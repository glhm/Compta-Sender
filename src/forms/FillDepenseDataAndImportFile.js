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
    description,       // Description (nom du fichier/fournisseur)
    numeroFacture      // Numéro de facture (optionnel)
  } = data;

  const timeout = config.app.defaultTimeout;

  // Cliquer sur "Ajouter"
  await clickWhenVisible(page, [
    '::-p-aria(Ajouter)',
    '#Ajouter',
    'xpath=//*[@id="Ajouter"]',
    ':scope >>> #Ajouter'
  ]);

  // Attendre que le formulaire apparaisse
  await new Promise(resolve => setTimeout(resolve, 500));

  // === LOGEMENT ===
  // Cliquer sur le select du logement
  await puppeteer.Locator.race([
    page.locator('table form > div > div:nth-of-type(1) select'),
    page.locator('::-p-xpath(//*[@id="Logement.Oid"])'),
    page.locator(':scope >>> table form > div > div:nth-of-type(1) select')
  ])
    .setTimeout(timeout)
    .click({
      offset: { x: 186.41250610351562, y: 20 }
    });

  // Remplir le logement
  await puppeteer.Locator.race([
    page.locator('table form > div > div:nth-of-type(1) select'),
    page.locator('::-p-xpath(//*[@id="Logement.Oid"])'),
    page.locator(':scope >>> table form > div > div:nth-of-type(1) select')
  ])
    .setTimeout(timeout)
    .fill(String(propertyId));

  // === CATEGORIE ===
  // Cliquer sur le select de la catégorie
  await puppeteer.Locator.race([
    page.locator('table form > div > div:nth-of-type(2) select'),
    page.locator('::-p-xpath(//*[@id="Article.Oid"])'),
    page.locator(':scope >>> table form > div > div:nth-of-type(2) select')
  ])
    .setTimeout(timeout)
    .click({
      offset: { x: 116.41250610351562, y: 16 }
    });

  // Remplir la catégorie
  await puppeteer.Locator.race([
    page.locator('table form > div > div:nth-of-type(2) select'),
    page.locator('::-p-xpath(//*[@id="Article.Oid"])'),
    page.locator(':scope >>> table form > div > div:nth-of-type(2) select')
  ])
    .setTimeout(timeout)
    .fill(String(categoryId));

  // === MONTANT TTC ===
  // Cliquer sur le champ montant
  await puppeteer.Locator.race([
    page.locator('#gTTC-montant input'),
    page.locator('::-p-xpath(//*[@id="gTTC-montant"]/div[2]/div/input)'),
    page.locator(':scope >>> #gTTC-montant input')
  ])
    .setTimeout(timeout)
    .click({
      offset: { x: 31.412506103515625, y: 9 }
    });

  // Remplir le montant
  await puppeteer.Locator.race([
    page.locator('#gTTC-montant input'),
    page.locator('::-p-xpath(//*[@id="gTTC-montant"]/div[2]/div/input)'),
    page.locator(':scope >>> #gTTC-montant input')
  ])
    .setTimeout(timeout)
    .fill(String(montantTTC));

  // === LIBELLE / DESCRIPTION ===
  if (description) {
    // Cliquer sur le champ libellé
    await puppeteer.Locator.race([
      page.locator('::-p-aria(Commentaire)'),
      page.locator('#Libelle'),
      page.locator('::-p-xpath(//*[@id="Libelle"])'),
      page.locator(':scope >>> #Libelle')
    ])
      .setTimeout(timeout)
      .click({
        offset: { x: 55.412506103515625, y: 23 }
      });

    // Remplir le libellé
    await puppeteer.Locator.race([
      page.locator('::-p-aria(Commentaire)'),
      page.locator('#Libelle'),
      page.locator('::-p-xpath(//*[@id="Libelle"])'),
      page.locator(':scope >>> #Libelle')
    ])
      .setTimeout(timeout)
      .fill(description);
  }

  // === DATE ===
  // Cliquer sur le champ date
  await puppeteer.Locator.race([
    page.locator('#gDate input'),
    page.locator('::-p-xpath(//*[@id="gDate"]/div[2]/div/div/div[1]/div/input)'),
    page.locator(':scope >>> #gDate input'),
    page.locator('::-p-text(JJ/MM/AAAA)')
  ])
    .setTimeout(timeout)
    .click({
      offset: { x: 28.412506103515625, y: 12 }
    });

  // Remplir la date
  await puppeteer.Locator.race([
    page.locator('#gDate input'),
    page.locator('::-p-xpath(//*[@id="gDate"]/div[2]/div/div/div[1]/div/input)'),
    page.locator(':scope >>> #gDate input'),
    page.locator('::-p-text(JJ/MM/AAAA)')
  ])
    .setTimeout(timeout)
    .fill(date);

  // === NUMERO DE FACTURE (optionnel) ===
  if (numeroFacture) {
    // Cliquer sur le champ numéro de facture
    await puppeteer.Locator.race([
      page.locator('::-p-aria(Numéro de facture)'),
      page.locator('#NumeroFacture'),
      page.locator('::-p-xpath(//*[@id="NumeroFacture"])'),
      page.locator(':scope >>> #NumeroFacture')
    ])
      .setTimeout(timeout)
      .click({
        offset: { x: 62.412506103515625, y: 23 }
      });

    // Remplir le numéro
    await puppeteer.Locator.race([
      page.locator('::-p-aria(Numéro de facture)'),
      page.locator('#NumeroFacture'),
      page.locator('::-p-xpath(//*[@id="NumeroFacture"])'),
      page.locator(':scope >>> #NumeroFacture')
    ])
      .setTimeout(timeout)
      .fill(numeroFacture);
  }

  // === IMPORTER ===
  await clickWhenVisible(page, [
    '#g8266dd9078dd799027adbb0908505247',
    '::-p-aria(publish Importer)',
    '::-p-xpath(//*[@id="g8266dd9078dd799027adbb0908505247"])',
    ':scope >>> #g8266dd9078dd799027adbb0908505247',
    '::-p-text(publishImporterLoading...)'
  ]);
  await new Promise(resolve => setTimeout(resolve, 800));

  // === IMPORTER DES FICHIERS ===
  await clickWhenVisible(page, [
    '#pdfmaker-button-import',
    '::-p-aria(publish Importer des fichiers)',
    '::-p-xpath(//*[@id="pdfmaker-button-import"])',
    ':scope >>> #pdfmaker-button-import',
    '::-p-text(publish Importer)'
  ]);
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Exécuter le script AHK
  await runAhkScript(config.files.importScriptName, `${path.resolve(pdfPath)}`);

  // Attendre que le fichier soit importé
  await new Promise(resolve => setTimeout(resolve, 3000));

  // === CONFIRMER ===
  await clickWhenVisible(page, [
    '#g303a74098e356909ffcf68b9bd4ca1b0',
    '::-p-aria(Confirmer)',
    '::-p-xpath(//*[@id="g303a74098e356909ffcf68b9bd4ca1b0"])',
    ':scope >>> #g303a74098e356909ffcf68b9bd4ca1b0',
    '::-p-text(ConfirmerLoading...)'
  ]);

  // === ENREGISTRER ===
  await clickWhenVisible(page, [
    '#g0aea5a3b4fbea02dad40ffdfe0e622b3 > span',
    '::-p-xpath(//*[@id="g0aea5a3b4fbea02dad40ffdfe0e622b3"]/span)',
    ':scope >>> #g0aea5a3b4fbea02dad40ffdfe0e622b3 > span',
    '::-p-text(Enregistrer)'
  ]);
  
  // Attendre la fermeture du modal
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
  
  // Attendre que le bouton Ajouter soit de nouveau visible
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
  
  // Délai supplémentaire
  await new Promise(resolve => setTimeout(resolve, 500));
}

module.exports = {
  fillDepenseDataAndImportFile
};
