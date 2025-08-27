import express from 'express';
import { register, login, telegramLogin } from '../controllers/authController.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/telegram', telegramLogin);

export default router;