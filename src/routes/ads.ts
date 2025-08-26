import express from 'express';
import { getAllAds, createAd } from '../controllers/adController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getAllAds);
// FIX: Type mismatches in authMiddleware and createAd were resolved in their respective files, fixing this call.
router.post('/', authMiddleware, createAd);

export default router;