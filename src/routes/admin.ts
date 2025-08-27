import express from 'express';
import { getAds, getUsers, deleteAd, deleteUser } from '../controllers/adminController.js';
import { adminAuthMiddleware } from '../middleware/adminAuth.js';

const router = express.Router();

// Protect all admin routes
router.use(adminAuthMiddleware);

router.get('/users', getUsers);
router.delete('/users/:id', deleteUser);

router.get('/ads', getAds);
router.delete('/ads/:id', deleteAd);

export default router;
