
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";
import { RecipeCard, SOP, StrategyReport, ImplementationGuide, MenuItem } from "../types";
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
        // 1. Remove markdown code blocks (```json ... ```)
        let clean = text.replace(/```json\n?|```/g, '');
        
        // 2. Extract the first valid JSON object if there's extra text
        const firstOpen = clean.indexOf('{');
        const lastClose = clean.lastIndexOf('}');
        
        if (firstOpen !== -1 && lastClose !== -1) {
            clean = clean.substring(firstOpen, lastClose + 1);
        }

        return JSON.parse(clean) as T;
    } catch (e) {
        console.error("JSON Parse Error. Raw text:", text);
        throw new Error("Failed to parse AI response. Please try again.");
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

export const generateRecipeCard = async (userId: string, item: MenuItem, requirements?: string): Promise<RecipeCard> => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    console.warn("API Key missing. Returning mock data.");
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate latency
    return {
      ...item,
      yield: 4,
      ingredients: item.ingredients ? item.ingredients.map(ing => ({
        ...ing,
        qty_per_serving: 100,
        cost_per_unit: 100,
        cost_per_serving: 25,
        unit: ing.unit || 'g'
      })) : [],
      preparation_steps: [
        "Prepare all ingredients and equipment.",
        `Combine ingredients for ${item.name}.`,
        "Cook according to standard procedure (Simulated Step).",
        "Garnish and serve immediately."
      ],
      equipment_needed: ["Chef's Knife", "Mixing Bowl", "Pan"],
      portioning_guideline: "One standard serving",
      allergens: ["Check ingredients"],
      prep_time_min: item.prep_time_min || 15,
      shelf_life_hours: 24,
      food_cost_per_serving: (item.current_price || 100) * 0.3,
      suggested_selling_price: item.current_price || 300,
      tags: ["Mock Data", "Demo"],
      human_summary: "This is a simulated recipe because the API Key is missing. Add an API Key to generate real AI recipes.",
      reasoning: "Mock reasoning for demo purposes.",
      confidence: "High",
      category: item.category,
      current_price: item.current_price
    };
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

    Output as valid JSON conforming to this structure:
    {
      "sku_id": "string",
      "name": "string",
      "yield": number,
      "ingredients": [{"ingredient_id": "string", "name": "string", "qty_per_serving": number, "unit": "string", "cost_per_unit": number, "cost_per_serving": number}],
      "preparation_steps": ["string"],
      "equipment_needed": ["string"],
      "portioning_guideline": "string",
      "allergens": ["string"],
      "prep_time_min": number,
      "shelf_life_hours": number,
      "food_cost_per_serving": number,
      "suggested_selling_price": number,
      "tags": ["string"],
      "human_summary": "string",
      "reasoning": "string",
      "confidence": "High|Medium|Low"
    }
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json'
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
    console.warn("API Key missing. Returning mock variation.");
    await new Promise(resolve => setTimeout(resolve, 1500));
    return {
      ...originalRecipe,
      name: `${variationType} - ${originalRecipe.name}`,
      human_summary: `This is a simulated ${variationType} variation.`,
      tags: [...(originalRecipe.tags || []), variationType, "Mock"],
      reasoning: "Mock variation logic."
    };
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

    Output as valid JSON conforming to the exact same RecipeCard structure as the input.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json'
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
    console.warn("API Key missing. Returning mock SOP.");
    await new Promise(resolve => setTimeout(resolve, 1500));
    return {
      sop_id: `mock-sop-${Date.now()}`,
      title: topic,
      scope: "General Operations (Demo)",
      prerequisites: "None",
      materials_equipment: ["Checklist", "Standard Tools"],
      stepwise_procedure: [
        { step_no: 1, action: "Identify requirements.", responsible_role: "Staff" },
        { step_no: 2, action: "Execute procedure according to safety standards.", responsible_role: "Staff" },
        { step_no: 3, action: "Verify results and log completion.", responsible_role: "Supervisor" }
      ],
      critical_control_points: ["Ensure safety compliance at all times."],
      monitoring_checklist: ["Procedure completed", "Area cleaned", "Logged in system"],
      kpis: ["100% Adherence"],
      quick_troubleshooting: "Contact manager if issues arise."
    };
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
      contents: prompt,
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
    console.warn("API Key missing. Returning mock strategy.");
    await new Promise(resolve => setTimeout(resolve, 1500));
    return {
      summary: [
        "This is a simulated strategy report for demonstration purposes.",
        "To get real AI insights, please configure a valid API Key."
      ],
      causes: ["Missing API Configuration", "Demo Mode Active"],
      action_plan: [
        { initiative: "Configure API Key", impact_estimate: "Enable Real AI", cost_estimate: "None", priority: "High" },
        { initiative: "Explore Demo Features", impact_estimate: "High Learning", cost_estimate: "None", priority: "Medium" }
      ],
      seasonal_menu_suggestions: [
        { type: "add", item: "Demo Special Salad", reason: "High margin item for testing." }
      ],
      roadmap: [
        { phase_name: "Setup", duration: "1 Day", steps: ["Add API Key"], milestone: "Full Access" }
      ]
    };
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
      contents: prompt,
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
      console.warn("API Key missing. Returning mock plan.");
      await new Promise(resolve => setTimeout(resolve, 1500));
      return {
        objective: `Implement: ${initiative} (Demo)`,
        estimated_timeline: "2 Weeks",
        phases: [
          {
            phase_name: "Preparation",
            steps: ["Analyze requirements", "Assemble team"],
            resources_needed: ["Time", "Personnel"],
            kpi_to_track: "Readiness Score"
          },
          {
            phase_name: "Execution",
            steps: ["Launch initiative", "Monitor progress"],
            resources_needed: ["Budget"],
            kpi_to_track: "Completion Rate"
          }
        ]
      };
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
            contents: prompt,
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

export const generateMarketingVideo = async (images: string[], prompt: string, aspectRatio: '16:9' | '9:16'): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) {
      throw new Error("API Key required for video generation");
  }

  // NOTE: Users must select their own API key via window.aistudio.openSelectKey() in the UI before calling this.
  const ai = new GoogleGenAI({ apiKey });

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
      } else {
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
                  aspectRatio: aspectRatio
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
