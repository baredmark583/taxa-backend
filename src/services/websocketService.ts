
import WebSocket from 'ws';
import jwt from 'jsonwebtoken';
import { ChatMessage } from '../types.js';
import { log } from '../utils/logger.js';

// Map to store active connections: userId -> WebSocket instance
const clients = new Map<string, WebSocket>();

export const handleConnection = (ws: WebSocket) => {
    const CONTEXT = 'WebSocket';
    log.info(CONTEXT, 'Client connected.');

    let userId: string | null = null;

    ws.on('message', (message: string) => {
        try {
            const data = JSON.parse(message);
            log.debug(CONTEXT, 'Received message from client.', { data });

            if (data.type === 'auth' && data.token) {
                const decoded = jwt.verify(data.token, process.env.JWT_SECRET!) as { userId: string };
                if (decoded.userId) {
                    userId = decoded.userId;
                    clients.set(userId, ws);
                    log.info(CONTEXT, `Socket authenticated for user ${userId}`);
                    
                    // Optional: send confirmation back to client
                    ws.send(JSON.stringify({ type: 'auth_success', message: 'Authentication successful' }));
                }
            }
        } catch (error) {
            log.error(CONTEXT, 'Error processing message.', { message, error });
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid message or token' }));
        }
    });

    ws.on('close', () => {
        if (userId) {
            clients.delete(userId);
            log.info(CONTEXT, `Client disconnected: ${userId}`);
        } else {
            log.info(CONTEXT, 'Unauthenticated client disconnected.');
        }
    });

    ws.on('error', (error) => {
        log.error(CONTEXT, 'A WebSocket error occurred.', { userId, error });
    });
};

export const sendMessageToUser = (receiverId: string, message: ChatMessage) => {
    const CONTEXT = 'WebSocket:sendMessage';
    const receiverSocket = clients.get(receiverId);
    if (receiverSocket && receiverSocket.readyState === WebSocket.OPEN) {
        const payload = {
            type: 'new_message',
            payload: message
        };
        receiverSocket.send(JSON.stringify(payload));
        log.info(CONTEXT, `Sent real-time message to user ${receiverId}`);
    } else {
        log.info(CONTEXT, `User ${receiverId} is not connected, cannot send real-time message.`);
    }
};
