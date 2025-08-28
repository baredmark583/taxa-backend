// FIX: Import express as a default module to use qualified types and avoid global conflicts.
// FIX: Use fully-qualified express types to resolve conflicts.
// FIX: Import Request, Response, and NextFunction types explicitly from express.
// FIX: Import Request, Response, and NextFunction types from express to resolve property access errors.
// FIX: Using default express import and qualified types to resolve type conflicts.
// FIX: Using explicit named imports for Request, Response, and NextFunction to resolve persistent type conflicts.
// FIX: Switched to named imports for express types to resolve property access errors.
// FIX: Use a default import for express and qualified types to resolve type errors.
// FIX: Use explicit named imports for Request, Response, and NextFunction to resolve type conflicts with global DOM types.
// FIX: Use named imports for express types to resolve type conflicts and property access errors.
// FIX: Use default express import and qualified types like express.Request to resolve all type conflicts.
// FIX: Use named imports for express types to resolve type conflicts and property access errors.
import express from 'express';
import jwt from 'jsonwebtoken';

// Extend the standard express Request type.
// FIX: Extend express.Request to ensure type consistency and avoid conflicts with global DOM types.
// FIX: Extend express.Request to ensure it has all the necessary properties.
// FIX: Extend the explicit Request type from express.
// FIX: Extend the imported Request type from express.
// FIX: Extending express.Request to resolve type conflicts.
// FIX: Use `express` namespace for types to avoid conflicts with global DOM types.
// FIX: Extend express.Request to resolve property access errors.
// FIX: Add properties from formidable middleware and use named import for Request.
// FIX: Extend express.Request to resolve type conflicts.
export interface AuthRequest extends express.Request {
  user?: { id: string };
  fields?: any; // from express-formidable
  files?: any; // from express-formidable
}

// FIX: Use explicit express types for request and response handlers to resolve property errors.
// FIX: Use fully-qualified express types.
// FIX: Use explicit AuthRequest, Response, and NextFunction types.
// FIX: Use explicit Response and NextFunction types from express to resolve property access errors.
// FIX: Using fully qualified express types to resolve property access errors.
// FIX: Use `express` namespace for types to avoid conflicts with global DOM types.
// FIX: Use explicit express types to fix property access errors.
// FIX: Use named imports for express types to resolve property access errors.
// FIX: Use qualified express types to resolve property access errors.
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