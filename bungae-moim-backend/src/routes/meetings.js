const express = require('express');
const requireAuth = require('../middleware/auth');
const { validateCreateMeeting } = require('../utils/validators');
const ApiError = require('../utils/apiError');
const { createMeeting, listMeetings, getMeetingDetail, applyToMeeting } = require('../services/meetingService');

const router = express.Router();

// page 파라미터에 실질적으로 의미 있는 상한. totalPages를 넘는 page는 응답이 빈
// 배열이라 그 자체로는 안전하지만, 원 값이 안전 정수 범위를 넘으면 그대로 DB 쿼리에
// 실려 Postgres bigint 범위 초과 에러(500 + 원문 노출)로 이어지므로 미리 끊어둔다.
const MAX_PAGE = 100000;

// GET /api/meetings — 목록/검색 (인증 불필요)
router.get('/', async (req, res, next) => {
  try {
    const rawPage = req.query.page;
    // Number.parseInt는 "1abc"→1, "-1"→-1 처럼 뒷부분을 조용히 버리거나 범위를 그대로
    // 통과시켜서, :id 라우트와 똑같이 잘못된 값이 DB까지 흘러갈 수 있었다(초대형 숫자는
    // 실제로 500 + Postgres 에러 원문 노출로 이어졌다). :id와 같은 원칙으로 숫자만으로
    // 이루어진 문자열인지 정규식으로 먼저 확인하고, 벗어나면 조용히 기본값(1페이지)으로
    // 떨어뜨린다. 다만 목록 조회는 :id 상세 조회와 달리 잘못된 page 하나 때문에 전체
    // 요청이 실패해서는 안 되므로 404 대신 기본값으로 폴백한다.
    const isValidPage =
      typeof rawPage === 'string' &&
      /^\d+$/.test(rawPage) &&
      Number(rawPage) > 0 &&
      Number(rawPage) <= MAX_PAGE;
    const page = isValidPage ? Number(rawPage) : undefined;

    const result = await listMeetings({
      type: req.query.type,
      category: req.query.category,
      keyword: req.query.keyword,
      regionSido: req.query.regionSido,
      regionSigungu: req.query.regionSigungu,
      status: req.query.status,
      sort: req.query.sort,
      page,
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

// :id 파라미터를 안전한 양의 정수로 파싱한다. 아니면 없는 모임 취급(404). GET /:id와 같은 원칙.
function parseMeetingId(rawId) {
  if (!/^\d+$/.test(rawId) || Number(rawId) > Number.MAX_SAFE_INTEGER || Number(rawId) <= 0) {
    throw new ApiError('NOT_FOUND', '모임을 찾을 수 없습니다');
  }
  return Number(rawId);
}

// POST /api/meetings/:id/apply — 참여 신청(F1, 로그인 필요)
router.post('/:id/apply', requireAuth, async (req, res, next) => {
  try {
    const id = parseMeetingId(req.params.id);
    const result = await applyToMeeting(id, req.session.userId);
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
