const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const config = require('./config');

/**
 * Configuration des paramètres pour le traitement des répertoires
 */
const directoryConfig = {
  // Extension des fichiers à traiter (ex: '.pdf')
  fileExtension: '.pdf',
  
  // Informations par défaut pour le traitement
  defaultRenterName: 'Default',
  defaultMontantTotal: '0',
  defaultLoyerHorsCharges: '0',
  defaultCharges: '0',
  defaultDate: '012023',
  
  // Délai entre le traitement de chaque fichier (en ms)
  delayBetweenFiles: 5000
};

/**
 * Traite un fichier trouvé
 * @param {string} filePath - Chemin complet du fichier
 * @returns {Promise<void>}
 */
function processFile(filePath) {
  return new Promise((resolve, reject) => {
    // Extraire le nom du fichier sans extension pour l'utiliser comme nom du locataire
    const fileName = path.basename(filePath, path.extname(filePath));
    
    console.log(`🔍 Traitement du fichier: ${filePath}`);
    
    // Paramètres pour le script principal
    const args = [
      directoryConfig.defaultRenterName,  // Nom du locataire (peut être extrait du nom de fichier)
      directoryConfig.defaultMontantTotal, // Montant total
      directoryConfig.defaultLoyerHorsCharges, // Loyer hors charges
      directoryConfig.defaultCharges,     // Charges
      directoryConfig.defaultDate,        // Date
      filePath,                  // Chemin du fichier comme premier paramètre AHK
      directoryConfig.delayBetweenFiles.toString() // Délai comme second paramètre AHK
    ];
    
    // Lancer le script principal avec les arguments
    const process = spawn('node', ['main.js', ...args], { stdio: 'inherit' });
    
    process.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Traitement réussi pour: ${filePath}`);
        resolve();
      } else {
        console.error(`❌ Erreur lors du traitement de: ${filePath} (code: ${code})`);
        reject(new Error(`Échec du traitement avec le code ${code}`));
      }
    });
    
    process.on('error', (err) => {
      console.error(`❌ Erreur lors du lancement du script: ${err.message}`);
      reject(err);
    });
  });
}

/**
 * Parcourt récursivement un répertoire et traite les fichiers correspondants
 * @param {string} directoryPath - Chemin du répertoire à parcourir
 * @returns {Promise<string[]>} - Liste des fichiers trouvés
 */
async function scanDirectory(directoryPath) {
  try {
    const files = fs.readdirSync(directoryPath);
    const matchingFiles = [];
    
    for (const file of files) {
      const fullPath = path.join(directoryPath, file);
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory()) {
        // Parcourir récursivement les sous-répertoires
        const subDirFiles = await scanDirectory(fullPath);
        matchingFiles.push(...subDirFiles);
      } else if (stats.isFile() && path.extname(file).toLowerCase() === directoryConfig.fileExtension) {
        // Ajouter les fichiers correspondant à l'extension recherchée
        matchingFiles.push(fullPath);
      }
    }
    
    return matchingFiles;
  } catch (error) {
    console.error(`❌ Erreur lors du scan du répertoire ${directoryPath}: ${error.message}`);
    return [];
  }
}

/**
 * Fonction principale qui traite tous les fichiers d'un répertoire
 * @param {string} directoryPath - Chemin du répertoire à traiter
 */
async function processAllFiles(directoryPath) {
  try {
    console.log(`🔍 Recherche de fichiers ${directoryConfig.fileExtension} dans: ${directoryPath}`);
    
    // Récupérer tous les fichiers correspondants
    const filesToProcess = await scanDirectory(directoryPath);
    
    console.log(`📋 ${filesToProcess.length} fichiers trouvés à traiter`);
    
    // Traiter les fichiers un par un avec un délai entre chaque
    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      console.log(`⏳ Traitement du fichier ${i+1}/${filesToProcess.length}: ${file}`);
      
      try {
        await processFile(file);
        
        // Attendre un délai entre chaque fichier pour éviter les problèmes
        if (i < filesToProcess.length - 1) {
          console.log(`⏱️ Attente de ${directoryConfig.delayBetweenFiles}ms avant le prochain fichier...`);
          await new Promise(resolve => setTimeout(resolve, directoryConfig.delayBetweenFiles));
        }
      } catch (error) {
        console.error(`❌ Échec du traitement pour ${file}: ${error.message}`);
        // Continuer avec le fichier suivant malgré l'erreur
      }
    }
    
    console.log('✅ Traitement de tous les fichiers terminé');
  } catch (error) {
    console.error(`❌ Erreur générale: ${error.message}`);
    process.exit(1);
  }
}

// Récupérer le chemin du répertoire à partir des arguments de ligne de commande
const directoryPath = process.argv[2];

if (!directoryPath) {
  console.error('❌ Veuillez spécifier un répertoire à traiter');
  console.log('Usage: node processDirectory.js <chemin_du_répertoire>');
  process.exit(1);
}

// Vérifier que le répertoire existe
if (!fs.existsSync(directoryPath) || !fs.statSync(directoryPath).isDirectory()) {
  console.error(`❌ Le répertoire spécifié n'existe pas: ${directoryPath}`);
  process.exit(1);
}

// Lancer le traitement
processAllFiles(directoryPath);