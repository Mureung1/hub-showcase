const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Login or Register user using email & username
 * Route: POST /api/auth/login
 * Body: { email: string, username: string }
 */
async function loginOrRegister(req, res) {
  try {
    const { email, username } = req.body;

    if (!email || !username) {
      return res.status(400).json({
        success: false,
        message: 'email and username are required.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim();

    // Check if user exists by email
    let user = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });

    let isNewUser = false;

    if (!user) {
      // Create new user with 1,000 initial points
      user = await prisma.user.create({
        data: {
          email: cleanEmail,
          username: cleanUsername,
          points: 1000,
          accuracyRate: 0.0
        }
      });
      isNewUser = true;
      console.log(`[auth] Registered new user: ${cleanUsername} (${cleanEmail}) with 1,000 initial points.`);
    } else {
      console.log(`[auth] User logged in: ${user.username} (${user.email}), points: ${user.points}`);
    }

    return res.status(200).json({
      success: true,
      message: isNewUser ? 'Account created successfully with 1,000 free pts!' : 'Logged in successfully.',
      isNewUser,
      data: user
    });

  } catch (error) {
    console.error('[auth] Error in loginOrRegister:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.',
      error: error.message
    });
  }
}

/**
 * Get profile and points balance for a specific user
 * Route: GET /api/auth/me/:userId
 */
async function getUserProfile(req, res) {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        votes: {
          include: { drop: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    return res.status(200).json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('[auth] Error fetching user profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile.',
      error: error.message
    });
  }
}

/**
 * Claim daily attendance bonus (+1,000 pts)
 * Route: POST /api/auth/daily-bonus
 * Body: { userId: string }
 */
async function claimDailyBonus(req, res) {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required.' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const BONUS_AMOUNT = 1000;
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        points: { increment: BONUS_AMOUNT }
      }
    });

    console.log(`[auth] User ${userId} claimed daily bonus +${BONUS_AMOUNT} pts. New total: ${updatedUser.points} pts.`);

    return res.status(200).json({
      success: true,
      message: `🎉 Daily bonus +${BONUS_AMOUNT.toLocaleString()} pts claimed!`,
      bonusAmount: BONUS_AMOUNT,
      data: updatedUser
    });

  } catch (error) {
    console.error('[auth] Error claiming daily bonus:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to claim daily bonus.',
      error: error.message
    });
  }
}

module.exports = {
  loginOrRegister,
  getUserProfile,
  claimDailyBonus
};
