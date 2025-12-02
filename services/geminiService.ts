
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { SYSTEM_INSTRUCTION, MARKDOWN_INSTRUCTION, APP_CONTEXT } from "../constants";
import { RecipeCard, SOP, StrategyReport, ImplementationGuide, MenuItem, MenuGenerationRequest } from "../types";

const getApiKey = (): string => {
  // 1. Check Local Storage (User Override / Manual Entry)
  const localKey = localStorage.getItem('gemini_api_key');
  if (localKey) return localKey;

  // 2. Check Environment Variable (Cloud / Build time)
  if (process.env.API_KEY) return process.env.API_KEY;

  return '';
};

export const setStoredApiKey = (key: string) => {
    localStorage.setItem('gemini_api_key', key);
    window.location.reload(); // Reload to reset state with new key
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
        let clean = text.replace(/```json\n?|```/g, '').trim();
        
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

export const verifyLocationWithMaps = async (locationQuery: string): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) return "API Key Required for location verification.";

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
      console.error("Maps Error:", error);
      return "Verification unavailable.";
  }
};

export const generateRecipeCard = async (userId: string, item: MenuItem, requirements: string, location?: string, chefPersona: string = 'Executive Chef'): Promise<RecipeCard> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key Required");
    const ai = new GoogleGenAI({ apiKey });

    // Determine Model and Persona-specific instruction
    let modelName = 'gemini-2.5-flash';
    let personaInstruction = "You are a professional Executive Chef. Balance flavor, presentation, and cost.";

    switch (chefPersona) {
        case 'The Alchemist':
            modelName = 'gemini-3-pro-preview'; // More reasoning for complex fusion
            personaInstruction = "You are an avant-garde Molecular Gastronomy Chef. Focus on innovative textures, modern techniques (sous-vide, foams, gels), and fusion of cuisines. Prioritize the 'wow' factor.";
            break;
        case 'The Accountant':
            modelName = 'gemini-2.5-flash'; // Efficiency
            personaInstruction = "You are a Cost-Control Specialist Chef. Maximize profit margins. Suggest ingredients that have high yield and low waste. Prioritize speed of service and shelf life.";
            break;
        case 'The Purist':
            modelName = 'gemini-3-pro-preview';
            personaInstruction = "You are a Traditionalist Chef. Focus on authenticity, heritage, and using fewer, higher-quality ingredients. Avoid shortcuts. Highlight the origin of the dish.";
            break;
        case 'The Wellness Guru':
            modelName = 'gemini-2.5-flash';
            personaInstruction = "You are a Nutrition-focused Chef. Prioritize macros, superfoods, and dietary compatibility (Gluten-free, Keto, Vegan). Highlight health benefits in the summary.";
            break;
        default:
            // Executive Chef
            break;
    }

    // Template to guide the model (More robust than strict Schema for complex creative tasks)
    const jsonTemplate = {
        sku_id: "string",
        name: "string",
        category: "main",
        prep_time_min: 0,
        current_price: 0,
        ingredients: [
            { name: "string", qty: "string", qty_per_serving: 0, cost_per_unit: 0, unit: "string", cost_per_serving: 0 }
        ],
        yield: 0,
        preparation_steps: ["string"],
        food_cost_per_serving: 0,
        suggested_selling_price: 0,
        tags: ["string"],
        human_summary: "string",
        reasoning: "string",
        confidence: "High"
    };

    const prompt = `
    Role: ${chefPersona}
    Mission: ${personaInstruction}
    
    Generate a detailed recipe card for "${item.name}". 
    Context/Requirements: ${requirements}
    ${location ? `Location for Costing: ${location}. 
    - Estimate ingredient prices (cost_per_unit) reflective of local wholesale market rates in ${location}.
    - Use local currency (e.g. INR for India) for all costs.` : 'Estimate costs based on average wholesale rates.'}
    
    Output STRICT JSON matching this structure:
    ${JSON.stringify(jsonTemplate)}
    
    ${SYSTEM_INSTRUCTION}`;

    const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            // Removed strict responseSchema to prevent validation errors on creative outputs
        }
    });

    return parseJSON<RecipeCard>(response.text);
};

export const generateRecipeVariation = async (userId: string, original: RecipeCard, variationType: string, location?: string): Promise<RecipeCard> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key Required");
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Create a "${variationType}" variation of the following recipe: ${JSON.stringify(original)}.
    Maintain the same JSON structure. Adjust ingredients, steps, and costs accordingly.
    ${location ? `Ensure revised costs reflect local market rates in ${location}.` : ''}
    Output STRICT JSON.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json'
        }
    });

    return parseJSON<RecipeCard>(response.text);
};

export const substituteIngredient = async (recipe: RecipeCard, ingredientName: string, location?: string): Promise<RecipeCard> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key Required");
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
    Context: Professional Kitchen.
    Task: Substitute the ingredient "${ingredientName}" in the provided recipe with a suitable alternative.
    Goal: Reduce cost or improve availability while maintaining the dish's essence.
    
    Recipe JSON:
    ${JSON.stringify(recipe)}

    Instructions:
    1. Identify a good substitute for "${ingredientName}".
    2. Replace the ingredient in the 'ingredients' list.
    3. Update 'qty', 'cost_per_unit', 'cost_per_serving' for the new ingredient based on local market rates in "${location || 'General Market'}".
    4. Recalculate 'food_cost_per_serving' and 'margin_pct' for the whole dish.
    5. Update 'preparation_steps' if the new ingredient requires different processing.
    6. Return the COMPLETE updated RecipeCard JSON.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json'
        }
    });

    return parseJSON<RecipeCard>(response.text);
};

