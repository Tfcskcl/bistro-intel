
import { GoogleGenAI, GenerateContentResponse, Type, Chat } from "@google/genai";
import { SYSTEM_INSTRUCTION, MARKDOWN_INSTRUCTION, APP_CONTEXT } from "../constants";
import { RecipeCard, SOP, StrategyReport, ImplementationGuide, MenuItem, MenuGenerationRequest } from "../types";
import { ingredientService } from "./ingredientService";

const getApiKey = (): string => {
  // 1. Check Environment Variable (Build time / AI Studio injection)
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    return process.env.API_KEY;
  }
  // 2. Fallback for live deployment
  return 'AIzaSyB8BoSUqHHnmpkSIwpp2jI2xM2TW3IlIgA';
};

// Helper for UI components to check status
export const hasValidApiKey = (): boolean => {
    return !!getApiKey();
};

// Helper to clean AI output before parsing
const parseJSON = <T>(text: string | undefined): T => {
    if (!text) throw new Error("Empty response from AI");
    
    try {
        // 1. First attempt: Direct parse if it looks clean
        if (text.trim().startsWith('{') && text.trim().endsWith('}')) {
             return JSON.parse(text) as T;
        }

        // 2. Remove markdown code blocks (```json ... ```)
        let clean = text.replace(/```json\n?|```/g, '');
        
        // 3. Extract the first valid JSON object if there's extra text
        const firstOpen = clean.indexOf('{');
        const lastClose = clean.lastIndexOf('}');
        
        if (firstOpen !== -1 && lastClose !== -1) {
            clean = clean.substring(firstOpen, lastClose + 1);
        }

        return JSON.parse(clean) as T;
    } catch (e) {
        console.error("JSON Parse Error. Raw text:", text);
        // Fallback: Try to find any JSON-like structure
        try {
            const match = text.match(/\{[\s\S]*\}/);
            if (match) {
                return JSON.parse(match[0]) as T;
            }
        } catch (e2) {
            // Ignore secondary error
        }
        throw new Error("Failed to parse AI response. The model might be overloaded or returned invalid data.");
    }
};

// Helper to format AI errors into user-friendly messages
const formatError = (error: any): string => {
    console.error("Gemini API Error:", error);
    const msg = (error.message || error.toString()).toLowerCase();
    
    if (msg.includes('429') || msg.includes('quota') || msg.includes('resource has been exhausted')) {
        return "AI usage limit reached. Please try again in a moment or check your billing.";
    }
    if (msg.includes('401') || msg.includes('api key') || msg.includes('unauthenticated')) {
        return "Authorization failed. Please check your API Key configuration.";
    }
    if (msg.includes('500') || msg.includes('internal')) {
        return "AI Service is currently experiencing technical issues. Please try again later.";
    }
    if (msg.includes('503') || msg.includes('overloaded') || msg.includes('unavailable')) {
        return "The system is under heavy load. Please retry in a few seconds.";
    }
    if (msg.includes('safety') || msg.includes('blocked') || msg.includes('harmful') || msg.includes('candidate')) {
        return "The request was blocked by safety filters. Please try rephrasing your prompt.";
    }
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('failed to fetch')) {
        return "Network connection error. Please check your internet connection.";
    }
    
    return error.message || "An unexpected error occurred. Please try again.";
};

