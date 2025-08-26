


// FIX: Import Request, Response, and NextFunction types directly from express to avoid conflicts with global types.
import * as express from 'express';
import jwt from 'jsonwebtoken';

// Extend the standard express Request type.
// FIX: Use imported Request type directly.
export type AuthRequest = express.Request & {
  user?: { id: string };
}

// Use standard express types for middleware function signature.
// FIX: Use imported Response and NextFunction types directly.
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