const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Cast a vote / buy Polymarket prediction shares on a specific Drop (UP or DOWN)
 * Lock-in Policy: Voting is blocked from Friday 09:00 KST until Sunday 23:59 KST (unless DISABLE_VOTE_LOCK is true)
 * Route: POST /api/votes
 */
async function castVote(req, res) {
  try {
    const { userId, dropId, direction, predictedPrice, predictionDays, stakedPoints } = req.body;

    // 1. Payload validation
    if (!userId || !dropId || !direction) {
      return res.status(400).json({
        success: false,
        message: 'userId, dropId, and direction (UP/DOWN) are required.'
      });
    }

    if (direction !== 'UP' && direction !== 'DOWN') {
      return res.status(400).json({
        success: false,
        message: 'Invalid vote direction. Must be "UP" or "DOWN".'
      });
    }

    const stake = stakedPoints ? parseInt(stakedPoints, 10) : 100;
    if (isNaN(stake) || stake <= 0) {
      return res.status(400).json({
        success: false,
        message: 'stakedPoints must be a positive integer.'
      });
    }

    if (predictedPrice !== undefined && (isNaN(predictedPrice) || predictedPrice < 0)) {
      return res.status(400).json({
        success: false,
        message: 'predictedPrice must be a positive integer.'
      });
    }

    const days = predictionDays ? parseInt(predictionDays, 10) : 7;

    // 2. Deadline Lock-in Policy Check (Friday 09:00 KST ~ Sunday 23:59 KST)
    if (process.env.DISABLE_VOTE_LOCK !== 'true') {
      const now = new Date();
      const kstOffset = 9 * 60 * 60 * 1000;
      const kstTime = new Date(now.getTime() + kstOffset);
      const day = kstTime.getUTCDay();
      const hours = kstTime.getUTCHours();

      const isFridayLocked = (day === 5 && hours >= 9);
      const isWeekendLocked = (day === 6 || day === 0);

      if (isFridayLocked || isWeekendLocked) {
        return res.status(403).json({
          success: false,
          message: 'Voting is locked. Submissions are prohibited from Friday 09:00 KST until weekly settlement.'
        });
      }
    }

    // 3. User & Drop existence and point balance check
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.points < stake) {
      return res.status(400).json({
        success: false,
        message: `Insufficient points balance. You have ${user.points} pts, but requested to stake ${stake} pts.`
      });
    }

    const drop = await prisma.drop.findUnique({ where: { id: dropId } });
    if (!drop) {
      return res.status(404).json({ success: false, message: 'Drop item not found.' });
    }

    // 4. Calculate Polymarket Share Prices ($0.05 ~ $0.95) & Odds
    const newUpStaked = drop.totalUpStaked + (direction === 'UP' ? stake : 0);
    const newDownStaked = drop.totalDownStaked + (direction === 'DOWN' ? stake : 0);
    const totalPot = newUpStaked + newDownStaked;

    let upSharePrice = 0.50;
    if (totalPot > 0) {
      upSharePrice = Math.max(0.05, Math.min(0.95, newUpStaked / totalPot));
    }
    const downSharePrice = Math.round((1.0 - upSharePrice) * 100) / 100;
    upSharePrice = Math.round(upSharePrice * 100) / 100;

    const boughtSharePrice = direction === 'UP' ? upSharePrice : downSharePrice;
    const oddsMultiplier = Math.round((1.0 / boughtSharePrice) * 100) / 100;
    const boughtSharesCount = Math.round((stake / boughtSharePrice) * 10) / 10;

    // 5. Atomic Transaction: Deduct User Points, Update Drop Pot, and Upsert Vote
    const [updatedUser, updatedDrop, vote] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { points: user.points - stake }
      }),
      prisma.drop.update({
        where: { id: dropId },
        data: {
          totalUpStaked: newUpStaked,
          totalDownStaked: newDownStaked
        }
      }),
      prisma.vote.upsert({
        where: {
          userId_dropId: { userId, dropId }
        },
        update: {
          direction,
          stakedPoints: stake,
          odds: oddsMultiplier,
          predictedPrice: predictedPrice !== undefined ? parseInt(predictedPrice, 10) : null,
          predictionDays: days
        },
        create: {
          userId,
          dropId,
          direction,
          stakedPoints: stake,
          odds: oddsMultiplier,
          predictedPrice: predictedPrice !== undefined ? parseInt(predictedPrice, 10) : null,
          predictionDays: days
        }
      })
    ]);

    console.log(`[polymarket] User ${userId} bought ${boughtSharesCount} ${direction} shares @ $${boughtSharePrice} (${oddsMultiplier}x odds, staked: ${stake} pts). Remaining: ${updatedUser.points} pts.`);

    return res.status(200).json({
      success: true,
      message: `Successfully bought ${direction} shares on Polymarket.`,
      data: {
        vote,
        stakedPoints: stake,
        boughtSharePrice,
        sharesCount: boughtSharesCount,
        odds: oddsMultiplier,
        remainingPoints: updatedUser.points,
        polymarket: {
          upPrice: upSharePrice,
          downPrice: downSharePrice,
          totalUpStaked: updatedDrop.totalUpStaked,
          totalDownStaked: updatedDrop.totalDownStaked
        }
      }
    });

  } catch (error) {
    console.error('[vote] Error casting vote:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while casting vote.',
      error: error.message
    });
  }
}

