const fs = require('fs-extra');
const path = require('path');
const connection = require('../src/core/Connection');
const goToDepenses = require('../src/navigation/NavToDepenses');
const depenseProcessor = require('../src/forms/FillDepenseDataAndImportFile');
const config = require('../src/config/Config');
const OcrExtractor = require('../src/core/OcrExtractor');
const { getAllProperties } = require('../src/core/PropertyResolver');
const categoryMapping = require('../src/config/categories-mapping.json');

const ocr = new OcrExtractor();

/**
 * Normalise le nom de catégorie pour matcher le mapping JSON
 * @param {string} folderName - Nom du dossier
 * @returns {string|null} - Clé de catégorie ou null
 */
function normalizeCategoryName(folderName) {
  // Mapping dossier vers clé JSON
  const mapping = {
    'OGA': 'oga',
    'Mobilier': 'mobilier',
    'Menage': 'menage',
    'Internet': 'internet',
    'Entretien': 'menage',
    'Elec': 'elec',
    'Eau': 'eau',
    'Comptable': 'comptable',
    'CFE': 'cfe',
    'Assurance_PNO': 'assurance_pno',
    'Copro': 'copro',
    'travaux': 'travaux',
    'Travaux': 'travaux'
  };
  
  return mapping[folderName] || null;
}

/**
 * Extrait la description depuis le nom de fichier
 * @param {string} filename - Nom du fichier
 * @returns {string} - Description
 */
function extractDescription(filename) {
  return path.basename(filename, '.pdf');
}

/**
 * Traite les dépenses d'un bien pour une année donnée
 * @param {Object} property - Information du bien
 * @param {number} year - Année à traiter
 * @param {Page} page - Page Puppeteer
 * @returns {Promise<Object>} - Résultat avec liste des échecs
 */
async function processPropertyDepenses(property, year, page) {
  const yearDir = path.join(config.paths.baseAccountingPath, property.path, String(year));
  const depensesDir = path.join(yearDir, 'Depenses');
  
  console.log(`\n🏠 Traitement des dépenses pour: ${property.name} (${year})`);
  console.log(`📁 Répertoire: ${depensesDir}`);

  // Vérifier si le répertoire existe
  if (!fs.existsSync(depensesDir)) {
    console.log(`⚠️  Pas de dossier Depenses pour ${property.name}`);
    return { processed: 0, failed: 0, failedFiles: [] };
  }

  // Récupérer tous les sous-dossiers (catégories)
  const categories = await fs.readdir(depensesDir);
  const pdfFiles = [];

  // Scanner chaque catégorie
  for (const category of categories) {
    const categoryPath = path.join(depensesDir, category);
    const stat = await fs.stat(categoryPath);

    if (stat.isDirectory()) {
      const files = await fs.readdir(categoryPath);
      const pdfs = files
        .filter(f => f.toLowerCase().endsWith('.pdf'))
        .map(f => ({
          filePath: path.join(categoryPath, f),
          categoryKey: normalizeCategoryName(category),
          originalCategory: category,
          description: extractDescription(f),
          propertyId: property.logementId
        }));

      pdfFiles.push(...pdfs);
    }
  }

  if (pdfFiles.length === 0) {
    console.log(`⚠️  Aucun fichier PDF trouvé pour ${property.name}`);
    return { processed: 0, failed: 0, failedFiles: [] };
  }

  console.log(`📄 ${pdfFiles.length} factures trouvées`);

  const failedFiles = [];
  let processed = 0;

  // Traiter chaque facture
  for (const fileInfo of pdfFiles) {
    console.log(`\n📄 ${path.basename(fileInfo.filePath)}`);
    console.log(`   Catégorie: ${fileInfo.originalCategory}`);

    // Vérifier que la catégorie est mappée
    if (!fileInfo.categoryKey) {
      console.log(`   ❌ Catégorie non reconnue: ${fileInfo.originalCategory}`);
      failedFiles.push({
        file: fileInfo.filePath,
        error: `Catégorie non reconnue: ${fileInfo.originalCategory}`,
        step: 'category'
      });
      continue;
    }

    const categoryInfo = categoryMapping.depenses[fileInfo.categoryKey];
    if (!categoryInfo) {
      console.log(`   ❌ Mapping manquant pour: ${fileInfo.categoryKey}`);
      failedFiles.push({
        file: fileInfo.filePath,
        error: `Mapping manquant: ${fileInfo.categoryKey}`,
        step: 'mapping'
      });
      continue;
    }

    console.log(`   → ${categoryInfo.label} (ID: ${categoryInfo.id})`);

    try {
      // 1. OCR pour extraire montant et date
      console.log(`   🔍 OCR en cours...`);
      const ocrResult = await ocr.extract(fileInfo.filePath);

      if (!ocrResult.success) {
        console.log(`   ❌ OCR échec: ${ocrResult.error}`);
        failedFiles.push({
          file: fileInfo.filePath,
          error: ocrResult.error,
          step: 'ocr'
        });
        continue;
      }

      const { montant_ttc, date_facture } = ocrResult.data;
      const cacheIndicator = ocrResult.fromCache ? ' (cache)' : '';
      console.log(`   ✅ OCR${cacheIndicator}: ${montant_ttc}€ le ${date_facture}`);

      // 2. Traitement JD2M
      await depenseProcessor.fillDepenseDataAndImportFile(page, {
        propertyId: fileInfo.propertyId,
        categoryId: categoryInfo.id,
        montantTTC: montant_ttc,
        date: date_facture,
        filePath: fileInfo.filePath,
        description: fileInfo.description
      });

      console.log(`   ✅ Dé${fileInfo.description}`);
      processed++;

    } catch (err) {
      console.error(`   ❌ Erreur: ${err.message}`);
      failedFiles.push({
        file: fileInfo.filePath,
        error: err.message,
        step: 'jd2m'
      });
    }
  }

  return { 
    processed, 
    failed: failedFiles.length, 
    failedFiles 
  };
}

