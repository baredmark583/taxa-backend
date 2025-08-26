
import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedAdData, Ad, ImageSearchQuery, ChatMessage } from '../types';

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

    const jsonText = response.text.trim();
    const generatedData = JSON.parse(jsonText) as GeneratedAdData;
    
    if (!generatedData.title || !generatedData.description || !generatedData.category || !generatedData.price || !generatedData.location) {
        throw new Error("Відповідь AI не містить обов'язкових полів.");
    }
    
    return generatedData;

  } catch (error) {
    console.error("Помилка під час виклику Gemini API:", error);
    throw new Error("Не вдалося згенерувати деталі оголошення за допомогою AI. Будь ласка, спробуйте ще раз.");
  }
};

// ... other Gemini functions (findRelevantAds, etc.) can be moved here ...
