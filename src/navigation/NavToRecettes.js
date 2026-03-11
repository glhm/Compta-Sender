const puppeteer = require('puppeteer-core');
const config = require('../config/Config');

/**
 * Navigue vers la page des recettes
 * @param {Page} page - La page Puppeteer
 * @returns {Promise<void>}
 */
async function navigate(page) {
  const timeout = config.app.defaultTimeout;

  // Cliquer sur le bouton du menu
  await puppeteer.Locator.race([
    page.locator('button.d-lg-none > span'),
    page.locator('::-p-xpath(//*[@id=\\"root\\"]/div[2]/div[2]/header/button[1]/span)'),
    page.locator(':scope >>> button.d-lg-none > span')
  ])
    .setTimeout(timeout)
    .click({
      offset: {
        x: 6.125,
        y: 18.737500190734863,
      },
    });

  // Sélectionner l'année fiscale
  await puppeteer.Locator.race([
    page.locator('div.app > div select'),
    page.locator('::-p-xpath(//*[@id=\\"sm-fiscalYear-input\\"])'),
    page.locator(':scope >>> div.app > div select')
  ])
    .setTimeout(timeout)
    .click({
      offset: {
        x: 80,
        y: 11.20001220703125,
      },
    });

  // Cliquer sur "Recettes"
  await puppeteer.Locator.race([
    page.locator('#ge7d9a91a4f901a72d8633230d4d350d2 span'),
    page.locator('::-p-xpath(//*[@id=\\"ge7d9a91a4f901a72d8633230d4d350d2\\"]/a/span)'),
    page.locator(':scope >>> #ge7d9a91a4f901a72d8633230d4d350d2 span'),
    page.locator('::-p-text(Recettes)')
  ])
    .setTimeout(timeout)
    .click({
      offset: {
        x: 39.5,
        y: 8.199981689453125,
      },
    });
}

module.exports = {
  navigate
};