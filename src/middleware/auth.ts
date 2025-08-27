// FIX: Use explicit type imports from express to avoid conflicts with global DOM types.
import { Request as ExpressRequest, Response as ExpressResponse, NextFunction as ExpressNextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend the standard express Request type.
// FIX: Extend Request from express to ensure type consistency.
export interface AuthRequest extends ExpressRequest {
  user?: { id: string };
}

// Use Express's built-in types for request and response handlers.
// FIX: Use aliased Response and NextFunction from express for correct types.
export const authMiddleware = (req: AuthRequest, res: ExpressResponse, next: ExpressNextFunction) => {
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