const memberModel = require('../models/memberModel');
const CURRENT_TEAM_ID = require('../currentTeamId');

async function listMembers(req, res) {
  try {
    const members = await memberModel.getMembersByTeam(CURRENT_TEAM_ID);
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { listMembers };
