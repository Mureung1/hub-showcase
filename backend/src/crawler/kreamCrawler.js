const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { PrismaClient } = require('@prisma/client');

// Use Stealth plugin to avoid bot detection
puppeteer.use(StealthPlugin());

const prisma = new PrismaClient();

const KREAM_RANKING_URL = 'https://kream.co.kr/?tab=home_ranking_v2&popular_filter=new_product';

// Helper to delay execution
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper to parse price string to integer
const parsePrice = (priceStr) => {
  if (!priceStr) return 0;
  const cleaned = priceStr.replace(/[^0-9]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
};

/**
 * Scrapes top sneakers from KREAM's ranking page and syncs to database
 */
async function scrapeKreamSneakers() {
  console.log('[crawler] Starting KREAM Scraper...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  try {
    const page = await browser.newPage();
    
    // Set viewport and random user agent
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');

    console.log(`[crawler] Navigating to ${KREAM_RANKING_URL}`);
    await page.goto(KREAM_RANKING_URL, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for the product list items to load
    await page.waitForSelector('.home-ranking-product-item', { timeout: 15000 });

    // Extract item list basic details
    const rankingItems = await page.evaluate(() => {
      const items = [];
      const elements = document.querySelectorAll('.home-ranking-product-item');
      
      elements.forEach((el) => {
        const href = el.getAttribute('href');
        if (!href) return;
        
        // Extract product ID from href (e.g., /products/978283)
        const idMatch = href.match(/\/products\/(\d+)/);
        const productId = idMatch ? idMatch[1] : null;

        // Rank info
        const rankEl = el.querySelector('div > section:nth-child(1) p');
        const rank = rankEl ? rankEl.innerText.trim() : '';

        // Product Name
        const nameEl = el.querySelector('div > section:nth-child(2) p');
        const title = nameEl ? nameEl.innerText.trim() : '';

        // Price (Current transaction price on list page)
        const priceEl = el.querySelector('div > section:nth-child(3) p');
        const priceText = priceEl ? priceEl.innerText.trim() : '';

        if (productId) {
          items.push({
            productId,
            rank,
            title,
            priceText,
          });
        }
      });
      return items;
    });

    console.log(`[crawler] Found ${rankingItems.length} items on ranking page.`);

    const sneakersList = [];

    // Iterate through items to filter by category (Sneakers) and get detailed info
    for (const item of rankingItems) {
      if (sneakersList.length >= 10) {
        console.log('[crawler] Successfully collected top 10 sneakers.');
        break;
      }

      console.log(`[crawler] Checking item ${item.productId}: ${item.title}`);
      
      try {
        const detailUrl = `https://kream.co.kr/products/${item.productId}`;
        // Use networkidle2 to ensure full React hydration
        await page.goto(detailUrl, { waitUntil: 'networkidle2', timeout: 20000 });
        
        // Wait until document title updates from default "kream.co.kr" or "KREAM"
        let retries = 0;
        let pageTitle = '';
        while (retries < 15) {
          pageTitle = await page.title();
          if (pageTitle && pageTitle !== 'kream.co.kr' && pageTitle !== 'KREAM' && pageTitle.includes('|')) {
            break;
          }
          await delay(400);
          retries++;
        }
        console.log(`[crawler] Page Title for ${item.productId}: "${pageTitle}" (Waited ${retries * 400}ms)`);

        // Wait for dynamic React content to load
        await page.waitForSelector('a[href*="/categories/"]', { timeout: 5000 }).catch((err) => {
          console.log(`[crawler] [DEBUG] Category selector timed out for ${item.productId}: ${err.message}`);
        });
        await page.waitForSelector('.detail_box, .product-right-section', { timeout: 5000 }).catch((err) => {
          console.log(`[crawler] [DEBUG] Detail box selector timed out for ${item.productId}: ${err.message}`);
        });
        
        // Check category first to see if it is a Sneaker/Shoe
        const categoryResult = await page.evaluate(() => {
          const catLinks = Array.from(document.querySelectorAll('a'));
          const linksInfo = catLinks
            .map(link => ({
              href: link.getAttribute('href') || '',
              text: link.innerText.trim()
            }))
            .filter(l => l.href.includes('categor') || l.text.includes('신발') || l.text.includes('스니커즈'));

          const match = catLinks.some(link => {
            const href = link.getAttribute('href') || '';
            const text = link.innerText.trim();
            return href.includes('/categories/44') || text.includes('신발') || text.includes('스니커즈') || text.includes('Sneakers');
          });

          return { match, linksInfo };
        });

        console.log(`[crawler] Item ${item.productId} Category Info:`, JSON.stringify(categoryResult.linksInfo));

        if (!categoryResult.match) {
          console.log(`[crawler] Skipping item ${item.productId} (Not a sneakers category)`);
          await delay(1500);
          continue;
        }

        // Extract Brand, Release Price, and Official title
        const productDetails = await page.evaluate(() => {
          // Get Brand Name from title: "[Product Name] | [Brand] | KREAM"
          let brand = '';
          const titleParts = document.title.split('|');
          if (titleParts.length >= 2) {
            brand = titleParts[1].trim();
          }

          // Release price
          let retailPriceText = '';
          const details = Array.from(document.querySelectorAll('.detail_box .detail_item, .product-right-section p'));
          for (const el of details) {
            const txt = el.innerText;
            if (txt.includes('발매가') || txt.includes('Release Price')) {
              retailPriceText = txt;
              break;
            }
          }

          return { brand, retailPriceText };
        });

        const brand = productDetails.brand || 'Unknown';
        const retailPrice = parsePrice(productDetails.retailPriceText);
        const marketPrice = parsePrice(item.priceText);

        console.log(`[crawler] [SNEAKERS MATCH] ID: ${item.productId} | Brand: ${brand} | Title: ${item.title} | Retail: ₩${retailPrice} | Market: ₩${marketPrice}`);

        sneakersList.push({
          kreamProductId: item.productId,
          title: item.title,
          brand: brand,
          category: 'sneakers',
          retailPrice: retailPrice,
          marketPrice: marketPrice,
          status: 'RELEASED',
        });

        // Polite delay to avoid IP blocking
        await delay(2000);
      } catch (err) {
        console.error(`[crawler] Failed to fetch details for product ${item.productId}:`, err.message);
      }
    }

    // Save to Database
    console.log(`[crawler] Syncing ${sneakersList.length} sneakers to database...`);
    for (const sneaker of sneakersList) {
      await prisma.drop.upsert({
        where: { kreamProductId: sneaker.kreamProductId },
        update: {
          title: sneaker.title,
          brand: sneaker.brand,
          marketPrice: sneaker.marketPrice,
          retailPrice: sneaker.retailPrice,
          status: sneaker.status,
        },
        create: {
          title: sneaker.title,
          brand: sneaker.brand,
          category: sneaker.category,
          retailPrice: sneaker.retailPrice,
          marketPrice: sneaker.marketPrice,
          status: sneaker.status,
          kreamProductId: sneaker.kreamProductId,
        },
      });
    }

    console.log('[crawler] Database sync complete!');
    return sneakersList;

  } catch (error) {
    console.error('[crawler] Scrape process crashed:', error);
    throw error;
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

// Allows standalone execution
if (require.main === module) {
  scrapeKreamSneakers()
    .then((data) => {
      console.log(`[crawler] Standalone run finished. Scraped ${data.length} items.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('[crawler] Standalone run failed:', err);
      process.exit(1);
    });
}

module.exports = { scrapeKreamSneakers };
