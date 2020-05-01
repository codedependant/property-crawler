// const puppeteer = require('puppeteer');
const numeral = require('numeral');
const { URL } = require('url');
const fse = require('fs-extra'); // v 5.0.0
const path = require('path');
const _ = require('lodash');
const fs = require('fs');
// const randomUA = require('modern-random-ua');
const puppeteer = require('puppeteer-extra')
 
// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

// function getLabelNode(label) {
//   const node = document.evaluate(`//div[text()='${label}']`, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
//   if(!node) return;
//   return node.singleNodeValue
// }

// function getLabelValue(node) {
//   return node.nextElementSibling.textContent.trim()
// }

// function getOverviewValue(label) {
//   const node = getLabelNode(label);
//   if(!node) return;
//   return getLabelValue(node);
// }


async function getPropertyData (page, url) {
 await page.goto(url);

  // let bodyHTML = await page.evaluate(() => document.documentElement.outerHTML);
  
  // let filePath = path.resolve(`./cache.html`);
  // await fse.outputFile(filePath, bodyHTML);


  const data = await page.evaluate(() => {
    const priceElement = document.querySelector('.js_listingPanel .p24_price');
    const price = priceElement.innerText;

    const area = document.querySelector('#breadCrumbContainer li:nth-child(10)').innerText.trim()

    const propertyOverview = Array.from(
      document.querySelectorAll('.p24_propertyOverviewRow .p24_propertyOverviewKey')
    ).reduce((memo, node) => ({
      ...memo,
      ...{ [node.innerText.trim()]: node.nextElementSibling.innerText.trim() },
    }));

    const propertyFeatures = Array.from(
      document.querySelectorAll('.p24_keyFeaturesContainer .p24_feature')
    ).reduce((memo, node) => ({
      ...memo,
      ...{ [node.innerText.trim().replace(':', '')]: node.nextElementSibling ? node.nextElementSibling.innerText.trim() : 'Yes' },
    }));

    
    // const floorSize = getOverviewValue('Floor Size');
    // const priceBySize = getOverviewValue('Price per m²');

    return {
      'Area': area,
      'Price': price,
      ...propertyFeatures,
      ...propertyOverview,
    };
  });


  const formattedData = formatData({url, ...data});
  console.log('CHE: getPropertyData -> formattedData', formattedData);

  return formattedData;
}

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

const numeralKeys = [
  'Price',
  'Garages',
  'Floor ',
  'Floor Size',
  'Price ',
  'Levies',
  'Rates ',
  'Bedrooms',
  'Bathrooms',
  'Lounges',
  'Garage',
]

function formatData(data) {
  const formattedData = numeralKeys.reduce(
    (memo, key) => !data[key] ? memo : ({
      ...memo,
      ...{
        [`Formatted ${key}`]: numeral(data[key]).value(),
      },
    }),
    {}
  );

  const calculatedPriceBySize =
    formattedData['Formatted Price'] && formattedData['Formatted Floor Size']
      ? Math.round(formattedData['Formatted Price'] / formattedData['Formatted Floor Size'])
      : 0;

  const calculatedRatesLevies =
    formattedData['Rates and Taxes'] && formattedData['Levies']
      ? Math.round(formattedData['Rates and Taxes'] + formattedData['Levies'])
      : 0;

  return {
    ...formattedData,
    ...data,
    'Calculated Price per m²': calculatedPriceBySize,
    'Caclulated Rates and Levies': calculatedRatesLevies,
  };
}

const waitFor = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const urls = JSON.parse(fs.readFileSync('property_urls.json'));
  let existingPropertyData = [];
  try {
    existingPropertyData = JSON.parse(fs.readFileSync('property_data.json'));
  } catch(e){
    console.log('no file');
  }

  const unextractedUrls = urls.filter(url => !existingPropertyData.find(property => property.url === url));
  console.log('CHE: unextractedUrls', unextractedUrls);
  const propertiesData = existingPropertyData;

  const browser = await puppeteer.launch({headless: false});
  const page = await browser.newPage();


  await asyncForEach(unextractedUrls, async (path) => {
    const url = `https://www.property24.com${path}`;
    try {
      await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36');
      const data = await getPropertyData(page, url);
      propertiesData.push(data);
      fs.writeFileSync('property_data.json', JSON.stringify(propertiesData));
    } catch(error) {
      console.log(url, error.message);
    }
    await waitFor(15000 + Math.random() * 15000);
  });

  // const url = 'https://www.property24.com/for-sale/de-waterkant/cape-town/western-cape/9141/106333954';
  // const data = await getPropertyData(page, url);
  // console.log('CHE: data', data);

  fs.writeFileSync('property_data.json', JSON.stringify(propertiesData));

  await browser.close();
})();