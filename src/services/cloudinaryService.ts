import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'taxa-ai-uploads',
    allowed_formats: ['jpeg', 'png', 'jpg', 'webp'],
    // Cloudinary can automatically transform images, e.g., to optimize them
    transformation: [{ width: 1024, height: 1024, crop: 'limit' }]
  } as any, // Use `as any` to bypass a potential type mismatch in the library
});

export const upload = multer({ storage: storage });
