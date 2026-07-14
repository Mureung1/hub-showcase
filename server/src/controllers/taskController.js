const taskModel = require('../models/taskModel');
const CURRENT_TEAM_ID = require('../currentTeamId');

const VALID_STATUSES = ['pending', 'in_progress', 'done'];

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

function updateStatus(req, res) {
  const taskId = Number(req.params.id);
  const { status, memberId } = req.body;

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: '올바르지 않은 상태입니다.' });
  }

  const task = taskModel.getTaskById(taskId);
  if (!task) {
    return res.status(404).json({ error: '태스크를 찾을 수 없습니다.' });
  }

  const hasAssignee = task.assignee_id !== null;
  const isAssignee = hasAssignee && Number(memberId) === task.assignee_id;

  if (hasAssignee && !isAssignee) {
    return res.status(403).json({ error: '담당자만 상태를 변경할 수 있습니다.' });
  }

  const updated = taskModel.updateStatus(taskId, status);
  res.json(updated);
}

module.exports = { listTasks, addTask, updateStatus };
