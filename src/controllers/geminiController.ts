// FIX: Import 'express' module to use explicit types like express.Response, avoiding conflicts with global DOM types.
// FIX: Import specific types from express to avoid global conflicts
import { Response } from 'express';
import { type AuthRequest } from '../middleware/auth.js';
import { generateAdDetailsFromImage } from '../services/geminiService.js';

// FIX: Use explicit express types for request and response handlers. AuthRequest is correctly typed from its definition.
// FIX: Use explicit Response type from express import
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