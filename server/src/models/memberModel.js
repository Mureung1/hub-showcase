const pool = require('../db');

async function getMembersByTeam(teamId) {
  const result = await pool.query(
    'SELECT id, name FROM members WHERE team_id = $1 ORDER BY id',
    [teamId]
  );
  return result.rows;
}

module.exports = { getMembersByTeam };
