const fs = require('fs-extra');
const path = require('path');
const connection = require('../src/core/Connection');
const goToRecettes = require('../src/navigation/NavToRecettes');
const receiptProcessor = require('../src/forms/FillReceiptDataAndImportFile');
const config = require('../src/config/Config');
const { formatDate, formatAmount } = require('../src/utils/FormatUtils');
const { getAllProperties, resolvePropertyFromPath } = require('../src/core/PropertyResolver');

/**
 * Extrait les informations d'un nom de fichier de quittance
 * Format attendu: Quittance--NomDuLocataire--YYYYMMDD--Montant1--Montant2.pdf
 * @param {string} filename - Nom du fichier à analyser
 * @returns {Object|null} - Informations extraites ou null si le format est invalide
 */
function parseReceiptFilename(filename) {
  // Vérifier si c'est un fichier PDF
  if (!filename.toLowerCase().endsWith('.pdf')) {
    return null;
  }

  // Supprimer l'extension .pdf pour l'analyse
  const nameWithoutExt = filename.slice(0, -4);

  // Diviser le nom en segments basés sur le séparateur --
  const segments = nameWithoutExt.split('--');

  // Vérifier si le format est correct (5 segments attendus)
  if (segments.length !== 5 || segments[0] !== 'Quittance') {
    return null;
  }

  // Extraire les informations
  const renterName = segments[1];
  const dateStr = segments[2]; // YYYYMMDD
  const montant1 = segments[3]; // loyerHorsCharges (peut contenir 'v' pour la virgule)
  const montant2 = segments[4]; // charges (peut contenir 'v' pour la virgule)

  try {
    // Formater la date au format DD/MM/YYYY
    const formattedDate = formatDate(dateStr);

    // Formater les montants (remplacer 'v' par '.')
    const formattedMontant1 = formatAmount(montant1);
    const formattedMontant2 = formatAmount(montant2);

    return {
      renterName,
      loyerHorsCharges: formattedMontant1,
      charges: formattedMontant2,
      date: formattedDate,
      originalFilename: filename
    };
  } catch (error) {
    console.error(`❌ Erreur lors du parsage des données pour ${filename}: ${error.message}`);
    return null;
  }
}

/**
 * Traite les recettes d'un bien pour une année donnée
 * @param {Object} property - Information du bien
 * @param {number} year - Année à traiter
 * @param {Page} page - Page Puppeteer déjà connectée
 * @returns {Promise<Object>} - Résultat du traitement
 */
async function processPropertyRecettes(property, year, page) {
  const yearDir = path.join(config.paths.baseAccountingPath, property.path, String(year));
  const atDirPath = path.join(yearDir, 'Recettes', 'AT');
  
  console.log(`\n🏠 Traitement des recettes pour: ${property.name} (${year})`);
  console.log(`📁 Répertoire: ${atDirPath}`);

  // Vérifier si le répertoire existe
  if (!fs.existsSync(atDirPath)) {
    console.log(`⚠️  Le répertoire Recettes/AT n'existe pas pour ${property.name}`);
    return { processed: 0, failed: 0 };
  }

  // Lire tous les fichiers
  const files = await fs.readdir(atDirPath);

  // Filtrer et analyser les fichiers de quittance
  const receipts = files
    .map(filename => {
      const receiptData = parseReceiptFilename(filename);
      if (receiptData) {
        receiptData.filePath = path.join(atDirPath, filename);
        receiptData.propertyId = property.logementId;
      }
      return receiptData;
    })
    .filter(data => data !== null);

  if (receipts.length === 0) {
    console.log(`⚠️  Aucun fichier de quittance trouvé pour ${property.name}`);
    return { processed: 0, failed: 0 };
  }

  console.log(`📄 ${receipts.length} quittances trouvées`);

  let processed = 0;
  let failed = 0;

  // Traiter chaque quittance
  for (const receipt of receipts) {
    console.log(`\n📄 ${receipt.originalFilename}`);
    console.log(`   Locataire: ${receipt.renterName}`);
    console.log(`   Loyer: ${receipt.loyerHorsCharges}€ | Charges: ${receipt.charges}€`);
    console.log(`   Date: ${receipt.date}`);

    try {
      await receiptProcessor.fillReceiptDataAndImportFile(page, {
        renterName: receipt.renterName,
        loyerHorsCharges: receipt.loyerHorsCharges,
        charges: receipt.charges,
        date: receipt.date,
        filePath: receipt.filePath,
        propertyId: receipt.propertyId  // Ajout du logement
      });

      console.log(`   ✅ Quittance traitée avec succès`);
      processed++;
      
      // Solution 2 : Délai de 1 seconde entre chaque quittance pour laisser JD2M terminer
      if (processed < receipts.length) {
        console.log(`   ⏳ Pause de 1s avant la prochaine quittance...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (err) {
      console.error(`   ❌ Erreur:`, err.message);
      failed++;
    }
  }

  return { processed, failed };
}

/**
 * Affiche l'aide d'utilisation
 */
function showUsage() {
  console.log(`
Usage: node run-recettes.js [année]

Paramètres:
  année    Année à traiter (par défaut: ${new Date().getFullYear()})

Exemples:
  node run-recettes.js       Traite l'année courante
  node run-recettes.js 2025  Traite l'année 2025
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
 * Traite les recettes de tous les biens pour l'année donnée
 * @returns {Promise<void>}
 */
async function processAllRecettes() {
  const year = getYearFromArgs();
  
  console.log(`\n========================================`);
  console.log(`🚀 Traitement des RECETTES pour ${year}`);
  console.log(`========================================\n`);

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
    let totalFailed = 0;

    // Traiter chaque bien
    for (const property of properties) {
      await goToRecettes.navigate(page);
      const result = await processPropertyRecettes(property, year, page);
      totalProcessed += result.processed;
      totalFailed += result.failed;
    }

    // Résumé final
    console.log(`\n========================================`);
    console.log(`📊 RÉSUMÉ FINAL`);
    console.log(`========================================`);
    console.log(`✅ Succès: ${totalProcessed}`);
    console.log(`❌ Échecs: ${totalFailed}`);
    console.log(`📄 Total: ${totalProcessed + totalFailed}`);
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
  await processAllRecettes();
})();
