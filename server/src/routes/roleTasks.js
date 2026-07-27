import { Router } from 'express'
import { getTasksByRole, createTasks, updateTask, deleteTask } from '../controllers/roleTasksController.js'

const router = Router()

router.get('/:token/roles/:roleId/tasks', getTasksByRole)
router.post('/:token/roles/:roleId/tasks', createTasks)
router.patch('/:token/roles/:roleId/tasks/:taskId', updateTask)
router.delete('/:token/roles/:roleId/tasks/:taskId', deleteTask)

export default router
