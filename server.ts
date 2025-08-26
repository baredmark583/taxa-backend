
// Use the 'process' global from Node.js, do not import it.
// FIX: To resolve type conflicts, using types directly from the express default import.
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// Added .js extension to local imports for ES module resolution.
import { initializeDatabase } from './src/db-init.js';

import authRoutes from './src/routes/auth.js';
import adRoutes from './src/routes/ads.js';
import geminiRoutes from './src/routes/gemini.js';
import { admin, adminRouter } from './src/admin.js';


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
    
    // AdminJS dashboard
    app.use(admin.options.rootPath, adminRouter);
    
    // Basic welcome route
    // FIX: Use express.Request and express.Response types for consistency.
    app.get('/', (req: express.Request, res: express.Response) => {
      res.send(`Taxa AI Backend is running. Admin panel is at http://localhost:${PORT}${admin.options.rootPath}`);
    });
    
    // Global error handler
    // FIX: Use express.Request, express.Response, and express.NextFunction types for consistency.
    app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
        console.error(err.stack);
        res.status(500).send('Something broke!');
    });

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      console.log(`AdminJS dashboard available at http://localhost:${PORT}${admin.options.rootPath}`);
    });
  } catch(error) {
    console.error("Failed to start server:", error);
    // FIX: Cast process to any to access exit method, avoiding a type error.
    (process as any).exit(1);
  }
};

startServer();