/**
 * Get Polymarket pricing stats and voting stats for a specific Drop
 * Route: GET /api/votes/stats/:dropId
 */
async function getVoteStats(req, res) {
  try {
    const { dropId } = req.params;

    const drop = await prisma.drop.findUnique({
      where: { id: dropId }
    });

    if (!drop) {
      return res.status(404).json({
        success: false,
        message: 'Drop not found.'
      });
    }

    const upCount = await prisma.vote.count({
      where: { dropId, direction: 'UP' }
    });

    const downCount = await prisma.vote.count({
      where: { dropId, direction: 'DOWN' }
    });

    const totalVotes = upCount + downCount;

    // Polymarket Share Pricing ($0.05 ~ $0.95)
    const totalStaked = drop.totalUpStaked + drop.totalDownStaked;
    let upPrice = 0.50;
    if (totalStaked > 0) {
      upPrice = Math.max(0.05, Math.min(0.95, drop.totalUpStaked / totalStaked));
    }
    const downPrice = Math.round((1.0 - upPrice) * 100) / 100;
    upPrice = Math.round(upPrice * 100) / 100;

    const upProbability = Math.round(upPrice * 100);
    const downProbability = Math.round(downPrice * 100);

    const upOdds = Math.round((1.0 / upPrice) * 100) / 100;
    const downOdds = Math.round((1.0 / downPrice) * 100) / 100;

    // Fetch predictions offset averages (3 days, 7 days)
    const votesWithPrices = await prisma.vote.findMany({
      where: { dropId, predictedPrice: { not: null } }
    });

    const basePrice = drop.marketPrice || drop.retailPrice;
    const offsets = [3, 7];
    const predictions = {};

    offsets.forEach(offset => {
      const offsetVotes = votesWithPrices.filter(v => v.predictionDays === offset);
      const count = offsetVotes.length;

      if (count === 0) {
        predictions[offset] = {
          averagePrice: basePrice,
          consensusPrice: basePrice,
          voteCount: 0
        };
      } else {
        const sum = offsetVotes.reduce((acc, curr) => acc + (curr.predictedPrice || 0), 0);
        const avg = Math.round(sum / count);
        const consensus = Math.round(basePrice * 0.3 + avg * 0.7);

        predictions[offset] = {
          averagePrice: avg,
          consensusPrice: consensus,
          voteCount: count
        };
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        dropId,
        upVotes: upCount,
        downVotes: downCount,
        totalVotes,
        polymarket: {
          upPrice,
          downPrice,
          upPriceCent: `${Math.round(upPrice * 100)}¢`,
          downPriceCent: `${Math.round(downPrice * 100)}¢`,
          upProbability: `${upProbability}%`,
          downProbability: `${downProbability}%`,
          upOdds: `${upOdds}x`,
          downOdds: `${downOdds}x`,
          totalUpStaked: drop.totalUpStaked,
          totalDownStaked: drop.totalDownStaked,
          totalPot: totalStaked
        },
        predictions
      }
    });

  } catch (error) {
    console.error(`[vote] Error fetching stats for drop ${req.params.dropId}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve voting statistics.',
      error: error.message
    });
  }
}

module.exports = {
  castVote,
  getVoteStats
};
