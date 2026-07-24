const availabilityModel = require('../models/availabilityModel');

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function toId(raw) {
  if (raw === undefined || raw === null || raw === '') return null;
  const n = Number(raw);
  return Number.isInteger(n) ? n : null;
}

function isValidDateString(value) {
  return typeof value === 'string' && DATE_PATTERN.test(value);
}

async function listAvailability(req, res) {
  const teamId = toId(req.query.team_id);
  const weekStart = req.query.week_start;

  if (teamId === null) {
    return res.status(400).json({ error: 'team_id는 필수이며 정수여야 합니다.' });
  }

  if (!isValidDateString(weekStart)) {
    return res.status(400).json({ error: 'week_start는 YYYY-MM-DD 형식이어야 합니다.' });
  }

  try {
    const slots = await availabilityModel.findByTeamAndWeek(teamId, weekStart);
    res.json(slots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function saveAvailability(req, res) {
  const teamId = toId(req.body.team_id);
  const memberId = toId(req.body.member_id);
  const weekStart = req.body.week_start;
  const slots = req.body.slots;

  if (teamId === null) {
    return res.status(400).json({ error: 'team_id는 필수이며 정수여야 합니다.' });
  }

  if (memberId === null) {
    return res.status(400).json({ error: 'member_id는 필수이며 정수여야 합니다.' });
  }

  if (!isValidDateString(weekStart)) {
    return res.status(400).json({ error: 'week_start는 YYYY-MM-DD 형식이어야 합니다.' });
  }

  if (!Array.isArray(slots)) {
    return res.status(400).json({ error: 'slots는 배열이어야 합니다.' });
  }

  for (const slot of slots) {
    if (!slot || !isValidDateString(slot.date) || !Number.isInteger(slot.hour)) {
      return res.status(400).json({
        error: 'slots의 각 항목은 { date: "YYYY-MM-DD", hour: 정수 } 형식이어야 합니다.',
      });
    }
  }

  try {
    await availabilityModel.replaceForMemberWeek(teamId, memberId, weekStart, slots);
    res.json({ team_id: teamId, member_id: memberId, week_start: weekStart, slots });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { listAvailability, saveAvailability };