// Helper for exponential backoff retry
async function retryOperation<T>(operation: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    try {
        return await operation();
    } catch (error: any) {
        const msg = (error.message || error.toString()).toLowerCase();
        // Retry on server errors or overload
        if (retries > 0 && (msg.includes('500') || msg.includes('503') || msg.includes('overloaded'))) {
            console.log(`Retrying operation... Attempts left: ${retries}. Delay: ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return retryOperation(operation, retries - 1, delay * 2);
        }
        throw error;
    }
}

export const verifyLocationWithMaps = async (locationQuery: string): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) return "API Key Required for Location Verification.";

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: `Verify this location for a business registration: "${locationQuery}". Return the official formatted address and a very brief description of the area type (e.g. commercial, residential).` }] }],
      config: {
        tools: [{ googleMaps: {} }],
        // responseMimeType is not allowed when using the googleMaps tool.
      }
    });
    
    return response.text || "Could not verify location.";
  } catch (error: any) {
    console.error("Maps verification failed:", error);
    return "Verification unavailable.";
  }
};

export const getChatResponse = async (history: { role: string, text: string }[], newMessage: string): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key is missing.");
  
    const ai = new GoogleGenAI({ apiKey });
    
    // Convert simple history to Gemini format and filter empty messages
    const chatHistory = history
        .filter(msg => msg.text && msg.text.trim() !== '')
        .map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }));
  
    // Use gemini-2.5-flash for better stability on general chat tasks
    const chat: Chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: APP_CONTEXT,
        },
        history: chatHistory
    });
  
    try {
        // Wrap sendMessage in retry logic
        const response = await retryOperation<GenerateContentResponse>(() => chat.sendMessage({ message: newMessage }));
        return response.text || "I didn't catch that. Could you try again?";
    } catch (error: any) {
        throw new Error(formatError(error));
    }
};

const recipeSchema = {
  type: Type.OBJECT,
  properties: {
    sku_id: { type: Type.STRING },
    name: { type: Type.STRING },
    category: { type: Type.STRING },
    current_price: { type: Type.NUMBER },
    yield: { type: Type.NUMBER },
    ingredients: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          ingredient_id: { type: Type.STRING },
          name: { type: Type.STRING },
          qty_per_serving: { type: Type.NUMBER },
          unit: { type: Type.STRING },
          cost_per_unit: { type: Type.NUMBER },
          cost_per_serving: { type: Type.NUMBER }
        }
      }
    },
    preparation_steps: { type: Type.ARRAY, items: { type: Type.STRING } },
    equipment_needed: { type: Type.ARRAY, items: { type: Type.STRING } },
    portioning_guideline: { type: Type.STRING },
    allergens: { type: Type.ARRAY, items: { type: Type.STRING } },
    prep_time_min: { type: Type.NUMBER },
    shelf_life_hours: { type: Type.NUMBER },
    food_cost_per_serving: { type: Type.NUMBER },
    suggested_selling_price: { type: Type.NUMBER },
    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
    human_summary: { type: Type.STRING },
    reasoning: { type: Type.STRING },
    confidence: { type: Type.STRING }
  }
};

export const generateRecipeCard = async (userId: string, item: MenuItem, requirements?: string): Promise<RecipeCard> => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error("API Key is missing. Please configure your API key to generate recipes.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const currentIngredients = ingredientService.getAll(userId);

  const prompt = `
    Generate a standardized recipe card for SKU: ${item.sku_id} with name "${item.name}".
    
    Specific Customer Requirements & Context:
    ${requirements || 'Standard preparation style.'}
    
    Context Data:
    Menu Item: ${JSON.stringify(item)}
    Ingredient Database (Use strictly for pricing): ${JSON.stringify(currentIngredients)}

    Tasks:
    1. List all ingredients required.
    2. For each ingredient, try to find a match in the 'Ingredient Database'.
    3. If found, use the database 'cost_per_unit' and 'unit'.
    4. If not found, estimate a realistic market 'cost_per_unit' and 'unit'.
    5. Calculate 'cost_per_serving' = 'qty_per_serving' * 'cost_per_unit' (ensure unit conversion if needed, e.g. 100g = 0.1kg).
    6. Sum all 'cost_per_serving' to get total 'food_cost_per_serving'.
    
    Output Format: JSON complying with the schema.
    Ensure 'ingredients' array has: name, qty_per_serving, unit, cost_per_unit, cost_per_serving.
  `;

  try {
    const response: GenerateContentResponse = await retryOperation(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: recipeSchema
      }
    }));

    return parseJSON<RecipeCard>(response.text);
  } catch (error: any) {
    throw new Error(formatError(error));
  }
};

export const generateRecipeVariation = async (userId: string, originalRecipe: RecipeCard, variationType: string): Promise<RecipeCard> => {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error("API Key is missing. Please configure your API key to generate variations.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const currentIngredients = ingredientService.getAll(userId);

  const prompt = `
    Create a "${variationType}" variation of the following recipe.
    
    Original Recipe:
    ${JSON.stringify(originalRecipe)}
    
    Ingredient Database: ${JSON.stringify(currentIngredients)}

    Tasks:
    1. Modify ingredients to suit the "${variationType}" requirement.
    2. Adjust preparation steps accordingly.
    3. RE-CALCULATE costs based on the Ingredient Database for any new or changed ingredients.
    4. Provide detailed costing per ingredient (cost_per_unit, cost_per_serving).
    5. Update the name to reflect the variation.
  `;

  try {
    const response: GenerateContentResponse = await retryOperation(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: recipeSchema
      }
    }));

    return parseJSON<RecipeCard>(response.text);
  } catch (error: any) {
    throw new Error(formatError(error));
  }
};

export const generateSOP = async (topic: string): Promise<SOP> => {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error("API Key is missing. Please configure your API key to generate SOPs.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `
    Create an SOP for "${topic}" for a modern cafe bistro.
    
    Output STRICTLY as valid JSON:
    {
      "sop_id": "gen-sop-${Date.now()}",
      "title": "string",
      "scope": "string",
      "prerequisites": "string",
      "materials_equipment": ["string"],
      "stepwise_procedure": [{"step_no": number, "action": "string", "responsible_role": "string", "time_limit": "string"}],
      "critical_control_points": ["string"],
      "monitoring_checklist": ["string"],
      "kpis": ["string"],
      "quick_troubleshooting": "string"
    }
  `;

  try {
    const response: GenerateContentResponse = await retryOperation(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json'
      }
    }));

    return parseJSON<SOP>(response.text);
  } catch (error: any) {
    throw new Error(formatError(error));
  }
};

export const generateStrategy = async (role: string, context: string): Promise<StrategyReport> => {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error("API Key is missing. Please configure your API key to generate strategy reports.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `
    Role Context: I am the ${role}.
    User Request: ${context}
    
    Assume a generic restaurant scenario if no specific data is provided, but prioritize actionable advice.
    Provide a comprehensive strategic analysis covering up to 12 months.
    
    Output as valid JSON:
    {
      "summary": ["string"],
      "causes": ["string"],
      "action_plan": [{"initiative": "string", "impact_estimate": "string", "cost_estimate": "string", "priority": "High|Medium|Low"}],
      "seasonal_menu_suggestions": [{"type": "add|remove", "item": "string", "reason": "string"}],
      "roadmap": [
        {
          "phase_name": "string",
          "duration": "string", 
          "steps": ["string"],
          "milestone": "string"
        }
      ]
    }
  `;

  try {
    const response: GenerateContentResponse = await retryOperation(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json'
      }
    }));

    return parseJSON<StrategyReport>(response.text);
  } catch (error: any) {
    throw new Error(formatError(error));
  }
};

export const generateImplementationPlan = async (initiative: string): Promise<ImplementationGuide> => {
    const apiKey = getApiKey();

    if (!apiKey) {
      throw new Error("API Key is missing. Please configure your API key.");
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
      Create a detailed implementation guide for: "${initiative}".
      
      Output as valid JSON:
      {
        "objective": "string",
        "estimated_timeline": "string",
        "phases": [
            {
                "phase_name": "string",
                "steps": ["string"],
                "resources_needed": ["string"],
                "kpi_to_track": "string"
            }
        ]
      }
    `;

    try {
        const response: GenerateContentResponse = await retryOperation(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: 'application/json'
            }
        }));

        return parseJSON<ImplementationGuide>(response.text);
    } catch (error: any) {
        throw new Error(formatError(error));
    }
};

