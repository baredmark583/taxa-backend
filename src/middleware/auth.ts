// FIX: Switched to default express import and qualified types (express.Request, express.Response) to resolve property access errors from potential type conflicts.
// FIX: Switched to qualified express types to resolve type conflicts and property access errors.
// FIX: Import Request, Response, NextFunction directly from express.
// FIX: Use qualified express types to avoid conflicts with global types.
import express from 'express';
// FIX: Added 'multer' import to make Express.Multer.File type available.
import 'multer';
import jwt from 'jsonwebtoken';

// Extend the standard express Request type.
// FIX: Use Request for better compatibility.
// FIX: Base AuthRequest on Request for correct typing.
// FIX: Use Request type directly to avoid conflicts with global Request.
// FIX: Switched to qualified express types to resolve all property access errors.
export type AuthRequest = express.Request & {
  user?: { id: string };
};

// FIX: Use imported express types for middleware signature.
// FIX: Use Response and NextFunction for correct typing.
// FIX: Use qualified express types for middleware signature.
// FIX: Use Response and NextFunction types directly.
// FIX: Switched to qualified express types to resolve all property access errors.
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