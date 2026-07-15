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

function getTaskById(id) {
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
}

function updateStatus(id, status) {
  db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run(status, id);
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
}

function archiveTask(id) {
  db.prepare('UPDATE tasks SET archived = 1 WHERE id = ?').run(id);
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
}

function updateDueDate(id, dueDate) {
  db.prepare('UPDATE tasks SET due_date = ? WHERE id = ?').run(dueDate, id);
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
}

module.exports = { getActiveTasks, createTask, getTaskById, updateStatus, archiveTask, updateDueDate };
