import { type Ad, type GeneratedAdData, type TelegramUser, type AdStatus, type Review, type ChatConversation, type ChatMessage, type SavedSearch, type NewReviewPayload, type Question, type Follow, type Answer } from '../types';
import * as db from './db';

// =================================================================
// MOCK BACKEND CONTROLLERS
// =================================================================

const MOCK_DELAY_MS = 500;

const simulateApiCall = <T>(data: T, delay: number = MOCK_DELAY_MS): Promise<T> => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(JSON.parse(JSON.stringify(data))); // Deep copy
        }, delay);
    });
};

/**
 * Fetches all ads.
 */
export const getAds = async (): Promise<Ad[]> => {
    console.log("API: Fetching ads...");
    // Ensure in-memory is synced with storage before returning
    db.updateInMemoryAds(db.readFromStorage<Ad[]>(db.STORAGE_KEY, []));
    return simulateApiCall(db.inMemoryAds.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
};

/**
 * Publishes a new ad.
 */
export const publishAd = async (adData: GeneratedAdData, imageUrls: string[], currentUser: TelegramUser): Promise<Ad> => {
    const newAd: Ad = {
        id: new Date().toISOString(),
        ...adData,
        imageUrls: imageUrls,
        createdAt: new Date().toISOString(),
        seller: { 
            id: currentUser.id,
            name: [currentUser.first_name, currentUser.last_name].filter(Boolean).join(' '),
            avatarUrl: currentUser.photo_url || `https://i.pravatar.cc/150?u=${currentUser.id}`,
            telegramUsername: currentUser.username || 'unknown_user',
            rating: 0,
            reviewsCount: 0,
            isVerified: false, // New users are not verified
        },
        status: 'active',
        stats: { views: 0, favorites: 0 },
        allowOffers: true,
    };
    
    const updatedAds = [newAd, ...db.inMemoryAds];
    db.updateInMemoryAds(updatedAds);
    db.writeToStorage(db.STORAGE_KEY, updatedAds);

    return simulateApiCall(newAd);
}

/**
 * Updates an existing ad.
 */
export const updateAd = async (updatedAd: Ad): Promise<Ad> => {
    const adIndex = db.inMemoryAds.findIndex(ad => ad.id === updatedAd.id);
    if (adIndex === -1) throw new Error("Ad not found.");
    db.inMemoryAds[adIndex] = updatedAd;
    db.writeToStorage(db.STORAGE_KEY, db.inMemoryAds);
    return simulateApiCall(updatedAd);
};

/**
 * Deletes an ad.
 */
export const deleteAd = async (adId: string): Promise<void> => {
    const newAds = db.inMemoryAds.filter(ad => ad.id !== adId);
    db.updateInMemoryAds(newAds);
    db.writeToStorage(db.STORAGE_KEY, newAds);
    return new Promise(resolve => setTimeout(resolve, MOCK_DELAY_MS / 2));
};


// --- Ad Status ---
export const updateAdStatus = async (adId: string, status: AdStatus): Promise<Ad> => {
    const ad = db.inMemoryAds.find(ad => ad.id === adId);
    if (!ad) throw new Error("Ad not found.");
    ad.status = status;
    db.writeToStorage(db.STORAGE_KEY, db.inMemoryAds);
    return simulateApiCall(ad);
}

// --- Reporting ---
export const reportAd = async (adId: string, reason: string, reporterId: number): Promise<{success: boolean}> => {
    console.log(`API: Ad ${adId} reported by user ${reporterId} for reason: ${reason}`);
    // In a real app, this would send data to a moderation backend.
    return simulateApiCall({ success: true }, 200);
}

// --- Ad Management ---
export const boostAd = async (adId: string): Promise<Ad> => {
    const ad = db.inMemoryAds.find(ad => ad.id === adId);
    if (!ad) throw new Error("Ad not found.");
    ad.isBoosted = true;
    // In a real app, you'd set an expiration for the boost.
    db.writeToStorage(db.STORAGE_KEY, db.inMemoryAds);
    return simulateApiCall(ad, 300);
}

export const incrementAdViewCount = (adId: string): void => {
    const ad = db.inMemoryAds.find(ad => ad.id === adId);
    if (ad) {
        ad.stats.views = (ad.stats.views || 0) + 1;
        db.writeToStorage(db.STORAGE_KEY, db.inMemoryAds);
    }
}


// --- Favorites ---
export const getFavoriteIds = async (): Promise<string[]> => {
    const ids = db.readFromStorage<string[]>(db.FAVORITES_STORAGE_KEY, []);
    return simulateApiCall(ids, 100);
};
export const addFavorite = async (adId: string): Promise<string[]> => {
    let ids = db.readFromStorage<string[]>(db.FAVORITES_STORAGE_KEY, []);
    if (!ids.includes(adId)) {
        ids = [...ids, adId];
        db.writeToStorage(db.FAVORITES_STORAGE_KEY, ids);
        // Update stats
        const ad = db.inMemoryAds.find(ad => ad.id === adId);
        if (ad) {
            ad.stats.favorites = (ad.stats.favorites || 0) + 1;
            db.writeToStorage(db.STORAGE_KEY, db.inMemoryAds);
        }
    }
    return simulateApiCall(ids, 100);
};
export const removeFavorite = async (adId: string): Promise<string[]> => {
    let ids = db.readFromStorage<string[]>(db.FAVORITES_STORAGE_KEY, []);
    const updatedIds = ids.filter(id => id !== adId);
    db.writeToStorage(db.FAVORITES_STORAGE_KEY, updatedIds);
     // Update stats
    const ad = db.inMemoryAds.find(ad => ad.id === adId);
    if (ad && ad.stats.favorites > 0) {
        ad.stats.favorites -= 1;
        db.writeToStorage(db.STORAGE_KEY, db.inMemoryAds);
    }
    return simulateApiCall(updatedIds, 100);
};

// --- Reviews ---
export const getReviewsForSeller = async (sellerId: number): Promise<Review[]> => {
    const allReviews = db.readFromStorage<Review[]>(db.REVIEWS_STORAGE_KEY, db.inMemoryReviews);
    const sellerReviews = allReviews
        .filter(r => r.sellerId === sellerId)
        .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return simulateApiCall(sellerReviews);
};

export const addReview = async (payload: NewReviewPayload, author: TelegramUser): Promise<{ newReview: Review, updatedSeller: Ad['seller'] }> => {
    const newReview: Review = {
        id: `review-${Date.now()}`,
        authorId: author.id,
        authorName: [author.first_name, author.last_name].filter(Boolean).join(' '),
        authorAvatarUrl: author.photo_url || `https://i.pravatar.cc/150?u=${author.id}`,
        createdAt: new Date().toISOString(),
        ...payload,
    };

    const currentReviews = db.readFromStorage<Review[]>(db.REVIEWS_STORAGE_KEY, db.inMemoryReviews);
    currentReviews.push(newReview);
    db.updateInMemoryReviews(currentReviews);
    db.writeToStorage(db.REVIEWS_STORAGE_KEY, currentReviews);

    // Recalculate seller's rating
    const sellerReviews = currentReviews.filter(r => r.sellerId === payload.sellerId);
    const totalRating = sellerReviews.reduce((sum, r) => sum + r.rating, 0);
    const newAverageRating = totalRating / sellerReviews.length;
    
    let updatedSeller: Ad['seller'] | null = null;

    // Update seller info on all their ads for consistency
    db.inMemoryAds.forEach(ad => {
        if (ad.seller.id === payload.sellerId) {
            ad.seller.rating = newAverageRating;
            ad.seller.reviewsCount = sellerReviews.length;
            if (!updatedSeller) {
                updatedSeller = ad.seller;
            }
        }
    });

    db.writeToStorage(db.STORAGE_KEY, db.inMemoryAds);
    
    if (!updatedSeller) {
        const originalAd = db.initialMockAdsData.find(ad => ad.seller.id === payload.sellerId);
        updatedSeller = {
            ...(originalAd?.seller || { id: payload.sellerId, name: 'Unknown', avatarUrl: '', telegramUsername: '', rating: 0, reviewsCount: 0, isVerified: false }),
            rating: newAverageRating,
            reviewsCount: sellerReviews.length,
        };
    }

    return simulateApiCall({ newReview, updatedSeller: updatedSeller! });
};



// --- CHAT SYSTEM ---
const getAllMessages = (): ChatMessage[] => {
    return db.readFromStorage<ChatMessage[]>(db.CHATS_STORAGE_KEY, []);
}

export const getConversations = async (userId: number): Promise<ChatConversation[]> => {
    const allMessages = getAllMessages();
    const conversationsMap = new Map<string, ChatConversation>();

    allMessages.forEach(msg => {
        if (msg.senderId === userId || msg.receiverId === userId) {
            const otherParticipantId = msg.senderId === userId ? msg.receiverId : msg.senderId;
            const conversationId = msg.adId ? `${msg.adId}_${Math.min(userId, otherParticipantId)}_${Math.max(userId, otherParticipantId)}` : `user_${otherParticipantId}`;
            
            let conversation = conversationsMap.get(conversationId);

            if (!conversation || msg.timestamp > conversation.lastMessage.timestamp) {
                const otherParticipantAd = db.inMemoryAds.find(ad => ad.seller.id === otherParticipantId);
                const participantInfo = {
                    id: otherParticipantId,
                    name: otherParticipantAd?.seller.name || 'Невідомий',
                    avatarUrl: otherParticipantAd?.seller.avatarUrl || `https://i.pravatar.cc/150?u=${otherParticipantId}`,
                };
                
                const unreadCount = allMessages.filter(m => m.senderId === otherParticipantId && m.receiverId === userId && (m.adId || null) === (msg.adId || null) && !m.isRead).length;

                conversationsMap.set(conversationId, {
                    id: conversationId,
                    adId: msg.adId,
                    participant: participantInfo,
                    lastMessage: msg,
                    unreadCount: unreadCount,
                });
            }
        }
    });
    
    const sortedConversations = Array.from(conversationsMap.values())
      .sort((a,b) => new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime());

    return simulateApiCall(sortedConversations);
};

export const getMessagesForConversation = async (userId: number, otherParticipantId: number): Promise<ChatMessage[]> => {
    let allMessages = getAllMessages();
    
    const conversationMessages = allMessages.filter(msg => 
        (msg.senderId === userId && msg.receiverId === otherParticipantId) ||
        (msg.senderId === otherParticipantId && msg.receiverId === userId)
    );

    // Mark messages as read
    let updated = false;
    conversationMessages.forEach(msg => {
        if(msg.receiverId === userId && !msg.isRead) {
            msg.isRead = true;
            updated = true;
        }
    });

    if (updated) {
        db.writeToStorage(db.CHATS_STORAGE_KEY, allMessages);
    }
    
    return simulateApiCall(conversationMessages);
};

export const sendMessage = async (senderId: number, receiverId: number, text: string, adId?: string): Promise<ChatMessage> => {
    const allMessages = getAllMessages();
    const newMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        senderId,
        receiverId,
        text,
        adId,
        timestamp: new Date().toISOString(),
        isRead: false,
    };
    allMessages.push(newMessage);
    db.writeToStorage(db.CHATS_STORAGE_KEY, allMessages);
    return simulateApiCall(newMessage);
};

