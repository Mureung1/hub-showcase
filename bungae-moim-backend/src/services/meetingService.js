const pool = require('../config/db');
const ApiError = require('../utils/apiError');
const withTransaction = require('../utils/withTransaction');
const { evaluateApplicability } = require('../utils/participation');

// status 필터로 허용하는 값. 임의 문자열이 그대로 SQL 조건에 들어가지 않도록 화이트리스트로 검증한다.
const ALLOWED_STATUS_FILTERS = ['recruiting', 'closed'];

// sort 필터로 허용하는 값 → 고정 ORDER BY 절. 사용자 입력을 문자열 보간으로 SQL에
// 직접 꽂으면 인젝션 통로가 되므로, 허용된 값에 대응하는 정적 SQL 조각만 미리
// 정의해두고 그중 하나를 그대로(가공 없이) 고르는 방식으로 제한한다.
const SORT_CLAUSES = {
  recent: 'created_at DESC, id DESC',
};
// 기본 정렬: 가장 임박한 일정 순 (홈의 "오늘의 번개" 등 기존 화면이 기대하는 순서).
const DEFAULT_SORT_CLAUSE = 'start_at ASC, id ASC';

// 목록 조회 한 페이지에 담는 모임 수.
const PAGE_SIZE = 20;

// DB의 snake_case row를 API 응답용 camelCase 객체로 변환한다.
function normalizeMeeting(row) {
  return {
    id: Number(row.id),
    hostId: Number(row.host_id),
    type: row.type,
    title: row.title,
    category: row.category,
    description: row.description,
    regionSido: row.region_sido,
    regionSigungu: row.region_sigungu,
    regionEupmyeondong: row.region_eupmyeondong,
    startAt: row.start_at,
    endAt: row.end_at,
    capacity: row.capacity === null ? null : Number(row.capacity),
    adultOnly: row.adult_only,
    openChatUrl: row.open_chat_url,
    status: row.status,
    createdAt: row.created_at,
  };
}

// 목록/검색 응답용. openChatUrl은 참여자에게만 의미가 있고 공개 목록에 노출할
// 이유가 없어 목록 항목에서는 제외한다 (상세/참여 API에서 별도로 다룬다).
function normalizeMeetingListItem(row) {
  const { openChatUrl, ...rest } = normalizeMeeting(row);
  return rest;
}

async function createMeeting(hostId, fields) {
  const { rows } = await pool.query(
    `INSERT INTO meetings
       (host_id, type, title, category, description,
        region_sido, region_sigungu, region_eupmyeondong,
        start_at, end_at, capacity, adult_only, open_chat_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
      hostId,
      fields.type,
      fields.title,
      fields.category,
      fields.description,
      fields.regionSido,
      fields.regionSigungu,
      fields.regionEupmyeondong,
      fields.startAt,
      fields.endAt,
      fields.capacity,
      fields.adultOnly,
      fields.openChatUrl,
    ]
  );

  return normalizeMeeting(rows[0]);
}

// GET /api/meetings — 필터/검색/페이지네이션.
// 기본적으로 status IN ('recruiting','closed')만 조회하고, 시간이 지난 건은
// 조회 시점에 finished로 간주해 제외한다 (DB 설계서 3번 — 별도 배치 없이 애플리케이션에서 필터링).
// 시간 판별: 종료 일시가 있으면(end_at, small) 그것을, 없으면(flash) start_at을 기준으로 한다.
async function listMeetings(filters = {}) {
  const conditions = ['COALESCE(end_at, start_at) >= now()'];
  const params = [];

  if (filters.status !== undefined && filters.status !== null && String(filters.status).trim() !== '') {
    if (!ALLOWED_STATUS_FILTERS.includes(filters.status)) {
      throw new ApiError('VALIDATION_ERROR', '허용되지 않는 status 값입니다');
    }
    params.push(filters.status);
    conditions.push(`status = $${params.length}`);
  } else {
    conditions.push("status IN ('recruiting', 'closed')");
  }

  const addFilter = (column, value) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.push(value);
      conditions.push(`${column} = $${params.length}`);
    }
  };

  addFilter('type', filters.type);
  addFilter('category', filters.category);
  addFilter('region_sido', filters.regionSido);
  addFilter('region_sigungu', filters.regionSigungu);

  if (filters.keyword && String(filters.keyword).trim() !== '') {
    params.push(`%${filters.keyword.trim()}%`);
    const idx = params.length;
    conditions.push(`(title ILIKE $${idx} OR description ILIKE $${idx})`);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  let orderClause = DEFAULT_SORT_CLAUSE;
  if (filters.sort !== undefined && filters.sort !== null && String(filters.sort).trim() !== '') {
    if (!Object.prototype.hasOwnProperty.call(SORT_CLAUSES, filters.sort)) {
      throw new ApiError('VALIDATION_ERROR', '허용되지 않는 sort 값입니다');
    }
    orderClause = SORT_CLAUSES[filters.sort];
  }

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM meetings ${where}`,
    params
  );
  const total = countResult.rows[0].total;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const page = Number.isInteger(filters.page) && filters.page > 0 ? filters.page : 1;
  const offset = (page - 1) * PAGE_SIZE;

  const { rows } = await pool.query(
    `SELECT * FROM meetings ${where}
     ORDER BY ${orderClause}
     LIMIT ${PAGE_SIZE} OFFSET $${params.length + 1}`,
    [...params, offset]
  );

  return {
    items: rows.map(normalizeMeetingListItem),
    page,
    totalPages,
    total,
  };
}