/**
 * Affiche l'aide d'utilisation
 */
function showUsage() {
  console.log(`
Usage: node run-depenses.js [année]

Paramètres:
  année    Année à traiter (par défaut: ${new Date().getFullYear()})

Exemples:
  node run-depenses.js       Traite l'année courante
  node run-depenses.js 2025  Traite l'année 2025
`);
}

/**
 * Récupère l'année depuis les arguments ou utilise l'année courante
 * @returns {number} - L'année à traiter
 */
function getYearFromArgs() {
  const args = process.argv.slice(2);
  
  // Afficher l'aide si demandé
  if (args.includes('--help') || args.includes('-h')) {
    showUsage();
    process.exit(0);
  }
  
  const yearArg = args[0];
  
  if (!yearArg) {
    return new Date().getFullYear();
  }
  
  const year = parseInt(yearArg, 10);
  
  if (isNaN(year) || year < 2000 || year > 2100) {
    console.error(`❌ Année invalide: "${yearArg}"`);
    console.error(`   Veuillez fournir une année entre 2000 et 2100.`);
    showUsage();
    process.exit(1);
  }
  
  return year;
}

/**
 * Traite les dépenses de tous les biens pour l'année donnée
 * @returns {Promise<void>}
 */
async function processAllDepenses() {
  const year = getYearFromArgs();
  
  console.log(`\n========================================`);
  console.log(`🚀 Traitement des DÉPENSES pour ${year}`);
  console.log(`========================================\n`);

  // Vérifier que la clé API est configurée
  if (!process.env[config.kimi.apiKeyEnvVar]) {
    console.error(`❌ Variable d'environnement ${config.kimi.apiKeyEnvVar} non définie`);
    console.error(`   Configurez votre clé API Kimi avant de continuer.`);
    process.exit(1);
  }

  try {
    // Récupérer tous les biens
    const properties = getAllProperties();
    
    if (properties.length === 0) {
      console.error('❌ Aucun bien configuré');
      return;
    }

    console.log(`📋 ${properties.length} bien(s) à traiter:`);
    properties.forEach(p => console.log(`   - ${p.name}`));

    // Lancer le navigateur et se connecter (une seule fois)
    console.log(`\n🔐 Connexion à JD2M...`);
    const { browser, page } = await connection.login();

    let totalProcessed = 0;
    const allFailedFiles = [];

    // Traiter chaque bien
    for (const property of properties) {
      await goToDepenses.navigate(page);
      const result = await processPropertyDepenses(property, year, page);
      totalProcessed += result.processed;
      allFailedFiles.push(...result.failedFiles);
    }

    // Résumé final
    console.log(`\n========================================`);
    console.log(`📊 RÉSUMÉ FINAL`);
    console.log(`========================================`);
    console.log(`✅ Succès: ${totalProcessed}`);
    console.log(`❌ Échecs: ${allFailedFiles.length}`);
    console.log(`📄 Total: ${totalProcessed + allFailedFiles.length}`);

    // Liste des fichiers en échec
    if (allFailedFiles.length > 0) {
      console.log(`\n📋 FICHIERS À TRAITER MANUELLEMENT:`);
      console.log(`----------------------------------------`);
      allFailedFiles.forEach((f, i) => {
        console.log(`${i + 1}. ${path.basename(f.file)}`);
        console.log(`   Erreur: ${f.error}`);
        console.log(`   Étape: ${f.step}`);
        console.log(`   Chemin: ${f.file}`);
        console.log();
      });
    }

    console.log(`========================================\n`);
    console.log('✅ Traitement terminé');
    
    // Ne pas fermer le navigateur
    // await browser.close();
    
  } catch (err) {
    console.error('❌ Erreur lors de l\'exécution:', err);
    process.exit(1);
  }
}

// Point d'entrée principal
(async () => {
  await processAllDepenses();
})();
