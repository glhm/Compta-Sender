/**
 * Configuration globale de l'application
 */
module.exports = {
  // Configuration des biens immobiliers
  properties: {
    '8_Richet': {
      path: '8_Richet',
      name: '8 Charles Richet',
      logementId: '280209574'
    },
    '55_Auduc': {
      path: '55_Auduc',
      name: '55 Renée Auduc',
      logementId: '561805757'
    }
  },

  // Chemins des exécutables
  paths: {
    // Chemin vers l'exécutable Chrome
    chromeExecutable: "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    // Chemin vers l'exécutable AutoHotkey
    ahkExecutable: "C:\\Program Files\\AutoHotkey\\v2\\AutoHotkey.exe",
    // Chemin de base vers les dossiers comptables
    baseAccountingPath: "G:\\Mon Drive\\Comptabilite\\Locatif"
  },

  // Configuration API Kimi
  kimi: {
    apiKeyEnvVar: "API_KIMI_KEY",
    apiUrl: "https://api.moonshot.ai/v1/chat/completions",
    model: "kimi-k2.5"
  },

  // Informations de connexion
  credentials: {
    // Email de connexion
    email: "gerbault.guilhem@gmail.com",
    // Variable d'environnement contenant le mot de passe
    passwordEnvVar: "JD2M_MDP",
  },

  // Paramètres de l'application
  app: {
    // Délai d'attente par défaut pour les actions (en ms)
    defaultTimeout: 15000,
    // Délai d'attente pour les actions plus longues (en ms)
    longTimeout: 30000,
    maxRetryTime: 40000,
    retryInterval: 500
  },

  // Paramètres pour le traitement des fichiers
  files: {
    // Répertoire contenant les scripts AHK
    ahkScriptsDir: "ahk_scripts",
    // Nom du script AHK d'importation
    importScriptName: "import_file.ahk"
  },

  // Configuration du cache OCR
  cache: {
    dir: ".ocr-cache"
  }
};
