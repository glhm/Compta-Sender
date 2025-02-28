const connection = require('./connection');
const goToRecettes = require('./NavToRecettes');
const receiptProcessor = require('./FillReceiptDataAndImportFile');

// Récupère les arguments passés en CLI
const args = process.argv.slice(2);
const renterName = args[0];  // Nom du locataire
const loyerHorsCharges = args[1];  // Montant 2
const charges = args[2];  // Montant 3
const date = args[3];  // Date MMYYYY
const filePath = args[4]; // Premier paramètre supplémentaire pour le script AHK

console.log(`📄 Processing receipt for: ${renterName}, LoyerHorsCharges:, ${loyerHorsCharges},charges: ${charges}, Date: ${date}`);
console.log(`📄 AHK Parameters: ${filePath}`);

(async () => {
  try {
    // Lancer le navigateur et se connecter
    const { browser, page } = await connection.login();

    // Aller à la page des recettes
    await goToRecettes.navigate(page);

    // Remplir le formulaire et charger le fichier
    await receiptProcessor.fillReceiptDataAndImportFile(page, {
      renterName,
      loyerHorsCharges,
      charges,
      date,
      filePath
    });

    // Ne pas fermer le navigateur pour permettre de voir le résultat
    // await browser.close();

    console.log('✅ Opération terminée avec succès');
  } catch (err) {
    console.error('❌ Erreur lors de l\'exécution:', err);
    process.exit(1);
  }
})();