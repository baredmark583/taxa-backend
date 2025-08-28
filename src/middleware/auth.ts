

// FIX: Use named imports for Express types to resolve widespread type conflicts with global DOM types.
import { type Request, type Response, type NextFunction } from 'express';
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
// FIX: Extend the correctly imported Request type to resolve all type conflicts.
export interface AuthRequest extends Request {
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
// FIX: Use named imports for Express types to resolve property access errors.
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