import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './src/routes/auth';
import adRoutes from './src/routes/ads';
import geminiRoutes from './src/routes/gemini';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increase limit for base64 images

app.get('/', (req: Request, res: Response) => {
    res.send('Taxa AI Backend is running!');
});

app.use('/api/auth', authRoutes);
app.use('/api/ads', adRoutes);
app.use('/api/gemini', geminiRoutes);


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
