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

async function getTeamByCode(req, res) {
  const code = req.query.code;

  if (!code) {
    return res.status(400).json({ error: 'code는 필수입니다.' });
  }

  try {
    const team = await teamModel.getTeamByInviteCode(code);
    if (!team) {
      return res.status(404).json({ error: '해당 초대코드의 팀을 찾을 수 없습니다.' });
    }
    res.json({ id: team.id, name: team.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getCurrentTeam, getTeamByCode };
