
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { SYSTEM_INSTRUCTION, MARKDOWN_INSTRUCTION, APP_CONTEXT } from "../constants";
import { RecipeCard, SOP, StrategyReport, ImplementationGuide, MenuItem, MenuGenerationRequest } from "../types";

const getApiKey = (): string => {
  // Priority: 1. Environment Variable (Cloud), 2. Hardcoded Fallback (Live Demo)
  if (process.env.API_KEY) return process.env.API_KEY;
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

    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            sku_id: { type: Type.STRING },
            name: { type: Type.STRING },
            category: { type: Type.STRING },
            prep_time_min: { type: Type.NUMBER },
            current_price: { type: Type.NUMBER },
            ingredients: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        qty: { type: Type.STRING },
                        qty_per_serving: { type: Type.NUMBER },
                        cost_per_unit: { type: Type.NUMBER },
                        unit: { type: Type.STRING },
                        cost_per_serving: { type: Type.NUMBER }
                    }
                }
            },
            yield: { type: Type.NUMBER },
            preparation_steps: { type: Type.ARRAY, items: { type: Type.STRING } },
            food_cost_per_serving: { type: Type.NUMBER },
            suggested_selling_price: { type: Type.NUMBER },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            human_summary: { type: Type.STRING },
            reasoning: { type: Type.STRING },
            confidence: { type: Type.STRING }
        }
    };

    const prompt = `
    Role: ${chefPersona}
    Mission: ${personaInstruction}
    
    Generate a detailed recipe card for "${item.name}". 
    Context/Requirements: ${requirements}
    ${location ? `Location for Costing: ${location}. 
    - Estimate ingredient prices (cost_per_unit) reflective of local wholesale market rates in ${location}.
    - Use local currency (e.g. INR for India) for all costs.` : 'Estimate costs based on average wholesale rates.'}
    
    ${SYSTEM_INSTRUCTION}`;

    const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: schema,
            systemInstruction: SYSTEM_INSTRUCTION // Base instruction + specific prompt override
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
    ${location ? `Ensure revised costs reflect local market rates in ${location}.` : ''}`;

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

    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            sop_id: { type: Type.STRING },
            title: { type: Type.STRING },
            scope: { type: Type.STRING },
            prerequisites: { type: Type.STRING },
            materials_equipment: { type: Type.ARRAY, items: { type: Type.STRING } },
            stepwise_procedure: { 
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        step_no: { type: Type.NUMBER },
                        action: { type: Type.STRING },
                        responsible_role: { type: Type.STRING },
                        time_limit: { type: Type.STRING }
                    }
                }
            },
            critical_control_points: { type: Type.ARRAY, items: { type: Type.STRING } },
            monitoring_checklist: { type: Type.ARRAY, items: { type: Type.STRING } },
            kpis: { type: Type.ARRAY, items: { type: Type.STRING } },
            quick_troubleshooting: { type: Type.STRING }
        }
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Create a Standard Operating Procedure (SOP) for: ${topic}.`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: schema,
            systemInstruction: SYSTEM_INSTRUCTION
        }
    });

    return parseJSON<SOP>(response.text);
};

export const generateStrategy = async (role: string, query: string): Promise<StrategyReport> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key Required");
    const ai = new GoogleGenAI({ apiKey });

    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            summary: { type: Type.ARRAY, items: { type: Type.STRING } },
            causes: { type: Type.ARRAY, items: { type: Type.STRING } },
            action_plan: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        initiative: { type: Type.STRING },
                        impact_estimate: { type: Type.STRING },
                        cost_estimate: { type: Type.STRING },
                        priority: { type: Type.STRING } // High/Medium/Low
                    }
                }
            },
            seasonal_menu_suggestions: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        type: { type: Type.STRING }, // add/remove
                        item: { type: Type.STRING },
                        reason: { type: Type.STRING }
                    }
                }
            },
            roadmap: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        phase_name: { type: Type.STRING },
                        duration: { type: Type.STRING },
                        steps: { type: Type.ARRAY, items: { type: Type.STRING } },
                        milestone: { type: Type.STRING }
                    }
                }
            }
        }
    };

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Role: ${role}. Query: ${query}. Provide a strategic analysis.`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: schema,
            systemInstruction: APP_CONTEXT
        }
    });

    return parseJSON<StrategyReport>(response.text);
};

export const generateImplementationPlan = async (title: string): Promise<ImplementationGuide> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key Required");
    const ai = new GoogleGenAI({ apiKey });

    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            objective: { type: Type.STRING },
            estimated_timeline: { type: Type.STRING },
            phases: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        phase_name: { type: Type.STRING },
                        steps: { type: Type.ARRAY, items: { type: Type.STRING } },
                        resources_needed: { type: Type.ARRAY, items: { type: Type.STRING } },
                        kpi_to_track: { type: Type.STRING }
                    }
                }
            }
        }
    };

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Create a detailed implementation guide for: ${title}`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: schema,
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