export const generateMarketingVideo = async (images: string[], prompt: string, aspectRatio: '16:9' | '9:16' | '1:1'): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) {
      throw new Error("API Key required for video generation");
  }

  const ai = new GoogleGenAI({ apiKey });
  const safeAspectRatio = (aspectRatio === '16:9' || aspectRatio === '9:16') ? aspectRatio : '16:9';

  try {
      let operation;

      if (images.length > 1) {
          const referenceImagesPayload: any[] = images.map(img => ({
              image: { imageBytes: img, mimeType: 'image/png' },
              referenceType: 'ASSET'
          }));

          operation = await ai.models.generateVideos({
              model: 'veo-3.1-generate-preview',
              prompt: prompt,
              config: {
                  numberOfVideos: 1,
                  referenceImages: referenceImagesPayload,
                  resolution: '720p',
                  aspectRatio: '16:9' 
              }
          });
      } else if (images.length === 1) {
          operation = await ai.models.generateVideos({
              model: 'veo-3.1-fast-generate-preview',
              prompt: prompt || 'Cinematic food shot', 
              image: { imageBytes: images[0], mimeType: 'image/png' },
              config: { numberOfVideos: 1, resolution: '720p', aspectRatio: safeAspectRatio }
          });
      } else {
          operation = await ai.models.generateVideos({
              model: 'veo-3.1-fast-generate-preview',
              prompt: prompt,
              config: { numberOfVideos: 1, resolution: '720p', aspectRatio: safeAspectRatio }
          });
      }

      while (!operation.done) {
          await new Promise(resolve => setTimeout(resolve, 5000));
          operation = await ai.operations.getVideosOperation({operation: operation});
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) throw new Error("Video generation completed but no URI returned.");

      const response = await fetch(`${downloadLink}&key=${apiKey}`);
      const blob = await response.blob();
      return URL.createObjectURL(blob);

  } catch (error: any) {
      throw new Error(formatError(error));
  }
};

