// FIX: Use explicit type imports from express to avoid conflicts with global DOM types.
import { Response as ExpressResponse, NextFunction as ExpressNextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { type AuthRequest } from './auth.js';
import pool from '../db.js';

export const adminAuthMiddleware = (req: AuthRequest, res: ExpressResponse, next: ExpressNextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication token required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    req.user = { id: decoded.userId };
    
    // Now, verify if the user is an admin
    pool.query('SELECT role FROM "User" WHERE id = $1', [req.user.id])
        .then(result => {
            if (result.rows.length > 0 && result.rows[0].role === 'ADMIN') {
                next();
            } else {
                return res.status(403).json({ message: 'Forbidden: Admin access required' });
            }
        })
        .catch(error => {
            console.error('Admin auth DB error:', error);
            return res.status(500).json({ message: 'Server error during auth check' });
        });

  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};