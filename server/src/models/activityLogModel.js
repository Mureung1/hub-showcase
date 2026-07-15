const db = require('../db');

function createLog({ taskId, memberId, previousStatus, newStatus }) {
  db.prepare(
    'INSERT INTO activity_logs (task_id, member_id, previous_status, new_status) VALUES (?, ?, ?, ?)'
  ).run(taskId, memberId, previousStatus, newStatus);
}

function getLogsByTeam(teamId) {
  return db
    .prepare(
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
       WHERE t.team_id = ?
       ORDER BY al.changed_at DESC, al.id DESC`
    )
    .all(teamId);
}

module.exports = { createLog, getLogsByTeam };
