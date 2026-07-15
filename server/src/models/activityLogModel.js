const db = require('../db');

function createLog({ taskId, memberId, previousStatus, newStatus }) {
  db.prepare(
    'INSERT INTO activity_logs (task_id, member_id, previous_status, new_status) VALUES (?, ?, ?, ?)'
  ).run(taskId, memberId, previousStatus, newStatus);
}

module.exports = { createLog };
