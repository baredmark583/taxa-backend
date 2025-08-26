
import express, { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './src/db-init'; // Import the new function

import authRoutes from './src/routes/auth';
import adRoutes from './src/routes/ads';
import geminiRoutes from './src/routes/gemini';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;


const startServer = async () => {

  // Initialize the database schema before starting the server
  await initializeDatabase();
    
  app.use(cors());
  app.use(express.json({ limit: '10mb' })); // Increase limit for base64 images

  // FIX: Use aliased express types for proper typing of req and res to resolve handler errors.
  app.get('/', (req: ExpressRequest, res: ExpressResponse) => {
      res.send('Taxa AI Backend is running! (PostgreSQL mode)');
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/ads', adRoutes);
  app.use('/api/gemini', geminiRoutes);


  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}, connected to PostgreSQL.`);
  });
};

startServer().catch(e => {
  console.error('Failed to start server:', e);
  // FIX: Cast process to any to avoid TypeScript error on 'exit'.
  (process as any).exit(1);
});