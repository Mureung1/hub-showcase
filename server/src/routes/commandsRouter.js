import { Router } from 'express';
import { getCommands, getCommand } from '../controllers/commandsController.js';

const router = Router();

router.get('/', getCommands);
router.get('/:id', getCommand);

export default router;
