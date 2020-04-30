const puppeteer = require('puppeteer');
const fs = require('fs');

async function getPageLinks(page, url) {
  await page.goto(url)

  const {links, nextPage} = await page.evaluate(() => {
    const nextPageElement = document.querySelector('.p24_pager .pull-right:not(.text-muted)');
    const nextPage = nextPageElement ? nextPageElement.getAttribute('href') : undefined;

    const links = [
      ...new Set(
        Array.from(
          document.querySelectorAll('.js_resultTile:not(.p24_development) a:not(.p24_thumbnail)')
        ).map((el) => el.getAttribute('href'))
      ),
    ];

    return {
      links,
      nextPage,
    }
  });
  
  let nextPageLinks = [];
  if(nextPage) nextPageLinks = await getPageLinks(page, nextPage);

  return [...links, ...nextPageLinks];
}

(async () => {
  const browser = await puppeteer.launch({headless: false});
  const page = await browser.newPage();

  const url = 'https://www.property24.com/apartments-for-sale/advanced-search/results?sp=s%3d11021%2c11017%26pf%3d2000000%26pt%3d3500000';
  const links = await getPageLinks(page, url);

  fs.writeFileSync('property_urls.json', JSON.stringify(links));

  await browser.close();
})();