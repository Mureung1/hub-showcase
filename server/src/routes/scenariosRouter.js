import { Router } from 'express';
import { getScenarios, getScenario } from '../controllers/scenariosController.js';

const router = Router();

router.get('/', getScenarios);
router.get('/:id', getScenario);

export default router;
