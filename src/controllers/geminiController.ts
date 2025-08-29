

// FIX: Switched to default express import and qualified types (express.Request, express.Response) to resolve property access errors from potential type conflicts.
// FIX: Switched to default express import and qualified express.Response type to fix errors.
// FIX: Import Response from express to resolve type errors.
// FIX: Use qualified express types to avoid conflicts with global types.
// FIX: Import Response type directly from express to resolve type errors.
// FIX: Switched to default express import and qualified express.Response type to resolve property access errors from potential type conflicts.
import express from 'express';
import { type AuthRequest } from '../middleware/auth.js';
// FIX: Added editImageWithGemini to imports.
import { generateAdDetailsFromImage, editImageWithGemini } from '../services/geminiService.js';
import { log } from '../utils/logger.js';

// FIX: Use qualified express types to resolve type conflicts.
export const generateAd = async (req: AuthRequest, res: express.Response) => {
    const CONTEXT = 'geminiController:generateAd';
    const { prompt, imageBase64, mimeType } = req.body;
    log.info(CONTEXT, 'Received request to generate ad details from image.', { prompt, mimeType });
    
    if (!prompt || !imageBase64 || !mimeType) {
        log.error(CONTEXT, 'Request is missing required fields.');
        return res.status(400).json({ message: 'Prompt, image, and mimeType are required.' });
    }

    try {
        const adDetails = await generateAdDetailsFromImage(prompt, imageBase64, mimeType);
        log.info(CONTEXT, 'Successfully generated ad details.', { adDetails });
        res.status(200).json(adDetails);
    } catch (error) {
        log.error(CONTEXT, 'Failed to generate ad details from AI.', error);
        res.status(500).json({ message: (error as Error).message || 'Failed to generate ad details from AI.' });
    }
};

// Add a new controller for image editing.
// FIX: Use qualified express types to resolve type conflicts.
export const editImage = async (req: AuthRequest, res: express.Response) => {
    const CONTEXT = 'geminiController:editImage';
    const { imageBase64, mimeType, editType } = req.body as { imageBase64: string, mimeType: string, editType: 'background' | 'enhance' };
    log.info(CONTEXT, 'Received request to edit an image.', { editType, mimeType });

    if (!imageBase64 || !mimeType || !editType) {
        log.error(CONTEXT, 'Request is missing required fields for image editing.');
        return res.status(400).json({ message: 'Image, mimeType, and editType are required.' });
    }
    
    let editPrompt = '';
    if (editType === 'background') {
        editPrompt = 'Critically important: Replace the background of the main object with a clean, solid, professional-looking white background. Do not alter the main object.';
    } else if (editType === 'enhance') {
        editPrompt = 'Enhance the quality of this image. Improve brightness, contrast, and sharpness to make it look more professional and appealing. Do not change the content of the image.';
    } else {
        log.error(CONTEXT, 'Invalid editType provided.', { editType });
        return res.status(400).json({ message: 'Invalid editType.' });
    }
    log.debug(CONTEXT, 'Generated Gemini prompt for image editing.', { editPrompt });

    try {
        const editedImage = await editImageWithGemini(imageBase64, mimeType, editPrompt);
        log.info(CONTEXT, 'Successfully edited image with Gemini.');
        // Don't log the full base64 string, just the success and mimeType
        res.status(200).json({ imageBase64: editedImage.imageBase64, mimeType: editedImage.mimeType });
    } catch (error) {
        log.error(CONTEXT, 'Failed to edit image with AI.', error);
        res.status(500).json({ message: (error as Error).message || 'Failed to edit image with AI.' });
    }
};