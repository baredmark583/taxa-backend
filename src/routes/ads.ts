// FIX: Use default express import to resolve type errors.
// FIX: Import Response and NextFunction types directly for the error handler.
import express from 'express';
import { getAllAds, createAd, getAdById, updateAdStatus, updateAd, getAdStatsByRegion } from '../controllers/adController.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { upload } from '../services/cloudinaryService.js';


const router = express.Router();

router.get('/', getAllAds);
router.get('/stats-by-region', getAdStatsByRegion); // New route for map data

// Use multer middleware to handle file uploads directly to Cloudinary
router.post('/', authMiddleware, upload.array('images', 10), createAd);
// Add a new route to get a single ad by its ID for deeplinking.
router.get('/:id', getAdById);
// Use multer for updates as well, handling new images.
router.put('/:id', authMiddleware, upload.array('images', 10), updateAd);
router.put('/:id/status', authMiddleware, updateAdStatus);

// Custom error handler for multer/cloudinary errors on this router.
// This will catch errors from the `upload.array()` middleware.
// FIX: Use qualified express types to fix property access errors.
// FIX: Use qualified express types (express.Response, express.NextFunction) to fix property access errors.
// FIX: Use imported Response and NextFunction types for the error handler signature.
// FIX: Use qualified express types to resolve property access errors.
router.use((err: Error, req: AuthRequest, res: express.Response, next: express.NextFunction) => {
    if (err) {
        console.error('File Upload Error:', err.message);
        // Provide a more specific error message if possible.
        // Cloudinary storage errors often contain informative messages.
        return res.status(500).json({ 
            message: `Помилка завантаження файлу: ${err.message}. Перевірте налаштування сервера (наприклад, Cloudinary).` 
        });
    }
    next();
});


export default router;