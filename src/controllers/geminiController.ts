
// FIX: Use named type imports to resolve persistent type resolution issues.
import { type Response } from 'express';
import { type AuthRequest } from '../middleware/auth.js';
// FIX: Added editImageWithGemini to imports.
import { generateAdDetailsFromImage, editImageWithGemini } from '../services/geminiService.js';

// FIX: Use qualified express types for request and response handlers.
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

// Add a new controller for image editing.
export const editImage = async (req: AuthRequest, res: Response) => {
    const { imageBase64, mimeType, editType } = req.body as { imageBase64: string, mimeType: string, editType: 'background' | 'enhance' };

    if (!imageBase64 || !mimeType || !editType) {
        return res.status(400).json({ message: 'Image, mimeType, and editType are required.' });
    }
    
    let editPrompt = '';
    if (editType === 'background') {
        editPrompt = 'Critically important: Replace the background of the main object with a clean, solid, professional-looking white background. Do not alter the main object.';
    } else if (editType === 'enhance') {
        editPrompt = 'Enhance the quality of this image. Improve brightness, contrast, and sharpness to make it look more professional and appealing. Do not change the content of the image.';
    } else {
        return res.status(400).json({ message: 'Invalid editType.' });
    }

    try {
        const editedImage = await editImageWithGemini(imageBase64, mimeType, editPrompt);
        res.status(200).json(editedImage);
    } catch (error) {
        console.error("Gemini image editing failed:", error);
        res.status(500).json({ message: (error as Error).message || 'Failed to edit image with AI.' });
    }
};