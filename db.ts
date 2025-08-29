

import { Pool } from 'pg';
import dotenv from 'dotenv';
import { log } from './src/utils/logger.js';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // FIX: Added SSL configuration required for cloud database providers like Render.
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.on('connect', () => {
  log.info('Database', 'Successfully connected to the PostgreSQL database!');
});

// FIX: Added an error handler to the pool for better debugging.
pool.on('error', (err) => {
    log.error('Database Pool', 'Unexpected error on idle client', err);
    // FIX: Cast process to any to access exit method, avoiding a type error.
    (process as any).exit(-1);
});


/**
 * Обертка над pool.query для логирования всех запросов к базе данных.
 * @param text - Текст SQL-запроса.
 * @param params - Параметры для SQL-запроса.
 * @returns Результат выполнения запроса.
 */
export const query = async (text: string, params?: any[]) => {
    const start = Date.now();
    log.debug('DB', 'Executing query', { text, params });
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        log.debug('DB', `Query successful (${duration}ms)`, { rowCount: res.rowCount });
        return res;
    } catch (err) {
        const duration = Date.now() - start;
        log.error('DB', `Query failed (${duration}ms)`, { text, error: err });
        throw err; // Пробрасываем ошибку дальше, чтобы ее обработал вызывающий код
    }
};


// Оставляем pool для прямого доступа, если он где-то нужен (например, в db-init)
export default pool;
