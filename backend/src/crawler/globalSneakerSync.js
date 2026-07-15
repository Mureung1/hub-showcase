const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// High-fidelity Mock data representing global sneakers for Fallback / Seeding
const MOCK_GLOBAL_SNEAKERS = [
  // UPCOMING SNEAKERS
  {
    title: "travis scott x air jordan 1 low og 'velvet brown'",
    brand: "Nike",
    category: "sneakers",
    status: "UPCOMING",
    retailPrice: 199000,
    consensusPrice: 228000,
    marketPrice: null,
    kreamProductId: "travis-velvet-brown",
    releaseDate: new Date("2026-10-15T09:00:00Z"),
    releaseDateText: "10/15",
    priceChangeRate: null,
    volume: null
  },
  {
    title: "nike kobe 5 protro 'deep royal blue'",
    brand: "Nike",
    category: "sneakers",
    status: "UPCOMING",
    retailPrice: 249000,
    consensusPrice: 286000,
    marketPrice: null,
    kreamProductId: "kobe-5-royal",
    releaseDate: new Date("2026-08-24T09:00:00Z"),
    releaseDateText: "08/24",
    priceChangeRate: null,
    volume: null
  },
  {
    title: "air jordan 4 retro 'fear'",
    brand: "Nike",
    category: "sneakers",
    status: "UPCOMING",
    retailPrice: 279000,
    consensusPrice: 320000,
    marketPrice: null,
    kreamProductId: "aj4-fear-2026",
    releaseDate: new Date("2026-11-09T09:00:00Z"),
    releaseDateText: "11/09",
    priceChangeRate: null,
    volume: null
  },
  {
    title: "supreme x nike clogposite 'black'",
    brand: "Nike",
    category: "sneakers",
    status: "UPCOMING",
    retailPrice: 179000,
    consensusPrice: 205000,
    marketPrice: null,
    kreamProductId: "supreme-clog-black",
    releaseDate: new Date("2026-09-05T09:00:00Z"),
    releaseDateText: "09/05",
    priceChangeRate: null,
    volume: null
  },
  {
    title: "adidas yeezy boost 350 v2 'carbon beluga'",
    brand: "Adidas",
    category: "sneakers",
    status: "UPCOMING",
    retailPrice: 319000,
    consensusPrice: 366000,
    marketPrice: null,
    kreamProductId: "yeezy-beluga-carbon",
    releaseDate: new Date("2026-09-30T09:00:00Z"),
    releaseDateText: "09/30",
    priceChangeRate: null,
    volume: null
  },

  // RELEASED / HOT SNEAKERS
  {
    title: "air jordan 1 retro high og 'chicago lost & found'",
    brand: "Nike",
    category: "sneakers",
    status: "RELEASED",
    retailPrice: 219000,
    consensusPrice: 219000,
    marketPrice: 480000,
    kreamProductId: "aj1-chicago-lost",
    releaseDate: new Date("2022-11-19T09:00:00Z"),
    releaseDateText: "released",
    priceChangeRate: 119.18, // +119.18%
    volume: 12500
  },
  {
    title: "asics gel-kayano 14 'cream black'",
    brand: "Asics",
    category: "sneakers",
    status: "RELEASED",
    retailPrice: 179000,
    consensusPrice: 179000,
    marketPrice: 295000,
    kreamProductId: "asics-kayano-cream",
    releaseDate: new Date("2023-05-12T09:00:00Z"),
    releaseDateText: "released",
    priceChangeRate: 64.80, // +64.8%
    volume: 9800
  },
  {
    title: "nike dunk low 'panda'",
    brand: "Nike",
    category: "sneakers",
    status: "RELEASED",
    retailPrice: 129000,
    consensusPrice: 129000,
    marketPrice: 135000,
    kreamProductId: "dunk-panda",
    releaseDate: new Date("2021-01-14T09:00:00Z"),
    releaseDateText: "released",
    priceChangeRate: 4.65, // +4.65%
    volume: 32000
  },
  {
    title: "adidas samba vegan 'cloud white black'",
    brand: "Adidas",
    category: "sneakers",
    status: "RELEASED",
    retailPrice: 139000,
    consensusPrice: 139000,
    marketPrice: 145000,
    kreamProductId: "samba-vegan-white",
    releaseDate: new Date("2021-06-15T09:00:00Z"),
    releaseDateText: "released",
    priceChangeRate: 4.31,
    volume: 18500
  },
  {
    title: "salomon xt-6 'black magnet'",
    brand: "Salomon",
    category: "sneakers",
    status: "RELEASED",
    retailPrice: 260000,
    consensusPrice: 260000,
    marketPrice: 215000,
    kreamProductId: "salomon-xt6-black",
    releaseDate: new Date("2021-02-01T09:00:00Z"),
    releaseDateText: "released",
    priceChangeRate: -17.30, // -17.3%
    volume: 7400
  }
];

