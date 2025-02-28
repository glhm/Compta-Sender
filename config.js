/**
 * Configuration globale de l'application
 */
module.exports = {
  // Chemins des exécutables
  paths: {
    // Chemin vers l'exécutable Chrome
    chromeExecutable: "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    // Chemin vers l'exécutable AutoHotkey
    ahkExecutable: "C:\\Program Files\\AutoHotkey\\v2\\AutoHotkey.exe"
  },
  
  // Informations de connexion
  credentials: {
    // Email de connexion
    email: "gerbault.guilhem@gmail.com",
    // Variable d'environnement contenant le mot de passe
    passwordEnvVar: "JD2M_MDP"
  },
  
  // Paramètres de l'application
  app: {
    // Délai d'attente par défaut pour les actions (en ms)
    defaultTimeout: 5000,
    // Délai d'attente pour les actions plus longues (en ms)
    longTimeout: 12000
  },
  
  // Paramètres pour le traitement des fichiers
  files: {
    // Répertoire contenant les scripts AHK
    ahkScriptsDir: "ahk_scripts",
    // Nom du script AHK d'importation
    importScriptName: "import_file.ahk"
  }
};