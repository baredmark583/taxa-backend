// routes/chat.ts
import express from 'express';
import { getConversations, getMessages, sendMessage } from '../controllers/chatController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// All chat routes are protected
router.use(authMiddleware);

router.get('/conversations', getConversations);
router.get('/messages/:adId/:participantId', getMessages);
router.post('/messages', sendMessage);

export default router;
