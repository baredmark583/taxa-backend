// FIX: Import Request, Response, NextFunction directly from express.
import { Request, Response, NextFunction } from 'express';
// FIX: Added 'multer' import to make Express.Multer.File type available.
import 'multer';
import jwt from 'jsonwebtoken';

// Extend the standard express Request type.
// FIX: Use Request for better compatibility.
// FIX: Base AuthRequest on Request for correct typing.
// FIX: Use Request type directly to avoid conflicts with global Request.
// FIX: Switched to qualified express types to resolve all property access errors.
// FIX: Use imported Request type to fix type errors.
// FIX: Use qualified express types to resolve type conflicts.
// FIX: Use the imported Request type directly for AuthRequest.
// FIX: Qualify with express.Request to resolve type conflicts.
// FIX: Switched to express.Request to resolve type conflicts with global Request type.
export type AuthRequest = Request & {
  user?: { id: string };
};

// FIX: Use imported express types for middleware signature.
// FIX: Use Response and NextFunction for correct typing.
// FIX: Use qualified express types for middleware signature.
// FIX: Use Response and NextFunction types directly.
// FIX: Switched to qualified express types to resolve all property access errors.
// FIX: Use imported Response and NextFunction types to fix type errors.
// FIX: Use qualified express types to resolve type conflicts.
// FIX: Use imported Response and NextFunction types for the middleware signature.
// FIX: Use qualified express types to fix property access errors.
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