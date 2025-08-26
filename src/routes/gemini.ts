import express from 'express';
import { generateAd } from '../controllers/geminiController';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// All Gemini routes should be protected to prevent abuse
router.use(authMiddleware);

router.post('/generate-ad', generateAd);

export default router;