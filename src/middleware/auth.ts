
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// FIX: Changed from interface to type for better compatibility with extending Express's Request type.
// This resolves errors where properties like 'headers' and 'body' were not found.
export type AuthRequest = Request & {
  user?: { id: string };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
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