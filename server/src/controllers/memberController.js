const memberModel = require('../models/memberModel');

function toId(raw) {
  if (raw === undefined || raw === null || raw === '') return null;
  const n = Number(raw);
  return Number.isInteger(n) ? n : null;
}

async function listMembers(req, res) {
  const teamId = toId(req.query.team_id);

  if (teamId === null) {
    return res.status(400).json({ error: 'team_id는 필수이며 정수여야 합니다.' });
  }

  try {
    const members = await memberModel.getMembersByTeam(teamId);
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { listMembers };
