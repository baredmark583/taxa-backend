
// FIX: To resolve type conflicts, using types directly from the express default import.
import express from 'express';
import jwt from 'jsonwebtoken';

// Extend the standard express Request type.
// FIX: Extend express.Request to ensure type consistency.
export interface AuthRequest extends express.Request {
  user?: { id: string };
}

// Use Express's built-in types for request and response handlers.
// FIX: Use express.Response and express.NextFunction for type consistency.
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