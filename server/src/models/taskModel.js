const db = require('../db');

function getActiveTasks(teamId) {
  return db
    .prepare('SELECT * FROM tasks WHERE team_id = ? AND archived = 0 ORDER BY created_at DESC')
    .all(teamId);
}

function createTask({ teamId, title, assigneeId, dueDate }) {
  const result = db
    .prepare('INSERT INTO tasks (team_id, title, assignee_id, due_date) VALUES (?, ?, ?, ?)')
    .run(teamId, title, assigneeId, dueDate);

  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
}

module.exports = { getActiveTasks, createTask };
