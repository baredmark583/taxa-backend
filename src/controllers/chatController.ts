




// FIX: Only import types from express, as the default export is not used. This helps avoid potential type conflicts.
import { Response } from 'express';
import { query } from '../db.js';
import cuid from 'cuid';
import { type AuthRequest } from '../middleware/auth.js';
import { sendTelegramNotification } from '../services/notificationService.js';
import { sendMessageToUser } from '../services/websocketService.js';
import { log } from '../utils/logger.js';

// Get all conversations for the current user
export const getConversations = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    const CONTEXT = `chatController:getConversations(${userId})`;
    log.info(CONTEXT, 'Fetching conversations for user.');

    const queryString = `
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
        const result = await query(queryString, [userId]);
        log.info(CONTEXT, `Successfully fetched ${result.rows.length} conversations.`);
        res.status(200).json(result.rows);
    } catch (error) {
        log.error(CONTEXT, 'Failed to fetch conversations.', error);
        res.status(500).json({ message: 'Failed to fetch conversations' });
    }
};

// Get all messages for a specific conversation (ad + other user)
export const getMessages = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    const { adId, participantId } = req.params;
    const CONTEXT = `chatController:getMessages(${userId})`;
    log.info(CONTEXT, 'Fetching messages for conversation.', { adId, participantId });


    const queryString = `
        SELECT cm.*, s.name as "senderName", s."avatarUrl" as "senderAvatar"
        FROM "ChatMessage" cm
        JOIN "User" s ON cm."senderId" = s.id
        WHERE cm."adId" = $1
          AND ( (cm."senderId" = $2 AND cm."receiverId" = $3) OR
                (cm."senderId" = $3 AND cm."receiverId" = $2) )
        ORDER BY cm."createdAt" ASC;
    `;

    try {
        const result = await query(queryString, [adId, userId, participantId]);
        log.info(CONTEXT, `Successfully fetched ${result.rows.length} messages.`);
        res.status(200).json(result.rows);
    } catch (error) {
        log.error(CONTEXT, 'Failed to fetch messages.', error);
        res.status(500).json({ message: 'Failed to fetch messages' });
    }
};

// Send a new message
export const sendMessage = async (req: AuthRequest, res: Response) => {
    const senderId = req.user?.id;
    const { adId, receiverId, text } = req.body;
    const CONTEXT = `chatController:sendMessage(${senderId})`;
    log.info(CONTEXT, 'Attempting to send a new message.', { adId, receiverId });

    if (!adId || !receiverId || !text) {
        log.error(CONTEXT, 'Request is missing required fields.');
        return res.status(400).json({ message: 'adId, receiverId, and text are required' });
    }

    try {
        const messageId = cuid();
        const result = await query(
            `INSERT INTO "ChatMessage" (id, text, "senderId", "receiverId", "adId")
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [messageId, text, senderId, receiverId, adId]
        );
        
        const newMessage = result.rows[0];
        log.info(CONTEXT, 'Message saved to database successfully.', { messageId });
        
        // Immediately respond to the sender
        res.status(201).json(newMessage);

        // Asynchronously push updates without blocking the response
        (async () => {
            const NOTIFICATION_CONTEXT = `${CONTEXT}:notifications`;
            log.info(NOTIFICATION_CONTEXT, 'Starting async notification process.');
            try {
                // Fetch sender info for a richer payload in WebSocket
                const senderResult = await query('SELECT name, "avatarUrl" FROM "User" WHERE id = $1', [senderId]);
                const fullMessagePayload = {
                    ...newMessage,
                    senderName: senderResult.rows[0].name,
                    senderAvatar: senderResult.rows[0].avatarUrl
                };

                // Send real-time message via WebSocket
                sendMessageToUser(receiverId, fullMessagePayload);

                // Send Telegram notification as a fallback
                const receiverResult = await query('SELECT "telegramId" FROM "User" WHERE id = $1', [receiverId]);
                const adResult = await query('SELECT title FROM "Ad" WHERE id = $1', [adId]);

                if (receiverResult.rows.length > 0 && receiverResult.rows[0].telegramId && adResult.rows.length > 0) {
                    const receiverTelegramId = receiverResult.rows[0].telegramId;
                    const adTitle = adResult.rows[0].title;
                    const notificationMessage = `У вас нове повідомлення по оголошенню "${adTitle}"! 📬`;
                    
                    log.info(NOTIFICATION_CONTEXT, `Attempting to send Telegram notification to user ${receiverId} (TG ID: ${receiverTelegramId})`);
                    await sendTelegramNotification(receiverTelegramId, notificationMessage, adId);
                } else {
                    log.info(NOTIFICATION_CONTEXT, 'Skipping Telegram notification (receiver has no telegramId or ad not found).');
                }
            } catch (notificationError) {
                log.error(NOTIFICATION_CONTEXT, 'Failed to send notifications.', notificationError);
            }
        })();

    } catch (error) {
        log.error(CONTEXT, 'Failed to send message.', error);
        res.status(500).json({ message: 'Failed to send message' });
    }
};