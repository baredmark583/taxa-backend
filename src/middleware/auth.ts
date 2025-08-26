

// FIX: Update express import to resolve type errors with middleware.
import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend the standard express Request type.
export type AuthRequest = Request & {
  user?: { id: string };
}

// Use standard express types for middleware function signature.
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