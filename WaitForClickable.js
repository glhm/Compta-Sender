/**
 * Attendre qu'un élément soit visible et cliquable, puis cliquer dessus.
 * @param {import('puppeteer-core').Page} page - La page Puppeteer.
 * @param {string[]} selectors - Un tableau de sélecteurs CSS ou XPath.
 * @param {object} [options] - Options pour le clic (comme offset).
 * @throws {Error} Si aucun élément n'est cliquable après 40s.
 */
async function clickWhenVisible(page, selectors, options = {}) {
    const maxRetryTime = 40000;  // ⏳ Temps max d'attente : 40 secondes

    for (const selector of selectors) {
        try {
            console.log(`⏳ Tentative avec le locator '${selector}'...`);

            // 🔄 Attendre que l'élément soit visible et cliquable
            await page.waitForSelector(selector, { visible: true, timeout: maxRetryTime });

            // 🔄 Clic direct via JavaScript (bypass potentiels problèmes d'offset)
            await page.evaluate((sel) => {
                const btn = document.querySelector(sel);
                if (btn) btn.click();
            }, selector);

            console.log(`✅ Bouton cliqué avec succès avec '${selector}' !`);
            return;  // 🚀 Succès, on sort de la fonction
        } catch (err) {
            console.log(`⚠️ Échec avec le locator '${selector}', tentative suivante...`);
        }
    }

    // ❌ Abandonner si aucun locator n'a pu cliquer après 40s
    throw new Error(`❌ Impossible de cliquer sur l'un des locators après 40 secondes !`);
}

module.exports = {
    clickWhenVisible,
};
