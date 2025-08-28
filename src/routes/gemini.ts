import express from 'express';
// FIX: Added editImage to imports.
import { generateAd, editImage } from '../controllers/geminiController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// All Gemini routes should be protected to prevent abuse
// FIX: Correctly typing the middleware in auth.ts resolves the 'No overload matches this call' error here.
router.use(authMiddleware);

router.post('/generate-ad', generateAd);
// Add a new route for image editing.
router.post('/edit-image', editImage);

export default router;