const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { PrismaClient } = require('@prisma/client');

// Use Stealth plugin to avoid bot detection
puppeteer.use(StealthPlugin());

const prisma = new PrismaClient();

// Target URL as requested by user
const KREAM_RANKING_URL = 'https://kream.co.kr/?tab=home_ranking_v2&gender=all_gender&popular_filter=new_product';

// Helper to delay execution
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Random delay helper to mimic human behavior and avoid IP blocking
const randomDelay = () => {
  const ms = Math.floor(1500 + Math.random() * 2000); // 1.5s ~ 3.5s
  return delay(ms);
};

// Helper to parse price string to integer
const parsePrice = (priceStr) => {
  if (!priceStr) return 0;
  const cleaned = priceStr.replace(/[^0-9]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
};

// Simple rule-based helper to infer category from product title
const inferCategory = (title) => {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('card') || lowerTitle.includes('pokemon') || lowerTitle.includes('tcg') || lowerTitle.includes('promo')) {
    return 'tcg';
  }
  if (
    lowerTitle.includes('cap') ||
    lowerTitle.includes('keyring') ||
    lowerTitle.includes('strap') ||
    lowerTitle.includes('top') ||
    lowerTitle.includes('crewneck') ||
    lowerTitle.includes('hoodie') ||
    lowerTitle.includes('jacket') ||
    lowerTitle.includes('t-shirt') ||
    lowerTitle.includes('tee') ||
    lowerTitle.includes('pants') ||
    lowerTitle.includes('bag')
  ) {
    return 'streetwear';
  }
  return 'sneakers'; // Default category
};

// Simple rule-based helper to infer brand from product title
const inferBrand = (title) => {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('nike')) return 'Nike';
  if (lowerTitle.includes('jordan')) return 'Jordan';
  if (lowerTitle.includes('adidas')) return 'Adidas';
  if (lowerTitle.includes('asics')) return 'Asics';
  if (lowerTitle.includes('new balance')) return 'New Balance';
  if (lowerTitle.includes('vans')) return 'Vans';
  if (lowerTitle.includes('supreme')) return 'Supreme';
  if (lowerTitle.includes('peaceminusone')) return 'Peaceminusone';
  if (lowerTitle.includes('pokemon')) return 'Pokemon';
  if (lowerTitle.includes('casetify')) return 'Casetify';
  if (lowerTitle.includes('palace')) return 'Palace';
  if (lowerTitle.includes('stussy')) return 'Stussy';
  if (lowerTitle.includes('yeezy')) return 'Yeezy';
  if (lowerTitle.includes('salomon')) return 'Salomon';
  if (lowerTitle.includes('bape')) return 'BAPE';
  if (lowerTitle.includes('polyteru')) return 'Polyteru';
  if (lowerTitle.includes('oofos')) return 'Oofos';
  if (lowerTitle.includes('iab studio')) return 'IAB Studio';
  
  // Fallback to first word of title
  const firstWord = title.split(' ')[0];
  return firstWord.replace(/[^a-zA-Z가-힣0-9]/g, '') || 'Unknown';
};

/**
 * Scrapes top 30 products from KREAM's popular ranking page and syncs to database
 */
async function scrapeKreamSneakers() {
  console.log('[crawler] Starting KREAM Scraper (Target: Top 30)...');
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
    
    // Optimizing speed and preventing detection by blocking media/css resources
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Set viewport and random user agent
    await page.setViewport({ width: 1280, height: 1000 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36');

    console.log(`[crawler] Navigating to ranking page: ${KREAM_RANKING_URL}`);
    await page.goto(KREAM_RANKING_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for the product list items to load on page
    await page.waitForSelector('.home-ranking-product-item', { timeout: 15000 });

    // Auto-scroll slightly to trigger lazy-load if needed to fetch 30 items
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 150;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight || totalHeight > 3000) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });

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

    const scrapedList = [];

    // Iterate through items to filter and get detailed info
    for (const item of rankingItems) {
      // Target Top 30 items
      if (scrapedList.length >= 30) {
        console.log('[crawler] Successfully collected top 30 products.');
        break;
      }

      console.log(`[crawler] Processing [Rank ${item.rank || 'N/A'}] Item ${item.productId}: ${item.title}`);
      
      try {
        const detailUrl = `https://kream.co.kr/products/${item.productId}`;
        await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
        
        // Wait until document title updates
        let retries = 0;
        let pageTitle = '';
        while (retries < 10) {
          pageTitle = await page.title();
          if (pageTitle && pageTitle !== 'kream.co.kr' && pageTitle !== 'KREAM' && pageTitle.includes('|')) {
            break;
          }
          await delay(200);
          retries++;
        }

        // Extract Brand and Release Price
        const productDetails = await page.evaluate(() => {
          let brand = '';
          const titleParts = document.title.split('|');
          if (titleParts.length >= 2) {
            brand = titleParts[1].trim();
          }

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

        let brand = productDetails.brand && productDetails.brand !== 'Unknown' ? productDetails.brand : inferBrand(item.title);
        const marketPrice = parsePrice(item.priceText);
        let retailPrice = parsePrice(productDetails.retailPriceText);
        
        // Fallback for retail price if it fails to scrape (85% of market price)
        if (retailPrice === 0 && marketPrice > 0) {
          retailPrice = Math.round((marketPrice * 0.85) / 1000) * 1000;
        }
        if (retailPrice === 0) {
          retailPrice = 129000;
        }
        
        const category = inferCategory(item.title);

        console.log(`[crawler] [MATCHED] Rank: ${item.rank} | Category: ${category} | Brand: ${brand} | Title: ${item.title} | Retail: ₩${retailPrice} | Market: ₩${marketPrice}`);

        scrapedList.push({
          kreamProductId: item.productId,
          title: item.title,
          brand: brand,
          category: category,
          retailPrice: retailPrice,
          marketPrice: marketPrice,
          status: 'RELEASED',
        });

        // Anti-bot random delay
        await randomDelay();
      } catch (err) {
        console.error(`[crawler] Failed to fetch details for product ${item.productId}:`, err.message);
      }
    }

    // Save to Database
    console.log(`[crawler] Syncing ${scrapedList.length} products to database...`);
    for (const item of scrapedList) {
      const consensusPrice = item.marketPrice ? item.marketPrice : Math.round(item.retailPrice * 1.15);
      
      await prisma.drop.upsert({
        where: { kreamProductId: item.kreamProductId },
        update: {
          title: item.title,
          brand: item.brand,
          category: item.category,
          marketPrice: item.marketPrice,
          retailPrice: item.retailPrice,
          consensusPrice: consensusPrice,
          status: item.status,
        },
        create: {
          title: item.title,
          brand: item.brand,
          category: item.category,
          retailPrice: item.retailPrice,
          consensusPrice: consensusPrice,
          marketPrice: item.marketPrice,
          status: item.status,
          kreamProductId: item.kreamProductId,
        },
      });
    }

    console.log('[crawler] Database sync complete!');
    return scrapedList;

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
