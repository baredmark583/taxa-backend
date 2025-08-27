// Use the 'process' global from Node.js, do not import it.
// FIX: Import the full 'express' module to use explicit types like express.Request, avoiding conflicts with global DOM types.
// FIX: Import specific types from express to avoid global conflicts
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.join(__dirname, '..', '..', 'dist');


const startServer = async () => {
  try {
    // Initialize the database schema before starting the server
    await initializeDatabase();
      
    app.use(cors());
    app.use(express.json({ limit: '10mb' })); // Increase limit for base64 images

    // API routes
    app.use('/api/auth', authRoutes);
    app.use('/api/ads', adRoutes);
    app.use('/api/gemini', geminiRoutes);
    app.use('/api/admin', adminRoutes);
    
    // Serve static files from the React app
    app.use(express.static(frontendDistPath));

    // The "catchall" handler: for any request that doesn't match one above,
    // send back React's index.html file.
    // FIX: Use explicit express.Request and express.Response types to fix property errors.
    // FIX: Use explicit Request and Response types from express import
    app.get('*', (req: Request, res: Response) => {
        res.sendFile(path.join(frontendDistPath, 'index.html'));
    });
    
    // Global error handler
    // FIX: Use explicit express types to avoid conflicts with global DOM types.
    // FIX: Use explicit express.Request, express.Response, and express.NextFunction types to fix property errors.
    // FIX: Use explicit Request, Response, and NextFunction types from express import
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
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