const express = require('express');
const taskController = require('../controllers/taskController');

const router = express.Router();

// 고정 경로(/archived, /:id/restore 등)는 /:id 같은 동적 라우트보다 먼저 와야 함
router.get('/archived', taskController.listArchivedTasks);
router.get('/', taskController.listTasks);
router.post('/', taskController.addTask);
router.patch('/:id/due-date', taskController.updateDueDate);
router.patch('/:id/title', taskController.updateTitle);
router.patch('/:id/assignee', taskController.updateAssignee);
router.patch('/:id/restore', taskController.restoreTask);
router.patch('/:id', taskController.updateStatus);
router.delete('/:id', taskController.archiveTask);

module.exports = router;
