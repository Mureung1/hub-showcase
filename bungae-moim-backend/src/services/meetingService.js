const pool = require('../config/db');

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
  const conditions = [
    "status IN ('recruiting', 'closed')",
    'COALESCE(end_at, start_at) >= now()',
  ];
  const params = [];

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
     ORDER BY start_at ASC, id ASC
     LIMIT ${PAGE_SIZE} OFFSET $${params.length + 1}`,
    [...params, offset]
  );

  return {
    items: rows.map(normalizeMeetingListItem),
    page,
    totalPages,
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

module.exports = { createMeeting, listMeetings, getMeetingDetail, normalizeMeeting, PAGE_SIZE };
