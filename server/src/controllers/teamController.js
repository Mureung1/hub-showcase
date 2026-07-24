const teamModel = require('../models/teamModel');
const CURRENT_TEAM_ID = require('../currentTeamId');

async function getCurrentTeam(req, res) {
  try {
    const team = await teamModel.getTeamById(CURRENT_TEAM_ID);
    if (!team) {
      return res.status(404).json({ error: '팀을 찾을 수 없습니다.' });
    }
    res.json(team);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getCurrentTeam };
