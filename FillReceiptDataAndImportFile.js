const puppeteer = require('puppeteer-core');
const config = require('./Config');
const { runAhkScript } = require('./AhkRunner');
const path = require('path');
const { clickWhenVisible } = require('./WaitForClickable');  // 🛠️ Import de la fonction utilitaire

/**
 * Traite le formulaire et charge le fichier
 * @param {Page} page - La page Puppeteer
 * @param {Object} data - Les données à remplir
 * @returns {Promise<void>}
 */
async function fillReceiptDataAndImportFile(page, data) {
  const {
    renterName,
    loyerHorsCharges,
    charges,
    date,
    filePath,
  } = data;

  const timeout = config.app.defaultTimeout;
  const longTimeout = config.app.longTimeout;

  await clickWhenVisible(page, [
    '::-p-aria(Ajouter)',
    '#Ajouter',
    'xpath=//*[@id="Ajouter"]',
    ':scope >>> #Ajouter'
  ]);

  // Sélectionner l'article
  await puppeteer.Locator.race([
    page.locator('::-p-aria(close Article* Montant TTC Commentaire Date de facture* JJ/MM/AAAA today Numéro de facture Facture) >>>> ::-p-aria([role=\\"combobox\\"])'),
    page.locator('table form > div > div:nth-of-type(2) select'),
    page.locator('::-p-xpath(//*[@id=\\"Article.Oid\\"])'),
    page.locator(':scope >>> table form > div > div:nth-of-type(2) select')
  ])
    .setTimeout(timeout)
    .click({
      offset: {
        x: 62.59999084472656,
        y: 16.399993896484375,
      },
    });

  // Remplir l'article
  await puppeteer.Locator.race([
    page.locator('::-p-aria(close Article* Location longue durée Montant TTC Commentaire Date de facture* JJ/MM/AAAA today Numéro de facture Facture) >>>> ::-p-aria([role=\\"combobox\\"])'),
    page.locator('table form > div > div:nth-of-type(2) select'),
    page.locator('::-p-xpath(//*[@id=\\"Article.Oid\\"])'),
    page.locator(':scope >>> table form > div > div:nth-of-type(2) select')
  ])
    .setTimeout(timeout)
    .fill('-42462');

  // Remplir le loyer
  await puppeteer.Locator.race([
    page.locator('table div > div > div > div:nth-of-type(2) > div:nth-of-type(2) input'),
    page.locator('::-p-xpath(//*[@id=\\"gTTC-montant-sub-article-559715\\"]/div/div/input)'),
    page.locator(':scope >>> table div > div > div > div:nth-of-type(2) > div:nth-of-type(2) input')
  ])
    .setTimeout(timeout)
    .fill(String(loyerHorsCharges));

  // Remplir les charges
  await puppeteer.Locator.race([
    page.locator('div:nth-of-type(2) > div:nth-of-type(3) input'),
    page.locator('::-p-xpath(//*[@id=\\"gTTC-montant-sub-article-45818785\\"]/div/div/input)'),
    page.locator(':scope >>> div:nth-of-type(2) > div:nth-of-type(3) input')
  ])
    .setTimeout(timeout)
    .fill(charges);

  // Remplir le libellé
  await puppeteer.Locator.race([
    page.locator('#Libelle-sub-article-559715'),
    page.locator('::-p-xpath(//*[@id=\\"Libelle-sub-article-559715\\"])'),
    page.locator(':scope >>> #Libelle-sub-article-559715')
  ])
    .setTimeout(timeout)
    .fill(renterName + " " + date);

  // Remplir le libellé
  await puppeteer.Locator.race([
    page.locator('#Libelle-sub-article-45818785'),
    page.locator('::-p-xpath(//*[@id=\\"Libelle-sub-article-45818785\\"])'),
    page.locator(':scope >>> #Libelle-sub-article-45818785')
  ])
    .setTimeout(timeout)
    .fill(renterName + " " + date);

  // Remplir la date
  await puppeteer.Locator.race([
    page.locator('#gDate input'),
    page.locator('::-p-xpath(//*[@id=\\"gDate\\"]/div[2]/div/div/div[1]/div/input)'),
    page.locator(':scope >>> #gDate input'),
    page.locator('::-p-text(JJ/MM/AAAA)')
  ])
    .setTimeout(timeout)
    .fill(date);

  // Cliquer sur "Importer"
  await puppeteer.Locator.race([
    page.locator('::-p-aria(publish Importer)'),
    page.locator('#g8266dd9078dd799027adbb0908505247'),
    page.locator('::-p-xpath(//*[@id=\\"g8266dd9078dd799027adbb0908505247\\"])'),
    page.locator(':scope >>> #g8266dd9078dd799027adbb0908505247'),
    page.locator('::-p-text(publishImporterLoading...)')
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
    page.locator('::-p-xpath(//*[@id=\\"pdfmaker-button-import\\"]/span)'),
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
  await runAhkScript(config.files.importScriptName, `${path.resolve(filePath)}`);

  // Cliquer sur "Confirmer"
  await puppeteer.Locator.race([
    page.locator('::-p-aria(Confirmer)'),
    page.locator('#g303a74098e356909ffcf68b9bd4ca1b0'),
    page.locator('::-p-xpath(//*[@id=\\"g303a74098e356909ffcf68b9bd4ca1b0\\"])'),
    page.locator(':scope >>> #g303a74098e356909ffcf68b9bd4ca1b0'),
    page.locator('::-p-text(ConfirmerLoading...)')
  ])
    .setTimeout(longTimeout)
    .click({
      offset: {
        x: 20.2874755859375,
        y: 26.3499755859375,
      },
    });

  // // Cliquer sur "Enregistrer"
  // await puppeteer.Locator.race([
  //   page.locator('#g0aea5a3b4fbea02dad40ffdfe0e622b3 > span'),
  //   page.locator('::-p-xpath(//*[@id=\\"g0aea5a3b4fbea02dad40ffdfe0e622b3\\"]/span)'),
  //   page.locator(':scope >>> #g0aea5a3b4fbea02dad40ffdfe0e622b3 > span'),
  //   page.locator('::-p-text(Enregistrer)')
  // ])
  //   .setTimeout(timeout)
  //   .click({
  //     offset: {
  //       x: 18.962493896484375,
  //       y: 6.39996337890625,
  //     },
  //   });

  // // Cliquer sur "Enregistrer" une seconde fois
  // await puppeteer.Locator.race([
  //   page.locator('#g0aea5a3b4fbea02dad40ffdfe0e622b3 > span'),
  //   page.locator('::-p-xpath(//*[@id=\\"g0aea5a3b4fbea02dad40ffdfe0e622b3\\"]/span)'),
  //   page.locator(':scope >>> #g0aea5a3b4fbea02dad40ffdfe0e622b3 > span'),
  //   page.locator('::-p-text(Enregistrer)')
  // ])
  //   .setTimeout(timeout)
  //   .click({
  //     offset: {
  //       x: 18.962493896484375,
  //       y: 6.39996337890625,
  //     },
  //   });


  await clickWhenVisible(page, [
    '#g0aea5a3b4fbea02dad40ffdfe0e622b3 > span',
    '::-p-xpath(//*[@id=\\"g0aea5a3b4fbea02dad40ffdfe0e622b3\\"]/span)',
    ':scope >>> #g0aea5a3b4fbea02dad40ffdfe0e622b3 > span',
    '::-p-text(Enregistrer)'
  ]);
}

module.exports = {
  fillReceiptDataAndImportFile
};