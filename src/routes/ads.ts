import express from 'express';
import { getAllAds, createAd } from '../controllers/adController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getAllAds);
router.post('/', authMiddleware, createAd);

export default router;