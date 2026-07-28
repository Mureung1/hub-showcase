const express = require('express');
const requireAuth = require('../middleware/auth');
const { validateCreateMeeting, validateRespondStatus } = require('../utils/validators');
const ApiError = require('../utils/apiError');
const { createMeeting, listMeetings, getMeetingDetail, applyToMeeting, cancelParticipation, listParticipants, respondToApplicant, cancelMeeting, updateMeeting } = require('../services/meetingService');

const router = express.Router();

// page 파라미터에 실질적으로 의미 있는 상한. totalPages를 넘는 page는 응답이 빈
// 배열이라 그 자체로는 안전하지만, 원 값이 안전 정수 범위를 넘으면 그대로 DB 쿼리에
// 실려 Postgres bigint 범위 초과 에러(500 + 원문 노출)로 이어지므로 미리 끊어둔다.
const MAX_PAGE = 100000;

// 경로 파라미터를 안전한 양의 정수로 파싱한다. 아니면 없는 리소스 취급(404).
// parseInt는 "1abc"→1처럼 뒷부분을 조용히 버려 엉뚱한 대상을 반환하고, 안전 정수 범위를
// 넘는 값은 Postgres bigint 초과 에러(500+원문 노출)로 이어지므로 정규식+범위로 먼저 막는다.
// message를 받는 이유: :id와 :userId가 같은 규칙을 쓰지만 안내 문구는 달라야 하기 때문이다.
function parseIdParam(rawId, message = '모임을 찾을 수 없습니다') {
  if (!/^\d+$/.test(rawId) || Number(rawId) > Number.MAX_SAFE_INTEGER || Number(rawId) <= 0) {
    throw new ApiError('NOT_FOUND', message);
  }
  return Number(rawId);
}

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
    const id = parseIdParam(req.params.id);

    const meeting = await getMeetingDetail(id, req.session.userId ?? null);
    if (!meeting) {
      throw new ApiError('NOT_FOUND', '모임을 찾을 수 없습니다');
    }

    res.json({ data: meeting });
  } catch (err) {
    next(err);
  }
});

// POST /api/meetings/:id/apply — 참여 신청(F1, 로그인 필요)
// body의 answer는 선택이다. 가입 질문이 설정된 모임에서만 필수로 검사한다(서비스가 판단).
router.post('/:id/apply', requireAuth, async (req, res, next) => {
  try {
    const id = parseIdParam(req.params.id);
    const result = await applyToMeeting(id, req.session.userId, req.body?.answer);
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/meetings/:id/apply — 참여/신청 취소(F2, 로그인 필요)
router.delete('/:id/apply', requireAuth, async (req, res, next) => {
  try {
    const id = parseIdParam(req.params.id);
    const result = await cancelParticipation(id, req.session.userId);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/meetings/:id/participants — 신청자 목록(F3, 모임장만)
router.get('/:id/participants', requireAuth, async (req, res, next) => {
  try {
    const id = parseIdParam(req.params.id);
    const result = await listParticipants(id, req.session.userId);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/meetings/:id — 모임 취소(E5, 모임장만)
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const meetingId = parseIdParam(req.params.id);
    const result = await cancelMeeting(meetingId, req.session.userId);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/meetings/:id — 모임 수정(E4, 모임장만)
router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseIdParam(req.params.id);
    const meeting = await updateMeeting(id, req.session.userId, req.body);
    res.json({ data: meeting });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/meetings/:id/participants/:userId — 승인/거절(F4, 모임장만·소모임만)
router.patch('/:id/participants/:userId', requireAuth, async (req, res, next) => {
  try {
    // 본문 검증을 먼저 한다. 잘못된 본문이 FORBIDDEN보다 먼저 걸리므로 남의 모임
    // 존재 여부가 덜 새어나간다.
    const status = validateRespondStatus(req.body);
    const id = parseIdParam(req.params.id);
    const targetUserId = parseIdParam(req.params.userId, '신청을 찾을 수 없습니다');

    const result = await respondToApplicant(id, req.session.userId, targetUserId, status);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
