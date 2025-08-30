// FIX: Use a single default import for express to avoid type conflicts.
// FIX: Import Request, Response, and NextFunction directly from express.
import { Request, Response, NextFunction } from 'express';
// FIX: Added 'multer' import to make Express.Multer.File type available.
import 'multer';
import jwt from 'jsonwebtoken';

// Extend the standard express Request type.
// FIX: Qualify with express.Request to resolve type conflicts.
// FIX: Use qualified express.Request to resolve property access errors.
// FIX: Use imported Request type to define AuthRequest.
export type AuthRequest = Request & {
  user?: { id: string };
};

// FIX: Use qualified express types for middleware signature.
// FIX: Use qualified express types (express.Response, express.NextFunction) to fix property access errors.
// FIX: Use imported types for middleware signature.
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