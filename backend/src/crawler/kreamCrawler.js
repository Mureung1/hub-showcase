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
  
  if (priceStr.includes('만')) {
    const match = priceStr.match(/([0-9.]+)/);
    if (match) {
      const num = parseFloat(match[1]);
      return Math.round(num * 10000);
    }
  }
  
  const cleaned = priceStr.replace(/[^0-9]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
};

// Rule-based helper to infer category from product title
const inferCategory = (title) => {
  const lowerTitle = title.toLowerCase();
  
  // 1. TCG / Card / Boardgames
  if (lowerTitle.includes('card') || lowerTitle.includes('pokemon') || lowerTitle.includes('tcg') || lowerTitle.includes('promo') || lowerTitle.includes('expansion') || lowerTitle.includes('magikarp') || lowerTitle.includes('mewtwo')) {
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
    lowerTitle.includes('case') ||
    lowerTitle.includes('chain') ||
    lowerTitle.includes('tote') ||
    lowerTitle.includes('shopper') ||
    lowerTitle.includes('reusable')
  ) {
    return 'accessories';
  }
  
  // 3. Collectibles / Figures / LEGO / Ornaments / Plush
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
    lowerTitle.includes('poster') ||
    lowerTitle.includes('alien') ||
    lowerTitle.includes('keyring')
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
    lowerTitle.includes('jersey') ||
    lowerTitle.includes('bermuda') ||
    lowerTitle.includes('anthem')
  ) {
    return 'streetwear';
  }
  
  // 5. Sneakers / Shoes / Slides (신발)
  return 'sneakers';
};

// Rule-based helper to infer brand from product title
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
  
  const firstWord = title.split(' ')[0];
  return firstWord.replace(/[^a-zA-Z가-힣0-9]/g, '') || 'Unknown';
};

/**
 * Scrapes top 30 products from KREAM's new product ranking page and syncs directly to database.
 * URL: https://kream.co.kr/?tab=home_ranking_v2&popular_filter=new_product
 */
async function scrapeKreamSneakers() {
  console.log('[crawler] Starting KREAM Scraper for URL:', KREAM_RANKING_URL);
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
      ],
    });
  } catch (e) {
    console.log('[crawler] Launching fallback Chrome...');
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
  }

  try {
    const page = await browser.newPage();

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    await page.setViewport({ width: 1440, height: 900 });
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    console.log(`[crawler] Navigating to: ${KREAM_RANKING_URL}`);
    await page.goto(KREAM_RANKING_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    await delay(6000);

    // Auto-scroll to ensure images & lazy items load
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 300;
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight > 3500) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });

    await delay(2000);

    const rankingItems = await page.evaluate(() => {
      const results = [];
      const elements = document.querySelectorAll('a');
      elements.forEach(el => {
        const href = el.getAttribute('href') || '';
        if (href.includes('/products/')) {
          const productId = href.match(/\/products\/(\d+)/)?.[1];
          if (!productId || results.some(r => r.productId === productId)) return;

          const text = el.innerText.trim();
          const lines = text.split('\n').map(s => s.trim()).filter(Boolean);
          
          let title = '';
          let priceText = '';
          lines.forEach(l => {
            if (l.includes('원')) priceText = l;
            else if (l.length > 5 && !l.includes('거래') && !l.match(/^\d+$/) && !l.includes('%')) {
              if (!title) title = l;
            }
          });

          // Extract image URL
          const img = el.querySelector('img');
          let imageUrl = img ? (img.getAttribute('src') || img.getAttribute('data-src') || img.src) : '';

          const source = el.querySelector('picture source');
          if (!imageUrl && source) {
            const srcset = source.getAttribute('srcset') || '';
            imageUrl = srcset.split(',')[0].trim().split(' ')[0] || '';
          }

          if (title && productId) {
            results.push({ productId, title, priceText, imageUrl });
          }
        }
      });
      return results;
    });

    console.log(`[crawler] Crawled ${rankingItems.length} items from page.`);

    const targetList = rankingItems.slice(0, 30);
    console.log(`[crawler] Syncing top ${targetList.length} products to database...`);

    if (targetList.length > 0) {
      // Purge all old drops and votes for a clean sync
      console.log('[crawler] Purging previous drops & votes for clean top 30 sync...');
      await prisma.vote.deleteMany({});
      await prisma.drop.deleteMany({});

      for (const item of targetList) {
        const marketPrice = parsePrice(item.priceText);
        let retailPrice = Math.round((marketPrice * 0.85) / 1000) * 1000;
        if (retailPrice === 0) retailPrice = 129000;

        const brand = inferBrand(item.title);
        const category = inferCategory(item.title);
        const consensusPrice = marketPrice ? marketPrice : Math.round(retailPrice * 1.15);

        console.log(`[crawler] [SYNC] Title: ${item.title} | Brand: ${brand} | Cat: ${category} | Price: ₩${marketPrice} | Img: ${item.imageUrl ? 'YES' : 'NO'}`);

        // Record price history for the current crawl timestamp only
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayLabel = `${month}/${day}`;
        const basePrice = marketPrice || retailPrice;

        await prisma.drop.create({
          data: {
            kreamProductId: item.productId,
            title: item.title,
            brand: brand,
            category: category,
            retailPrice: retailPrice,
            consensusPrice: consensusPrice,
            marketPrice: marketPrice,
            imageUrl: item.imageUrl || null,
            status: 'RELEASED',
            priceHistories: {
              create: [
                { dateLabel: todayLabel, price: basePrice }
              ]
            }
          },
        });
      }
      console.log('[crawler] Clean top 30 sync complete.');
    } else {
      console.warn('[crawler] No items crawled. Database untouched.');
    }

    return targetList;
  } catch (error) {
    console.error('[crawler] Scrape process crashed:', error);
    throw error;
  } finally {
    if (browser) await browser.close();
    await prisma.$disconnect();
  }
}

// Allows standalone execution
if (require.main === module) {
  (async () => {
    try {
      const items = await scrapeKreamSneakers();
      console.log(`[crawler] Successfully synced ${items.length} items.`);
      process.exit(0);
    } catch (err) {
      console.error('[crawler] Scraper pipeline failed:', err);
      process.exit(1);
    }
  })();
}

module.exports = { scrapeKreamSneakers };
