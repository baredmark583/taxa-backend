// FIX: Replaced named type imports with a default import to use qualified types (e.g., `express.Request`) and resolve type conflicts.
import express from 'express';
// FIX: Added 'multer' import to make Express.Multer.File type available.
import 'multer';
import jwt from 'jsonwebtoken';

// Extend the standard express Request type.
// FIX: Extend the correctly imported `express.Request` type to resolve property access errors.
export interface AuthRequest extends express.Request {
  user?: { id: string };
  body: any; // for multer text fields
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] }; // for multer files
}

// FIX: Use qualified express types for middleware signature to resolve property errors on `req.headers` and `res.status`.
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