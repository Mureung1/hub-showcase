const taskModel = require('../models/taskModel');
const CURRENT_TEAM_ID = require('../currentTeamId');

function listTasks(req, res) {
  const tasks = taskModel.getActiveTasks(CURRENT_TEAM_ID);
  res.json(tasks);
}

function addTask(req, res) {
  const { title, assigneeId, dueDate } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: '제목은 필수입니다.' });
  }

  try {
    const task = taskModel.createTask({
      teamId: CURRENT_TEAM_ID,
      title: title.trim(),
      assigneeId: assigneeId || null,
      dueDate: dueDate || null,
    });
    res.status(201).json(task);
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return res.status(400).json({ error: '존재하지 않는 담당자입니다.' });
    }
    throw err;
  }
}

module.exports = { listTasks, addTask };
