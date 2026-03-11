const puppeteer = require('puppeteer-core');
const config = require('../config/Config');
const { runAhkScript } = require('../core/AhkRunner');
const path = require('path');
const { clickWhenVisible } = require('../utils/WaitForClickable');  // 🛠️ Import de la fonction utilitaire

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
    propertyId       // ID du logement (nouveau)
  } = data;

  const timeout = config.app.defaultTimeout;
  const longTimeout = config.app.longTimeout;

  await clickWhenVisible(page, [
    '::-p-aria(Ajouter)',
    '#Ajouter',
    'xpath=//*[@id="Ajouter"]',
    ':scope >>> #Ajouter'
  ]);

  // Attendre que le formulaire/modal apparaisse (délai augmenté)
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Sélectionner le logement (bien) - NOUVEAU
  if (propertyId) {
    await puppeteer.Locator.race([
      page.locator('table form > div > div:nth-of-type(1) select'),
      page.locator('::-p-xpath(//*[@id="Logement.Oid"])'),
      page.locator(':scope >>> table form > div > div:nth-of-type(1) select')
    ])
      .setTimeout(timeout)
      .fill(propertyId);
  }

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
  await clickWhenVisible(page, [
    '#g8266dd9078dd799027adbb0908505247',
    '::-p-aria(publish Importer)',
    '::-p-xpath(//*[@id="g8266dd9078dd799027adbb0908505247"])',
    ':scope >>> #g8266dd9078dd799027adbb0908505247',
    '::-p-text(Importer)'
  ]);
  await new Promise(resolve => setTimeout(resolve, 800));

  // Cliquer sur "Importer des"
  await clickWhenVisible(page, [
    '#pdfmaker-button-import',
    '#pdfmaker-button-import > span',
    '::-p-xpath(//*[@id="pdfmaker-button-import"]/span)',
    ':scope >>> #pdfmaker-button-import > span',
    '::-p-text(Importer des)'
  ]);
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Exécuter le script AHK
  await runAhkScript(config.files.importScriptName, `${path.resolve(filePath)}`);
  
  // Attendre que le fichier soit importé (le temps que la fenêtre se ferme et JD2M rafraîchisse)
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Cliquer sur "Confirmer" via clickWhenVisible (plus robuste)
  await clickWhenVisible(page, [
    '#g303a74098e356909ffcf68b9bd4ca1b0',
    '::-p-aria(Confirmer)',
    '::-p-xpath(//*[@id="g303a74098e356909ffcf68b9bd4ca1b0"])',
    ':scope >>> #g303a74098e356909ffcf68b9bd4ca1b0',
    '::-p-text(Confirmer)'
  ]);

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
  
  // Attendre que le modal de confirmation disparaisse complètement
  console.log('   ⏳ Attente de la fermeture du modal...');
  try {
    await page.waitForFunction(() => {
      const modal = document.querySelector('#g303a74098e356909ffcf68b9bd4ca1b0') ||
                    document.querySelector('.modal') ||
                    document.querySelector('[role="dialog"]');
      return !modal || modal.offsetParent === null;
    }, { timeout: 10000 });
    console.log('   ✅ Modal fermé');
  } catch (e) {
    console.log('   ⚠️ Timeout en attendant le modal, on continue...');
  }
  
  // Solution 1 : Attendre que le formulaire d'ajout soit complètement fermé
  // en vérifiant que le bouton "Ajouter" est de nouveau visible
  console.log('   ⏳ Attente de la fermeture du formulaire...');
  try {
    await page.waitForFunction(() => {
      const ajouterBtn = document.querySelector('#Ajouter') ||
                         document.querySelector('[aria-label="Ajouter"]') ||
                         Array.from(document.querySelectorAll('button')).find(btn => 
                           btn.textContent.includes('Ajouter') && btn.offsetParent !== null
                         );
      return ajouterBtn && ajouterBtn.offsetParent !== null;
    }, { timeout: 15000 });
    console.log('   ✅ Formulaire fermé, bouton Ajouter visible');
  } catch (e) {
    console.log('   ⚠️ Timeout en attendant le bouton Ajouter, on continue...');
  }
  
  // Délai supplémentaire pour s'assurer que JD2M a bien tout enregistré
  await new Promise(resolve => setTimeout(resolve, 500));
}

module.exports = {
  fillReceiptDataAndImportFile
};