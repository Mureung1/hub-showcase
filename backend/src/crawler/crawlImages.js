const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

async function run() {
  console.log('[scraper] Launching browser to scrape real KREAM Top 30 images...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1280,1000'
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1000 });
    
    // Mask webdriver
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    const url = 'https://kream.co.kr/?tab=home_ranking_v2&gender=all_gender&popular_filter=all';
    console.log('[scraper] Navigating to ' + url);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });

    console.log('[scraper] Waiting for home-ranking-product-item...');
    await page.waitForSelector('.home-ranking-product-item', { timeout: 30000 });

    // Scroll to lazy load images
    console.log('[scraper] Scrolling page to load list images...');
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 300;
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight > 3000) {
            clearInterval(timer);
            resolve();
          }
        }, 150);
      });
    });

    // Extract genuine items with their raw real image URLs
    const items = await page.evaluate(() => {
      const cards = document.querySelectorAll('.home-ranking-product-item');
      const data = [];
      cards.forEach((card, i) => {
        if (i < 30) {
          const title = card.querySelector('.title')?.innerText || '';
          const brand = card.querySelector('.brand')?.innerText || '';
          const priceText = card.querySelector('.price')?.innerText || '';
          
          // Locate image
          const imgEl = card.querySelector('img');
          const imageUrl = imgEl ? imgEl.src : '';
          data.push({ rank: i + 1, brand, title, priceText, imageUrl });
        }
      });
      return data;
    });

    console.log(`[scraper] Scraped ${items.length} items successfully.`);
    const outputFilePath = path.join(__dirname, 'kream_real_top30.json');
    fs.writeFileSync(outputFilePath, JSON.stringify(items, null, 2));
    console.log('[scraper] Wrote data to ' + outputFilePath);
    
    // Print first 5 items to check
    console.log('--- SAMPLE SCRAPE ---');
    console.log(items.slice(0, 5));
    console.log('---------------------');

  } catch (err) {
    console.error('[scraper] Scraping crashed:', err);
  } finally {
    await browser.close();
  }
}

run();
