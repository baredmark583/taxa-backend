import express from 'express';
import { generateAd } from '../controllers/geminiController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// All Gemini routes should be protected to prevent abuse
// FIX: Correctly typing the middleware in auth.ts resolves the 'No overload matches this call' error here.
router.use(authMiddleware);

router.post('/generate-ad', generateAd);

export default router;