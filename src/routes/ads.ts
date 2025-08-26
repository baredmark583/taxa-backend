import { Router } from 'express';
import { getAllAds, createAd } from '../controllers/adController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/', getAllAds);
router.post('/', authMiddleware, createAd);

export default router;
