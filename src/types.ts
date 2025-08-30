// This file can be used for backend-specific types if needed.

// Previously from Prisma, now defined manually for our database.
export interface User {
  id: string;
  email: string | null;
  password: string | null; // Note: This should not be sent to the client.
  telegramId?: number | null;
  username?: string | null;
  name: string;
  role: 'USER' | 'ADMIN';
  status: 'active' | 'banned';
  avatarUrl: string | null;
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  ads: Ad[];
  createdAt: Date;
  updatedAt: Date;
}

// FIX: Export AdStatus to be used in controllers.
export type AdStatus = 'active' | 'reserved' | 'sold' | 'archived';

export interface Ad {
  id: string;
  title: string;
  description: string;
  price: string;
  category: string;
  location: string;
  tags: string[];
  imageUrls: string[];
  status: AdStatus; 
  isBoosted: boolean;
  sellerId: string;
  // This is added dynamically when fetching ads
  seller?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// --- Feature Models (based on db-init.ts) ---

export interface Review {
  id: string;
  rating: number; // 1 to 5
  text: string;
  authorId: string;
  sellerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  text: string | null;
  imageUrl: string | null;
  isRead: boolean;
  senderId: string;
  receiverId: string;
  adId: string;
  createdAt: Date;
}

export interface SavedSearch {
  id: string;
  query: string;
  category: string | null;
  filters: Record<string, any> | null; // JSONB can be represented as an object
  userId: string;
  createdAt: Date;
}

export interface Question {
  id:string;
  text: string;
  adId: string;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
  answer?: Answer; // Relation
}

export interface Answer {
  id: string;
  text: string;
  questionId: string;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Follow {
  followerId: string;
  sellerId: string;
  createdAt: Date;
}

export interface HomePageBanner {
    id: string;
    imageUrl: string;
    title: string;
    subtitle?: string;
    buttonText?: string;
    buttonLink?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface Category {
    id: string;
    name: string;
    parentId: string | null;
    createdAt: Date;
    updatedAt: Date;
}


// --- API Payloads & Helpers ---

export interface GeneratedAdData {
  title: string;
  description: string;
  category: string;
  price: string;
  location: string;
  tags: string[];
}


export interface ImageSearchQuery {
    query: string;
    category: string;
}