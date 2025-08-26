// This file acts as the public API for our simulated backend.
// The frontend will import all necessary functions from here.

// Re-export all controller functions (for data management)
export * from './controllers';

// Re-export all Gemini service functions (for AI features)
// In a real backend, these would be called on the server, not the client.
export { 
    generateAdDetailsFromImage as generateAdContent,
    findRelevantAds,
    answerQuestionAboutAd as getAiAnswerForAd,
    improveAdContent as improveAdWithAI,
    suggestPriceForAd as getSuggestedPrice,
    generateShareableText as getShareableText,
    findSimilarAds as getSimilarAds,
    generateSearchQueryFromImage as searchByImage,
    analyzeChatMessageForScam,
    editImage // Keep this here for now, as it's a client-side simulation
} from '../services/geminiService';
