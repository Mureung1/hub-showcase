const pool = require('../db');

async function getActiveTasks(teamId) {
  const result = await pool.query(
    'SELECT * FROM tasks WHERE team_id = $1 AND archived = false ORDER BY created_at DESC',
    [teamId]
  );
  return result.rows;
}

async function createTask({ teamId, title, assigneeId, dueDate }) {
  const result = await pool.query(
    'INSERT INTO tasks (team_id, title, assignee_id, due_date) VALUES ($1, $2, $3, $4) RETURNING *',
    [teamId, title, assigneeId, dueDate]
  );
  return result.rows[0];
}

async function getTaskById(id) {
  const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
  return result.rows[0];
}

async function updateStatus(id, status) {
  const result = await pool.query(
    'UPDATE tasks SET status = $1 WHERE id = $2 RETURNING *',
    [status, id]
  );
  return result.rows[0];
}

async function archiveTask(id) {
  const result = await pool.query(
    'UPDATE tasks SET archived = true WHERE id = $1 RETURNING *',
    [id]
  );
  return result.rows[0];
}

async function updateDueDate(id, dueDate) {
  const result = await pool.query(
    'UPDATE tasks SET due_date = $1 WHERE id = $2 RETURNING *',
    [dueDate, id]
  );
  return result.rows[0];
}

module.exports = { getActiveTasks, createTask, getTaskById, updateStatus, archiveTask, updateDueDate };
