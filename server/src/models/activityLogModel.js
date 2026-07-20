const pool = require('../db');

async function createLog({ taskId, memberId, previousStatus, newStatus }) {
  const result = await pool.query(
    'INSERT INTO activity_logs (task_id, member_id, previous_status, new_status) VALUES ($1, $2, $3, $4) RETURNING *',
    [taskId, memberId, previousStatus, newStatus]
  );
  return result.rows[0];
}

async function getLogsByTeam(teamId) {
  const result = await pool.query(
    `SELECT
       al.id,
       al.task_id,
       t.title AS task_title,
       al.member_id,
       m.name AS member_name,
       al.previous_status,
       al.new_status,
       al.changed_at
     FROM activity_logs al
     JOIN tasks t ON t.id = al.task_id
     LEFT JOIN members m ON m.id = al.member_id
     WHERE t.team_id = $1
     ORDER BY al.changed_at DESC, al.id DESC`,
    [teamId]
  );
  return result.rows;
}

module.exports = { createLog, getLogsByTeam };
