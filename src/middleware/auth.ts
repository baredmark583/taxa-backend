// FIX: To resolve type conflicts, using types directly from the express default import.
// FIX: Changed to a default import of express to use namespaced types.
// FIX: Use named imports for Request, Response, NextFunction to avoid global type conflicts.
// FIX: Use default import for express to avoid global type conflicts with Request, Response, etc.
import express from 'express';
import jwt from 'jsonwebtoken';

// Extend the standard express Request type.
// FIX: Extend express.Request to ensure type consistency.
// FIX: Extend express.Request to avoid conflict with global types.
// FIX: Extend Request from named express import.
// FIX: Extend namespaced express.Request to avoid global type conflicts.
export interface AuthRequest extends express.Request {
  user?: { id: string };
}

// Use Express's built-in types for request and response handlers.
// FIX: Use express.Response and express.NextFunction for type consistency.
// FIX: Use express.Response and express.NextFunction to avoid conflict with global types.
// FIX: Use named Response and NextFunction types.
// FIX: Use namespaced express types to avoid global type conflicts.
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