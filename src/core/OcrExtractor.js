const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { fromPath } = require('pdf2pic');
const crypto = require('crypto');
const config = require('../config/Config');

/**
 * Classe pour extraire les données des factures via OCR (API Kimi)
 * avec système de cache
 */
class OcrExtractor {
  constructor() {
    this.apiKey = process.env[config.kimi.apiKeyEnvVar];
    this.cacheDir = config.cache.dir;
    this.ensureCacheDir();
    
    if (!this.apiKey) {
      console.warn(`⚠️  Variable d'environnement ${config.kimi.apiKeyEnvVar} non définie`);
    }
  }

  /**
   * Crée le dossier de cache s'il n'existe pas
   */
  ensureCacheDir() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
      console.log(`📁 Dossier de cache créé: ${this.cacheDir}`);
    }
  }

  /**
   * Génère une clé de cache basée sur le contenu du fichier
   * @param {string} filePath - Chemin du fichier
   * @returns {string} - Hash MD5
   */
  getCacheKey(filePath) {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Vérifie si un résultat est en cache
   * @param {string} cacheKey - Clé de cache
   * @returns {Object|null} - Données en cache ou null
   */
  getFromCache(cacheKey) {
    const cachePath = path.join(this.cacheDir, `${cacheKey}.json`);
    if (fs.existsSync(cachePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
        console.log(`📦 Cache hit`);
        return data;
      } catch (error) {
        console.warn(`⚠️  Erreur lecture cache: ${error.message}`);
        return null;
      }
    }
    return null;
  }

  /**
   * Sauvegarde les données en cache
   * @param {string} cacheKey - Clé de cache
   * @param {Object} data - Données à sauvegarder
   */
  saveToCache(cacheKey, data) {
    try {
      const cachePath = path.join(this.cacheDir, `${cacheKey}.json`);
      fs.writeFileSync(cachePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.warn(`⚠️  Erreur sauvegarde cache: ${error.message}`);
    }
  }

  /**
   * Convertit un PDF en image (première page uniquement)
   * @param {string} pdfPath - Chemin du PDF
   * @returns {Promise<string>} - Chemin de l'image générée
   */
  async convertPdfToImage(pdfPath) {
    const convert = fromPath(pdfPath, {
      density: 200,
      format: 'png',
      width: 1200,
      quality: 90,
      savePath: './temp'
    });
    
    const result = await convert(1);
    return result.path;
  }

  /**
   * Appelle l'API Kimi pour l'OCR
   * @param {string} imagePath - Chemin de l'image
   * @returns {Promise<string>} - Réponse de l'API
   */
  async callKimiAPI(imagePath) {
    if (!this.apiKey) {
      throw new Error(`Clé API Kimi non configurée (${config.kimi.apiKeyEnvVar})`);
    }

    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    const response = await axios.post(config.kimi.apiUrl, {
      model: config.kimi.model,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${base64Image}`
            }
          },
          {
            type: 'text',
            text: 'Extrais les informations de cette facture en JSON strict avec ce format: {"montant_ttc": number, "date_facture": "JJ/MM/AAAA"}. Le montant doit être un nombre (pas de €, pas d\'espaces). La date doit être au format JJ/MM/AAAA.'
          }
        ]
      }],
      temperature: 0.2
    }, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    return response.data.choices[0].message.content;
  }

  /**
   * Parse la réponse JSON de Kimi
   * @param {string} responseText - Texte de réponse
   * @returns {Object} - Données extraites
   */
  parseKimiResponse(responseText) {
    try {
      // Chercher un JSON dans la réponse
      const jsonMatch = responseText.match(/\{[^}]+\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Format JSON non trouvé dans la réponse');
    } catch (error) {
      throw new Error(`Erreur parsing réponse Kimi: ${error.message}. Réponse: ${responseText.substring(0, 100)}`);
    }
  }

  /**
   * Méthode principale d'extraction
   * @param {string} pdfPath - Chemin du PDF
   * @returns {Promise<Object>} - Résultat de l'extraction
   */
  async extract(pdfPath) {
    const cacheKey = this.getCacheKey(pdfPath);
    const filename = path.basename(pdfPath);
    
    // 1. Vérifier le cache
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return { 
        success: true, 
        fromCache: true, 
        data: cached,
        file: filename
      };
    }

    let imagePath = null;
    
    try {
      console.log(`🔍 OCR en cours pour ${filename}...`);
      
      // 2. Convertir en image
      imagePath = await this.convertPdfToImage(pdfPath);
      
      // 3. Appeler Kimi API
      const kimiResponse = await this.callKimiAPI(imagePath);
      const extractedData = this.parseKimiResponse(kimiResponse);
      
      // 4. Valider les données
      if (!extractedData.montant_ttc && extractedData.montant_ttc !== 0) {
        throw new Error('Montant TTC non trouvé dans la facture');
      }
      
      if (!extractedData.date_facture) {
        throw new Error('Date de facture non trouvée');
      }

      // 5. Normaliser le montant
      const montant = parseFloat(extractedData.montant_ttc);
      if (isNaN(montant)) {
        throw new Error(`Montant invalide: ${extractedData.montant_ttc}`);
      }

      const result = {
        montant_ttc: montant,
        date_facture: extractedData.date_facture
      };

      // 6. Sauvegarder en cache
      this.saveToCache(cacheKey, result);
      
      return { 
        success: true, 
        fromCache: false, 
        data: result,
        file: filename
      };

    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        file: filename,
        filePath: pdfPath
      };
    } finally {
      // 7. Nettoyer l'image temporaire
      if (imagePath && fs.existsSync(imagePath)) {
        try {
          fs.unlinkSync(imagePath);
        } catch (cleanupError) {
          // Ignorer les erreurs de nettoyage
        }
      }
    }
  }
}

module.exports = OcrExtractor;
