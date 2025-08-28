import express from 'express';
import { getAllAds, createAd, getAdById, updateAdStatus, updateAd } from '../controllers/adController.js';
import { authMiddleware } from '../middleware/auth.js';
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


export default router;