const memberModel = require('../models/memberModel');
const CURRENT_TEAM_ID = require('../currentTeamId');

function listMembers(req, res) {
  res.json(memberModel.getMembersByTeam(CURRENT_TEAM_ID));
}

module.exports = { listMembers };
