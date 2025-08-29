
import express from 'express';
import { addFavorite, getFavoriteAdIds, removeFavorite, getFavoriteAds, generateWebCode } from '../controllers/userController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// All user routes should be protected
// FIX: Correctly typing the middleware in auth.ts resolves the 'No overload matches this call' error here.
router.use(authMiddleware);

router.get('/me/favorites/ids', getFavoriteAdIds);
router.get('/me/favorites', getFavoriteAds);
router.post('/me/favorites/:adId', addFavorite);
router.delete('/me/favorites/:adId', removeFavorite);
router.post('/me/generate-web-code', generateWebCode);


export default router;
