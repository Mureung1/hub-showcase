const pool = require('../config/db');

// pg는 date 컬럼을 '로컬 자정' Date로 돌려준다. 그대로 JSON에 실으면 UTC로 직렬화되면서
// KST 기준 하루가 밀린다(2001-05-20 → "2001-05-19T15:00:00.000Z"). 생년월일은 시각이 아니라
// 날짜이므로, 로컬 게터로 'YYYY-MM-DD' 문자열을 만들어 내보낸다.
function toDateString(value) {
  if (!(value instanceof Date)) return value ?? null;

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeUser(row) {
  return {
    id: Number(row.id),
    email: row.email,
    nickname: row.nickname,
    birthDate: toDateString(row.birth_date),
    trustScore: Number(row.trust_score),
  };
}

async function findOrCreateUserByProvider({ provider, providerId, email, nickname }) {
  const existing = await pool.query(
    'SELECT id, email, nickname, birth_date, trust_score FROM users WHERE provider = $1 AND provider_id = $2',
    [provider, providerId]
  );

  if (existing.rows.length > 0) {
    return { user: normalizeUser(existing.rows[0]), isNewUser: false };
  }

  const inserted = await pool.query(
    `INSERT INTO users (provider, provider_id, email, nickname)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, nickname, birth_date, trust_score`,
    [provider, providerId, email, nickname]
  );

  return { user: normalizeUser(inserted.rows[0]), isNewUser: true };
}

module.exports = { findOrCreateUserByProvider, normalizeUser };
