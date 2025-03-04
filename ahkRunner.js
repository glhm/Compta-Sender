const { exec } = require('child_process');
const path = require('path');
const config = require('./Config');

/**
 * Exécute un script AHK avec les paramètres fournis
 * @param {string} scriptName - Nom du script AHK à exécuter
 * @param {string} param1 - Premier paramètre supplémentaire
 * @returns {Promise<void>}
 */
function runAhkScript(scriptName, param1) {
  return new Promise((resolve, reject) => {
    if (!param1) {
      reject('❌ Erreur : Le paramètre param1 ne peut pas être vide.');
      return;
    }
    const ahkExecutable = `"${config.paths.ahkExecutable}"`;
    const ahkScriptPath = path.join(__dirname, config.files.ahkScriptsDir, scriptName);
    const command = `${ahkExecutable} "${ahkScriptPath}" "${param1}"`;

    console.log(`📂 Exécution du script AHK : ${ahkScriptPath} avec paramètres: ${param1}`);

    const process = exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(`❌ Erreur lors de l'exécution du script AHK: ${error.message}`);
        return;
      }
      if (stderr) {
        reject(`⚠️ AHK a retourné une erreur: ${stderr.trim()}`);
        return;
      }
      console.log(`✅ Script AHK exécuté avec succès: ${stdout}`);
      resolve(stdout);
    });

    // Capture aussi les erreurs en temps réel
    process.stderr.on('data', (data) => {
      reject(`⚠️ AHK Error: ${data.trim()}`);
    });
  });
}

module.exports = {
  runAhkScript
};