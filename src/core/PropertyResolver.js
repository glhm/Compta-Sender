const path = require('path');
const config = require('../config/Config');

/**
 * Détecte le bien immobilier à partir du chemin du fichier
 * @param {string} filePath - Chemin complet du fichier
 * @returns {Object} - Information du bien { key, name, logementId }
 */
function resolvePropertyFromPath(filePath) {
  // Normaliser le chemin pour Windows
  const normalizedPath = path.normalize(filePath);
  
  // Chercher quel bien correspond au chemin
  for (const [key, property] of Object.entries(config.properties)) {
    // Construire le chemin attendu pour ce bien
    const propertyPath = path.join(config.paths.baseAccountingPath, property.path);
    
    if (normalizedPath.includes(propertyPath) || normalizedPath.includes(property.path)) {
      return {
        key,
        name: property.name,
        logementId: property.logementId
      };
    }
  }
  
  throw new Error(`Impossible de déterminer le bien à partir du chemin: ${filePath}`);
}

/**
 * Liste tous les biens configurés
 * @returns {Array} - Liste des biens [{ key, name, logementId, path }]
 */
function getAllProperties() {
  return Object.entries(config.properties).map(([key, property]) => ({
    key,
    name: property.name,
    logementId: property.logementId,
    path: property.path
  }));
}

/**
 * Récupère un bien par sa clé
 * @param {string} key - Clé du bien ('8_Richet' ou '55_Auduc')
 * @returns {Object} - Information du bien
 */
function getPropertyByKey(key) {
  const property = config.properties[key];
  if (!property) {
    throw new Error(`Bien non trouvé: ${key}`);
  }
  
  return {
    key,
    name: property.name,
    logementId: property.logementId,
    path: property.path
  };
}

module.exports = {
  resolvePropertyFromPath,
  getAllProperties,
  getPropertyByKey
};
