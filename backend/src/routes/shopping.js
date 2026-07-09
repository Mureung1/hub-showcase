import { Router } from 'express';
import * as shoppingController from '../controllers/shoppingController.js';

const router = Router();

router.get('/sets', shoppingController.getShoppingSets);
router.get('/list', shoppingController.getShoppingList);

export default router;
