import express from 'express';
// FIX: Added getStats to the import list.
import { getAds, getUsers, deleteAd, deleteUser, getStats, updateAd, updateUser, getAnalytics, getSettings, updateSettings } from '../controllers/adminController.js';
import { adminAuthMiddleware } from '../middleware/adminAuth.js';

const router = express.Router();

// Protect all admin routes
router.use(adminAuthMiddleware);

// Add a new route for the admin dashboard statistics.
router.get('/stats', getStats);
router.get('/analytics', getAnalytics);

// Settings routes
router.get('/settings', getSettings);
router.put('/settings', updateSettings);


router.get('/users', getUsers);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

router.get('/ads', getAds);
router.put('/ads/:id', updateAd);
router.delete('/ads/:id', deleteAd);

export default router;