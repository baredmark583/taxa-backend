// FIX: Reverted express import to standard ES module syntax.
// FIX: Import Request and Response types directly from express to resolve type errors.
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// FIX: Added .js extension to local imports for ES module resolution.
import { initializeDatabase } from './src/db-init.js';

import authRoutes from './src/routes/auth.js';
import adRoutes from './src/routes/ads.js';
import geminiRoutes from './src/routes/gemini.js';
import { admin, adminRouter } from './src/admin.js';
// FIX: Import exit from process to handle process.exit type error.
import { exit } from 'process';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;


const startServer = async () => {

  // Initialize the database schema before starting the server
  await initializeDatabase();
    
  app.use(cors());
  app.use(express.json({ limit: '10mb' })); // Increase limit for base64 images

  // AdminJS Router
  // FIX: Using correct Express types resolves the overload error for app.use.
  app.use(admin.options.rootPath, adminRouter);


  // Use standard express types for req and res to resolve handler errors.
  // FIX: Using imported Request and Response types.
  app.get('/', (req: Request, res: Response) => {
      res.send('Taxa AI Backend is running! (PostgreSQL mode)');
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/ads', adRoutes);
  app.use('/api/gemini', geminiRoutes);


  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}, connected to PostgreSQL.`);
    console.log(`AdminJS started on http://localhost:${PORT}${admin.options.rootPath}`);
  });
};

startServer().catch(e => {
  console.error('Failed to start server:', e);
  // FIX: Use imported exit function to avoid type errors on global process object.
  exit(1);
});