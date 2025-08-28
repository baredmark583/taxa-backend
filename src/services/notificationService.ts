import axios from 'axios';

const botToken = process.env.TELEGRAM_BOT_TOKEN;

if (!botToken) {
    console.warn("TELEGRAM_BOT_TOKEN environment variable not set. Telegram notifications will be disabled.");
}

/**
 * Sends a notification message to a user via the Telegram bot.
 * @param telegramId The Telegram user ID to send the message to.
 * @param message The text of the message to send. Supports basic Markdown.
 * @param adId Optional Ad ID to create a deep link button.
 */
export const sendTelegramNotification = async (telegramId: number, message: string, adId?: string): Promise<void> => {
    if (!botToken) {
        console.log(`Telegram notifications are disabled. Would have sent to ${telegramId}: "${message}"`);
        return;
    }
    
    // IMPORTANT: Replace 'taxaAIbot' with your bot's username, and 'item' with the direct link name from BotFather.
    const botUsername = 'taxaAIbot'; 
    const directLinkName = 'item'; 

    const apiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    // Define the payload structure for the Telegram API
    const payload: { chat_id: number; text: string; parse_mode: string; reply_markup?: any } = {
        chat_id: telegramId,
        text: message,
        parse_mode: 'Markdown',
    };
    
    // If an adId is provided, create a Web App button
    if (adId) {
        const webAppUrl = `https://t.me/${botUsername}/${directLinkName}?startapp=${adId}`;
        payload.reply_markup = {
            inline_keyboard: [
                [{ text: 'Перейти до оголошення', web_app: { url: webAppUrl } }]
            ]
        };
    }

    try {
        await axios.post(apiUrl, payload);
        console.log(`Successfully sent notification to Telegram user ${telegramId}`);
    } catch (error: any) {
        // Log the error but don't let it crash the application.
        // Telegram API might return useful error info in the response.
        console.error(`Failed to send Telegram notification to user ${telegramId}:`, error.response?.data || error.message);
    }
};

/**
 * Example of how this will be integrated with the future chat system:
 *
 * 1. When a user sends a message, a future `createChatMessage` controller will be called.
 * 2. After saving the message, it will fetch the receiver's data from the database.
 *    // const receiverResult = await pool.query('SELECT "telegramId" FROM "User" WHERE id = $1', [receiverId]);
 *    // const receiver = receiverResult.rows[0];
 * 3. If the receiver has a `telegramId`, it will call this service:
 *    // if (receiver && receiver.telegramId) {
 *    //   const message = `У вас нове повідомлення по оголошенню! 📬`;
 *    //   await sendTelegramNotification(receiver.telegramId, message, adId);
 *    // }
 */
