const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Cast a vote on a specific Drop (UP or DOWN)
 * Lock-in Policy: Voting is blocked from Friday 09:00 KST until Sunday 23:59 KST
 * Route: POST /api/votes
 */
async function castVote(req, res) {
  try {
    const { userId, dropId, direction, predictedPrice, predictionDays } = req.body;

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

    if (predictedPrice !== undefined && (isNaN(predictedPrice) || predictedPrice < 0)) {
      return res.status(400).json({
        success: false,
        message: 'predictedPrice must be a positive integer.'
      });
    }

    const days = predictionDays ? parseInt(predictionDays, 10) : 7;
    if (isNaN(days) || days <= 0) {
      return res.status(400).json({
        success: false,
        message: 'predictionDays must be a positive integer.'
      });
    }

    // 2. Deadline Lock-in Policy Check (Friday 09:00 KST ~ Sunday 23:59 KST)
    const now = new Date();
    // Convert to KST (UTC +9)
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstTime = new Date(now.getTime() + kstOffset);
    
    const day = kstTime.getUTCDay(); // 0: Sunday, 5: Friday, 6: Saturday
    const hours = kstTime.getUTCHours();

    // Check if Friday after 09:00 KST, Saturday, or Sunday
    const isFridayLocked = (day === 5 && hours >= 9);
    const isWeekendLocked = (day === 6 || day === 0);

    if (isFridayLocked || isWeekendLocked) {
      return res.status(403).json({
        success: false,
        message: 'Voting is locked. Submissions are prohibited from Friday 09:00 KST until weekly settlement.'
      });
    }

    // 3. User & Drop existence check
    const userExists = await prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const dropExists = await prisma.drop.findUnique({ where: { id: dropId } });
    if (!dropExists) {
      return res.status(404).json({ success: false, message: 'Drop item not found.' });
    }

    // 4. Create or update vote (Upsert to prevent duplicate votes per user/drop)
    const vote = await prisma.vote.upsert({
      where: {
        userId_dropId: {
          userId,
          dropId
        }
      },
      update: {
        direction,
        predictedPrice: predictedPrice !== undefined ? parseInt(predictedPrice, 10) : null,
        predictionDays: days
      },
      create: {
        userId,
        dropId,
        direction,
        predictedPrice: predictedPrice !== undefined ? parseInt(predictedPrice, 10) : null,
        predictionDays: days
      }
    });

    console.log(`[vote] User ${userId} voted ${direction} (Price: ₩${predictedPrice || 'N/A'}, Days: ${days}) on Drop ${dropId}.`);

    return res.status(200).json({
      success: true,
      message: 'Vote submitted successfully.',
      data: vote
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
 * Get voting stats for a specific Drop
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

    const total = upCount + downCount;
    const upRatio = total > 0 ? Math.round((upCount / total) * 100) : 0;
    const downRatio = total > 0 ? Math.round((downCount / total) * 100) : 0;

    // Fetch all votes with prices for this drop
    const votesWithPrices = await prisma.vote.findMany({
      where: {
        dropId,
        predictedPrice: { not: null }
      }
    });

    const basePrice = drop.marketPrice || drop.retailPrice;

    // Calculate predictions for target offsets (e.g. 3 days, 7 days)
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
        // Time-weighted consensus pricing model: 30% Market Price + 70% Crowd Wisdom
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
        totalVotes: total,
        ratio: {
          UP: `${upRatio}%`,
          DOWN: `${downRatio}%`
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
