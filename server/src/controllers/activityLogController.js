const activityLogModel = require('../models/activityLogModel');

function toId(raw) {
  if (raw === undefined || raw === null || raw === '') return null;
  const n = Number(raw);
  return Number.isInteger(n) ? n : null;
}

async function listLogs(req, res) {
  const teamId = toId(req.query.team_id);

  if (teamId === null) {
    return res.status(400).json({ error: 'team_id는 필수이며 정수여야 합니다.' });
  }

  try {
    const logs = await activityLogModel.getLogsByTeam(teamId);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { listLogs };
