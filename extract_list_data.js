const puppeteer = require('puppeteer');
const fs = require('fs');
const numeral = require('numeral');



async function getPageLinks(page, url) {
  await page.goto(url);

  const { properties, nextPage } = await page.evaluate(() => {

    const getElementText = (el, selector) =>
      el.querySelector(selector) ? el.querySelector(selector).innerText : undefined;

    const nextPageElement = document.querySelector('.p24_pager .pull-right:not(.text-muted)');
    const nextPage = nextPageElement ? nextPageElement.getAttribute('href') : undefined;

    const properties = Array.from(
      document.querySelectorAll('.js_resultTile:not(.p24_development)')
    ).map((el) => {
      const details = Array.from(el.querySelectorAll('.p24_featureDetails')).reduce(
        (memo, detailEl) => ({
          ...memo,
          ...{ [detailEl.getAttribute('title').toLocaleLowerCase()]: detailEl.innerText.trim() },
        }),
        {}
      );
      
      
      const price = getElementText(el, '.p24_price');
      const size = getElementText(el, '.p24_size');
      const location = getElementText(el, '.p24_location');
      const address = getElementText(el, '.p24_address');
      const urlEl = el.querySelector('a:not(.p24_thumbnail)');
      const href = urlEl ? `https://property24.com/${urlEl.getAttribute('href')}` : undefined;

      return {
        price,
        size,
        ...details,
        location,
        address,
        href,
      };
    });

    return {
      properties,
      nextPage,
    };
  });

  let nextPageProperties = [];
  if(nextPage) nextPageProperties = await getPageLinks(page, nextPage);

  const formattedProperties = properties.map(property => formatProperty(property));

  return [...formattedProperties, ...nextPageProperties];
}

const numeralKeys = [
  'bedrooms',
  'bathrooms',
  'price',
  'parking spaces',
  'size',
]

function formatProperty(property) {
  const formattedData = numeralKeys.reduce(
    (memo, key) => !property[key] ? memo : ({
      ...memo,
      ...{
        [key]: numeral(property[key]).value(),
      },
    }),
    {}
  );

  return {
    ...property,
    ...formattedData,
  };
}

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  const url =
    'https://www.property24.com/for-sale/advanced-search/results?sp=s%3d11021%2c11017%26pf%3d2500000%26pt%3d3500000%26so%3dPriceHigh';
  const properties = await getPageLinks(page, url);

  fs.writeFileSync('property_list_data.json', JSON.stringify(properties));

  await browser.close();
})();
