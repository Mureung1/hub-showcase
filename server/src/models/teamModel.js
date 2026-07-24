const pool = require('../db');

async function getTeamById(id) {
  const result = await pool.query(
    'SELECT id, name, start_date::text AS start_date, end_date::text AS end_date FROM teams WHERE id = $1',
    [id]
  );
  return result.rows[0];
}

module.exports = { getTeamById };
