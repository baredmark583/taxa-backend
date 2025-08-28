// FIX: Replaced named type imports with a default import to use qualified types (e.g., `express.Response`) and resolve type conflicts.
import type { Response } from 'express';
import { type AuthRequest } from '../middleware/auth.js';
import { generateAdDetailsFromImage } from '../services/geminiService.js';

// FIX: Use qualified express types for request and response handlers to resolve property errors on `req.body` and `res.status`.
export const generateAd = async (req: AuthRequest, res: Response) => {
    const { prompt, imageBase64, mimeType } = req.body;
    
    if (!prompt || !imageBase64 || !mimeType) {
        return res.status(400).json({ message: 'Prompt, image, and mimeType are required.' });
    }

    try {
        const adDetails = await generateAdDetailsFromImage(prompt, imageBase64, mimeType);
        res.status(200).json(adDetails);
    } catch (error) {
        console.error("Gemini ad generation failed:", error);
        res.status(500).json({ message: (error as Error).message || 'Failed to generate ad details from AI.' });
    }
};