export const sendMessageWithImage = async (senderId: number, receiverId: number, imageUrl: string, adId?: string): Promise<ChatMessage> => {
    const allMessages = getAllMessages();
    const newMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        senderId,
        receiverId,
        imageUrl,
        adId,
        timestamp: new Date().toISOString(),
        isRead: false,
    };
    allMessages.push(newMessage);
    db.writeToStorage(db.CHATS_STORAGE_KEY, allMessages);
    return simulateApiCall(newMessage);
};


export const getUnreadMessagesCount = async (userId: number): Promise<number> => {
    const allMessages = getAllMessages();
    return allMessages.filter(m => m.receiverId === userId && !m.isRead).length;
}

// --- SAVED SEARCHES ---

export const getSavedSearches = async (): Promise<SavedSearch[]> => {
    return db.readFromStorage<SavedSearch[]>(db.SAVED_SEARCHES_STORAGE_KEY, []);
};

export const saveSearch = async (searchData: Omit<SavedSearch, 'id' | 'createdAt'>): Promise<SavedSearch> => {
    const searches = await getSavedSearches();
    const newSearch: SavedSearch = {
        ...searchData,
        id: `search-${Date.now()}`,
        createdAt: new Date().toISOString(),
    };
    searches.push(newSearch);
    db.writeToStorage(db.SAVED_SEARCHES_STORAGE_KEY, searches);
    return simulateApiCall(newSearch);
};

