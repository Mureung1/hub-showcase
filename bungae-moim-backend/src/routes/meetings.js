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
      status: req.query.status,
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
    const rawId = req.params.id;
    // parseInt는 "1abc"→1, "1.9"→1 처럼 뒷부분을 조용히 버려서 엉뚱한 모임을
    // 반환해버린다. 그래서 숫자만으로 이루어진 문자열인지 정규식으로 먼저 확인한다.
    // 또한 안전한 정수 범위를 넘는 숫자 문자열을 그대로 쿼리에 넘기면 Postgres의
    // bigint 범위 초과 에러가 500과 함께 원문 그대로 노출된다 — 여기서 미리 막는다.
    if (!/^\d+$/.test(rawId) || Number(rawId) > Number.MAX_SAFE_INTEGER || Number(rawId) <= 0) {
      throw new ApiError('NOT_FOUND', '모임을 찾을 수 없습니다');
    }
    const id = Number(rawId);

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
