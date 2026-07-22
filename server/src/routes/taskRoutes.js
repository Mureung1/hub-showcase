const express = require('express');
const taskController = require('../controllers/taskController');

const router = express.Router();

router.get('/', taskController.listTasks);
router.get('/archived', taskController.listArchivedTasks);
router.post('/', taskController.addTask);
router.patch('/:id', taskController.updateStatus);
router.patch('/:id/due-date', taskController.updateDueDate);
router.patch('/:id/title', taskController.updateTitle);
router.patch('/:id/assignee', taskController.updateAssignee);
router.patch('/:id/restore', taskController.restoreTask);
router.delete('/:id', taskController.archiveTask);

module.exports = router;
