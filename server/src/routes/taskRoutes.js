const express = require('express');
const taskController = require('../controllers/taskController');

const router = express.Router();

router.get('/', taskController.listTasks);
router.post('/', taskController.addTask);

module.exports = router;