export const deleteSearch = async (id: string): Promise<void> => {
    let searches = await getSavedSearches();
    searches = searches.filter(s => s.id !== id);
    db.writeToStorage(db.SAVED_SEARCHES_STORAGE_KEY, searches);
    return simulateApiCall(undefined, 100);
};

export const isSearchSaved = async (searchData: Omit<SavedSearch, 'id' | 'createdAt'>): Promise<boolean> => {
    const searches = await getSavedSearches();
    return searches.some(s => 
        s.query === searchData.query && 
        s.category === searchData.category &&
        JSON.stringify(s.filters) === JSON.stringify(searchData.filters)
    );
};

export const getNewMatchesCount = async (search: SavedSearch): Promise<number> => {
    const ads = await getAds();
    return ads.filter(ad => {
        const isNewer = new Date(ad.createdAt) > new Date(search.createdAt);
        if (!isNewer) return false;

        const matchesCategory = search.category === 'Все' || ad.category === search.category;
        const matchesQuery = !search.query || ad.title.toLowerCase().includes(search.query.toLowerCase()) || ad.description.toLowerCase().includes(search.query.toLowerCase());
        const matchesLocation = !search.filters.location || ad.location.toLowerCase().includes(search.filters.location.toLowerCase());
        const matchesPriceFrom = !search.filters.priceFrom || parseInt(ad.price) >= parseInt(search.filters.priceFrom);
        const matchesPriceTo = !search.filters.priceTo || parseInt(ad.price) <= parseInt(search.filters.priceTo);

        return matchesCategory && matchesQuery && matchesLocation && matchesPriceFrom && matchesPriceTo;
    }).length;
};

