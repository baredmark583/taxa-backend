// FIX: Import express as a default module to use qualified types and avoid global conflicts.
// FIX: Use fully-qualified express types to resolve conflicts.
import express from 'express';
import jwt from 'jsonwebtoken';

// Extend the standard express Request type.
// FIX: Extend express.Request to ensure type consistency and avoid conflicts with global DOM types.
// FIX: Extend express.Request to ensure it has all the necessary properties.
export interface AuthRequest extends express.Request {
  user?: { id: string };
}

// FIX: Use explicit express types for request and response handlers to resolve property errors.
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