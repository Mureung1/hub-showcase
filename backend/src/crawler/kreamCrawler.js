const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { PrismaClient } = require('@prisma/client');

// Use Stealth plugin to avoid bot detection
puppeteer.use(StealthPlugin());

const prisma = new PrismaClient();

const KREAM_RANKING_URL = 'https://kream.co.kr/?tab=home_ranking_v2&gender=all_gender&popular_filter=all';

// Helper to delay execution
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper to parse price string to integer
const parsePrice = (priceStr) => {
  if (!priceStr) return 0;
  
  // Check if string contains "만" (Korean ten-thousand multiplier)
  if (priceStr.includes('만')) {
    // Extract decimal/number before "만" (e.g. "9.5", "50", "9")
    const match = priceStr.match(/([0-9.]+)/);
    if (match) {
      const num = parseFloat(match[1]);
      return Math.round(num * 10000);
    }
  }
  
  const cleaned = priceStr.replace(/[^0-9]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
};

// Simple rule-based helper to infer category from product title
const inferCategory = (title) => {
  const lowerTitle = title.toLowerCase();
  
  // 1. TCG / Card / Boardgames
  if (lowerTitle.includes('card') || lowerTitle.includes('pokemon') || lowerTitle.includes('tcg') || lowerTitle.includes('promo')) {
    return 'tcg';
  }
  
  // 2. Accessories (악세서리)
  if (
    lowerTitle.includes('keyring') ||
    lowerTitle.includes('strap') ||
    lowerTitle.includes('bag') ||
    lowerTitle.includes('backpack') ||
    lowerTitle.includes('wallet') ||
    lowerTitle.includes('cap') ||
    lowerTitle.includes('hat') ||
    lowerTitle.includes('socks') ||
    lowerTitle.includes('belt') ||
    lowerTitle.includes('watch') ||
    lowerTitle.includes('glasses') ||
    lowerTitle.includes('case')
  ) {
    return 'accessories';
  }
  
  // 3. Collectibles / Figures / LEGO / Ornaments (장신구, 피규어, 굿즈)
  if (
    lowerTitle.includes('figure') ||
    lowerTitle.includes('toy') ||
    lowerTitle.includes('lego') ||
    lowerTitle.includes('brick') ||
    lowerTitle.includes('bearbrick') ||
    lowerTitle.includes('plush') ||
    lowerTitle.includes('doll') ||
    lowerTitle.includes('popcorn') ||
    lowerTitle.includes('sweet') ||
    lowerTitle.includes('poster')
  ) {
    return 'collectibles';
  }
  
  // 4. Streetwear / Apparel (의류)
  if (
    lowerTitle.includes('top') ||
    lowerTitle.includes('crewneck') ||
    lowerTitle.includes('hoodie') ||
    lowerTitle.includes('jacket') ||
    lowerTitle.includes('t-shirt') ||
    lowerTitle.includes('tee') ||
    lowerTitle.includes('pants') ||
    lowerTitle.includes('shorts') ||
    lowerTitle.includes('sweater') ||
    lowerTitle.includes('shirt') ||
    lowerTitle.includes('vest') ||
    lowerTitle.includes('coat') ||
    lowerTitle.includes('jersey')
  ) {
    return 'streetwear';
  }
  
  // 5. Sneakers / Shoes (신발)
  return 'sneakers';
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
 * Scrapes top 30 products from KREAM's popular ranking page and syncs directly to database.
 * Performance Optimized: Avoids visiting 30 individual product pages, running in just a few seconds.
 */
async function scrapeKreamSneakers() {
  console.log('[crawler] Starting KREAM Scraper (Optimized List Sync)...');
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  try {
    const page = await browser.newPage();
    
    // We load styles/images for list view to guarantee React rendering and lazy loading trigger

    // Set viewport and user agent
    await page.setViewport({ width: 1280, height: 1200 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36');

    console.log(`[crawler] Navigating to KREAM Ranking: ${KREAM_RANKING_URL}`);
    await page.goto(KREAM_RANKING_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for the product list items to load on page
    await page.waitForSelector('.home-ranking-product-item', { timeout: 35000 });

    // Auto-scroll to load at least 30 items
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 250;
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight > 2500) {
            clearInterval(timer);
            resolve();
          }
        }, 80);
      });
    });

    // Extract items directly from the list page (including list images)
    const rankingItems = await page.evaluate(() => {
      const items = [];
      const elements = document.querySelectorAll('.home-ranking-product-item');
      
      elements.forEach((el) => {
        const href = el.getAttribute('href');
        if (!href) return;
        
        const idMatch = href.match(/\/products\/(\d+)/);
        const productId = idMatch ? idMatch[1] : null;

        const rankEl = el.querySelector('div > section:nth-child(1) p');
        const rank = rankEl ? rankEl.innerText.trim() : '';

        const nameEl = el.querySelector('div > section:nth-child(2) p');
        const title = nameEl ? nameEl.innerText.trim() : '';

        const priceEl = el.querySelector('div > section:nth-child(3) p');
        const priceText = priceEl ? priceEl.innerText.trim() : '';

        // Extract list image URL
        const imgEl = el.querySelector('.product-img img, picture img, img.image, img');
        const imageUrl = imgEl ? (imgEl.getAttribute('data-src') || imgEl.getAttribute('src') || imgEl.src) : '';

        if (productId) {
          items.push({
            productId,
            rank,
            title,
            priceText,
            imageUrl
          });
        }
      });
      return items;
    });

    console.log(`[crawler] Found ${rankingItems.length} items on ranking page.`);

    const targetList = rankingItems.slice(0, 30);
    console.log(`[crawler] Syncing top ${targetList.length} products directly to DB...`);

    for (const item of targetList) {
      const marketPrice = parsePrice(item.priceText);
      // Fallback: estimate retail price as 85% of market price
      let retailPrice = Math.round((marketPrice * 0.85) / 1000) * 1000;
      if (retailPrice === 0) retailPrice = 129000;

      const brand = inferBrand(item.title);
      const category = inferCategory(item.title);
      const consensusPrice = marketPrice ? marketPrice : Math.round(retailPrice * 1.15);

      console.log(`[crawler] [SYNC] Rank: ${item.rank} | Brand: ${brand} | Title: ${item.title} | Market: ₩${marketPrice} | Image: ${item.imageUrl ? 'Yes' : 'No'}`);

      await prisma.drop.upsert({
        where: { kreamProductId: item.productId },
        update: {
          title: item.title,
          brand: brand,
          category: category,
          marketPrice: marketPrice,
          retailPrice: retailPrice,
          consensusPrice: consensusPrice,
          imageUrl: item.imageUrl || null,
          status: 'RELEASED',
        },
        create: {
          title: item.title,
          brand: brand,
          category: category,
          retailPrice: retailPrice,
          consensusPrice: consensusPrice,
          marketPrice: marketPrice,
          imageUrl: item.imageUrl || null,
          status: 'RELEASED',
          kreamProductId: item.productId,
        },
      });
    }

    // Clean up out-of-ranking products (released drops that are not in the new top 30)
    const activeProductIds = targetList.map(item => item.productId);
    const dropsToDelete = await prisma.drop.findMany({
      where: {
        status: 'RELEASED',
        kreamProductId: {
          notIn: activeProductIds
        }
      },
      select: { id: true }
    });

    const deleteIds = dropsToDelete.map(d => d.id);
    if (deleteIds.length > 0) {
      console.log(`[crawler] Cleaning up ${deleteIds.length} out-of-ranking released products...`);
      // Delete votes related to those drops first to avoid foreign key issues
      await prisma.vote.deleteMany({
        where: {
          dropId: { in: deleteIds }
        }
      });
      // Delete drops
      await prisma.drop.deleteMany({
        where: {
          id: { in: deleteIds }
        }
      });
      console.log(`[crawler] Cleaned up ${deleteIds.length} drops.`);
    }

    console.log('[crawler] Popular products sync completed.');
    return targetList;

  } catch (error) {
    console.error('[crawler] Scrape process crashed:', error);
    throw error;
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

/**
 * Scrapes upcoming products from KREAM's calendar page and syncs directly to DB
 */
async function scrapeKreamUpcoming() {
  console.log('[crawler] Starting KREAM Upcoming Scraper...');
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1000 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36');

    const calendarUrl = 'https://kream.co.kr/calendar';
    console.log(`[crawler] Navigating to calendar page: ${calendarUrl}`);
    await page.goto(calendarUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    try {
      await page.waitForSelector('.product_card, .calendar-product-item', { timeout: 10000 });
    } catch (e) {
      console.log('[crawler] Calendar elements not found (probably empty or slow). Skipping dynamic upcoming scrape.');
      return [];
    }

    const upcomingItems = await page.evaluate(() => {
      const items = [];
      const cards = document.querySelectorAll('.product_card, .calendar-product-item');
      cards.forEach((el) => {
        const titleEl = el.querySelector('.name, .product_name, p');
        const title = titleEl ? titleEl.innerText.trim() : '';
        const href = el.querySelector('a')?.getAttribute('href') || '';
        const idMatch = href.match(/\/products\/(\d+)/);
        const productId = idMatch ? idMatch[1] : null;

        // Image
        const imgEl = el.querySelector('img');
        const imageUrl = imgEl ? (imgEl.getAttribute('data-src') || imgEl.src) : '';

        // Release Price
        const priceEl = el.querySelector('.price, .retail_price');
        const priceText = priceEl ? priceEl.innerText.trim() : '';

        if (title && productId) {
          items.push({
            productId,
            title,
            imageUrl,
            priceText,
          });
        }
      });
      return items.slice(0, 10);
    });

    console.log(`[crawler] Found ${upcomingItems.length} upcoming items.`);
    
    const syncedUpcoming = [];
    for (const item of upcomingItems) {
      const retailPrice = parsePrice(item.priceText) || 159000;
      const category = inferCategory(item.title);
      const brand = inferBrand(item.title);

      await prisma.drop.upsert({
        where: { kreamProductId: item.productId },
        update: {
          title: item.title,
          brand: brand,
          category: category,
          retailPrice: retailPrice,
          imageUrl: item.imageUrl || null,
          status: 'UPCOMING',
        },
        create: {
          title: item.title,
          brand: brand,
          category: category,
          retailPrice: retailPrice,
          imageUrl: item.imageUrl || null,
          status: 'UPCOMING',
          kreamProductId: item.productId,
        },
      });
      syncedUpcoming.push(item);
    }
    return syncedUpcoming;
  } catch (error) {
    console.error('[crawler] Upcoming scrape failed:', error.message);
    return [];
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

// Allows standalone execution
if (require.main === module) {
  (async () => {
    try {
      const sneakers = await scrapeKreamSneakers();
      console.log(`[crawler] Scraped ${sneakers.length} released sneakers.`);
      try {
        const upcoming = await scrapeKreamUpcoming();
        console.log(`[crawler] Scraped ${upcoming.length} upcoming items.`);
      } catch (err) {
        console.error('[crawler] Upcoming scrape skipped or failed:', err.message);
      }
      process.exit(0);
    } catch (err) {
      console.error('[crawler] Scraper pipeline failed:', err);
      process.exit(1);
    }
  })();
}

module.exports = { scrapeKreamSneakers, scrapeKreamUpcoming };
