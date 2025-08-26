


// FIX: Switched to default express import and qualified types to resolve type errors in middleware.
import express from 'express';
import jwt from 'jsonwebtoken';

// Extend the standard express Request type.
// FIX: Use express.Request to ensure AuthRequest is correctly extended.
export type AuthRequest = express.Request & {
  user?: { id: string };
}

// FIX: Use qualified express types to resolve errors with req.headers, res.status, and next().
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