export const generateSOP = async (topic: string): Promise<SOP> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key Required");
    const ai = new GoogleGenAI({ apiKey });

    const jsonTemplate = {
        sop_id: "string",
        title: "string",
        scope: "string",
        prerequisites: "string",
        materials_equipment: ["string"],
        stepwise_procedure: [
            { step_no: 1, action: "string", responsible_role: "string", time_limit: "string" }
        ],
        critical_control_points: ["string"],
        monitoring_checklist: ["string"],
        kpis: ["string"],
        quick_troubleshooting: "string"
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Create a Standard Operating Procedure (SOP) for: ${topic}. 
        Output STRICT JSON matching this structure: ${JSON.stringify(jsonTemplate)}`,
        config: {
            responseMimeType: 'application/json',
            systemInstruction: SYSTEM_INSTRUCTION
        }
    });

    return parseJSON<SOP>(response.text);
};

export const generateStrategy = async (role: string, query: string): Promise<StrategyReport> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key Required");
    const ai = new GoogleGenAI({ apiKey });

    const jsonTemplate = {
        summary: ["string"],
        causes: ["string"],
        action_plan: [
            { initiative: "string", impact_estimate: "string", cost_estimate: "string", priority: "High" }
        ],
        seasonal_menu_suggestions: [
            { type: "add", item: "string", reason: "string" }
        ],
        roadmap: [
            { phase_name: "string", duration: "string", steps: ["string"], milestone: "string" }
        ]
    };

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Role: ${role}. Query: ${query}. Provide a strategic analysis.
        Output STRICT JSON matching this structure: ${JSON.stringify(jsonTemplate)}`,
        config: {
            responseMimeType: 'application/json',
            systemInstruction: APP_CONTEXT
        }
    });

    return parseJSON<StrategyReport>(response.text);
};

export const generateImplementationPlan = async (title: string): Promise<ImplementationGuide> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key Required");
    const ai = new GoogleGenAI({ apiKey });

    const jsonTemplate = {
        objective: "string",
        estimated_timeline: "string",
        phases: [
            { phase_name: "string", steps: ["string"], resources_needed: ["string"], kpi_to_track: "string" }
        ]
    };

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Create a detailed implementation guide for: ${title}.
        Output STRICT JSON matching this structure: ${JSON.stringify(jsonTemplate)}`,
        config: {
            responseMimeType: 'application/json',
            systemInstruction: "You are an operations manager. Provide clear, step-by-step instructions."
        }
    });

    return parseJSON<ImplementationGuide>(response.text);
};

export const generateMarketingVideo = async (images: string[], prompt: string, aspectRatio: '16:9' | '9:16' | '1:1'): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key Required");
    const ai = new GoogleGenAI({ apiKey });

    // Using Veo fast for preview.
    // Veo supports 16:9 or 9:16. Mapping 1:1 to 9:16 as fallback.
    const ar = aspectRatio === '1:1' ? '9:16' : aspectRatio;

    let operation;
    if (images.length > 0) {
        operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: prompt,
            image: {
                imageBytes: images[0],
                mimeType: 'image/png', // Assumption based on input handling
            },
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: ar
            }
        });
    } else {
        operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: prompt,
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: ar
            }
        });
    }

    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!uri) throw new Error("Video generation failed to return a URI.");
    
    // Append key for access
    return `${uri}&key=${apiKey}`;
};

export const generateMarketingImage = async (prompt: string, aspectRatio: '16:9' | '9:16' | '1:1'): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key Required");
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: prompt,
        config: {
            imageConfig: {
                aspectRatio: aspectRatio,
            }
        }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }
    throw new Error("No image generated.");
};

export const generateKitchenWorkflow = async (description: string): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key Required");
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Analyze this kitchen workflow issue and suggest an optimization plan: ${description}. Use Markdown formatting.`,
        config: {
            systemInstruction: MARKDOWN_INSTRUCTION
        }
    });

    return response.text || "Analysis unavailable.";
};

export const generateMenu = async (request: MenuGenerationRequest): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key Required");
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Generate a restaurant menu.
    Restaurant: ${request.restaurantName} (${request.cuisineType})
    Audience: ${request.targetAudience}
    Budget: ${request.budgetRange}
    Must Include: ${request.mustIncludeItems}
    Restrictions: ${request.dietaryRestrictions.join(', ')}
    
    Output in Markdown.`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
            systemInstruction: MARKDOWN_INSTRUCTION
        }
    });

    return response.text || "Menu generation failed.";
};

export const getChatResponse = async (history: {role: string, text: string}[], message: string): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key Required");
    const ai = new GoogleGenAI({ apiKey });

    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        history: history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
        config: {
            systemInstruction: APP_CONTEXT
        }
    });

    const result = await chat.sendMessage({ message: message });
    return result.text || "I'm not sure how to respond to that.";
};
