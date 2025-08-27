// FIX: Use explicit type imports from express to avoid conflicts with global DOM types.
import { Response as ExpressResponse } from 'express';
import { type AuthRequest } from '../middleware/auth.js';
import { generateAdDetailsFromImage } from '../services/geminiService.js';

// Use Express's built-in types for request and response handlers.
// FIX: Use aliased Response from express for correct types. AuthRequest is correctly typed from its definition.
export const generateAd = async (req: AuthRequest, res: ExpressResponse) => {
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