// GET /api/meetings/:id — 상세 조회. 조회하는 사람(viewerId)에 따라 응답이 달라진다.
// 목록과 달리 지난/취소된 모임도 그대로 반환한다 — 기획서 11번대로 상세 페이지에서는
// "종료된 모임"으로 보여줘야 하기 때문이다.
async function getMeetingDetail(meetingId, viewerId = null) {
  const { rows } = await pool.query(
    `SELECT m.*, u.nickname AS host_nickname, u.trust_score AS host_trust_score
       FROM meetings m
       JOIN users u ON u.id = m.host_id
      WHERE m.id = $1`,
    [meetingId]
  );

  if (rows.length === 0) return null;
  const row = rows[0];

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS confirmed_count
       FROM meeting_participants
      WHERE meeting_id = $1 AND status IN ('confirmed', 'approved')`,
    [meetingId]
  );

  let myParticipation = null;
  if (viewerId) {
    const mine = await pool.query(
      'SELECT status FROM meeting_participants WHERE meeting_id = $1 AND user_id = $2',
      [meetingId, viewerId]
    );
    if (mine.rows.length > 0) {
      myParticipation = { status: mine.rows[0].status };
    }
  }

  const meeting = normalizeMeeting(row);

  const detail = {
    ...meeting,
    host: {
      id: meeting.hostId,
      nickname: row.host_nickname,
      trustScore: Number(row.host_trust_score),
    },
    confirmedCount: countResult.rows[0].confirmed_count,
    myParticipation,
  };

  // openChatUrl은 참여가 확정된 뒤에만 노출한다 (번개모임은 신청 전, 소모임은 승인 전
  // 비노출 — API 명세서 2번). 모임장 본인은 링크를 직접 등록한 사람이므로 항상 볼 수 있다.
  const isHost = viewerId !== null && Number(viewerId) === meeting.hostId;
  const isConfirmed =
    myParticipation !== null &&
    (myParticipation.status === 'confirmed' || myParticipation.status === 'approved');

  if (!isHost && !isConfirmed) {
    delete detail.openChatUrl;
  }

  return detail;
}

// blockReason(순수 함수 판정)을 HTTP 에러로 옮긴다. 신규 코드는 만들지 않고 기존 5개 코드 +
// 메시지로 사유를 구분한다(FE는 상세 응답의 canApply/blockReason으로 이미 버튼을 막으므로,
// 이 에러는 로드~클릭 사이 경합 대비 fallback이다).
function blockReasonToError(blockReason) {
  switch (blockReason) {
    case 'HOST':
      return new ApiError('VALIDATION_ERROR', '자신이 만든 모임에는 신청할 수 없습니다');
    case 'ALREADY_APPLIED':
      return new ApiError('VALIDATION_ERROR', '이미 신청한 모임입니다');
    case 'REJECTED':
      return new ApiError('VALIDATION_ERROR', '신청이 거절된 모임입니다');
    case 'CANCELLED_MEETING':
      return new ApiError('VALIDATION_ERROR', '취소된 모임입니다');
    case 'ENDED':
      return new ApiError('VALIDATION_ERROR', '이미 종료된 모임입니다');
    case 'FULL':
      return new ApiError('VALIDATION_ERROR', '정원이 가득 찼습니다');
    case 'BIRTHDATE_REQUIRED':
      return new ApiError('FORBIDDEN', '생년월일을 등록해야 참여할 수 있습니다');
    case 'ADULT_ONLY':
      return new ApiError('FORBIDDEN', '성인만 참여할 수 있는 모임입니다');
    default:
      return new ApiError('VALIDATION_ERROR', '지금은 신청할 수 없습니다');
  }
}

// POST /api/meetings/:id/apply — 참여 신청(F1).
// 모임 행을 FOR UPDATE로 잠가 같은 모임 동시 신청을 직렬화한다. flash는 즉시 confirmed,
// 마지막 자리를 채우면 모임을 closed로. small은 pending. 내가 취소했던(cancelled) row는
// 되살리는 UPDATE로 재신청(낡은 타임스탬프는 리셋).
async function applyToMeeting(meetingId, userId) {
  return withTransaction(async (client) => {
    const meetingRes = await client.query(
      `SELECT *, COALESCE(end_at, start_at) < now() AS is_past
         FROM meetings WHERE id = $1 FOR UPDATE`,
      [meetingId]
    );
    if (meetingRes.rows.length === 0) {
      throw new ApiError('NOT_FOUND', '모임을 찾을 수 없습니다');
    }
    const row = meetingRes.rows[0];
    const meeting = normalizeMeeting(row);

    const userRes = await client.query('SELECT birth_date FROM users WHERE id = $1', [userId]);
    const birthDate = userRes.rows.length > 0 ? userRes.rows[0].birth_date : null;

    const existingRes = await client.query(
      'SELECT status FROM meeting_participants WHERE meeting_id = $1 AND user_id = $2',
      [meetingId, userId]
    );
    const existingStatus = existingRes.rows.length > 0 ? existingRes.rows[0].status : null;

    const countRes = await client.query(
      `SELECT COUNT(*)::int AS confirmed_count FROM meeting_participants
        WHERE meeting_id = $1 AND status IN ('confirmed', 'approved')`,
      [meetingId]
    );
    const confirmedCount = countRes.rows[0].confirmed_count;

    const { canApply, blockReason } = evaluateApplicability({
      meeting,
      viewer: { id: userId, birthDate },
      confirmedCount,
      existingStatus,
      isPast: row.is_past,
    });
    if (!canApply) throw blockReasonToError(blockReason);

    const newStatus = meeting.type === 'flash' ? 'confirmed' : 'pending';

    if (existingStatus === 'cancelled') {
      await client.query(
        `UPDATE meeting_participants
            SET status = $3, applied_at = now(), responded_at = NULL
          WHERE meeting_id = $1 AND user_id = $2`,
        [meetingId, userId, newStatus]
      );
    } else {
      await client.query(
        'INSERT INTO meeting_participants (meeting_id, user_id, status) VALUES ($1, $2, $3)',
        [meetingId, userId, newStatus]
      );
    }

    // flash 정원이 이 신청으로 차면 모임을 마감한다.
    if (meeting.type === 'flash' && confirmedCount + 1 >= meeting.capacity) {
      await client.query("UPDATE meetings SET status = 'closed' WHERE id = $1", [meetingId]);
    }

    return { status: newStatus };
  });
}

// DELETE /api/meetings/:id/apply — 참여/신청 취소(F2).
// confirmed/approved 취소만 신뢰도 -3(0 미만 clamp) + flash가 closed면 recruiting으로 재오픈.
// 감점은 반드시 SQL 상대 갱신으로 한다 — 한 사용자가 다른 두 모임을 동시 취소하면 모임 행
// 잠금이 users 행을 지켜주지 못해 JS 읽기-쓰기는 갱신이 유실된다.
// 이미 cancelled/rejected거나 신청이 없으면 아무 것도 하지 않는다(이중취소 감점 방지).
async function cancelParticipation(meetingId, userId) {
  return withTransaction(async (client) => {
    const meetingRes = await client.query('SELECT * FROM meetings WHERE id = $1 FOR UPDATE', [meetingId]);
    if (meetingRes.rows.length === 0) {
      throw new ApiError('NOT_FOUND', '모임을 찾을 수 없습니다');
    }
    const meeting = normalizeMeeting(meetingRes.rows[0]);

    const partRes = await client.query(
      'SELECT status FROM meeting_participants WHERE meeting_id = $1 AND user_id = $2',
      [meetingId, userId]
    );
    const status = partRes.rows.length > 0 ? partRes.rows[0].status : null;
    if (status === null || status === 'cancelled' || status === 'rejected') {
      throw new ApiError('NOT_FOUND', '취소할 신청이 없습니다');
    }

    const wasConfirmed = status === 'confirmed' || status === 'approved';

    await client.query(
      "UPDATE meeting_participants SET status = 'cancelled' WHERE meeting_id = $1 AND user_id = $2",
      [meetingId, userId]
    );

    if (wasConfirmed) {
      await client.query(
        'UPDATE users SET trust_score = GREATEST(trust_score - 3, 0) WHERE id = $1',
        [userId]
      );
      // flash가 정원 마감(closed)이었다면 자리가 비므로 다시 모집 상태로.
      if (meeting.type === 'flash' && meeting.status === 'closed') {
        await client.query("UPDATE meetings SET status = 'recruiting' WHERE id = $1", [meetingId]);
      }
    }

    return { status: 'cancelled' };
  });
}

module.exports = {
  createMeeting, listMeetings, getMeetingDetail, applyToMeeting, cancelParticipation, normalizeMeeting, PAGE_SIZE,
};
