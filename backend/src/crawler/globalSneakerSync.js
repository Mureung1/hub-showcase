const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// List of KREAM product IDs that were used as mock data
const MOCK_PRODUCT_IDS = [
  "travis-velvet-brown",
  "kobe-5-royal",
  "aj4-fear-2026",
  "supreme-clog-black",
  "yeezy-beluga-carbon",
  "aj1-chicago-lost",
  "asics-kayano-cream",
  "dunk-panda",
  "samba-vegan-white",
  "salomon-xt6-black"
];

/**
 * Permanently cleans up mock data and ensures no seeding occurs
 */
async function cleanupMockData() {
  console.log('[cleanup] Starting permanent cleanup of mock sneaker data...');
  try {
    // 1. Delete dependent votes first to avoid foreign key issues
    const deletedVotes = await prisma.vote.deleteMany({
      where: {
        drop: {
          kreamProductId: { in: MOCK_PRODUCT_IDS }
        }
      }
    });
    console.log(`[cleanup] Deleted ${deletedVotes.count} dependent votes.`);

    // 2. Delete mock drop items
    const deletedDrops = await prisma.drop.deleteMany({
      where: {
        kreamProductId: { in: MOCK_PRODUCT_IDS }
      }
    });
    console.log(`[cleanup] Deleted ${deletedDrops.count} mock drops.`);

    console.log('[cleanup] All mock data has been purged. No mock seeding will occur.');
  } catch (error) {
    console.error('[cleanup] Failed to cleanup mock data:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  cleanupMockData()
    .then(() => {
      console.log('[cleanup] Mock cleanup script finished.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[cleanup] Cleanup failed:', err);
      process.exit(1);
    });
}

module.exports = { cleanupMockData };
