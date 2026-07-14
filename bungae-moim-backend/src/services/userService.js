const pool = require('../config/db');

function normalizeUser(row) {
  return {
    id: Number(row.id),
    email: row.email,
    nickname: row.nickname,
    birthDate: row.birth_date,
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
