const activityLogModel = require('../models/activityLogModel');
const CURRENT_TEAM_ID = require('../currentTeamId');

async function listLogs(req, res) {
  try {
    const logs = await activityLogModel.getLogsByTeam(CURRENT_TEAM_ID);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { listLogs };
