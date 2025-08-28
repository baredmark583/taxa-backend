




// controllers/chatController.ts
// FIX: Replaced named type imports with a default import to use qualified types (e.g., `express.Response`) and resolve type conflicts.
import express from 'express';
import pool from '../db.js';
import cuid from 'cuid';
import { type AuthRequest } from '../middleware/auth.js';
import { sendTelegramNotification } from '../services/notificationService.js';
import { sendMessageToUser } from '../services/websocketService.js';

// Get all conversations for the current user
// FIX: Use qualified express types for request and response handlers to resolve property errors.
export const getConversations = async (req: AuthRequest, res: express.Response) => {
    const userId = req.user?.id;

    const query = `
        WITH LastMessages AS (
            SELECT
                "adId",
                LEAST("senderId", "receiverId") as user1,
                GREATEST("senderId", "receiverId") as user2,
                MAX("createdAt") as last_message_time
            FROM "ChatMessage"
            WHERE "senderId" = $1 OR "receiverId" = $1
            GROUP BY "adId", user1, user2
        )
        SELECT
            cm.text as "lastMessageText",
            cm."createdAt" as "lastMessageAt",
            cm."isRead",
            cm."senderId",
            a.id as "adId",
            a.title as "adTitle",
            a."imageUrls" as "adImageUrls",
            p.id as "participantId",
            p.name as "participantName",
            p."avatarUrl" as "participantAvatarUrl"
        FROM LastMessages lm
        JOIN "ChatMessage" cm ON lm.last_message_time = cm."createdAt"
            AND lm."adId" = cm."adId"
            AND LEAST(cm."senderId", cm."receiverId") = lm.user1
            AND GREATEST(cm."senderId", cm."receiverId") = lm.user2
        JOIN "Ad" a ON lm."adId" = a.id
        JOIN "User" p ON p.id = CASE WHEN lm.user1 = $1 THEN lm.user2 ELSE lm.user1 END
        ORDER BY cm."createdAt" DESC;
    `;

    try {
        const result = await pool.query(query, [userId]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({ message: 'Failed to fetch conversations' });
    }
};

// Get all messages for a specific conversation (ad + other user)
// FIX: Use qualified express types for request and response handlers to resolve property errors.
export const getMessages = async (req: AuthRequest, res: express.Response) => {
    const userId = req.user?.id;
    const { adId, participantId } = req.params;

    const query = `
        SELECT cm.*, s.name as "senderName", s."avatarUrl" as "senderAvatar"
        FROM "ChatMessage" cm
        JOIN "User" s ON cm."senderId" = s.id
        WHERE cm."adId" = $1
          AND ( (cm."senderId" = $2 AND cm."receiverId" = $3) OR
                (cm."senderId" = $3 AND cm."receiverId" = $2) )
        ORDER BY cm."createdAt" ASC;
    `;

    try {
        const result = await pool.query(query, [adId, userId, participantId]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ message: 'Failed to fetch messages' });
    }
};

// Send a new message
// FIX: Use qualified express types for request and response handlers to resolve property errors.
export const sendMessage = async (req: AuthRequest, res: express.Response) => {
    const senderId = req.user?.id;
    const { adId, receiverId, text } = req.body;

    if (!adId || !receiverId || !text) {
        return res.status(400).json({ message: 'adId, receiverId, and text are required' });
    }

    try {
        const messageId = cuid();
        const result = await pool.query(
            `INSERT INTO "ChatMessage" (id, text, "senderId", "receiverId", "adId")
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [messageId, text, senderId, receiverId, adId]
        );
        
        const newMessage = result.rows[0];
        
        // Immediately respond to the sender
        res.status(201).json(newMessage);

        // Asynchronously push updates without blocking the response
        (async () => {
            try {
                // Fetch sender info for a richer payload in WebSocket
                const senderResult = await pool.query('SELECT name, "avatarUrl" FROM "User" WHERE id = $1', [senderId]);
                const fullMessagePayload = {
                    ...newMessage,
                    senderName: senderResult.rows[0].name,
                    senderAvatar: senderResult.rows[0].avatarUrl
                };

                // Send real-time message via WebSocket
                sendMessageToUser(receiverId, fullMessagePayload);

                // Send Telegram notification as a fallback
                const receiverResult = await pool.query('SELECT "telegramId" FROM "User" WHERE id = $1', [receiverId]);
                const adResult = await pool.query('SELECT title FROM "Ad" WHERE id = $1', [adId]);

                if (receiverResult.rows.length > 0 && receiverResult.rows[0].telegramId && adResult.rows.length > 0) {
                    const receiverTelegramId = receiverResult.rows[0].telegramId;
                    const adTitle = adResult.rows[0].title;
                    const notificationMessage = `У вас нове повідомлення по оголошенню "${adTitle}"! 📬`;
                    
                    await sendTelegramNotification(receiverTelegramId, notificationMessage, adId);
                }
            } catch (notificationError) {
                console.error('Failed to send notifications:', notificationError);
            }
        })();

    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ message: 'Failed to send message' });
    }
};
