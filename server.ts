// Use the 'process' global from Node.js, do not import it.
// FIX: Switched to a default express import to avoid conflicts with global DOM types.
// FIX: Use fully-qualified types like express.Request and express.Response to resolve conflicts.
// FIX: Import Request, Response, and NextFunction types explicitly from express to resolve type conflicts.
// FIX: Correctly import Request, Response, and NextFunction types from express to fix handler type issues.
// FIX: Reverting to a default express import and using fully qualified types like express.Request to resolve persistent type conflicts.
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// Added imports for path and url to serve static files.
import path from 'path';
import { fileURLToPath } from 'url';
// Added .js extension to local imports for ES module resolution.
import { initializeDatabase } from './src/db-init.js';

import authRoutes from './src/routes/auth.js';
import adRoutes from './src/routes/ads.js';
import geminiRoutes from './src/routes/gemini.js';
import adminRoutes from './src/routes/admin.js';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Enable trusting proxy headers for accurate IP address detection in production
app.set('trust proxy', true);

// Helper constants for file paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    
    // FIX: Serve static files from the frontend build directory
    // This is crucial for a single-server deployment model.
    // It assumes the frontend is built into a 'public' folder relative to the backend.
    const frontendBuildPath = path.join(__dirname, '..', 'public');
    app.use(express.static(frontendBuildPath));

    // FIX: Add a catch-all route to serve index.html for client-side routing.
    // This allows direct navigation to routes like /profile in the browser.
    // FIX: Use explicit express types to resolve overload errors.
    // FIX: Use explicit express types to resolve overload errors.
    // FIX: Use fully-qualified express types to resolve overload errors.
    // FIX: Use explicit Request and Response types from express.
    // FIX: Use explicit Request and Response types from express to resolve property access errors.
    // FIX: Using fully qualified express types to resolve property access and overload errors.
    app.get('*', (req: express.Request, res: express.Response) => {
        // Check if the request is for an API route, if so, do not serve index.html
        if (req.originalUrl.startsWith('/api')) {
            return res.status(404).send('API route not found');
        }
        
        // If the request has a file extension, it's likely for a static asset
        // that was not found by express.static. In this case, send a 404.
        // This prevents the client-side router's index.html from being sent
        // for missing assets, which causes MIME type errors.
        if (path.extname(req.path)) {
            return res.status(404).send('Resource not found');
        }

        res.sendFile(path.join(frontendBuildPath, 'index.html'));
    });
    
    // Global error handler
    // FIX: Used explicit express types to avoid conflicts with global DOM types and resolve property errors.
    // FIX: Used explicit express types to avoid conflicts with global DOM types and resolve property errors.
    // FIX: Use fully-qualified express types to avoid conflicts with global DOM types.
    // FIX: Use explicit Error, Request, Response, and NextFunction types.
    // FIX: Use explicit Request, Response, and NextFunction types from express to resolve property access errors.
    // FIX: Using fully qualified express types to resolve property access errors.
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