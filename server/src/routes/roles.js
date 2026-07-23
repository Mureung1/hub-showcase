import { Router } from 'express'
import { getRolesByToken, createRole, updateRole } from '../controllers/rolesController.js'

const router = Router()

router.get('/:token/roles', getRolesByToken)
router.post('/:token/roles', createRole)
router.patch('/:token/roles/:roleId', updateRole)

export default router
