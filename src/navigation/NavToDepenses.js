const puppeteer = require('puppeteer-core');
const config = require('../config/Config');

/**
 * Navigue vers la page des dépenses
 * @param {Page} page - La page Puppeteer
 * @returns {Promise<void>}
 */
async function navigate(page) {
  const timeout = config.app.defaultTimeout;

  // Cliquer sur le bouton du menu
  await puppeteer.Locator.race([
    page.locator('button.d-lg-none > span'),
    page.locator('::-p-xpath(//*[@id="root"]/div[2]/div[2]/header/button[1]/span)'),
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
    page.locator('::-p-xpath(//*[@id="sm-fiscalYear-input"])'),
    page.locator(':scope >>> div.app > div select')
  ])
    .setTimeout(timeout)
    .click({
      offset: {
        x: 80,
        y: 11.20001220703125,
      },
    });

  // Cliquer sur "Dépenses"
  await puppeteer.Locator.race([
    page.locator('#gb189b236704df24a9782ac4c1ece7cc5 span'),
    page.locator('::-p-xpath(//*[@id="gb189b236704df24a9782ac4c1ece7cc5"]/a/span)'),
    page.locator(':scope >>> #gb189b236704df24a9782ac4c1ece7cc5 span'),
    page.locator('::-p-text(Dépenses)')
  ])
    .setTimeout(timeout)
    .click({
      offset: {
        x: 47.5,
        y: 12,
      },
    });
}

module.exports = {
  navigate
};
