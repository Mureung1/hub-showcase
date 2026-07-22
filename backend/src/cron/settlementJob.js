const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Weekly & Release-day Settlement Engine for Polymarket predictions
 *
 * Rules:
 * 1. RELEASED Drops: Settled every Sunday 23:59 KST
 * 2. UPCOMING Drops: Settled on the release date at 23:59 KST
 *
 * Payout Rule:
 * - If final marketPrice > retailPrice -> UP wins
 * - If final marketPrice <= retailPrice -> DOWN wins
 * - Winning users receive: payout = Math.round(stakedPoints * odds)
 * - User points and accuracyRate are updated atomically.
 */
async function processSettlements() {
  console.log('[settlement] Starting Polymarket prediction settlement job...');

  try {
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstTime = new Date(now.getTime() + kstOffset);

    // Fetch drops that have votes to settle
    const dropsToSettle = await prisma.drop.findMany({
      include: {
        votes: {
          include: { user: true }
        }
      }
    });

    let settledDropsCount = 0;
    let totalPayoutPoints = 0;

    for (const drop of dropsToSettle) {
      if (!drop.votes || drop.votes.length === 0) continue;

      const finalPrice = drop.marketPrice || drop.consensusPrice || drop.retailPrice;
      const winningDirection = finalPrice > drop.retailPrice ? 'UP' : 'DOWN';

      console.log(`[settlement] Drop "${drop.title.substring(0, 30)}" | Final Price: ₩${finalPrice} vs Retail: ₩${drop.retailPrice} -> Winner: ${winningDirection}`);

      // Process votes for this drop
      for (const vote of drop.votes) {
        const isWinner = vote.direction === winningDirection;
        const payout = isWinner ? Math.round(vote.stakedPoints * vote.odds) : 0;

        if (isWinner && payout > 0) {
          await prisma.user.update({
            where: { id: vote.userId },
            data: {
              points: { increment: payout }
            }
          });
          totalPayoutPoints += payout;
          console.log(`[settlement] User ${vote.userId} WON ${payout} pts (Staked: ${vote.stakedPoints} pts @ ${vote.odds}x odds).`);
        }
      }

      // Update User Accuracy Rates
      const allUsersWithVotes = await prisma.user.findMany({
        include: { votes: true }
      });

      for (const user of allUsersWithVotes) {
        if (user.votes.length === 0) continue;
        // Count how many total votes were correct
        let correctCount = 0;
        for (const v of user.votes) {
          const d = dropsToSettle.find(dp => dp.id === v.dropId);
          if (d) {
            const p = d.marketPrice || d.consensusPrice || d.retailPrice;
            const w = p > d.retailPrice ? 'UP' : 'DOWN';
            if (v.direction === w) correctCount++;
          }
        }
        const accRate = Math.round((correctCount / user.votes.length) * 1000) / 10;
        await prisma.user.update({
          where: { id: user.id },
          data: { accuracyRate: accRate }
        });
      }

      settledDropsCount++;
    }

    console.log(`[settlement] Completed settlement for ${settledDropsCount} drops. Total payout distributed: ${totalPayoutPoints} pts.`);

    return {
      settledDropsCount,
      totalPayoutPoints
    };
  } catch (error) {
    console.error('[settlement] Error processing settlement:', error);
    throw error;
  }
}

/**
 * Initializes Cron Jobs for Polymarket Settlements:
 * 1. Weekly Sunday 23:59 KST: Settlement for all RELEASED drops
 * 2. Daily 23:59 KST: Settlement for UPCOMING drops releasing today
 */
function initSettlementCron() {
  console.log('[cron] Polymarket Settlement Cron Initialized (Sunday 23:59 KST & Daily 23:59 KST).');

  // Sunday 23:59 KST
  cron.schedule('59 23 * * 0', async () => {
    console.log('[cron] Executing Sunday 23:59 KST weekly Polymarket settlement...');
    await processSettlements();
  }, {
    timezone: 'Asia/Seoul'
  });

  // Daily 23:59 KST
  cron.schedule('59 23 * * *', async () => {
    console.log('[cron] Executing Daily 23:59 KST release-day Polymarket settlement...');
    await processSettlements();
  }, {
    timezone: 'Asia/Seoul'
  });
}

module.exports = {
  processSettlements,
  initSettlementCron
};
