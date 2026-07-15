import { Router } from 'express';
import * as ingredientsController from '../controllers/ingredientsController.js';

const router = Router();

router.get('/', ingredientsController.getIngredients);

export default router;
