
// FIX: Switched to default express import and qualified types (express.Request, express.Response) to resolve property access errors from potential type conflicts.
// FIX: Import Request and Response types directly from express to fix type errors.
// FIX: Switched to default express import and qualified types to resolve type errors.
// FIX: Import Request and Response from express to resolve type errors.
// FIX: Use qualified express types to avoid conflicts with global types.
// FIX: Import Request and Response types directly from express to resolve type errors.
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import cuid from 'cuid';
import { User } from '../types.js';
import crypto from 'crypto';
import { updateLocationFromIp } from '../services/locationService.js';
import { log } from '../utils/logger.js';

// FIX: Use Request and Response for correct typing.
// FIX: Use imported Request and Response types to fix type errors.
export const register = async (req: Request, res: Response) => {
  const CONTEXT = 'authController:register';
  const { email, password, name } = req.body;
  log.info(CONTEXT, 'Attempting to register new user.', { email, name });

  if (!email || !password || !name) {
    log.error(CONTEXT, 'Registration failed: All fields are required.');
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const existingUserResult = await query('SELECT * FROM "User" WHERE email = $1', [email]);
    if (existingUserResult.rows.length > 0) {
      log.info(CONTEXT, 'Registration failed: User with this email already exists.', { email });
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const userId = cuid();
    const avatarUrl = `https://i.pravatar.cc/150?u=${email}`;
    log.info(CONTEXT, 'Password hashed and user details prepared.');
    
    const newUserResult = await query(
      'INSERT INTO "User" (id, email, password, name, "avatarUrl", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [userId, email, hashedPassword, name, avatarUrl, new Date()]
    );
    
    const newUser: User = newUserResult.rows[0];
    const token = jwt.sign({ userId: newUser.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    log.info(CONTEXT, `User registered successfully with id: ${newUser.id}`);
    
    // Omit password from the response
    const { password: _password, ...userWithoutPassword } = newUser;

    // Asynchronously update user location based on IP, non-blocking
    updateLocationFromIp(req.ip, newUser.id).catch(err => log.error(CONTEXT, "Failed to update location for new user:", err));

    res.status(201).json({ token, user: userWithoutPassword });
  } catch (error) {
    log.error(CONTEXT, 'Server error during registration.', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// FIX: Use Request and Response for correct typing.
// FIX: Use imported Request and Response types to fix type errors.
export const login = async (req: Request, res: Response) => {
  const CONTEXT = 'authController:login';
  const { email, password } = req.body;
  log.info(CONTEXT, 'Attempting to log in user.', { email });

  if (!email || !password) {
    log.error(CONTEXT, 'Login failed: Email and password are required.');
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const userResult = await query('SELECT * FROM "User" WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      log.info(CONTEXT, 'Login failed: Invalid credentials (user not found).', { email });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user: User = userResult.rows[0];
    if (!user.password) {
      log.info(CONTEXT, 'Login failed: User exists but has no password (likely social login).');
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      log.info(CONTEXT, 'Login failed: Invalid credentials (password incorrect).', { email });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    log.info(CONTEXT, `User logged in successfully: ${user.id}`);
    
    // Omit password from the response
    const { password: _password, ...userWithoutPassword } = user;

    // Asynchronously update user location based on IP, non-blocking
    updateLocationFromIp(req.ip, user.id).catch(err => log.error(CONTEXT, "Failed to update location for user:", err));

    res.status(200).json({ token, user: userWithoutPassword });
  } catch (error) {
    log.error(CONTEXT, 'Server error during login.', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// FIX: Use Request and Response for correct typing.
// FIX: Use imported Request and Response types to fix type errors.
export const redeemWebCode = async (req: Request, res: Response) => {
  const CONTEXT = 'authController:redeemWebCode';
  const { code } = req.body;
  log.info(CONTEXT, 'Attempting to log in user with one-time code.', { code });

  if (!code) {
    log.error(CONTEXT, 'Login failed: Code is required.');
    return res.status(400).json({ message: 'Code is required' });
  }

  const client = await (await import('../db.js')).default.connect();
  try {
    await client.query('BEGIN');

    const codeResult = await client.query('SELECT * FROM "WebLoginCode" WHERE code = $1 FOR UPDATE', [code]);

    if (codeResult.rows.length === 0) {
      log.info(CONTEXT, 'Login failed: Invalid code.');
      await client.query('ROLLBACK');
      return res.status(401).json({ message: 'Invalid or expired code' });
    }

    const loginCode = codeResult.rows[0];

    if (new Date(loginCode.expiresAt) < new Date()) {
      log.info(CONTEXT, 'Login failed: Expired code.');
      await client.query('DELETE FROM "WebLoginCode" WHERE code = $1', [code]);
      await client.query('COMMIT');
      return res.status(401).json({ message: 'Invalid or expired code' });
    }

    const userResult = await client.query('SELECT * FROM "User" WHERE id = $1', [loginCode.userId]);
    if (userResult.rows.length === 0) {
      log.error(CONTEXT, 'Logic error: Code exists but user does not.');
      await client.query('ROLLBACK');
      return res.status(500).json({ message: 'Server error' });
    }
    
    const user: User = userResult.rows[0];
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    
    await client.query('DELETE FROM "WebLoginCode" WHERE code = $1', [code]);
    await client.query('COMMIT');

    log.info(CONTEXT, `User logged in successfully via web code: ${user.id}`);
    const { password: _password, ...userWithoutPassword } = user;
    res.status(200).json({ token, user: userWithoutPassword });

  } catch (error) {
    await client.query('ROLLBACK');
    log.error(CONTEXT, 'Server error during web code login.', error);
    res.status(500).json({ message: 'Server error during login' });
  } finally {
    client.release();
  }
};


// FIX: Use Request and Response for correct typing.
// FIX: Use imported Request and Response types to fix type errors.
export const telegramLogin = async (req: Request, res: Response) => {
    const CONTEXT = 'authController:telegramLogin';
    const { initData } = req.body;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    log.info(CONTEXT, 'Attempting Telegram login.');

    if (!initData || !botToken) {
        log.error(CONTEXT, 'initData or bot token are missing.');
        return res.status(400).json({ message: 'initData and bot token are required' });
    }

    try {
        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');
        urlParams.delete('hash');

        // Sort the parameters alphabetically by key
        const sortedParams = Array.from(urlParams.entries()).sort((a, b) => a[0].localeCompare(b[0]));
        const dataCheckString = sortedParams.map(([key, value]) => `${key}=${value}`).join('\n');
        
        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
        const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

        if (calculatedHash !== hash) {
            log.error(CONTEXT, 'Telegram data validation failed: Invalid hash.');
            return res.status(403).json({ message: 'Invalid Telegram data' });
        }
        
        const userObject = JSON.parse(urlParams.get('user')!);
        const { id: telegramId, first_name, last_name, username, photo_url } = userObject;

        const client = await (await import('../db.js')).default.connect();
        try {
            await client.query('BEGIN');
            
            let userResult = await client.query('SELECT * FROM "User" WHERE "telegramId" = $1', [telegramId]);
            let user: User;

            if (userResult.rows.length === 0) {
                // User does not exist, create them
                const userId = cuid();
                const fullName = `${first_name || ''} ${last_name || ''}`.trim();
                const insertResult = await client.query(
                    `INSERT INTO "User" (id, "telegramId", name, username, "avatarUrl", "updatedAt") 
                     VALUES ($1, $2, $3, $4, $5, $6) 
                     RETURNING *`,
                    [userId, telegramId, fullName, username, photo_url, new Date()]
                );
                user = insertResult.rows[0];
                log.info(CONTEXT, `New user created from Telegram data: ${user.id}`);
            } else {
                // User exists, update their details
                user = userResult.rows[0];
                const fullName = `${first_name || ''} ${last_name || ''}`.trim();
                const updateResult = await client.query(
                    `UPDATE "User" SET name = $1, username = $2, "avatarUrl" = $3, "updatedAt" = $4 
                     WHERE "telegramId" = $5 RETURNING *`,
                    [fullName, username, photo_url, new Date(), telegramId]
                );
                user = updateResult.rows[0];
                log.info(CONTEXT, `Existing user updated from Telegram data: ${user.id}`);
            }
            
            const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
            await client.query('COMMIT');
            
            // Omit password from the response
            const { password: _password, ...userWithoutPassword } = user;

            // Asynchronously update user location based on IP, non-blocking
            updateLocationFromIp(req.ip, user.id).catch(err => log.error(CONTEXT, "Failed to update location for telegram user:", err));

            res.status(200).json({ token, user: userWithoutPassword });

        } catch (dbError) {
            await client.query('ROLLBACK');
            throw dbError; // Throw to be caught by outer catch block
        } finally {
            client.release();
        }

    } catch (error) {
        log.error(CONTEXT, 'Server error during Telegram login.', error);
        res.status(500).json({ message: 'Server error during Telegram login' });
    }
};