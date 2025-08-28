import WebSocket from 'ws';
import jwt from 'jsonwebtoken';
import { ChatMessage } from '../types.js';

// Map to store active connections: userId -> WebSocket instance
const clients = new Map<string, WebSocket>();

export const handleConnection = (ws: WebSocket) => {
    console.log('Client connected via WebSocket');

    let userId: string | null = null;

    ws.on('message', (message: string) => {
        try {
            const data = JSON.parse(message);

            if (data.type === 'auth' && data.token) {
                const decoded = jwt.verify(data.token, process.env.JWT_SECRET!) as { userId: string };
                if (decoded.userId) {
                    userId = decoded.userId;
                    clients.set(userId, ws);
                    console.log(`WebSocket authenticated for user ${userId}`);
                    
                    // Optional: send confirmation back to client
                    ws.send(JSON.stringify({ type: 'auth_success', message: 'Authentication successful' }));
                }
            }
        } catch (error) {
            console.error('WebSocket message error:', error);
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid message or token' }));
        }
    });

    ws.on('close', () => {
        if (userId) {
            clients.delete(userId);
            console.log(`WebSocket client disconnected: ${userId}`);
        } else {
            console.log('Unauthenticated WebSocket client disconnected');
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
};

export const sendMessageToUser = (receiverId: string, message: ChatMessage) => {
    const receiverSocket = clients.get(receiverId);
    if (receiverSocket && receiverSocket.readyState === WebSocket.OPEN) {
        receiverSocket.send(JSON.stringify({
            type: 'new_message',
            payload: message
        }));
        console.log(`Sent real-time message to user ${receiverId}`);
    } else {
        console.log(`User ${receiverId} is not connected via WebSocket for real-time message.`);
    }
};
