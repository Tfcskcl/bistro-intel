
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION, MARKDOWN_INSTRUCTION, APP_CONTEXT } from "../constants";
import { RecipeCard, SOP, StrategyReport, ImplementationGuide, MenuItem, MenuGenerationRequest } from "../types";

const getApiKey = (): string => {
  // 1. Check Environment Variable (Preferred for Production deployments)
  if (process.env.API_KEY) return process.env.API_KEY;

  // 2. Check Local Storage (User Override / Manual Entry for Live Site)
  const localKey = localStorage.getItem('gemini_api_key');
  if (localKey) return localKey;

  return '';
};

export const setStoredApiKey = (key: string) => {
    if (!key) return;
    localStorage.setItem('gemini_api_key', key.trim());
    // We don't reload automatically to allow UI to update state gracefully
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
        throw new Error("Failed to parse AI response. The model generated invalid JSON.");
    }
};

const createAIClient = () => {
    const key = getApiKey();
    if (!key) throw new Error("API Key is missing. Please connect your Google Gemini API Key.");
    return new GoogleGenAI({ apiKey: key });
};

export const verifyLocationWithMaps = async (locationQuery: string): Promise<string> => {
  try {
    const ai = createAIClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: `Verify this location for a business: "${locationQuery}". Return the formatted address and area type (Commercial/Residential).` }] }],
      config: {
        tools: [{ googleMaps: {} }],
      }
    });
    
    return response.text || "Could not verify location.";
  } catch (error: any) {
      console.error("Maps Error:", error);
      return "Location verification unavailable.";
  }
};

export const generateRecipeCard = async (userId: string, item: MenuItem, requirements: string, location?: string, chefPersona: string = 'Executive Chef'): Promise<RecipeCard> => {
    const ai = createAIClient();

    // Determine Model and Persona-specific instruction
    let modelName = 'gemini-2.5-flash'; 
    let personaInstruction = "You are a professional Executive Chef. Balance flavor, presentation, and cost.";

    switch (chefPersona) {
        case 'The Alchemist':
            personaInstruction = "You are an avant-garde Molecular Gastronomy Chef. Focus on innovative textures, modern techniques (sous-vide, foams, gels), and fusion. Prioritize the 'wow' factor.";
            break;
        case 'The Accountant':
            personaInstruction = "You are a Cost-Control Specialist Chef. Maximize profit margins. Suggest ingredients that have high yield and low waste. Prioritize speed of service.";
            break;
        case 'The Purist':
            personaInstruction = "You are a Traditionalist Chef. Focus on authenticity, heritage, and using fewer, higher-quality ingredients. Avoid shortcuts. Highlight the origin.";
            break;
        case 'The Wellness Guru':
            personaInstruction = "You are a Nutrition-focused Chef. Prioritize macros, superfoods, and dietary compatibility (Gluten-free, Keto, Vegan). Highlight health benefits.";
            break;
        default:
            break;
    }

    // Explicit JSON Template for Prompt-Guided Generation
    const jsonStructure = `
    {
        "sku_id": "${item.sku_id || 'generated'}",
        "name": "Dish Name",
        "category": "main",
        "prep_time_min": 15,
        "current_price": 0,
        "ingredients": [
            { "name": "Ingredient Name", "qty": "100g", "qty_per_serving": 100, "cost_per_unit": 50, "unit": "g", "cost_per_serving": 5 }
        ],
        "yield": 1,
        "preparation_steps": ["Step 1", "Step 2"],
        "food_cost_per_serving": 0,
        "suggested_selling_price": 0,
        "tags": ["Tag1", "Tag2"],
        "human_summary": "A brief description...",
        "reasoning": "Why this recipe works...",
        "confidence": "High"
    }
    `;

    const prompt = `
    Role: ${chefPersona}
    Mission: ${personaInstruction}
    
    Task: Generate a professional recipe card for "${item.name}". 
    Context: ${requirements}
    
    Costing Rules:
    - Location: ${location || 'Global Average'}.
    - Estimate ingredient 'cost_per_unit' based on wholesale market rates in ${location || 'this region'}.
    - Calculate 'cost_per_serving' = (qty_per_serving * cost_per_unit).
    - Calculate 'food_cost_per_serving' as sum of ingredient costs.
    - Set 'suggested_selling_price' to achieve a 25-30% food cost percentage.
    
    Output STRICT JSON matching this structure exactly:
    ${jsonStructure}
    
    ${SYSTEM_INSTRUCTION}`;

    const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
            responseMimeType: 'application/json'
        }
    });

    return parseJSON<RecipeCard>(response.text);
};

