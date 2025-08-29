// FIX: Switched to default express import and qualified types (express.Request, express.Response) to resolve property access errors from potential type conflicts.
// FIX: Switched to default express import to resolve type errors.
// FIX: Import Response, NextFunction directly from express.
// FIX: Use qualified express types to avoid conflicts with global types.
import express from 'express';
import jwt from 'jsonwebtoken';
import { type AuthRequest } from './auth.js';
import { query } from '../db.js';
import { log } from '../utils/logger.js';

// FIX: Use Response and NextFunction for correct typing.
export const adminAuthMiddleware = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  const CONTEXT = 'adminAuthMiddleware';
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    log.info(CONTEXT, 'Auth failed: Token missing or malformed.');
    return res.status(401).json({ message: 'Authentication token required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    req.user = { id: decoded.userId };
    
    // Now, verify if the user is an admin
    query('SELECT role FROM "User" WHERE id = $1', [req.user.id])
        .then(result => {
            if (result.rows.length > 0 && result.rows[0].role === 'ADMIN') {
                log.info(CONTEXT, `Access granted for admin user: ${req.user?.id}`);
                next();
            } else {
                log.info(CONTEXT, `Access forbidden for non-admin user: ${req.user?.id}`);
                return res.status(403).json({ message: 'Forbidden: Admin access required' });
            }
        })
        .catch(error => {
            log.error(CONTEXT, 'DB error during admin role check.', error);
            return res.status(500).json({ message: 'Server error during auth check' });
        });

  } catch (error) {
    log.error(CONTEXT, 'Auth failed: Invalid or expired token.', error);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};