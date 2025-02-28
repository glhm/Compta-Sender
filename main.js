const connection = require('./connection');
const goToRecettes = require('./goToRecettes');
const loadFile = require('./loadFile');

// Récupère les arguments passés en CLI
const args = process.argv.slice(2);
const renterName = args[0];  // Nom du locataire
const MontantTotal = args[1];  // Montant 1
const LoyerHorsCharges = args[2];  // Montant 2
const charges = args[3];  // Montant 3
const date = args[4];  // Date MMYYYY
const ahkParam1 = args[5] || ''; // Premier paramètre supplémentaire pour le script AHK
const ahkParam2 = args[6] || ''; // Deuxième paramètre supplémentaire pour le script AHK

console.log(`📄 Processing receipt for: ${renterName}, Amounts: ${MontantTotal}, ${LoyerHorsCharges}, ${charges}, Date: ${date}`);
console.log(`📄 AHK Parameters: ${ahkParam1}, ${ahkParam2}`);

(async () => {
  try {
    // Lancer le navigateur et se connecter
    const { browser, page } = await connection.login();
    
    // Aller à la page des recettes
    await goToRecettes.navigate(page);
    
    // Remplir le formulaire et charger le fichier
    await loadFile.process(page, {
      renterName,
      MontantTotal,
      LoyerHorsCharges,
      charges,
      date,
      ahkParam1,
      ahkParam2
    });
    
    // Ne pas fermer le navigateur pour permettre de voir le résultat
    // await browser.close();
    
    console.log('✅ Opération terminée avec succès');
  } catch (err) {
    console.error('❌ Erreur lors de l\'exécution:', err);
    process.exit(1);
  }
})();