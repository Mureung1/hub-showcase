const pool = require('../db');

async function findByTeamAndWeek(teamId, weekStart) {
  const result = await pool.query(
    `SELECT id, team_id, member_id, slot_date::text AS slot_date, slot_hour, created_at
     FROM availability_slots
     WHERE team_id = $1 AND slot_date >= $2::date AND slot_date < $2::date + 7
     ORDER BY slot_date, slot_hour`,
    [teamId, weekStart]
  );
  return result.rows;
}

async function replaceForMemberWeek(teamId, memberId, weekStart, slots) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `DELETE FROM availability_slots
       WHERE team_id = $1 AND member_id = $2
         AND slot_date >= $3::date AND slot_date < $3::date + 7`,
      [teamId, memberId, weekStart]
    );

    for (const slot of slots) {
      await client.query(
        'INSERT INTO availability_slots (team_id, member_id, slot_date, slot_hour) VALUES ($1, $2, $3, $4)',
        [teamId, memberId, slot.date, slot.hour]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { findByTeamAndWeek, replaceForMemberWeek };
