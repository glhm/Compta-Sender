const puppeteer = require('puppeteer-core');
const config = require('../config/Config');

/**
 * Se connecte au site de comptabilité
 * @returns {Promise<{browser: Browser, page: Page}>} Le navigateur et la page ouverte
 */
async function login() {
  const browser = await puppeteer.launch({
    executablePath: config.paths.chromeExecutable,
    headless: false,
    slowMo: 1,
    args: ['--start-maximized'],
  });

  const page = await browser.newPage();

  // Configuration de la vue
  await page.setViewport({
    width: 666,
    height: 728
  });

  // Navigation vers la page de connexion
  await page.goto('https://app.jedeclaremonmeuble.com/myspace/login');

  // Remplir le champ email
  await puppeteer.Locator.race([
    page.locator('::-p-aria(Email)'),
    page.locator('div:nth-of-type(1) > input'),
    page.locator('::-p-xpath(//*[@id=\\"root\\"]/div[2]/div[2]/div[2]/div/div[1]/div[1]/div/form/div[1]/input)'),
    page.locator(':scope >>> div:nth-of-type(1) > input')
  ])
    .setTimeout(config.app.defaultTimeout)
    .fill(config.credentials.email);

  // Remplir le champ mot de passe
  await puppeteer.Locator.race([
    page.locator('::-p-aria(Mot de passe)'),
    page.locator('div:nth-of-type(2) > input'),
    page.locator('::-p-xpath(//*[@id=\\"root\\"]/div[2]/div[2]/div[2]/div/div[1]/div[1]/div/form/div[2]/input)'),
    page.locator(':scope >>> div:nth-of-type(2) > input')
  ])
    .setTimeout(config.app.defaultTimeout)
    .fill(process.env[config.credentials.passwordEnvVar]);

  // Cliquer sur le bouton de connexion
  await puppeteer.Locator.race([
    page.locator('#g65ffd02af9f2589f99fbf88ec730060f > span'),
    page.locator('::-p-xpath(//*[@id=\\"g65ffd02af9f2589f99fbf88ec730060f\\"]/span)'),
    page.locator(':scope >>> #g65ffd02af9f2589f99fbf88ec730060f > span')
  ])
    .setTimeout(config.app.defaultTimeout)
    .click({
      offset: {
        x: 20.637496948242188,
        y: 14.5999755859375,
      },
    });

  return { browser, page };
}

module.exports = {
  login
};