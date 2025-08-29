// src/utils/logger.ts

/**
 * Возвращает текущую временную метку в формате ISO.
 */
const getTimestamp = (): string => new Date().toISOString();

/**
 * Простой структурированный логгер для вывода в консоль.
 */
export const log = {
    /**
     * Логирует информационные сообщения.
     * @param context - Контекст, в котором происходит событие (например, 'Request', 'adController:createAd').
     * @param message - Сообщение для логирования.
     * @param data - Дополнительные данные для вывода.
     */
    info: (context: string, message: string, data?: any) => {
        const logData = data ? `\n${JSON.stringify(data, null, 2)}` : '';
        console.log(`[${getTimestamp()}] [INFO] [${context}] - ${message}${logData}`);
    },

    /**
     * Логирует сообщения об ошибках.
     * @param context - Контекст, в котором произошла ошибка.
     * @param message - Сообщение об ошибке.
     * @param error - Объект ошибки или другие данные об ошибке.
     */
    error: (context: string, message: string, error?: any) => {
        const errorData = error ? `\n${error instanceof Error ? error.stack : JSON.stringify(error, null, 2)}` : '';
        console.error(`[${getTimestamp()}] [ERROR] [${context}] - ${message}${errorData}`);
    },

    /**
     * Логирует отладочные сообщения. В реальном приложении это можно было бы включать/выключать через переменные окружения.
     * @param context - Контекст для отладки.
     * @param message - Отладочное сообщение.
     * @param data - Отладочные данные.
     */
    debug: (context: string, message: string, data?: any) => {
        // Для простоты выводим всегда, но в проде можно было бы сделать: if (process.env.NODE_ENV === 'development') { ... }
        const debugData = data ? `\n${JSON.stringify(data, null, 2)}` : '';
        console.debug(`[${getTimestamp()}] [DEBUG] [${context}] - ${message}${debugData}`);
    },
};
