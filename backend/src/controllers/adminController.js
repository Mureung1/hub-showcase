const { PrismaClient } = require('@prisma/client');
const { scrapeKreamSneakers } = require('../crawler/kreamCrawler');
const { processSettlements } = require('../cron/settlementJob');
const prisma = new PrismaClient();

/**
 * Handles manual dump of KREAM product data
 * Route: POST /api/admin/kream-dump
 */
async function dumpKreamPrices(req, res) {
  try {
    const { products } = req.body;

    if (!products || !Array.isArray(products)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payload. "products" array is required.'
      });
    }

    console.log(`[admin] Received manual KREAM price dump for ${products.length} products.`);

    const syncedProducts = [];

    for (const product of products) {
      const { kreamProductId, title, brand, retailPrice, marketPrice } = product;

      if (!kreamProductId || !title) {
        console.warn(`[admin] Skipping invalid item in dump: ${JSON.stringify(product)}`);
        continue;
      }

      const synced = await prisma.drop.upsert({
        where: { kreamProductId: String(kreamProductId) },
        update: {
          title,
          brand: brand || null,
          retailPrice: retailPrice ? parseInt(retailPrice, 10) : 0,
          marketPrice: marketPrice ? parseInt(marketPrice, 10) : null,
          status: 'RELEASED',
        },
        create: {
          kreamProductId: String(kreamProductId),
          title,
          brand: brand || null,
          category: 'sneakers',
          retailPrice: retailPrice ? parseInt(retailPrice, 10) : 0,
          marketPrice: marketPrice ? parseInt(marketPrice, 10) : null,
          status: 'RELEASED',
        },
      });

      syncedProducts.push(synced);
    }

    return res.status(200).json({
      success: true,
      message: `Successfully synced ${syncedProducts.length} KREAM products.`,
      count: syncedProducts.length,
      data: syncedProducts
    });

  } catch (error) {
    console.error('[admin] Error dumping KREAM prices:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while syncing KREAM prices.',
      error: error.message
    });
  }
}

/**
 * Triggers KREAM crawler immediately
 * Route: POST /api/admin/kream-trigger
 */
async function triggerKreamCrawler(req, res) {
  try {
    console.log('[admin] Manual KREAM crawling triggered.');
    const results = await scrapeKreamSneakers();
    return res.status(200).json({
      success: true,
      message: 'KREAM ranking crawl and DB sync completed successfully.',
      count: results.length,
      data: results
    });
  } catch (error) {
    console.error('[admin] Failed to run manual scraper trigger:', error);
    return res.status(500).json({
      success: false,
      message: 'Crawler trigger failed.',
      error: error.message
    });
  }
}

/**
 * Updates image URLs for one or more products manually
 * Route: POST /api/admin/update-images
 */
async function updateProductImages(req, res) {
  try {
    const { updates } = req.body;
    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ success: false, message: '"updates" array is required.' });
    }

    const results = [];
    for (const { kreamProductId, imageUrl } of updates) {
      if (!kreamProductId || !imageUrl) continue;
      const updated = await prisma.drop.updateMany({
        where: { kreamProductId: String(kreamProductId) },
        data: { imageUrl },
      });
      results.push({ kreamProductId, updated: updated.count });
    }

    return res.status(200).json({
      success: true,
      message: `Updated images for ${results.length} products.`,
      data: results,
    });
  } catch (error) {
    console.error('[admin] Error updating product images:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Triggers Polymarket Settlement manually
 * Route: POST /api/admin/settlement-trigger
 */
async function triggerSettlement(req, res) {
  try {
    console.log('[admin] Manual Polymarket settlement triggered.');
    const result = await processSettlements();
    return res.status(200).json({
      success: true,
      message: 'Polymarket settlement executed successfully.',
      data: result
    });
  } catch (error) {
    console.error('[admin] Failed to run manual settlement trigger:', error);
    return res.status(500).json({
      success: false,
      message: 'Settlement trigger failed.',
      error: error.message
    });
  }
}

module.exports = {
  dumpKreamPrices,
  triggerKreamCrawler,
  updateProductImages,
  triggerSettlement
};
