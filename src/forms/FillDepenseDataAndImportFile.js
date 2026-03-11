const puppeteer = require('puppeteer-core');
const config = require('../config/Config');
const { runAhkScript } = require('../core/AhkRunner');
const path = require('path');
const { clickWhenVisible } = require('../utils/WaitForClickable');

/**
 * Remplit le formulaire de dépense et importe le fichier
 * @param {Page} page - La page Puppeteer
 * @param {Object} data - Les données à remplir
 * @returns {Promise<void>}
 */
async function fillDepenseDataAndImportFile(page, data) {
  const {
    propertyId,        // ID du logement (ex: 280209574 ou 561805757)
    categoryId,        // ID de la catégorie de dépense
    montantTTC,        // Montant TTC
    date,              // Date JJ/MM/AAAA
    filePath: pdfPath, // Chemin du PDF
    description        // Description optionnelle
  } = data;

  const timeout = config.app.defaultTimeout;
  const longTimeout = config.app.longTimeout;

  // Cliquer sur "Ajouter"
  await clickWhenVisible(page, [
    '::-p-aria(Ajouter[role="button"])',
    '#add-button',
    'xpath=//*[@id="add-button"]',
    ':scope >>> #add-button'
  ]);

  // Sélectionner le logement (bien)
  await puppeteer.Locator.race([
    page.locator('table form > div > div:nth-of-type(1) select'),
    page.locator('::-p-xpath(//*[@id="Logement.Oid"])'),
    page.locator(':scope >>> table form > div > div:nth-of-type(1) select')
  ])
    .setTimeout(timeout)
    .fill(propertyId);

  // Sélectionner la catégorie de dépense
  await puppeteer.Locator.race([
    page.locator('form > div > div:nth-of-type(2) select'),
    page.locator('::-p-xpath(//*[@id="Article.Oid"])'),
    page.locator(':scope >>> form > div > div:nth-of-type(2) select')
  ])
    .setTimeout(timeout)
    .fill(categoryId);

  // Remplir le montant TTC
  await puppeteer.Locator.race([
    page.locator('#gTTC-montant input'),
    page.locator('::-p-xpath(//*[@id="gTTC-montant"]/div[2]/div/input)'),
    page.locator(':scope >>> #gTTC-montant input')
  ])
    .setTimeout(timeout)
    .fill(String(montantTTC));

  // Remplir le libellé/description (optionnel)
  if (description) {
    await puppeteer.Locator.race([
      page.locator('#Libelle'),
      page.locator('::-p-xpath(//*[@id="Libelle"])'),
      page.locator(':scope >>> #Libelle')
    ])
      .setTimeout(timeout)
      .fill(description);
  }

  // Remplir la date
  await puppeteer.Locator.race([
    page.locator('#gDate input'),
    page.locator('::-p-xpath(//*[@id="gDate"]/div[2]/div/div/div[1]/div/input)'),
    page.locator(':scope >>> #gDate input'),
    page.locator('::-p-text(JJ/MM/AAAA)')
  ])
    .setTimeout(timeout)
    .fill(date);

  // Cliquer sur "Importer"
  await puppeteer.Locator.race([
    page.locator('::-p-aria(publish Importer)'),
    page.locator('#g8266dd9078dd799027adbb0908505247'),
    page.locator('::-p-xpath(//*[@id="g8266dd9078dd799027adbb0908505247"])'),
    page.locator(':scope >>> #g8266dd9078dd799027adbb0908505247')
  ])
    .setTimeout(timeout)
    .click({
      offset: {
        x: 40.17498779296875,
        y: 23.5999755859375,
      },
    });

  // Cliquer sur "Importer des"
  await puppeteer.Locator.race([
    page.locator('#pdfmaker-button-import > span'),
    page.locator('::-p-xpath(//*[@id="pdfmaker-button-import"]/span)'),
    page.locator(':scope >>> #pdfmaker-button-import > span'),
    page.locator('::-p-text(Importer des)')
  ])
    .setTimeout(timeout)
    .click({
      offset: {
        x: 86.10000610351562,
        y: 7.9375,
      },
    });

  // Exécuter le script AHK
  await runAhkScript(config.files.importScriptName, `${path.resolve(pdfPath)}`);

  // Cliquer sur "Confirmer"
  await puppeteer.Locator.race([
    page.locator('::-p-aria(Confirmer)'),
    page.locator('#g303a74098e356909ffcf68b9bd4ca1b0'),
    page.locator('::-p-xpath(//*[@id="g303a74098e356909ffcf68b9bd4ca1b0"])'),
    page.locator(':scope >>> #g303a74098e356909ffcf68b9bd4ca1b0')
  ])
    .setTimeout(longTimeout)
    .click({
      offset: {
        x: 20.2874755859375,
        y: 26.3499755859375,
      },
    });

  // Cliquer sur "Enregistrer"
  await clickWhenVisible(page, [
    '#g0aea5a3b4fbea02dad40ffdfe0e622b3 > span',
    '::-p-xpath(//*[@id="g0aea5a3b4fbea02dad40ffdfe0e622b3"]/span)',
    ':scope >>> #g0aea5a3b4fbea02dad40ffdfe0e622b3 > span',
    '::-p-text(Enregistrer)'
  ]);
}

module.exports = {
  fillDepenseDataAndImportFile
};
