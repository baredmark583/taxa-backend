import express from 'express';
// Import formidable for file uploads
import formidable from 'express-formidable';
// FIX: Changed import to add getAdById controller function.
import { getAllAds, createAd, getAdById, updateAdStatus, updateAd } from '../controllers/adController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Middleware for parsing multipart/form-data, including file uploads
const formidableMiddleware = formidable({
    uploadDir: './temp_uploads', // A temporary directory for uploads
    keepExtensions: true,
    // Set a max file size to prevent large uploads (e.g., 10MB)
    maxFileSize: 10 * 1024 * 1024
});


router.get('/', getAllAds);
// FIX: Use formidable middleware to handle file uploads instead of relying on base64 in JSON.
router.post('/', authMiddleware, formidableMiddleware, createAd);
// Add a new route to get a single ad by its ID for deeplinking.
router.get('/:id', getAdById);
// FIX: Use formidable middleware for updates as well.
router.put('/:id', authMiddleware, formidableMiddleware, updateAd);
router.put('/:id/status', authMiddleware, updateAdStatus);


export default router;