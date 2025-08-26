import { Router } from 'express';
import { generateAd } from '../controllers/geminiController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All Gemini routes should be protected to prevent abuse
router.use(authMiddleware);

router.post('/generate-ad', generateAd);

export default router;
