import { Router } from 'express';
import * as recipesController from '../controllers/recipesController.js';

const router = Router();

router.get('/', recipesController.listRecipes);
router.get('/:id', recipesController.getRecipeDetail);
router.post('/:id/cook-done', recipesController.cookDone);

export default router;
