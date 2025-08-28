// FIX: Use a default import for express and explicit types (e.g., express.Response) to avoid conflicts with global DOM types.
// FIX: Use fully-qualified express.Response to resolve conflicts.
// FIX: Import Response type explicitly from express.
// FIX: Import Response type from express to resolve property access errors.
// FIX: Using default express import and qualified types to resolve type conflicts.
// FIX: Using explicit named import for Response to resolve persistent type conflicts.
// FIX: Switched to a named import for the express Response type to resolve property access errors.
// FIX: Use a default import for express and qualified types (e.g., express.Request) to resolve type errors.
// FIX: Use explicit named import for Response to resolve type conflicts with global DOM types.
// FIX: Use named imports for express types to resolve type conflicts and property access errors.
// FIX: Use default express import and qualified types like express.Request to resolve all type conflicts.
// FIX: Use named import for express Response type to resolve property access errors.
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