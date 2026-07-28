const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get all drops from database with optional filters
 * Route: GET /api/drops
 */
async function getAllDrops(req, res) {
  try {
    const { category, brand, status } = req.query;

    // Build query conditions
    const where = {};
    if (category) where.category = category;
    if (brand) where.brand = brand;
    if (status) where.status = status;

    const drops = await prisma.drop.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        votes: true,
        _count: {
          select: { votes: true }
        }
      }
    });

    // Process each drop to append statistical predictions and time-weighted consensus models
    const formattedDrops = drops.map(drop => {
      const votes = drop.votes || [];
      const upVotes = votes.filter(v => v.direction === 'UP').length;
      const downVotes = votes.filter(v => v.direction === 'DOWN').length;
      const totalVotes = votes.length;

      const upRatio = totalVotes > 0 ? Math.round((upVotes / totalVotes) * 100) : 0;
      const downRatio = totalVotes > 0 ? Math.round((downVotes / totalVotes) * 100) : 0;

      const basePrice = drop.marketPrice || drop.retailPrice;
      const votesWithPrices = votes.filter(v => v.predictedPrice !== null);

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
          // Time-weighted consensus pricing model: 30% Market/Retail + 70% average user prediction
          const consensus = Math.round(basePrice * 0.3 + avg * 0.7);

          predictions[offset] = {
            averagePrice: avg,
            consensusPrice: consensus,
            voteCount: count
          };
        }
      });

      // Dynamically update the consensusPrice dynamically from 7-day consensus if voted
      const dynamicConsensus = predictions[7].voteCount > 0 ? predictions[7].consensusPrice : (drop.consensusPrice || basePrice);

      // Avoid returning raw votes array to keep response payloads small
      const { votes: _, ...dropData } = drop;

      return {
        ...dropData,
        upVotes,
        downVotes,
        totalVotes,
        ratio: {
          UP: `${upRatio}%`,
          DOWN: `${downRatio}%`
        },
        predictions,
        consensusPrice: dynamicConsensus
      };
    });

    return res.status(200).json({
      success: true,
      count: formattedDrops.length,
      data: formattedDrops
    });
  } catch (error) {
    console.error('[drops] Error fetching drops:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve drops.',
      error: error.message
    });
  }
}

/**
 * Get detailed info of a single drop by its ID
 * Route: GET /api/drops/:id
 */
async function getDropById(req, res) {
  try {
    const { id } = req.params;

    const drop = await prisma.drop.findUnique({
      where: { id },
      include: {
        votes: true,
        _count: {
          select: { votes: true }
        }
      }
    });

    if (!drop) {
      return res.status(404).json({
        success: false,
        message: 'Drop not found.'
      });
    }

    const votes = drop.votes || [];
    const upVotes = votes.filter(v => v.direction === 'UP').length;
    const downVotes = votes.filter(v => v.direction === 'DOWN').length;
    const totalVotes = votes.length;

    const upRatio = totalVotes > 0 ? Math.round((upVotes / totalVotes) * 100) : 0;
    const downRatio = totalVotes > 0 ? Math.round((downVotes / totalVotes) * 100) : 0;

    const basePrice = drop.marketPrice || drop.retailPrice;
    const votesWithPrices = votes.filter(v => v.predictedPrice !== null);

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

    const dynamicConsensus = predictions[7].voteCount > 0 ? predictions[7].consensusPrice : (drop.consensusPrice || basePrice);

    return res.status(200).json({
      success: true,
      data: {
        ...drop,
        upVotes,
        downVotes,
        totalVotes,
        ratio: {
          UP: `${upRatio}%`,
          DOWN: `${downRatio}%`
        },
        predictions,
        consensusPrice: dynamicConsensus
      }
    });
  } catch (error) {
    console.error(`[drops] Error fetching drop by id ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve drop details.',
      error: error.message
    });
  }
}

module.exports = {
  getAllDrops,
  getDropById
};