export const getTotalNewMatchesCount = async (): Promise<number> => {
    const searches = await getSavedSearches();
    const counts = await Promise.all(searches.map(s => getNewMatchesCount(s)));
    return counts.reduce((sum, count) => sum + count, 0);
};


// --- SEARCH HISTORY ---

export const getSearchHistory = async (): Promise<string[]> => {
    return db.readFromStorage<string[]>(db.SEARCH_HISTORY_STORAGE_KEY, []);
};

export const saveSearchHistory = async (query: string): Promise<string[]> => {
    let history = await getSearchHistory();
    // Remove existing entry to move it to the top
    history = history.filter(item => item.toLowerCase() !== query.toLowerCase());
    history.unshift(query);
    // Keep only the last 5 items
    const updatedHistory = history.slice(0, 5);
    db.writeToStorage(db.SEARCH_HISTORY_STORAGE_KEY, updatedHistory);
    return simulateApiCall(updatedHistory, 50);
};

// --- Q&A System ---

export const getQuestionsForAd = async (adId: string): Promise<Question[]> => {
    const allQuestions = db.readFromStorage<Question[]>(db.QUESTIONS_STORAGE_KEY, []);
    return allQuestions.filter(q => q.adId === adId).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export const postQuestion = async (adId: string, text: string, author: TelegramUser): Promise<Question> => {
    const allQuestions = await getQuestionsForAd(adId);
    const newQuestion: Question = {
        id: `q-${Date.now()}`,
        adId,
        text,
        authorId: author.id,
        authorName: [author.first_name, author.last_name].filter(Boolean).join(' '),
        authorAvatarUrl: author.photo_url || `https://i.pravatar.cc/150?u=${author.id}`,
        createdAt: new Date().toISOString(),
    };
    const allStoredQuestions = db.readFromStorage<Question[]>(db.QUESTIONS_STORAGE_KEY, []);
    allStoredQuestions.push(newQuestion);
    db.writeToStorage(db.QUESTIONS_STORAGE_KEY, allStoredQuestions);
    return simulateApiCall(newQuestion);
};

export const postAnswer = async (questionId: string, text: string, author: TelegramUser): Promise<Answer> => {
    const allQuestions = db.readFromStorage<Question[]>(db.QUESTIONS_STORAGE_KEY, []);
    const question = allQuestions.find(q => q.id === questionId);
    if (!question) throw new Error("Question not found");

    const newAnswer: Answer = {
        id: `ans-${Date.now()}`,
        questionId,
        text,
        authorId: author.id,
        createdAt: new Date().toISOString(),
    };
    question.answer = newAnswer;
    db.writeToStorage(db.QUESTIONS_STORAGE_KEY, allQuestions);
    return simulateApiCall(newAnswer);
};

// --- Following Sellers ---
export const getFollowingIds = async (userId: number): Promise<number[]> => {
    const follows = db.readFromStorage<Follow[]>(db.FOLLOWS_STORAGE_KEY, []);
    return follows.filter(f => f.followerId === userId).map(f => f.sellerId);
}

export const followSeller = async (followerId: number, sellerId: number): Promise<void> => {
    let follows = db.readFromStorage<Follow[]>(db.FOLLOWS_STORAGE_KEY, []);
    if (!follows.some(f => f.followerId === followerId && f.sellerId === sellerId)) {
        follows.push({ followerId, sellerId });
        db.writeToStorage(db.FOLLOWS_STORAGE_KEY, follows);
    }
    return simulateApiCall(undefined, 100);
}

export const unfollowSeller = async (followerId: number, sellerId: number): Promise<void> => {
    let follows = db.readFromStorage<Follow[]>(db.FOLLOWS_STORAGE_KEY, []);
    follows = follows.filter(f => !(f.followerId === followerId && f.sellerId === sellerId));
    db.writeToStorage(db.FOLLOWS_STORAGE_KEY, follows);
    return simulateApiCall(undefined, 100);
}


// --- Offers and Secure Deals ---

export const makePriceOffer = async (ad: Ad, buyerId: number, price: string): Promise<void> => {
    const allMessages = getAllMessages();
    const offerMessage: ChatMessage = {
        id: `sys-${Date.now()}`,
        senderId: 0, // System
        receiverId: ad.seller.id,
        adId: ad.id,
        isSystemMessage: true,
        isRead: false,
        timestamp: new Date().toISOString(),
        offerDetails: {
            price,
            status: 'pending'
        }
    };
    allMessages.push(offerMessage);
    db.writeToStorage(db.CHATS_STORAGE_KEY, allMessages);
    return simulateApiCall(undefined);
};

export const respondToOffer = async (messageId: string, accepted: boolean): Promise<void> => {
    const allMessages = getAllMessages();
    const offerMsg = allMessages.find(m => m.id === messageId);
    if (!offerMsg || !offerMsg.offerDetails) throw new Error("Offer message not found");
    
    offerMsg.offerDetails.status = accepted ? 'accepted' : 'declined';

    db.writeToStorage(db.CHATS_STORAGE_KEY, allMessages);
    return simulateApiCall(undefined);
};

export const startSecureDeal = async (adId: string, buyerId: number): Promise<void> => {
    const ad = db.inMemoryAds.find(ad => ad.id === adId);
    if (!ad) throw new Error("Ad not found");
    if (ad.seller.id === buyerId) throw new Error("Cannot start a deal with yourself");

    const allMessages = getAllMessages();
    const dealMessage: ChatMessage = {
        id: `sys-${Date.now()}`,
        senderId: 0,
        receiverId: ad.seller.id, // Notification for seller
        adId: ad.id,
        isSystemMessage: true,
        isRead: false,
        timestamp: new Date().toISOString(),
        secureDealDetails: {
            status: 'payment_pending',
            adId: ad.id,
            sellerId: ad.seller.id,
            buyerId: buyerId
        }
    };
    allMessages.push(dealMessage);
    // Also send a copy to the buyer
    allMessages.push({...dealMessage, id: `sys-${Date.now()}-2`, receiverId: buyerId});

    db.writeToStorage(db.CHATS_STORAGE_KEY, allMessages);
    return simulateApiCall(undefined);
};

export const updateSecureDealStatus = async (messageId: string, newStatus: 'shipping_pending' | 'delivery_pending' | 'completed'): Promise<void> => {
    const allMessages = getAllMessages();
    const dealMsg = allMessages.find(m => m.id === messageId);
    if (!dealMsg || !dealMsg.secureDealDetails) throw new Error("Deal message not found");

    dealMsg.secureDealDetails.status = newStatus;

    db.writeToStorage(db.CHATS_STORAGE_KEY, allMessages);
    return simulateApiCall(undefined);
};
