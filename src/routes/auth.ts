
import express from 'express';
import { register, login, telegramLogin, redeemWebCode } from '../controllers/authController.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/telegram', telegramLogin);
router.post('/redeem-code', redeemWebCode);

export default router;
