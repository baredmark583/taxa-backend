// FIX: Use a default import for express and explicit types (e.g., express.Request) to avoid conflicts with global DOM types.
// FIX: Use fully-qualified express types to resolve conflicts.
// FIX: Use named imports for Request and Response to resolve type conflicts with global DOM types.
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import cuid from 'cuid';
import { User } from '../types.js';
import crypto from 'crypto';
import { updateLocationFromIp } from '../services/locationService.js';

// FIX: Use explicit express types for request and response handlers to resolve property errors.
export const register = async (req: Request, res: Response) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const existingUserResult = await pool.query('SELECT * FROM "User" WHERE email = $1', [email]);
    if (existingUserResult.rows.length > 0) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const userId = cuid();
    const avatarUrl = `https://i.pravatar.cc/150?u=${email}`;
    
    const newUserResult = await pool.query(
      'INSERT INTO "User" (id, email, password, name, "avatarUrl", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [userId, email, hashedPassword, name, avatarUrl, new Date()]
    );
    
    const newUser: User = newUserResult.rows[0];
    const token = jwt.sign({ userId: newUser.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    
    // Omit password from the response
    const { password: _password, ...userWithoutPassword } = newUser;

    // Asynchronously update user location based on IP, non-blocking
    updateLocationFromIp(req.ip, newUser.id).catch(err => console.error("Failed to update location for new user:", err));

    res.status(201).json({ token, user: userWithoutPassword });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// FIX: Use explicit express types for request and response handlers to resolve property errors.
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const userResult = await pool.query('SELECT * FROM "User" WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user: User = userResult.rows[0];
    if (!user.password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    
    // Omit password from the response
    const { password: _password, ...userWithoutPassword } = user;

    // Asynchronously update user location based on IP, non-blocking
    updateLocationFromIp(req.ip, user.id).catch(err => console.error("Failed to update location for user:", err));

    res.status(200).json({ token, user: userWithoutPassword });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// FIX: Use explicit express types for request and response handlers to resolve property errors.
export const telegramLogin = async (req: Request, res: Response) => {
    const { initData } = req.body;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!initData || !botToken) {
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
            console.error('Telegram hash validation failed!');
            console.error('Received hash:', hash);
            console.error('Calculated hash:', calculatedHash);
            console.error('Data check string:', JSON.stringify(dataCheckString));
            return res.status(401).json({ message: 'Invalid Telegram data' });
        }

        const tgUser = JSON.parse(urlParams.get('user') || '{}');
        const telegramId = tgUser.id;

        if (!telegramId) {
            return res.status(400).json({ message: 'User data not found in initData' });
        }

        let dbUser: User;
        const existingUserResult = await pool.query('SELECT * FROM "User" WHERE "telegramId" = $1', [telegramId]);

        if (existingUserResult.rows.length > 0) {
            const currentDbUser = existingUserResult.rows[0];
            const updatedName = `${tgUser.first_name || ''} ${tgUser.last_name || ''}`.trim() || currentDbUser.name;
            const updatedUsername = tgUser.username || currentDbUser.username;
            
            await pool.query(
                'UPDATE "User" SET name = $1, username = $2, "updatedAt" = $3 WHERE id = $4',
                [updatedName, updatedUsername, new Date(), currentDbUser.id]
            );
            const updatedUserResult = await pool.query('SELECT * FROM "User" WHERE id = $1', [currentDbUser.id]);
            dbUser = updatedUserResult.rows[0];
        } else {
            const userId = cuid();
            const name = `${tgUser.first_name || ''} ${tgUser.last_name || ''}`.trim() || tgUser.username || 'Telegram User';
            const avatarUrl = `https://i.pravatar.cc/150?u=${telegramId}`;

            const newUserResult = await pool.query(
                'INSERT INTO "User" (id, name, "telegramId", username, "avatarUrl", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
                [userId, name, telegramId, tgUser.username, avatarUrl, new Date()]
            );
            dbUser = newUserResult.rows[0];
        }

        const token = jwt.sign({ userId: dbUser.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
        const { password: _password, ...userWithoutPassword } = dbUser;

        // Asynchronously update user location based on IP, non-blocking
        updateLocationFromIp(req.ip, dbUser.id).catch(err => console.error("Failed to update location for telegram user:", err));

        res.status(200).json({ token, user: userWithoutPassword });

    } catch (error) {
        console.error('Telegram login error:', error);
        res.status(500).json({ message: 'Server error during Telegram login' });
    }
};