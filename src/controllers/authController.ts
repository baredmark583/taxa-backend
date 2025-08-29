
// FIX: Only import types from express, as the default export is not used. This helps avoid potential type conflicts.
// FIX: Import default express module to use its types and resolve conflicts.
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import cuid from 'cuid';
import { User } from '../types.js';
import crypto from 'crypto';
import { updateLocationFromIp } from '../services/locationService.js';
import { log } from '../utils/logger.js';

// FIX: Use express.Request and express.Response for correct typing.
export const register = async (req: express.Request, res: express.Response) => {
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

// FIX: Use express.Request and express.Response for correct typing.
export const login = async (req: express.Request, res: express.Response) => {
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

// FIX: Use express.Request and express.Response for correct typing.
export const telegramLogin = async (req: express.Request, res: express.Response) => {
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

        const dataCheckString = Array.from(urlParams.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');

        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
        const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

        if (calculatedHash !== hash) {
            log.error(CONTEXT, 'Telegram hash validation failed!', { received: hash, calculated: calculatedHash });
            return res.status(401).json({ message: 'Invalid Telegram data' });
        }
        log.info(CONTEXT, 'Telegram hash validated successfully.');

        const tgUser = JSON.parse(urlParams.get('user') || '{}');
        const telegramId = tgUser.id;
        log.info(CONTEXT, 'Parsed Telegram user data.', { tgUser });

        if (!telegramId) {
            log.error(CONTEXT, 'User data not found in initData.');
            return res.status(400).json({ message: 'User data not found in initData' });
        }

        let dbUser: User;
        const existingUserResult = await query('SELECT * FROM "User" WHERE "telegramId" = $1', [telegramId]);

        if (existingUserResult.rows.length > 0) {
            log.info(CONTEXT, 'Existing Telegram user found, updating details.');
            const currentDbUser = existingUserResult.rows[0];
            const updatedName = `${tgUser.first_name || ''} ${tgUser.last_name || ''}`.trim() || currentDbUser.name;
            const updatedUsername = tgUser.username || currentDbUser.username;
            
            await query(
                'UPDATE "User" SET name = $1, username = $2, "updatedAt" = $3 WHERE id = $4',
                [updatedName, updatedUsername, new Date(), currentDbUser.id]
            );
            const updatedUserResult = await query('SELECT * FROM "User" WHERE id = $1', [currentDbUser.id]);
            dbUser = updatedUserResult.rows[0];
        } else {
            log.info(CONTEXT, 'New Telegram user, creating database entry.');
            const userId = cuid();
            const name = `${tgUser.first_name || ''} ${tgUser.last_name || ''}`.trim() || tgUser.username || 'Telegram User';
            const avatarUrl = `https://i.pravatar.cc/150?u=${telegramId}`;

            const newUserResult = await query(
                'INSERT INTO "User" (id, name, "telegramId", username, "avatarUrl", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
                [userId, name, telegramId, tgUser.username, avatarUrl, new Date()]
            );
            dbUser = newUserResult.rows[0];
        }

        const token = jwt.sign({ userId: dbUser.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
        const { password: _password, ...userWithoutPassword } = dbUser;
        log.info(CONTEXT, `Successfully authenticated Telegram user: ${dbUser.id}`);

        // Asynchronously update user location based on IP, non-blocking
        updateLocationFromIp(req.ip, dbUser.id).catch(err => log.error(CONTEXT, "Failed to update location for telegram user:", err));

        res.status(200).json({ token, user: userWithoutPassword });

    } catch (error) {
        log.error(CONTEXT, 'Server error during Telegram login.', error);
        res.status(500).json({ message: 'Server error during Telegram login' });
    }
};