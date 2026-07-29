import { Router } from 'express'
import { createExpense, getExpenses } from '../controllers/expensesController.js'

const router = Router()

router.post('/:token/expenses', createExpense)
router.get('/:token/expenses', getExpenses)

export default router
