/**
 * Utilitaires de formatage pour les dates et les montants
 */

/**
 * Convertit une date au format JJMMYYYY en format DD/MM/YYYY
 * @param {string} dateStr - Date au format JJMMYYYY
 * @returns {string} - Date au format DD/MM/YYYY
 */
function formatDate(dateStr) {
    if (!dateStr || dateStr.length !== 8) {
        throw new Error(`Format de date invalide: ${dateStr}. Format attendu: JJMMYYYY`);
    }

    const day = dateStr.substring(0, 2);
    const month = dateStr.substring(2, 4);
    const year = dateStr.substring(4, 8);

    return `${day}/${month}/${year}`;
}

/**
 * Convertit un montant au format "nombreVnombre" en nombre décimal
 * Par exemple: "123v45" devient 123.45
 * @param {string} amountStr - Montant au format nombreVnombre
 * @returns {string} - Montant formaté avec virgule décimale
 */
function formatAmount(amountStr) {
    if (!amountStr) {
        return '0';
    }

    // Si le montant contient déjà un point décimal, le retourner tel quel
    if (amountStr.includes('.')) {
        return amountStr;
    }

    // Remplacer 'v' par '.' pour la notation décimale
    if (amountStr.includes('v')) {
        return amountStr.replace('v', ',');
    }

    return amountStr;
}

module.exports = {
    formatDate,
    formatAmount
};