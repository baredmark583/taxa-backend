// Use the 'process' global from Node.js, do not import it.
// FIX: Import 'express' and its types to use explicit types like Request, avoiding conflicts with global DOM types.
// FIX: Using explicit Request, Response, NextFunction types from express to resolve type conflicts.
// FIX: Corrected Express types for the global error handler to resolve property access errors.
// FIX: Using express.Request, express.Response, and express.NextFunction to resolve type conflicts.
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// Added .js extension to local imports for ES module resolution.
import { initializeDatabase } from './src/db-init.js';

import authRoutes from './src/routes/auth.js';
import adRoutes from './src/routes/ads.js';
import geminiRoutes from './src/routes/gemini.js';
import adminRoutes from './src/routes/admin.js';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    // Initialize the database schema before starting the server
    await initializeDatabase();
      
    // FIX: Configured CORS for a separate frontend deployment.
    // The frontend URL must be set in the .env file or environment variables.
    const corsOptions = {
      origin: process.env.FRONTEND_URL, // e.g., 'https://your-frontend-domain.vercel.app'
      credentials: true,
    };
    app.use(cors(corsOptions));
    app.use(express.json({ limit: '10mb' })); // Increase limit for base64 images

    // API routes.
    app.use('/api/auth', authRoutes);
    app.use('/api/ads', adRoutes);
    app.use('/api/gemini', geminiRoutes);
    app.use('/api/admin', adminRoutes);
    
    // Global error handler
    // FIX: Use explicit express types to avoid conflicts with global DOM types.
    // FIX: Use explicit express.Request, express.Response, and express.NextFunction types to fix property errors.
    // FIX: Use explicit Request, Response, and NextFunction types from express import
    // FIX: Using explicit Request, Response, NextFunction types from express to resolve type conflicts.
    // FIX: Switched to explicit express.Request, express.Response, and express.NextFunction to resolve type conflicts.
    // FIX: Use explicit express types to resolve property errors.
    app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
        console.error(err.stack);
        res.status(500).send('Something broke!');
    });

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch(error) {
    console.error("Failed to start server:", error);
    // FIX: Cast process to any to access exit method, avoiding a type error.
    (process as any).exit(1);
  }
};

startServer();