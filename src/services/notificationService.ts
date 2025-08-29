
import axios from 'axios';
import { log } from '../utils/logger.js';

const botToken = process.env.TELEGRAM_BOT_TOKEN;

if (!botToken) {
    log.info("TelegramService", "TELEGRAM_BOT_TOKEN environment variable not set. Telegram notifications will be disabled.");
}

/**
 * Sends a notification message to a user via the Telegram bot.
 * @param telegramId The Telegram user ID to send the message to.
 * @param message The text of the message to send. Supports basic Markdown.
 * @param adId Optional Ad ID to create a deep link button.
 */
export const sendTelegramNotification = async (telegramId: number, message: string, adId?: string): Promise<void> => {
    const CONTEXT = 'TelegramService';

    if (!botToken || !process.env.FRONTEND_URL) {
        log.info(CONTEXT, `Notifications are disabled. Would have sent to ${telegramId}: "${message}"`);
        return;
    }

    const apiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    const payload: { chat_id: number; text: string; parse_mode: string; reply_markup?: any } = {
        chat_id: telegramId,
        text: message,
        parse_mode: 'Markdown',
    };
    
    if (adId) {
        // The URL for web_app must be a direct HTTPS link to the web application.
        // We pass the adId as a query parameter for the frontend to handle.
        const webAppUrl = `${process.env.FRONTEND_URL}?adId=${adId}`;
        payload.reply_markup = {
            inline_keyboard: [
                [{ text: 'Перейти до оголошення', web_app: { url: webAppUrl } }]
            ]
        };
    }
    
    log.info(CONTEXT, 'Sending notification.', { telegramId, message, adId });

    try {
        await axios.post(apiUrl, payload);
        log.info(CONTEXT, `Successfully sent notification to Telegram user ${telegramId}`);
    } catch (error: any) {
        log.error(CONTEXT, `Failed to send Telegram notification to user ${telegramId}.`, error.response?.data || error.message);
    }
};
