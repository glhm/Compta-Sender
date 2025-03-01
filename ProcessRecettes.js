const fs = require('fs-extra');
const path = require('path');
const connection = require('./Connection');
const goToRecettes = require('./NavToRecettes');
const receiptProcessor = require('./FillReceiptDataAndImportFile');
const config = require('./Config');
const { formatDate, formatAmount } = require('./FormatUtils');

/**
 * Extrait les informations d'un nom de fichier de quittance
 * Format attendu: Quittance--JJMMYYYY--NomDuLocataire--Montant1--Montant2.pdf
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
  const dateStr = segments[1]; // JJMMYYYY
  const renterName = segments[2];
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
    console.error(`❌ Erreur lors du formatage des données pour ${filename}: ${error.message}`);
    return null;
  }
}

/**
 * Traite tous les fichiers de quittance dans le répertoire AT
 * @param {string} year - Année à traiter (ex: "2024")
 * @returns {Promise<void>}
 */
async function processReceiptFiles(year) {
  try {
    // Construire le chemin complet vers le répertoire de l'année
    const yearDir = path.join(config.paths.baseAccountingPath, year);
    const atDirPath = path.join(yearDir, 'Recettes', 'AT');
    console.log(`🔍 Year Directory ${yearDir}`);

    console.log(`🔍 Recherche de quittances pour l'année ${year} dans: ${atDirPath}`);

    // Vérifier si le répertoire AT existe
    if (!fs.existsSync(atDirPath)) {
      console.error(`❌ Le répertoire Recettes/AT n'existe pas dans ${yearDir}`);
      return;
    }

    // Lire tous les fichiers du répertoire AT
    const files = await fs.readdir(atDirPath);

    // Filtrer et analyser les fichiers de quittance
    const receipts = files
      .map(filename => {
        const receiptData = parseReceiptFilename(filename);
        if (receiptData) {
          receiptData.filePath = path.join(atDirPath, filename);
        }
        return receiptData;
      })
      .filter(data => data !== null);

    if (receipts.length === 0) {
      console.log('⚠️  Aucun fichier de quittance trouvé dans le format attendu : Quittance--JJMMYYYY--100v10--20v00');
      return;
    }

    console.log(`📄 ${receipts.length} quittances trouvées à traiter`);

    // Lancer le navigateur et se connecter
    const { browser, page } = await connection.login();

    // Aller à la page des recettes
    await goToRecettes.navigate(page);

    // Traiter chaque quittance
    for (const receipt of receipts) {
      console.log(`\n📄 Traitement de la quittance: ${receipt.originalFilename}`);
      console.log(`   - Locataire: ${receipt.renterName}`);
      console.log(`   - Loyer hors charges: ${receipt.loyerHorsCharges}`);
      console.log(`   - Charges: ${receipt.charges}`);
      console.log(`   - Date: ${receipt.date}`);

      try {
        // Remplir le formulaire et charger le fichier
        await receiptProcessor.fillReceiptDataAndImportFile(page, {
          renterName: receipt.renterName,
          loyerHorsCharges: receipt.loyerHorsCharges,
          charges: receipt.charges,
          date: receipt.date,
          filePath: receipt.filePath
        });

        console.log(`✅ Quittance traitée avec succès: ${receipt.originalFilename}`);
        // 🕒 Attendre 15 secondes avant le prochain reçu
        console.log("⏳ Pause de 15 secondes avant le reçu suivant...");
        await new Promise(resolve => setTimeout(resolve, 15000));
      } catch (err) {
        console.error(`❌ Erreur lors du traitement de ${receipt.originalFilename}:`, err);
      }
    }

    console.log('\n✅ Traitement de toutes les quittances terminé');

    // Ne pas fermer le navigateur pour permettre de voir le résultat
    // await browser.close();
  } catch (err) {
    console.error('❌ Erreur lors de l\'exécution:', err);
  }
}

// Point d'entrée principal
(async () => {
  // Récupérer l'année depuis les arguments ou utiliser l'année courante
  const year = process.argv[2];

  await processReceiptFiles(year);
})();