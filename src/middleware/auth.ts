

// FIX: Use default express import to enable qualified type usage which resolves type errors.
import express from 'express';
// FIX: Added 'multer' import to make Express.Multer.File type available.
import 'multer';
import jwt from 'jsonwebtoken';

// Extend the standard express Request type.
// FIX: Changed from an interface to a type intersection to prevent issues with
// property inheritance. The `body` and `files` properties are now
// correctly inherited from `Request` and augmented by middleware types.
export type AuthRequest = express.Request & {
  user?: { id: string };
};

// FIX: Use imported express types for middleware signature.
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