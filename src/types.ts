// This file can be used for backend-specific types if needed.

// Previously from Prisma, now defined manually for our in-memory store.
export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'USER' | 'ADMIN';
  avatarUrl: string | null;
  ads: Ad[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Ad {
  id: string;
  title: string;
  description: string;
  price: string;
  category: string;
  location: string;
  tags: string[];
  imageUrls: string[];
  status: string; // 'active', 'reserved', 'sold', etc.
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

export interface ChatMessage {
    senderId: string;
    text?: string | null;
}