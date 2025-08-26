import express from 'express';
import { generateAd } from '../controllers/geminiController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// All Gemini routes should be protected to prevent abuse
router.use(authMiddleware);

router.post('/generate-ad', generateAd);

export default router;