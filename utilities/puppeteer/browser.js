const puppeteer = require('puppeteer');
const { getAuthorDataOnFilterPage, getAuthorDataOnBookPage } = require('../helpers/puppeteerHelpers');
const { SELECTORS, FORMAT_OPTIONS } = require('../../constants/puppeteerSelectors');

class Browser {
  constructor() {
    this.browserConfig = {
      defaultViewport: {
        width: 1920,
        height: 1080,
      },
      ignoreDefaultArgs: ['--disable-extensions'],
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'],
    };
    this.browser = undefined;
  }

  async getAuthorsData(page) {
    try {
      const refs = await page.evaluate(getAuthorDataOnBookPage);

      const asins = [];
      const names = refs.map((ref) => {
        if (ref.includes('field-author=')) {
          const splitFilterRef = ref.split('=');

          return splitFilterRef[3].split('&')[0].replace('+', ' ');
        }
      }).filter((el) => el);

      for (const ref of refs) {
        if (!ref.includes('field-author=')) {
          const splitRef = ref.split('/');

          asins.push({
            name: splitRef[1].trim().replace('-', ' '),
            asin: splitRef[3].trim(),
          });
        } else {
          await page.goto(`https://www.amazon.com${ref.trim()}`);
          const data = await page.evaluate(getAuthorDataOnFilterPage, names);

          if (data) {
            asins.push(data);
          }
        }
      }
      const authorsWithousAsins = names.filter((name) => !asins.some((el) => el.name === name));

      return authorsWithousAsins.length ? [...asins, ...authorsWithousAsins.map((el) => ({ name: el }))] : asins;
    } catch (error) {
      console.error(error.message);
      await this.browser.close();
    }
  }

  async close() {
    if (!this.browser) {
      return;
    }

    await this.browser.close();
  }

  async goToObjectPage(url) {
    try {
      if (!this.browser) {
        this.browser = await puppeteer.launch(this.browserConfig);
      }

      const page = await this.browser.newPage();

      await page.setCacheEnabled(false);
      await page.setDefaultNavigationTimeout(30000);
      await page.goto(url);

      return page;
    } catch (error) {
      console.error(error.message);
      await this.browser.close();
    }
  }

  async getObjectName(page) {
    try {
      const title = await page.evaluate(() => {
        const elements = document.getElementsByClassName(SELECTORS.TITLE);

        return elements[0].textContent.trim();
      });

      return title;
    } catch (error) {
      console.error(error.message);
      await this.browser.close();
    }
  }

  async getFormats(page) {
    try {
      const formats = await page.evaluate(() => {
        const elements = document.getElementsByClassName(SELECTORS.FORMATS);
        const buttons = [];

        buttons.push(elements[0]
          .getElementsByClassName(FORMAT_OPTIONS.SELECTED)[0]
          .textContent.trim().split('\n')[0].trim());

        const unselected = elements[0].getElementsByClassName(FORMAT_OPTIONS.NOT_SELECTED);

        for (const el of unselected) {
          buttons.push(el.textContent.trim().split('\n')[0].trim());
        }

        return buttons;
      });

      return formats;
    } catch (error) {
      console.error(error.message);
      await this.browser.close();
    }
  }
}

const puppeteerBrowser = new Browser();

module.exports = {
  puppeteerBrowser,
};
