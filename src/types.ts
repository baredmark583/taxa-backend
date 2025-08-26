
// This file can be used for backend-specific types if needed.
import { Ad as PrismaAd, User as PrismaUser } from '@prisma/client';

export interface GeneratedAdData {
  title: string;
  description: string;
  category: string;
  price: string;
  location: string;
  tags: string[];
}

// A simplified Ad type for use with the Gemini service, matching the Prisma model
export type Ad = Pick<PrismaAd, 'id' | 'title' | 'description' | 'price' | 'category' | 'location'>;
export type User = PrismaUser;

export interface ImageSearchQuery {
    query: string;
    category: string;
}

export interface ChatMessage {
    senderId: string;
    text?: string | null;
}
