





// FIX: Corrected express import to use require syntax for proper CJS module type resolution.
import express = require('express');
import { type AuthRequest } from '../middleware/auth';
import { generateAdDetailsFromImage } from '../services/geminiService';

// Use standard express Response type. The AuthRequest type is correctly typed from its source.
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