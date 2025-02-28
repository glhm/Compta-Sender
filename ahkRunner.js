const { exec } = require('child_process');
const path = require('path');
const config = require('./config');

/**
 * Exécute un script AHK avec les paramètres fournis
 * @param {string} scriptName - Nom du script AHK à exécuter
 * @param {string} param1 - Premier paramètre supplémentaire
 * @param {string} param2 - Deuxième paramètre supplémentaire
 * @returns {Promise<void>}
 */
function runAhkScript(scriptName, param1 = '', param2 = '') {
  return new Promise((resolve, reject) => {
    // Définir le chemin de AutoHotkey.exe
    const ahkExecutable = `"${config.paths.ahkExecutable}"`;
    
    // Définir le chemin du script AHK
    const ahkScriptPath = path.join(__dirname, config.files.ahkScriptsDir, scriptName);
    
    // Construire la commande avec les paramètres
    const command = `${ahkExecutable} "${ahkScriptPath}" "${param1}" "${param2}"`;
    
    console.log(`📂 Exécution du script AHK : ${ahkScriptPath} avec paramètres: ${param1}, ${param2}`);
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Erreur lors de l'exécution du script AHK: ${error.message}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.error(`⚠️ Avertissement: ${stderr}`);
      }
      console.log(`✅ Script AHK exécuté avec succès: ${stdout}`);
      resolve();
    });
  });
}

module.exports = {
  runAhkScript
};