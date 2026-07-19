const express = require('express');
const requireAuth = require('../middleware/auth');
const { validateCreateMeeting } = require('../utils/validators');
const ApiError = require('../utils/apiError');
const { createMeeting, listMeetings, getMeetingDetail } = require('../services/meetingService');

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

// GET /api/meetings/:id — 상세 조회 (인증 불필요, 로그인 시 myParticipation/openChatUrl이 개인화됨)
router.get('/:id', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    // 숫자가 아닌 id는 DB에 물어볼 것도 없이 없는 모임이다.
    if (!Number.isInteger(id) || id <= 0) {
      throw new ApiError('NOT_FOUND', '모임을 찾을 수 없습니다');
    }

    const meeting = await getMeetingDetail(id, req.session.userId ?? null);
    if (!meeting) {
      throw new ApiError('NOT_FOUND', '모임을 찾을 수 없습니다');
    }

    res.json({ data: meeting });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
