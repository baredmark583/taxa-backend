// Use the 'process' global from Node.js, do not import it.
// FIX: Use explicit type imports from express to avoid conflicts with global DOM types.
import express, { Request as ExpressRequest, Response as ExpressResponse, NextFunction as ExpressNextFunction } from 'express';
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
      
    app.use(cors());
    app.use(express.json({ limit: '10mb' })); // Increase limit for base64 images

    // API routes
    app.use('/api/auth', authRoutes);
    app.use('/api/ads', adRoutes);
    app.use('/api/gemini', geminiRoutes);
    app.use('/api/admin', adminRoutes);
    
    // Basic welcome route
    // FIX: Use aliased Request and Response from express to ensure correct types.
    app.get('/', (req: ExpressRequest, res: ExpressResponse) => {
      res.send(`Taxa AI Backend is running.`);
    });
    
    // Global error handler
    // FIX: Use aliased Request, Response, and NextFunction from express for correct types.
    app.use((err: Error, req: ExpressRequest, res: ExpressResponse, next: ExpressNextFunction) => {
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