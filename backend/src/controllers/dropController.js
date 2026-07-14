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
        _count: {
          select: { votes: true }
        }
      }
    });

    return res.status(200).json({
      success: true,
      count: drops.length,
      data: drops
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

    return res.status(200).json({
      success: true,
      data: drop
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
