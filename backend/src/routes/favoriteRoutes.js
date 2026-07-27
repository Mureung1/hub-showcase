import express from 'express';

import { createFavorite, deleteFavorite } from '../controllers/favoriteController.js';

const router = express.Router();

router.post('/', createFavorite);
router.delete('/', deleteFavorite);

export default router;
