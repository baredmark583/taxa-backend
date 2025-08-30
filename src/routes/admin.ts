import express from 'express';
import { 
    getAds, getUsers, deleteAd, deleteUser, getStats, updateAd, updateUser, getAnalytics, 
    getSettings, updateSettings, getBanner, updateBanner, getCategories, createCategory,
    updateCategory, deleteCategory
} from '../controllers/adminController.js';
import { adminAuthMiddleware } from '../middleware/adminAuth.js';
import { upload } from '../services/cloudinaryService.js';

const router = express.Router();

// Public route for banner
router.get('/banner', getBanner);

// Protect all following admin routes
router.use(adminAuthMiddleware);

// Dashboard routes
router.get('/stats', getStats);
router.get('/analytics', getAnalytics);

// Settings routes
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// Banner management
router.post('/banner', upload.single('image'), updateBanner);

// Category management
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// User management
router.get('/users', getUsers);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Ad management
router.get('/ads', getAds);
router.put('/ads/:id', updateAd);
router.delete('/ads/:id', deleteAd);

export default router;