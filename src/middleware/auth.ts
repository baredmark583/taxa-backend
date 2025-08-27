// FIX: Import 'express' and its types to use explicit types like Request, avoiding conflicts with global DOM types.
// FIX: Use explicit Request, Response, NextFunction types from express to resolve type conflicts.
// FIX: Corrected Express types to use named imports and resolve type conflicts.
// FIX: Use express.Request, express.Response, express.NextFunction to resolve type conflicts.
// FIX: Switched to named imports for express types to resolve conflicts with global DOM types.
// FIX: Switched to default express import and explicit types to resolve conflicts with global DOM types.
import express from 'express';
import jwt from 'jsonwebtoken';

// Extend the standard express Request type.
// FIX: Extend Request to ensure type consistency.
// FIX: Extend Request type to ensure type consistency
// FIX: Extending the base Request type from express.
// FIX: Explicitly extend express.Request to resolve type conflicts.
// FIX: Extend express.Request to resolve type conflicts.
// FIX: Explicitly extend express.Request to resolve type conflicts with global DOM types.
export interface AuthRequest extends express.Request {
  user?: { id: string };
}

// FIX: Use explicit express types for request and response handlers.
// FIX: Use explicit Response and NextFunction types from express import
// FIX: Use explicit Request, Response, NextFunction types from express to resolve type conflicts.
// FIX: Switched to explicit express.Response and express.NextFunction to resolve type conflicts.
// FIX: Use explicit express types to resolve property errors.
// FIX: Use explicit express types to resolve property errors.
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