import express from 'express';
// FIX: Changed import to add getAdById controller function.
import { getAllAds, createAd, getAdById, updateAdStatus } from '../controllers/adController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getAllAds);
// FIX: Type mismatches in authMiddleware and createAd were resolved in their respective files, fixing this call.
router.post('/', authMiddleware, createAd);
// Add a new route to get a single ad by its ID for deeplinking.
router.get('/:id', getAdById);
router.put('/:id/status', authMiddleware, updateAdStatus);


export default router;