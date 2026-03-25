const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');
const config = require('../config/Config');

/**
 * Classe pour extraire les données des factures via OCR (API Kimi)
 * avec système de cache
 */
class OcrExtractor {
  constructor() {
    this.apiKey = (process.env[config.kimi.apiKeyEnvVar] || '').trim();
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
   * Appelle l'API Kimi pour l'OCR avec PDF direct
   * @param {string} pdfPath - Chemin du PDF
   * @returns {Promise<string>} - Réponse de l'API
   */
  async callKimiAPI(pdfPath) {
    if (!this.apiKey) {
      throw new Error(`Clé API Kimi non configurée (${config.kimi.apiKeyEnvVar})`);
    }

    const pdfBuffer = fs.readFileSync(pdfPath);
    const base64Pdf = pdfBuffer.toString('base64');
    const filename = path.basename(pdfPath);
    
    const response = await axios.post(config.kimi.apiUrl, {
      model: config.kimi.model,
      messages: [
        {
          role: 'system',
          content: 'Tu es un assistant spécialisé dans l\'extraction de données de factures. Extrais les informations demandées et retourne UNIQUEMENT un objet JSON valide.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'file',
              file_url: {
                url: `data:application/pdf;base64,${base64Pdf}`,
                name: filename
              }
            },
            {
              type: 'text',
              text: `Extrais les informations de cette facture et retourne UNIQUEMENT un objet JSON avec ce format exact:
{
  "date_facture": "JJ/MM/AAAA",
  "montant_ttc": "123,45",
  "fournisseur": "Nom de l'entreprise ou fournisseur",
  "numero_facture": "Numéro de facture"
}

Règles:
- date_facture: date au format JJ/MM/AAAA
- montant_ttc: montant TTC avec une virgule comme séparateur décimal (ex: 123,45)
- fournisseur: nom de l'entreprise émettrice de la facture
- numero_facture: numéro de facture s'il est présent, sinon "N/A"

Retourne UNIQUEMENT le JSON, sans texte avant ou après.`
            }
          ]
        }
      ],
      temperature: 0.1,
      max_tokens: 4096
    }, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000
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
      // Chercher un JSON dans la réponse (gère les réponses multilignes)
      const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Format JSON non trouvé dans la réponse');
    } catch (error) {
      throw new Error(`Erreur parsing réponse Kimi: ${error.message}. Réponse: ${responseText.substring(0, 200)}`);
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
    
    try {
      console.log(`🔍 OCR en cours pour ${filename}...`);
      
      // 2. Appeler Kimi API directement avec le PDF
      const kimiResponse = await this.callKimiAPI(pdfPath);
      const extractedData = this.parseKimiResponse(kimiResponse);
      
      // 3. Valider les données obligatoires
      if (!extractedData.montant_ttc) {
        throw new Error('Montant TTC non trouvé dans la facture');
      }
      
      if (!extractedData.date_facture) {
        throw new Error('Date de facture non trouvée');
      }

      // 4. Formater le résultat
      const result = {
        date_facture: extractedData.date_facture,
        montant_ttc: String(extractedData.montant_ttc), // Garder comme string avec virgule
        fournisseur: extractedData.fournisseur || 'N/A',
        numero_facture: extractedData.numero_facture || 'N/A'
      };

      // 5. Sauvegarder en cache
      this.saveToCache(cacheKey, result);
      
      // 6. Pause pour respecter les rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
      
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
    }
  }
}

module.exports = OcrExtractor;
