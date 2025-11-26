
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";
import { RecipeCard, SOP, StrategyReport, ImplementationGuide, MenuItem } from "../types";
import { ingredientService } from "./ingredientService";

let client: GoogleGenAI | null = null;

const getClient = (): GoogleGenAI => {
  if (!client) {
    const apiKey = (typeof process !== 'undefined' && process.env && process.env.API_KEY) 
      ? process.env.API_KEY 
      : '';
      
    if (!apiKey) {
      console.warn("API_KEY not found in environment variables. AI features may fail.");
    }
    
    client = new GoogleGenAI({ apiKey });
  }
  return client;
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

export const generateRecipeCard = async (userId: string, item: MenuItem, requirements?: string): Promise<RecipeCard> => {
  const ai = getClient();
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
    console.error("Error generating recipe:", error);
    throw new Error(error.message || "Failed to generate recipe");
  }
};

export const generateRecipeVariation = async (userId: string, originalRecipe: RecipeCard, variationType: string): Promise<RecipeCard> => {
  const ai = getClient();
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
    console.error("Error generating variation:", error);
    throw new Error(error.message || "Failed to generate variation");
  }
};

export const generateSOP = async (topic: string): Promise<SOP> => {
  const ai = getClient();
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
    console.error("Error generating SOP:", error);
    throw new Error(error.message || "Failed to generate SOP. Please check API Key.");
  }
};

export const generateStrategy = async (role: string, context: string): Promise<StrategyReport> => {
  const ai = getClient();
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
    console.error("Error generating strategy:", error);
    throw new Error(error.message || "Failed to generate strategy");
  }
};

export const generateImplementationPlan = async (initiative: string): Promise<ImplementationGuide> => {
    const ai = getClient();
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
        console.error("Error generating plan:", error);
        throw new Error(error.message || "Failed to generate plan");
    }
};
