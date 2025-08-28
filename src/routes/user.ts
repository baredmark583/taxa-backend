import express from 'express';
import { addFavorite, getFavoriteAdIds, removeFavorite, getFavoriteAds } from '../controllers/userController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// All user routes should be protected
router.use(authMiddleware);

router.get('/me/favorites/ids', getFavoriteAdIds);
router.get('/me/favorites', getFavoriteAds);
router.post('/me/favorites/:adId', addFavorite);
router.delete('/me/favorites/:adId', removeFavorite);

export default router;
