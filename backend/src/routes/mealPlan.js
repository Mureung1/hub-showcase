import { Router } from 'express';
import * as mealPlanController from '../controllers/mealPlanController.js';

const router = Router();

router.get('/candidates', mealPlanController.getCandidates);
router.post('/weekly', mealPlanController.buildWeekly);
router.post('/shopping-list', mealPlanController.getMealShoppingList);

export default router;
