const express = require('express');
const requireAuth = require('../middleware/auth');
const { validateCreateMeeting } = require('../utils/validators');
const { createMeeting, listMeetings } = require('../services/meetingService');

const router = express.Router();

// GET /api/meetings — 목록/검색 (인증 불필요)
router.get('/', async (req, res, next) => {
  try {
    const page = Number.parseInt(req.query.page, 10);
    const result = await listMeetings({
      type: req.query.type,
      category: req.query.category,
      keyword: req.query.keyword,
      regionSido: req.query.regionSido,
      regionSigungu: req.query.regionSigungu,
      page: Number.isNaN(page) ? undefined : page,
    });
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/meetings — 모임 등록 (로그인 필요)
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const fields = validateCreateMeeting(req.body);
    const meeting = await createMeeting(req.session.userId, fields);
    res.status(201).json({ data: meeting });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
