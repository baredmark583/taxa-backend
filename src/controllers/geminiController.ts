

// FIX: Replaced named express imports with a default import to resolve type conflicts.
import express from 'express';
import { type AuthRequest } from '../middleware/auth.js';
import { generateAdDetailsFromImage } from '../services/geminiService.js';

// FIX: Use explicit express types for request and response handlers. AuthRequest is correctly typed from its definition.
// FIX: Use fully-qualified express.Response type.
// FIX: Use explicit AuthRequest and Response types.
// FIX: Use explicit Response type from express to resolve property access errors.
// FIX: Using fully qualified express types to resolve property access errors.
// FIX: Use `express` namespace for types to avoid conflicts with global DOM types.
// FIX: Use qualified express.Response to fix property access errors.
// FIX: Use named express types to resolve property access errors.
// FIX: Use qualified express types to resolve property access errors.
// FIX: Use named imports for Express types to resolve property access errors.
// FIX: Use qualified express types to resolve property access errors.
// FIX: Switched to qualified express types to prevent conflicts with global DOM types.
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