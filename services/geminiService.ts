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

export const generateRecipeCard = async (userId: string, item: MenuItem): Promise<RecipeCard> => {
  const ai = getClient();
  const currentIngredients = ingredientService.getAll(userId);

  const prompt = `
    Generate a standardized recipe card for SKU: ${item.sku_id} with name "${item.name}".
    
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

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text) as RecipeCard;
  } catch (error) {
    console.error("Error generating recipe:", error);
    throw error;
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

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text) as RecipeCard;
  } catch (error) {
    console.error("Error generating variation:", error);
    throw error;
  }
};

export const generateSOP = async (topic: string): Promise<SOP> => {
  const ai = getClient();
  const prompt = `
    Create an SOP for "${topic}" for a modern cafe bistro.
    
    Output as valid JSON:
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

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text) as SOP;
  } catch (error) {
    console.error("Error generating SOP:", error);
    throw error;
  }
};

export const generateStrategy = async (role: string, context: string): Promise<StrategyReport> => {
  const ai = getClient();
  const prompt = `
    Role Context: I am the ${role}.
    User Request: ${context}
    
    Assume a generic restaurant scenario if no specific data is provided, but prioritize actionable advice.
    
    Output as valid JSON:
    {
      "summary": ["string"],
      "causes": ["string"],
      "action_plan": [{"initiative": "string", "impact_estimate": "string", "cost_estimate": "string", "priority": "High|Medium|Low"}],
      "seasonal_menu_suggestions": [{"type": "add|remove", "item": "string", "reason": "string"}]
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

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text) as StrategyReport;
  } catch (error) {
    console.error("Error generating strategy:", error);
    throw error;
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

        const text = response.text;
        if (!text) throw new Error("No response from AI");
        return JSON.parse(text) as ImplementationGuide;
    } catch (error) {
        console.error("Error generating plan:", error);
        throw error;
    }
};