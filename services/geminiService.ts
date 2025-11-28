
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";
import { RecipeCard, SOP, StrategyReport, ImplementationGuide, MenuItem, MenuGenerationRequest } from "../types";
import { ingredientService } from "./ingredientService";

const getApiKey = (): string => {
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    return process.env.API_KEY;
  }
  return '';
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
    Ingredient Prices (Use these for costing if matches found, otherwise estimate): ${JSON.stringify(currentIngredients)}

    Important:
    - If specific ingredient prices are not found in context, estimate reasonable market rates.
    - Ensure 'food_cost_per_serving' is calculated based on ingredient quantities and costs.
    - 'sku_id' should match the input or be generated if missing.
    - 'category' should be one of: main, snack, beverage, dessert.
    - 'current_price' should be the current selling price or estimated if unknown.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: recipeSchema
      }
    });

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
    
    Ingredient Prices Context: ${JSON.stringify(currentIngredients)}

    Tasks:
    1. Modify ingredients to suit the "${variationType}" requirement.
    2. Adjust preparation steps accordingly.
    3. Recalculate estimated food cost and price.
    4. Update the name to reflect the variation.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: recipeSchema
      }
    });

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
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json'
      }
    });

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
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json'
      }
    });

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
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: 'application/json'
            }
        });

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

  // NOTE: Users must select their own API key via window.aistudio.openSelectKey() in the UI before calling this.
  const ai = new GoogleGenAI({ apiKey });

  // Veo models only support 16:9 or 9:16. Default 1:1 to 16:9 to prevent 500 error.
  const safeAspectRatio = (aspectRatio === '16:9' || aspectRatio === '9:16') ? aspectRatio : '16:9';

  try {
      let operation;

      if (images.length > 1) {
          // Multiple images -> Use veo-3.1-generate-preview
          // Using hardcoded strings instead of imported Enums to avoid browser issues
          const referenceImagesPayload: any[] = images.map(img => ({
              image: {
                  imageBytes: img,
                  mimeType: 'image/png'
              },
              referenceType: 'ASSET'
          }));

          operation = await ai.models.generateVideos({
              model: 'veo-3.1-generate-preview',
              prompt: prompt,
              config: {
                  numberOfVideos: 1,
                  referenceImages: referenceImagesPayload,
                  resolution: '720p',
                  aspectRatio: '16:9' // Fixed for this model
              }
          });
      } else if (images.length === 1) {
          // Single image -> Use veo-3.1-fast-generate-preview
          operation = await ai.models.generateVideos({
              model: 'veo-3.1-fast-generate-preview',
              prompt: prompt || 'Cinematic food shot', 
              image: {
                  imageBytes: images[0],
                  mimeType: 'image/png', 
              },
              config: {
                  numberOfVideos: 1,
                  resolution: '720p',
                  aspectRatio: safeAspectRatio
              }
          });
      } else {
          // Text only -> Use veo-3.1-fast-generate-preview
          operation = await ai.models.generateVideos({
              model: 'veo-3.1-fast-generate-preview',
              prompt: prompt,
              config: {
                  numberOfVideos: 1,
                  resolution: '720p',
                  aspectRatio: safeAspectRatio
              }
          });
      }

      // Poll for completion
      while (!operation.done) {
          await new Promise(resolve => setTimeout(resolve, 5000));
          operation = await ai.operations.getVideosOperation({operation: operation});
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      
      if (!downloadLink) {
          throw new Error("Video generation completed but no URI returned.");
      }

      // Note: Typically we return the blob URL for immediate viewing
      const response = await fetch(`${downloadLink}&key=${apiKey}`);
      const blob = await response.blob();
      return URL.createObjectURL(blob);

  } catch (error: any) {
      throw new Error(formatError(error));
  }
};

export const generateMarketingImage = async (prompt: string, aspectRatio: string): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error("API Key required for image generation");
    }

    const ai = new GoogleGenAI({ apiKey });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: {
                parts: [{ text: prompt }]
            },
            config: {
                imageConfig: {
                    aspectRatio: aspectRatio,
                    imageSize: "1K"
                }
            }
        });

        let base64Image = '';
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                base64Image = part.inlineData.data;
                break;
            }
        }

        if (!base64Image) {
            throw new Error("No image generated. Please try again.");
        }

        return `data:image/png;base64,${base64Image}`;

    } catch (error: any) {
        throw new Error(formatError(error));
    }
};

export const generateKitchenWorkflow = async (description: string): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key is missing.");

    const ai = new GoogleGenAI({ apiKey });
    
    // Provide a structure for the workflow in markdown
    const prompt = `
        Design an efficient kitchen workflow based on the following user requirements and context.
        The user has uploaded media (images/videos) which imply the layout described below.
        
        User Description: "${description}"
        
        Output a detailed Workflow Plan in Markdown format. Include:
        1. **Zone Layout Strategy**: How to arrange prep, cooking, and plating areas.
        2. **Process Flow**: Step-by-step movement of food and staff.
        3. **Equipment Placement Recommendations**.
        4. **Safety & Efficiency Checkpoints**.
        
        Keep it professional, operational, and easy to read.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                systemInstruction: SYSTEM_INSTRUCTION
            }
        });
        
        return response.text || "Failed to generate workflow content.";
    } catch (error: any) {
        throw new Error(formatError(error));
    }
};

export const generateMenu = async (req: MenuGenerationRequest): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key is missing.");

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
        Design a complete restaurant menu based on these requirements:
        
        Restaurant Name: ${req.restaurantName}
        Cuisine: ${req.cuisineType}
        Target Audience: ${req.targetAudience}
        Budget Range: ${req.budgetRange}
        Must Include: ${req.mustIncludeItems}
        Dietary Restrictions: ${req.dietaryRestrictions.join(', ')}
        
        Output the menu in nicely formatted Markdown. Structure it by categories (Appetizers, Mains, Desserts, etc.).
        For each item, include:
        - Dish Name
        - A mouth-watering description
        - Estimated Selling Price (based on the budget range)
        - Key Ingredients
        
        Also include a brief "Menu Strategy" section at the end explaining why these items fit the target audience.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                systemInstruction: SYSTEM_INSTRUCTION
            }
        });
        
        return response.text || "Failed to generate menu.";
    } catch (error: any) {
        throw new Error(formatError(error));
    }
};
