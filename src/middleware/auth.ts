





// FIX: Corrected express import to use require syntax for proper CJS module type resolution.
import express = require('express');
import jwt from 'jsonwebtoken';

// Extend the standard express Request type.
export type AuthRequest = express.Request & {
  user?: { id: string };
}

// Use standard express types for middleware function signature.
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