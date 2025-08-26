
// FIX: Aliased express types to avoid potential conflicts with global types.
import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// FIX: Extend the aliased express Request type.
export type AuthRequest = ExpressRequest & {
  user?: { id: string };
}

// FIX: Use aliased express types for middleware function signature.
export const authMiddleware = (req: AuthRequest, res: ExpressResponse, next: NextFunction) => {
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