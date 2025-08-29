
// FIX: Use default express import for correct type resolution.
// FIX: Use default express import to resolve type errors.
// FIX: Use default express import to resolve type conflicts.
// FIX: Switched to default express import and qualified types.
// FIX: Import Response and NextFunction from express to resolve type errors.
// FIX: Use qualified express types to avoid conflicts with global types.
// FIX: Import Response and NextFunction types directly from express to resolve type errors.
// FIX: Switched to default express import and qualified types (express.Response, express.NextFunction) to resolve property access errors and handler overload errors.
// FIX: Import Response and NextFunction directly from express to resolve type conflicts.
import express, { Response, NextFunction } from 'express';
import { getAllAds, createAd, getAdById, updateAdStatus, updateAd } from '../controllers/adController.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { upload } from '../services/cloudinaryService.js';


const router = express.Router();

router.get('/', getAllAds);
// Use multer middleware to handle file uploads directly to Cloudinary
router.post('/', authMiddleware, upload.array('images', 10), createAd);
// Add a new route to get a single ad by its ID for deeplinking.
router.get('/:id', getAdById);
// Use multer for updates as well, handling new images.
router.put('/:id', authMiddleware, upload.array('images', 10), updateAd);
router.put('/:id/status', authMiddleware, updateAdStatus);

// Custom error handler for multer/cloudinary errors on this router.
// This will catch errors from the `upload.array()` middleware.
// FIX: Use qualified express types to resolve type conflicts.
// FIX: Use imported Response and NextFunction types.
router.use((err: Error, req: AuthRequest, res: Response, next: NextFunction) => {
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