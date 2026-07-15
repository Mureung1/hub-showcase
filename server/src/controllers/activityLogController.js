const activityLogModel = require('../models/activityLogModel');
const CURRENT_TEAM_ID = require('../currentTeamId');

function listLogs(req, res) {
  const logs = activityLogModel.getLogsByTeam(CURRENT_TEAM_ID);
  res.json(logs);
}

module.exports = { listLogs };
