const db = require('../db');

function getMembersByTeam(teamId) {
  return db.prepare('SELECT id, name FROM members WHERE team_id = ? ORDER BY id').all(teamId);
}

module.exports = { getMembersByTeam };
