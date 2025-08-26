
// FIX: To resolve type conflicts, using types directly from the express default import.
import express from 'express';
import { type AuthRequest } from '../middleware/auth.js';
import { generateAdDetailsFromImage } from '../services/geminiService.js';

// Use Express's built-in types for request and response handlers.
// FIX: Use express.Response for type consistency.
export const generateAd = async (req: AuthRequest, res: express.Response) => {
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