export const generateMarketingImage = async (prompt: string, aspectRatio: string): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key required for image generation");

    const ai = new GoogleGenAI({ apiKey });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { text: prompt },
                ],
            },
            config: {
                // responseMimeType is not supported for nano banana series models
            },
        });

        if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    const base64EncodeString: string = part.inlineData.data;
                    return `data:image/png;base64,${base64EncodeString}`;
                }
            }
        }
        throw new Error("No image data returned.");
    } catch (error: any) {
        throw new Error(formatError(error));
    }
};

export const generateKitchenWorkflow = async (description: string): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key required.");

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
        Act as an expert Restaurant Operations Consultant.
        Design an optimized kitchen workflow based on this input: "${description}".
        
        Provide the response in clear Markdown format with:
        - **Problem Analysis**
        - **Proposed Workflow Steps**
        - **Station Layout Recommendations**
        - **Staff Positioning**
        
        Do not output JSON. Output Markdown text.
    `;

    try {
        const response: GenerateContentResponse = await retryOperation(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                systemInstruction: MARKDOWN_INSTRUCTION,
            }
        }));
        return response.text || "Failed to generate workflow.";
    } catch (error: any) {
        throw new Error(formatError(error));
    }
};

export const generateMenu = async (request: MenuGenerationRequest): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key required.");

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
        Create a full menu for a restaurant with the following details:
        Name: ${request.restaurantName}
        Cuisine: ${request.cuisineType}
        Target Audience: ${request.targetAudience}
        Budget per Person: ${request.budgetRange}
        Must Include: ${request.mustIncludeItems}
        Dietary Restrictions: ${request.dietaryRestrictions.join(', ')}

        Format the menu in Markdown.
        Include sections like Starters, Mains, Desserts, Beverages.
        For each item, provide a name, a short appetizing description, and a price within the budget.
        Highlight "Chef's Special" or "Bestseller" for a few items.
    `;

    try {
        const response: GenerateContentResponse = await retryOperation(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                systemInstruction: MARKDOWN_INSTRUCTION,
            }
        }));
        return response.text || "Failed to generate menu.";
    } catch (error: any) {
        throw new Error(formatError(error));
    }
};
