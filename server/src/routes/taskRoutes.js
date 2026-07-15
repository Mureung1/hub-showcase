const express = require('express');
const taskController = require('../controllers/taskController');

const router = express.Router();

router.get('/', taskController.listTasks);
router.post('/', taskController.addTask);
router.patch('/:id', taskController.updateStatus);
router.patch('/:id/due-date', taskController.updateDueDate);
router.delete('/:id', taskController.archiveTask);

module.exports = router;
