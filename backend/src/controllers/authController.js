const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-dropcast';

/**
 * Register new user with email, username, and password
 * Route: POST /api/auth/register
 * Body: { email: string, username: string, password: string }
 */
async function register(req, res) {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({
        success: false,
        message: '이메일, 닉네임, 비밀번호를 모두 입력해 주세요.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: '비밀번호는 최소 6자 이상이어야 합니다.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim();

    // Check email duplicate
    const existingEmail = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: '이미 등록된 이메일 주소입니다.'
      });
    }

    // Check username duplicate
    const existingUsername = await prisma.user.findUnique({
      where: { username: cleanUsername }
    });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: '이미 사용 중인 닉네임입니다.'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with 1,000 free initial points
    const user = await prisma.user.create({
      data: {
        email: cleanEmail,
        username: cleanUsername,
        password: hashedPassword,
        points: 1000,
        accuracyRate: 0.0
      }
    });

    // Generate JWT token
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    console.log(`[auth] Registered new user: ${user.username} (${user.email})`);

    // Omit password from user response
    const { password: _, ...userWithoutPassword } = user;

    return res.status(201).json({
      success: true,
      message: '회원가입이 완료되었습니다! 1,000 포인트를 증정합니다.',
      token,
      data: userWithoutPassword
    });

  } catch (error) {
    console.error('[auth] Error in register:', error);
    return res.status(500).json({
      success: false,
      message: '회원가입 처리 중 오류가 발생했습니다.',
      error: error.message
    });
  }
}

/**
 * Login user with email and password
 * Route: POST /api/auth/login
 * Body: { email: string, password: string }
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: '이메일과 비밀번호를 모두 입력해 주세요.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '가입되지 않은 이메일이거나 비밀번호가 일치하지 않습니다.'
      });
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '가입되지 않은 이메일이거나 비밀번호가 일치하지 않습니다.'
      });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    console.log(`[auth] User logged in: ${user.username} (${user.email})`);

    // Omit password from user response
    const { password: _, ...userWithoutPassword } = user;

    return res.status(200).json({
      success: true,
      message: '성공적으로 로그인되었습니다.',
      token,
      data: userWithoutPassword
    });

  } catch (error) {
    console.error('[auth] Error in login:', error);
    return res.status(500).json({
      success: false,
      message: '로그인 처리 중 오류가 발생했습니다.',
      error: error.message
    });
  }
}

/**
 * Legacy support / Combined handler if needed
 */
async function loginOrRegister(req, res) {
  return login(req, res);
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

    const { password: _, ...userWithoutPassword } = user;

    return res.status(200).json({
      success: true,
      data: userWithoutPassword
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

    const { password: _, ...userWithoutPassword } = updatedUser;

    return res.status(200).json({
      success: true,
      message: `🎉 Daily bonus +${BONUS_AMOUNT.toLocaleString()} pts claimed!`,
      bonusAmount: BONUS_AMOUNT,
      data: userWithoutPassword
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
  register,
  login,
  loginOrRegister,
  getUserProfile,
  claimDailyBonus
};
