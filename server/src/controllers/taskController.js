const taskModel = require('../models/taskModel');
const activityLogModel = require('../models/activityLogModel');
const CURRENT_TEAM_ID = require('../currentTeamId');

const VALID_STATUSES = ['pending', 'in_progress', 'done'];

function canMemberChange(task, memberId) {
  return task.assignee_id === null || memberId === task.assignee_id;
}

function getTodayDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function listTasks(req, res) {
  try {
    const tasks = await taskModel.getActiveTasks(CURRENT_TEAM_ID);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function listArchivedTasks(req, res) {
  try {
    const tasks = await taskModel.getArchivedTasks(CURRENT_TEAM_ID);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function addTask(req, res) {
  const { title, assigneeId, dueDate } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: '제목은 필수입니다.' });
  }

  if (dueDate && dueDate < getTodayDateString()) {
    return res.status(400).json({ error: '마감일은 오늘 이후여야 합니다.' });
  }

  try {
    const task = await taskModel.createTask({
      teamId: CURRENT_TEAM_ID,
      title: title.trim(),
      assigneeId: assigneeId || null,
      dueDate: dueDate || null,
    });
    res.status(201).json(task);
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({ error: '존재하지 않는 담당자입니다.' });
    }
    res.status(500).json({ error: err.message });
  }
}

async function updateStatus(req, res) {
  const taskId = Number(req.params.id);
  const { status } = req.body;
  const memberId = req.body.memberId != null ? Number(req.body.memberId) : null;

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: '올바르지 않은 상태입니다.' });
  }

  try {
    const task = await taskModel.getTaskById(taskId);
    if (!task) {
      return res.status(404).json({ error: '태스크를 찾을 수 없습니다.' });
    }

    if (!canMemberChange(task, memberId)) {
      return res.status(403).json({ error: '담당자만 상태를 변경할 수 있습니다.' });
    }

    const previousStatus = task.status;
    const updated = await taskModel.updateStatus(taskId, status);

    if (previousStatus !== status) {
      await activityLogModel.createLog({
        taskId,
        memberId,
        previousStatus,
        newStatus: status,
      });
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function archiveTask(req, res) {
  const taskId = Number(req.params.id);
  const memberId = req.body.memberId != null ? Number(req.body.memberId) : null;

  try {
    const task = await taskModel.getTaskById(taskId);
    if (!task) {
      return res.status(404).json({ error: '태스크를 찾을 수 없습니다.' });
    }

    if (!canMemberChange(task, memberId)) {
      return res.status(403).json({ error: '담당자만 삭제할 수 있습니다.' });
    }

    const archived = await taskModel.archiveTask(taskId);
    res.json(archived);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateDueDate(req, res) {
  const taskId = Number(req.params.id);
  const memberId = req.body.memberId != null ? Number(req.body.memberId) : null;
  const dueDate = req.body.dueDate || null;

  if (dueDate && dueDate < getTodayDateString()) {
    return res.status(400).json({ error: '마감일은 오늘 이후여야 합니다.' });
  }

  try {
    const task = await taskModel.getTaskById(taskId);
    if (!task) {
      return res.status(404).json({ error: '태스크를 찾을 수 없습니다.' });
    }

    if (!canMemberChange(task, memberId)) {
      return res.status(403).json({ error: '담당자만 마감일을 수정할 수 있습니다.' });
    }

    const updated = await taskModel.updateDueDate(taskId, dueDate);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateTitle(req, res) {
  const taskId = Number(req.params.id);
  const memberId = req.body.memberId != null ? Number(req.body.memberId) : null;
  const title = (req.body.title || '').trim();

  if (!title) {
    return res.status(400).json({ error: '제목은 필수입니다.' });
  }

  try {
    const task = await taskModel.getTaskById(taskId);
    if (!task) {
      return res.status(404).json({ error: '태스크를 찾을 수 없습니다.' });
    }

    if (!canMemberChange(task, memberId)) {
      return res.status(403).json({ error: '담당자만 제목을 수정할 수 있습니다.' });
    }

    const updated = await taskModel.updateTitle(taskId, title);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateAssignee(req, res) {
  const taskId = Number(req.params.id);
  const memberId = req.body.memberId != null ? Number(req.body.memberId) : null;
  const assigneeId = req.body.assigneeId != null ? Number(req.body.assigneeId) : null;

  try {
    const task = await taskModel.getTaskById(taskId);
    if (!task) {
      return res.status(404).json({ error: '태스크를 찾을 수 없습니다.' });
    }

    if (!canMemberChange(task, memberId)) {
      return res.status(403).json({ error: '담당자만 담당자를 지정할 수 있습니다.' });
    }

    const updated = await taskModel.updateAssignee(taskId, assigneeId);
    res.json(updated);
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({ error: '존재하지 않는 담당자입니다.' });
    }
    res.status(500).json({ error: err.message });
  }
}

async function restoreTask(req, res) {
  const taskId = Number(req.params.id);
  const memberId = req.body.memberId != null ? Number(req.body.memberId) : null;

  try {
    const task = await taskModel.getTaskById(taskId);
    if (!task) {
      return res.status(404).json({ error: '태스크를 찾을 수 없습니다.' });
    }

    if (!canMemberChange(task, memberId)) {
      return res.status(403).json({ error: '담당자만 복원할 수 있습니다.' });
    }

    const restored = await taskModel.restoreTask(taskId);
    res.json(restored);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  listTasks,
  listArchivedTasks,
  addTask,
  updateStatus,
  archiveTask,
  updateDueDate,
  updateTitle,
  updateAssignee,
  restoreTask,
};
