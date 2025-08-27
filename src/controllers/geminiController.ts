// FIX: Use a default import for express and explicit types (e.g., express.Response) to avoid conflicts with global DOM types.
// FIX: Use fully-qualified express.Response to resolve conflicts.
// FIX: Use named import for Response to resolve type conflicts with global DOM types.
import { Response } from 'express';
import { type AuthRequest } from '../middleware/auth.js';
import { generateAdDetailsFromImage } from '../services/geminiService.js';

// FIX: Use explicit express types for request and response handlers. AuthRequest is correctly typed from its definition.
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