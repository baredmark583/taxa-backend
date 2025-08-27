// FIX: Use explicit express types to avoid conflicts with global DOM types.
// FIX: Import Request, Response, NextFunction explicitly to avoid conflicts with DOM types.
import express from 'express';
import jwt from 'jsonwebtoken';

// Extend the standard express Request type.
// FIX: Extend express.Request to ensure type consistency.
// FIX: Extend Request from express to ensure type consistency.
export interface AuthRequest extends express.Request {
  user?: { id: string };
}

// FIX: Use explicit express types for request and response handlers.
// FIX: Use explicit Response and NextFunction types from express to fix property errors.
export const authMiddleware = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication token required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    req.user = { id: decoded.userId };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};