export const generateRecipeVariation = async (userId: string, original: RecipeCard, variationType: string, location?: string): Promise<RecipeCard> => {
    const ai = createAIClient();

    const prompt = `
    Task: Create a "${variationType}" variation of the following recipe.
    Original Recipe JSON: ${JSON.stringify(original)}
    
    Requirements:
    1. Adjust ingredients to match the "${variationType}" style (e.g. Vegan = no animal products, Budget = cheaper alternatives).
    2. Recalculate all costs based on new ingredients.
    3. Keep the exact same JSON structure.
    4. Update the 'name' to reflect the variation.
    
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
    const ai = createAIClient();

    const prompt = `
    Context: Professional Kitchen.
    Task: Substitute "${ingredientName}" in the provided recipe with a suitable alternative.
    Goal: Reduce cost or improve availability while maintaining the dish's essence.
    
    Recipe JSON:
    ${JSON.stringify(recipe)}

    Instructions:
    1. Identify a good substitute.
    2. Replace the ingredient object in the 'ingredients' array.
    3. Update 'qty', 'cost_per_unit', 'cost_per_serving' based on local rates in "${location || 'General Market'}".
    4. Recalculate 'food_cost_per_serving' and 'margin_pct' for the whole dish.
    5. Return the COMPLETE updated RecipeCard JSON.
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
    const ai = createAIClient();

    const jsonTemplate = {
        sop_id: "SOP-GEN-001",
        title: "SOP Title",
        scope: "Who this applies to",
        prerequisites: "Requirements before starting",
        materials_equipment: ["Item 1", "Item 2"],
        stepwise_procedure: [
            { step_no: 1, action: "Action description", responsible_role: "Role", time_limit: "5 mins" }
        ],
        critical_control_points: ["Safety check 1"],
        monitoring_checklist: ["Check 1"],
        kpis: ["Success Metric"],
        quick_troubleshooting: "If X happens, do Y"
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Create a Standard Operating Procedure (SOP) for: "${topic}". 
        Role: F&B Operations Manager.
        Tone: Professional, Clear, Actionable.
        
        Output STRICT JSON matching this structure: ${JSON.stringify(jsonTemplate)}`,
        config: {
            responseMimeType: 'application/json'
        }
    });

    return parseJSON<SOP>(response.text);
};

export const generateStrategy = async (role: string, query: string): Promise<StrategyReport> => {
    const ai = createAIClient();

    const jsonTemplate = {
        summary: ["Key insight 1", "Key insight 2"],
        causes: ["Root cause 1", "Root cause 2"],
        action_plan: [
            { initiative: "Action Name", impact_estimate: "High Impact", cost_estimate: "Low Cost", priority: "High" }
        ],
        seasonal_menu_suggestions: [
            { type: "add", item: "Dish Name", reason: "Why it works" }
        ],
        roadmap: [
            { phase_name: "Phase 1", duration: "Week 1", steps: ["Step 1", "Step 2"], milestone: "Goal Achieved" }
        ]
    };

    const prompt = `
    Role: Senior Restaurant Consultant acting as ${role}.
    Query: "${query}"
    
    Analyze the situation and provide a strategic plan.
    Focus on: Revenue Growth, Cost Reduction, and Operational Efficiency.
    
    Output STRICT JSON matching this structure:
    ${JSON.stringify(jsonTemplate)}
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json'
        }
    });

    return parseJSON<StrategyReport>(response.text);
};

export const generateImplementationPlan = async (title: string): Promise<ImplementationGuide> => {
    const ai = createAIClient();

    const jsonTemplate = {
        objective: "Clear objective statement",
        estimated_timeline: "e.g. 2 Weeks",
        phases: [
            { phase_name: "Phase 1: Preparation", steps: ["Step 1", "Step 2"], resources_needed: ["Resource A"], kpi_to_track: "Metric" }
        ]
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Create a detailed implementation guide for: "${title}".
        Output STRICT JSON matching this structure: ${JSON.stringify(jsonTemplate)}`,
        config: {
            responseMimeType: 'application/json'
        }
    });

    return parseJSON<ImplementationGuide>(response.text);
};

export const generateMarketingVideo = async (images: string[], prompt: string, aspectRatio: '16:9' | '9:16' | '1:1'): Promise<string> => {
    const ai = createAIClient();
    const apiKey = getApiKey();

    const ar = aspectRatio === '1:1' ? '9:16' : aspectRatio;

    let operation;
    
    if (images.length > 0) {
        operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: prompt,
            image: {
                imageBytes: images[0],
                mimeType: 'image/png', 
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
    const ai = createAIClient();

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
    const ai = createAIClient();

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Analyze this kitchen workflow issue and suggest an optimization plan: ${description}. 
        Return a well-formatted Markdown response with headings, bullet points, and a diagram description if needed.`,
        config: {
            systemInstruction: MARKDOWN_INSTRUCTION
        }
    });

    return response.text || "Analysis unavailable.";
};

export const generateMenu = async (request: MenuGenerationRequest): Promise<string> => {
    const ai = createAIClient();

    const prompt = `Generate a restaurant menu.
    Restaurant: ${request.restaurantName} (${request.cuisineType})
    Audience: ${request.targetAudience}
    Budget: ${request.budgetRange}
    Must Include: ${request.mustIncludeItems}
    Restrictions: ${request.dietaryRestrictions.join(', ')}
    
    Output in clean Markdown format with categories, dish names, descriptions, and prices.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: MARKDOWN_INSTRUCTION
        }
    });

    return response.text || "Menu generation failed.";
};

export const getChatResponse = async (history: {role: string, text: string}[], message: string): Promise<string> => {
    const ai = createAIClient();

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
