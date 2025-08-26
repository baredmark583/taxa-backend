





// FIX: Corrected express import to use require syntax for proper CJS module type resolution.
import express = require('express');
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './src/db-init'; // Import the new function

import authRoutes from './src/routes/auth';
import adRoutes from './src/routes/ads';
import geminiRoutes from './src/routes/gemini';
import { admin, adminRouter } from './src/admin';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;


const startServer = async () => {

  // Initialize the database schema before starting the server
  await initializeDatabase();
    
  app.use(cors());
  app.use(express.json({ limit: '10mb' })); // Increase limit for base64 images

  // AdminJS Router
  app.use(admin.options.rootPath, adminRouter);


  // Use standard express types for req and res to resolve handler errors.
  app.get('/', (req: express.Request, res: express.Response) => {
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
  // FIX: Cast process to any to avoid TypeScript error on 'exit'.
  (process as any).exit(1);
});