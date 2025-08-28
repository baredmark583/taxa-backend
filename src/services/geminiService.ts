// FIX: Imported Modality for the image editing feature.
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { GeneratedAdData, Ad, ImageSearchQuery, ChatMessage } from '../types.js';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set for Gemini.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

const adSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "Яскравий та описовий заголовок для оголошення, до 60 символів. Має бути українською мовою."
    },
    description: {
      type: Type.STRING,
      description: "Детальний, привабливий опис товару, що підкреслює його ключові особливості, стан та переваги. Напиши щонайменше 3 речення. Має бути українською мовою."
    },
    category: {
      type: Type.STRING,
      description: "Найбільш відповідна категорія для товару з цього списку: Електроніка, Меблі, Одяг, Транспорт, Нерухомість, Хобі, Дитячі товари, Інше. Має бути українською мовою."
    },
    price: {
      type: Type.STRING,
      description: "Запропонована ціна в українських гривнях (UAH), відформатована як рядок (наприклад, '15000'). Якщо не впевнений, запропонуй розумну ринкову ціну."
    },
    location: {
        type: Type.STRING,
        description: "Місто, в якому знаходиться товар. Спробуй визначити його з опису або контексту. Наприклад, 'Київ'. Має бути українською мовою."
    },
    tags: {
        type: Type.ARRAY,
        description: "3-5 релевантних тегів українською мовою, що описують товар (наприклад, 'вінтаж', 'шкіра', 'розмір L', 'як новий').",
        items: { type: Type.STRING }
    }
  },
  required: ["title", "description", "category", "price", "location", "tags"]
};


export const generateAdDetailsFromImage = async (userPrompt: string, imageBase64: string, mimeType: string): Promise<GeneratedAdData> => {
  try {
    const textPart = { text: `На основі зображення та цього опису від користувача: "${userPrompt}", згенеруй деталі оголошення. Весь текст має бути українською мовою. Використовуй лише надані категорії. Запропонуй ціну в гривнях (UAH). Визнач місто. Згенеруй 3-5 релевантних тегів.` };
    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType,
      },
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [textPart, imagePart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: adSchema,
        systemInstruction: "You are an expert copywriter for a Ukrainian classifieds website. All your output must be in Ukrainian."
      }
    });

    if (!response.text) {
        throw new Error("Відповідь від AI порожня. Можливо, зображення було заблоковано через політику безпеки. Спробуйте інше фото.");
    }
    const jsonText = response.text.trim();
    const generatedData = JSON.parse(jsonText) as GeneratedAdData;
    
    if (!generatedData.title || !generatedData.description || !generatedData.category || !generatedData.price || !generatedData.location) {
        throw new Error("Відповідь AI не містить обов'язкових полів.");
    }
    
    return generatedData;

  } catch (error) {
    console.error("Помилка під час виклику Gemini API:", error);
    
    // Re-throw our custom, user-friendly errors directly to the controller.
    if (error instanceof Error && (error.message.includes("політику безпеки") || error.message.includes("обов'язкових полів"))) {
        throw error;
    }
    
    // For all other errors (API errors, network issues, JSON parsing), throw a generic message
    // that includes the most likely cause for an unexpected failure, like a safety block.
    throw new Error("Не вдалося згенерувати деталі. Можливо, зображення було заблоковано. Спробуйте інше фото.");
  }
};

// Add a new function for editing images.
export const editImageWithGemini = async (imageBase64: string, mimeType: string, editPrompt: string): Promise<{ imageBase64: string; mimeType: string }> => {
    try {
        const imagePart = {
            inlineData: {
                data: imageBase64,
                mimeType: mimeType,
            },
        };
        const textPart = { text: editPrompt };
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-preview-image-generation',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
        
        const imageResponsePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
        const inlineData = imageResponsePart?.inlineData;

        // FIX: Reworked the type guard to check for the success case first. This provides a more robust signal
        // to the TypeScript compiler, ensuring that inside the `if` block, `inlineData` and its properties are
        // correctly typed as strings, which resolves the persistent TS2322 build error.
        if (inlineData && typeof inlineData.data === 'string' && typeof inlineData.mimeType === 'string') {
            return {
                imageBase64: inlineData.data,
                mimeType: inlineData.mimeType,
            };
        } else {
            // Failure path
            const textResponse = response.text; // Check for a text-based error from Gemini
            if (textResponse) {
                throw new Error(`AI did not return an image. Reason: ${textResponse}`);
            }
            throw new Error('AI did not return an edited image. The image may have been blocked by safety policies.');
        }

    } catch (error: any) {
        console.error("Error calling Gemini Image Editing API:", error);
        
        // Check for rate limit error (status code 429)
        if (error.status === 429) {
            throw new Error("Ліміт запитів до AI вичерпано. Спробуйте пізніше або перевірте ваш тарифний план.");
        }

        // Re-throw custom errors to the controller, otherwise throw a generic one.
        if (error instanceof Error && error.message.startsWith('AI did not')) {
            throw error;
        }
        throw new Error("Не вдалося відредагувати зображення. Можливо, його було заблоковано. Спробуйте інше фото.");
    }
};

// ... other Gemini functions (findRelevantAds, etc.) can be moved here ...