/**
 * Synchronizes global sneakers from RapidAPI / StockX
 * Falls back to high-fidelity seeding if API key is not present
 */
async function syncGlobalSneakers() {
  console.log('[sync] Starting Global Sneaker Database Sync...');
  
  const apiKey = process.env.RAPIDAPI_KEY;
  
  if (!apiKey) {
    console.log('[sync] RAPIDAPI_KEY not found in environment. Triggering high-fidelity Mock fallback seeder...');
    return await seedMockData();
  }

  // RapidAPI connection blueprint (can be expanded with user's subscription)
  try {
    const url = 'https://thesneakerdatabase.p.rapidapi.com/sneakers?limit=20&gender=men';
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'thesneakerdatabase.p.rapidapi.com'
      }
    });

    if (!response.ok) {
      throw new Error(`API returned HTTP ${response.status}`);
    }

    const json = await response.json();
    console.log(`[sync] Successfully fetched ${json.results?.length || 0} items from global API.`);
    
    // Process and upsert logic here...
    // For safety, we also seed mock if no data came back
    if (!json.results || json.results.length === 0) {
      console.log('[sync] Empty API results. Falling back to mock data...');
      return await seedMockData();
    }
    
    // Map API fields (converting USD to approximate KRW)
    for (const item of json.results) {
      const retailUSD = item.retailPrice || 150;
      const retailKRW = Math.round(retailUSD * 1350);
      const isReleased = item.releaseDate && new Date(item.releaseDate) < new Date();
      
      await prisma.drop.upsert({
        where: { kreamProductId: `global-${item.id}` },
        update: {
          title: item.title.toLowerCase(),
          brand: item.brand,
          marketPrice: isReleased ? Math.round(retailKRW * 1.1) : null,
          retailPrice: retailKRW,
          releaseDate: item.releaseDate ? new Date(item.releaseDate) : null,
          releaseDateText: item.releaseDate ? item.releaseDate.substring(5, 10).replace('-', '/') : 'tbd',
          status: isReleased ? 'RELEASED' : 'UPCOMING',
        },
        create: {
          title: item.title.toLowerCase(),
          brand: item.brand,
          category: 'sneakers',
          retailPrice: retailKRW,
          marketPrice: isReleased ? Math.round(retailKRW * 1.1) : null,
          kreamProductId: `global-${item.id}`,
          releaseDate: item.releaseDate ? new Date(item.releaseDate) : null,
          releaseDateText: item.releaseDate ? item.releaseDate.substring(5, 10).replace('-', '/') : 'tbd',
          status: isReleased ? 'RELEASED' : 'UPCOMING',
        }
      });
    }
    
    console.log('[sync] Finished upserting global API data into database.');
  } catch (error) {
    console.error('[sync] Global Sneaker API sync failed. Activating local mock seeder fallback...', error.message);
    return await seedMockData();
  } finally {
    await prisma.$disconnect();
  }
}

// Local mock data seeding function
async function seedMockData() {
  console.log('[sync] Seeding Mock data to database...');
  let successCount = 0;
  
  for (const sneaker of MOCK_GLOBAL_SNEAKERS) {
    try {
      await prisma.drop.upsert({
        where: { kreamProductId: sneaker.kreamProductId },
        update: {
          title: sneaker.title,
          brand: sneaker.brand,
          category: sneaker.category,
          status: sneaker.status,
          retailPrice: sneaker.retailPrice,
          consensusPrice: sneaker.consensusPrice,
          marketPrice: sneaker.marketPrice,
          releaseDate: sneaker.releaseDate,
          releaseDateText: sneaker.releaseDateText,
          priceChangeRate: sneaker.priceChangeRate,
          volume: sneaker.volume
        },
        create: {
          title: sneaker.title,
          brand: sneaker.brand,
          category: sneaker.category,
          status: sneaker.status,
          retailPrice: sneaker.retailPrice,
          consensusPrice: sneaker.consensusPrice,
          marketPrice: sneaker.marketPrice,
          kreamProductId: sneaker.kreamProductId,
          releaseDate: sneaker.releaseDate,
          releaseDateText: sneaker.releaseDateText,
          priceChangeRate: sneaker.priceChangeRate,
          volume: sneaker.volume
        }
      });
      successCount++;
    } catch (err) {
      console.error(`[sync] Failed to upsert sneaker "${sneaker.title}":`, err.message);
    }
  }
  
  console.log(`[sync] Mock Seeding Complete. Successfully upserted ${successCount}/${MOCK_GLOBAL_SNEAKERS.length} items.`);
  return MOCK_GLOBAL_SNEAKERS;
}

// Direct execution support
if (require.main === module) {
  syncGlobalSneakers()
    .then(() => {
      console.log('[sync] Executed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[sync] Execution failed:', err);
      process.exit(1);
    });
}

module.exports = { syncGlobalSneakers };
