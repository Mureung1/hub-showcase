const express = require('express');
const rateLimit = require('express-rate-limit');
const supabase = require('../services/supabase');
const auth = require('../middleware/auth');

const router = express.Router();

const createProfileLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limited' },
});

router.post('/', createProfileLimiter, auth, async (req, res) => {
  const { nickname, keywordIds = [] } = req.body;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert({ id: req.user.id, nickname: nickname || null, onboarding_completed: true })
    .select('id, nickname, onboarding_completed')
    .single();

  if (profileError) {
    return res.status(500).json({ error: 'db_connection_failed' });
  }

  if (keywordIds.length > 0) {
    const userKeywords = keywordIds.map((keywordId, index) => ({
      user_id: req.user.id,
      keyword_id: keywordId,
      priority: index,
    }));

    const { error: keywordsError } = await supabase
      .from('user_keywords')
      .insert(userKeywords);

    if (keywordsError) {
      return res.status(500).json({ error: 'db_connection_failed' });
    }
  }

  res.json({
    id: profile.id,
    nickname: profile.nickname,
    onboardingCompleted: profile.onboarding_completed,
  });
});

router.get('/', auth, async (req, res) => {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, nickname, onboarding_completed, created_at')
    .eq('id', req.user.id)
    .single();

  if (error || !profile) {
    return res.status(404).json({ error: 'not_found' });
  }

  res.json({
    id: profile.id,
    nickname: profile.nickname,
    onboardingCompleted: profile.onboarding_completed,
    createdAt: profile.created_at,
  });
});

module.exports = router;
