import { type Ad, type Review, type ChatMessage, type SavedSearch, type Question, type Follow } from '../types';

// =================================================================
// MOCK DATABASE & LOCALSTORAGE PERSISTENCE
// =================================================================

export const STORAGE_KEY = 'teleboard_ads_uk';
export const FAVORITES_STORAGE_KEY = 'teleboard_favorites_uk';
export const REVIEWS_STORAGE_KEY = 'teleboard_reviews_uk';
export const CHATS_STORAGE_KEY = 'teleboard_chats_uk';
export const SAVED_SEARCHES_STORAGE_KEY = 'teleboard_saved_searches_uk';
export const SEARCH_HISTORY_STORAGE_KEY = 'teleboard_search_history_uk';
export const QUESTIONS_STORAGE_KEY = 'teleboard_questions_uk';
export const FOLLOWS_STORAGE_KEY = 'teleboard_follows_uk';


const getDateAgo = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};


const initialMockAds: Ad[] = [
    {
      id: '1',
      title: 'Вінтажна шкіряна куртка',
      description: 'Класична коричнева шкіряна куртка у відмінному стані. Розмір L. Справжня шкіра, тепла підкладка.',
      price: '2500',
      category: 'Одяг',
      imageUrls: ['https://picsum.photos/seed/jacket/600/500', 'https://picsum.photos/seed/jacket2/600/500', 'https://picsum.photos/seed/jacket3/600/500'],
      createdAt: getDateAgo(1),
      location: 'Київ',
      tags: ['шкіряна куртка', 'вінтаж', 'розмір L', 'одяг'],
      seller: { id: 101, name: 'Іван Петренко', avatarUrl: 'https://i.pravatar.cc/150?u=a042581f4e29026704d', telegramUsername: 'ivan_petrenko', rating: 4.8, reviewsCount: 12, isVerified: true },
      status: 'active',
      isBoosted: true,
      stats: { views: 152, favorites: 18 },
      allowOffers: true,
    },
    {
      id: '2',
      title: 'Сучасна книжкова шафа',
      description: 'Книжкова шафа з дуба на 5 полиць. Мінімалістичний дизайн. Ідеально впишеться в будь-який інтер\'єр.',
      price: '4800',
      category: 'Меблі',
      imageUrls: ['https://picsum.photos/seed/bookshelf/600/500'],
      createdAt: getDateAgo(3),
      location: 'Львів',
      tags: ['шафа', 'меблі', 'дуб', 'зберігання'],
      seller: { id: 102, name: 'Анна Сидоренко', avatarUrl: 'https://i.pravatar.cc/150?u=a042581f4e29026705d', telegramUsername: 'anna_sidorenko', rating: 5.0, reviewsCount: 5, isVerified: false },
      status: 'reserved',
      stats: { views: 89, favorites: 5 },
      allowOffers: false,
    },
    {
      id: '3',
      title: 'Акустична гітара',
      description: 'Yamaha F310, ідеальна для початківців. У комплекті з чохлом. Струни майже нові.',
      price: '3500',
      category: 'Хобі',
      imageUrls: ['https://picsum.photos/seed/guitar/600/500', 'https://picsum.photos/seed/guitar2/600/500'],
      createdAt: getDateAgo(5),
      location: 'Одеса',
      tags: ['гітара', 'музика', 'yamaha', 'хобі'],
      seller: { id: 101, name: 'Іван Петренко', avatarUrl: 'https://i.pravatar.cc/150?u=a042581f4e29026704d', telegramUsername: 'ivan_petrenko', rating: 4.8, reviewsCount: 12, isVerified: true },
      status: 'sold',
      stats: { views: 210, favorites: 11 },
       allowOffers: true,
    },
    {
      id: '4',
      title: 'Бездротові навушники',
      description: 'Нові навушники з шумозаглушенням. Коробка не вскрита. Відмінний звук і тривала робота від батареї.',
      price: '4200',
      previousPrice: '4800',
      category: 'Електроніка',
      imageUrls: ['https://picsum.photos/seed/headphones/600/500'],
      createdAt: new Date().toISOString(),
      location: 'Київ',
      tags: ['навушники', 'нові', 'bluetooth', 'електроніка'],
      seller: { id: 104, name: 'Олена Смирнова', avatarUrl: 'https://i.pravatar.cc/150?u=a042581f4e29026707d', telegramUsername: 'olena_smyrnova', rating: 4.5, reviewsCount: 2, isVerified: true },
      status: 'active',
      stats: { views: 45, favorites: 7 },
       allowOffers: true,
    },
];

const initialMockReviews: Review[] = [
    {
        id: 'review-1',
        authorId: 102,
        authorName: 'Анна Сидоренко',
        authorAvatarUrl: 'https://i.pravatar.cc/150?u=a042581f4e29026705d',
        sellerId: 101,
        rating: 5,
        text: 'Все чудово! Куртка відповідає опису, продавець дуже ввічливий.',
        createdAt: getDateAgo(2),
    },
    {
        id: 'review-2',
        authorId: 104,
        authorName: 'Олена Смирнова',
        authorAvatarUrl: 'https://i.pravatar.cc/150?u=a042581f4e29026707d',
        sellerId: 102,
        rating: 5,
        text: 'Угода пройшла швидко і гладко. Шафа просто чудова. Рекомендую!',
        createdAt: getDateAgo(4),
    }
];


// --- LocalStorage Helper Functions ---

export const readFromStorage = <T>(key: string, defaultValue: T): T => {
    try {
        const stored = localStorage.getItem(key);
        // Gracefully handle cases where the key doesn't exist, is empty, or stores the literal string "undefined".
        if (stored === null || stored === 'undefined' || stored.trim() === '') {
            return defaultValue;
        }
        return JSON.parse(stored);
    } catch (error) {
        // If parsing fails for any reason (e.g., malformed JSON), log the error and return the default value.
        console.error(`Failed to parse JSON from localStorage for key "${key}". Returning default value. Error:`, error);
        return defaultValue;
    }
};

export const writeToStorage = (key: string, data: any): void => {
    try {
        // Prevent writing `undefined` to localStorage.
        if (data === undefined) {
            console.warn(`Attempted to write 'undefined' to localStorage for key: ${key}. Aborting.`);
            return;
        }
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error(`Failed to write to localStorage for key "${key}".`, error);
    }
};

// Initialize storage if it's empty
const getInitialAds = (): Ad[] => {
    let ads = readFromStorage<Ad[] | null>(STORAGE_KEY, null);
    if (!ads || ads.length === 0) {
        ads = initialMockAds;
        writeToStorage(STORAGE_KEY, ads);
    }
    return ads;
};

const getInitialReviews = (): Review[] => {
    let reviews = readFromStorage<Review[] | null>(REVIEWS_STORAGE_KEY, null);
    if (!reviews || reviews.length === 0) {
        reviews = initialMockReviews;
        writeToStorage(REVIEWS_STORAGE_KEY, reviews);
    }
    return reviews;
};


// --- In-memory cache synced with localStorage ---
export let inMemoryAds: Ad[] = getInitialAds();
export let inMemoryReviews: Review[] = getInitialReviews();
export const initialMockAdsData = initialMockAds;

// Functions to update the in-memory cache, which might be useful if we stop writing to localStorage on every change.
export const updateInMemoryAds = (newAds: Ad[]) => {
    inMemoryAds = newAds;
}
export const updateInMemoryReviews = (newReviews: Review[]) => {
    inMemoryReviews = newReviews;
}
