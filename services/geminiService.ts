
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { SYSTEM_INSTRUCTION, MARKDOWN_INSTRUCTION, APP_CONTEXT } from "../constants";
import { RecipeCard, SOP, StrategyReport, ImplementationGuide, MenuItem, MenuGenerationRequest, User, PurchaseOrder, InventoryItem, MenuStructure } from "../types";

// Development Key for Live Preview 
// SECURITY NOTE: We have removed the hardcoded key to prevent exposure.
// Please set the 'API_KEY' environment variable in your hosting provider (Vercel/Netlify).
const PREVIEW_KEY = ""; 

// --- MOCK GENERATORS (DYNAMIC) ---

const generateMockRecipe = (item: MenuItem, requirements: string): RecipeCard => {
    // ... (Existing mock recipe logic remains unchanged)
    const isDrink = item.category === 'beverage';
    const baseName = item.name || "Custom Dish";
    const nameLower = baseName.toLowerCase();
    
    // Smart Ingredient Selection based on Name - ORDER MATTERS (Specific -> Generic)
    const mockIngredients = [];
    
    if (nameLower.includes('risotto')) {
        mockIngredients.push({ name: "Arborio Rice", qty: "150g", qty_per_serving: 0.15, cost_per_unit: 300, unit: "kg", cost_per_serving: 45 });
        mockIngredients.push({ name: "Vegetable Stock", qty: "500ml", qty_per_serving: 0.5, cost_per_unit: 60, unit: "l", cost_per_serving: 30 });
        mockIngredients.push({ name: "Parmesan Cheese", qty: "30g", qty_per_serving: 0.03, cost_per_unit: 1200, unit: "kg", cost_per_serving: 36 });
        mockIngredients.push({ name: "White Wine", qty: "30ml", qty_per_serving: 0.03, cost_per_unit: 800, unit: "l", cost_per_serving: 24 });
        if (nameLower.includes('chicken')) {
             mockIngredients.push({ name: "Chicken Breast", qty: "100g", qty_per_serving: 0.1, cost_per_unit: 250, unit: "kg", cost_per_serving: 25 });
        } else if (nameLower.includes('mushroom')) {
             mockIngredients.push({ name: "Button Mushrooms", qty: "80g", qty_per_serving: 0.08, cost_per_unit: 180, unit: "kg", cost_per_serving: 14.4 });
        }
    } else if (nameLower.includes('pasta') || nameLower.includes('spaghetti') || nameLower.includes('fettuccine')) {
        mockIngredients.push({ name: "Pasta (Dry)", qty: "120g", qty_per_serving: 0.12, cost_per_unit: 150, unit: "kg", cost_per_serving: 18 });
        mockIngredients.push({ name: "Olive Oil", qty: "20ml", qty_per_serving: 0.02, cost_per_unit: 800, unit: "l", cost_per_serving: 16 });
        mockIngredients.push({ name: "Garlic", qty: "5g", qty_per_serving: 0.005, cost_per_unit: 100, unit: "kg", cost_per_serving: 0.5 });
        if (nameLower.includes('alfredo') || nameLower.includes('cream')) {
            mockIngredients.push({ name: "Heavy Cream", qty: "80ml", qty_per_serving: 0.08, cost_per_unit: 220, unit: "l", cost_per_serving: 17.6 });
        } else {
            mockIngredients.push({ name: "Tomato Puree", qty: "100g", qty_per_serving: 0.1, cost_per_unit: 60, unit: "kg", cost_per_serving: 6 });
        }
    } else if (nameLower.includes('burger')) {
        mockIngredients.push({ name: "Burger Bun", qty: "1 pc", qty_per_serving: 1, cost_per_unit: 15, unit: "pc", cost_per_serving: 15 });
        mockIngredients.push({ name: "Patty (Meat/Veg)", qty: "1 pc", qty_per_serving: 1, cost_per_unit: 40, unit: "pc", cost_per_serving: 40 });
        mockIngredients.push({ name: "Lettuce", qty: "20g", qty_per_serving: 0.02, cost_per_unit: 80, unit: "kg", cost_per_serving: 1.6 });
        mockIngredients.push({ name: "Cheese Slice", qty: "1 slice", qty_per_serving: 1, cost_per_unit: 12, unit: "slice", cost_per_serving: 12 });
        mockIngredients.push({ name: "Mayo Sauce", qty: "15g", qty_per_serving: 0.015, cost_per_unit: 180, unit: "kg", cost_per_serving: 2.7 });
    } else if (nameLower.includes('pizza')) {
        mockIngredients.push({ name: "Pizza Dough Ball", qty: "200g", qty_per_serving: 0.2, cost_per_unit: 60, unit: "kg", cost_per_serving: 12 });
        mockIngredients.push({ name: "Mozzarella", qty: "80g", qty_per_serving: 0.08, cost_per_unit: 450, unit: "kg", cost_per_serving: 36 });
        mockIngredients.push({ name: "Pizza Sauce", qty: "60g", qty_per_serving: 0.06, cost_per_unit: 100, unit: "kg", cost_per_serving: 6 });
        mockIngredients.push({ name: "Basil", qty: "5g", qty_per_serving: 0.005, cost_per_unit: 400, unit: "kg", cost_per_serving: 2 });
    } else if (nameLower.includes('chicken') || nameLower.includes('murgh')) {
        // Generic Chicken fallback
        mockIngredients.push({ name: "Chicken Breast (Boneless)", qty: "200g", qty_per_serving: 0.2, cost_per_unit: 250, unit: "kg", cost_per_serving: 50 });
        mockIngredients.push({ name: "Ginger Garlic Paste", qty: "1 tbsp", qty_per_serving: 0.015, cost_per_unit: 100, unit: "kg", cost_per_serving: 1.5 });
        mockIngredients.push({ name: "Greek Yogurt (Thick)", qty: "50g", qty_per_serving: 0.05, cost_per_unit: 120, unit: "kg", cost_per_serving: 6 });
        mockIngredients.push({ name: "Lemon Juice", qty: "10ml", qty_per_serving: 0.01, cost_per_unit: 80, unit: "l", cost_per_serving: 0.8 });
    } else if (nameLower.includes('paneer') || nameLower.includes('cottage cheese')) {
        mockIngredients.push({ name: "Malai Paneer", qty: "180g", qty_per_serving: 0.18, cost_per_unit: 350, unit: "kg", cost_per_serving: 63 });
        mockIngredients.push({ name: "Cashew Paste", qty: "30g", qty_per_serving: 0.03, cost_per_unit: 800, unit: "kg", cost_per_serving: 24 });
        mockIngredients.push({ name: "Fresh Cream", qty: "40ml", qty_per_serving: 0.04, cost_per_unit: 200, unit: "l", cost_per_serving: 8 });
    } else if (nameLower.includes('rice') || nameLower.includes('biryani')) {
        mockIngredients.push({ name: "Basmati Rice (Aged)", qty: "150g", qty_per_serving: 0.15, cost_per_unit: 110, unit: "kg", cost_per_serving: 16.5 });
        mockIngredients.push({ name: "Saffron Strands", qty: "0.1g", qty_per_serving: 0.0001, cost_per_unit: 250000, unit: "kg", cost_per_serving: 25 });
        mockIngredients.push({ name: "Ghee", qty: "20g", qty_per_serving: 0.02, cost_per_unit: 600, unit: "kg", cost_per_serving: 12 });
    } else if (isDrink) {
        mockIngredients.push({ name: "Base Liquid (Milk/Water)", qty: "200ml", qty_per_serving: 0.2, cost_per_unit: 60, unit: "l", cost_per_serving: 12 });
        mockIngredients.push({ name: "Flavor Syrup", qty: "30ml", qty_per_serving: 0.03, cost_per_unit: 400, unit: "l", cost_per_serving: 12 });
        mockIngredients.push({ name: "Ice Cubes", qty: "100g", qty_per_serving: 0.1, cost_per_unit: 5, unit: "kg", cost_per_serving: 0.5 });
    } else {
        // Generic Base
        mockIngredients.push({ name: `Main Protein/Veg for ${baseName}`, qty: "150g", qty_per_serving: 0.15, cost_per_unit: 200, unit: "kg", cost_per_serving: 30 });
    }

    // Add common complex items if not already added
    if (!mockIngredients.some(i => i.name.includes("Oil"))) {
        mockIngredients.push({ name: "Cooking Oil/Butter", qty: "20ml", qty_per_serving: 0.02, cost_per_unit: 160, unit: "l", cost_per_serving: 3.2 });
    }
    if (!mockIngredients.some(i => i.name.includes("Salt"))) {
        mockIngredients.push({ name: "Salt", qty: "5g", qty_per_serving: 0.005, cost_per_unit: 20, unit: "kg", cost_per_serving: 0.1 });
    }
    if (!mockIngredients.some(i => i.name.includes("Water")) && !isDrink) {
        mockIngredients.push({ name: "Water (Prep)", qty: "100ml", qty_per_serving: 0.1, cost_per_unit: 0, unit: "l", cost_per_serving: 0 });
    }
    
    // Add generic aromatics for savory dishes
    if (!isDrink && !mockIngredients.some(i => i.name.includes("Onion"))) {
         mockIngredients.push({ name: "Onion", qty: "50g", qty_per_serving: 0.05, cost_per_unit: 40, unit: "kg", cost_per_serving: 2 });
    }

    const totalCost = mockIngredients.reduce((acc, curr) => acc + (curr.cost_per_serving || 0), 0);

    return {
        sku_id: item.sku_id || `MOCK-${Date.now().toString().substr(-4)}`,
        name: baseName,
        category: item.category,
        prep_time_min: item.prep_time_min || 35,
        current_price: item.current_price || 0,
        ingredients: mockIngredients.map((i, idx) => ({ ...i, ingredient_id: `m_${Date.now()}_${idx}` })),
        yield: 1,
        preparation_steps: [
            `Mise en place: Gather all ingredients for ${baseName}. Ensure work station is sanitized.`,
            `Prepare the main components. Cut vegetables to uniform size.`,
            `Heat the cooking vessel to proper temperature.`,
            `Begin cooking base aromatics (onions, garlic) if applicable.`,
            `Add main ingredients in order of cooking time.`,
            `Season generously with salt and pepper.`,
            `Simmer or cook until main protein/veg is tender and cooked through.`,
            `Check seasoning and adjust acidity or salt.`,
            `Rest the dish for a few minutes if served hot.`,
            `Plate carefully and garnish before serving.`
        ],
        equipment_needed: ["Chef Knife", "Cutting Board", "Heavy Bottom Pan", "Mixing Bowls", "Tongs/Spatula", "Thermometer"],
        portioning_guideline: isDrink ? "350ml Glass" : "Standard Serving Size",
        allergens: ["Check Ingredients"],
        shelf_life_hours: 24,
        food_cost_per_serving: totalCost,
        suggested_selling_price: Math.ceil(totalCost / 0.30), // 30% Food Cost Model
        tags: ["Auto-Generated", "Draft", "Offline Mode"],
        human_summary: `A generated recipe draft for ${baseName}. This uses offline estimations as the AI service was unreachable. Please review costs and ingredients.`,
        reasoning: "Generated using BistroIntelligence Offline Engine. Please connect API Key for full AI precision.",
        confidence: "Low",
        prep_time_minutes: 20,
        cook_time_minutes: 15,
        total_time_minutes: 35
    };
};

const generateMockSOP = (topic: string): SOP => {
    return {
        sop_id: `SOP-MOCK-${Date.now()}`,
        title: topic || "Standard Operating Procedure",
        scope: "General Operations",
        prerequisites: "Staff Training Level 1",
        materials_equipment: ["Checklist", "Safety Gear"],
        stepwise_procedure: [
            { step_no: 1, action: `Initialize process for ${topic}`, responsible_role: "Supervisor", time_limit: "5 min" },
            { step_no: 2, action: "Perform core operational task", responsible_role: "Staff" },
            { step_no: 3, action: "Quality check and verification", responsible_role: "Manager" }
        ],
        critical_control_points: ["Ensure safety compliance at Step 2"],
        monitoring_checklist: ["Log completion time", "Report issues"],
        kpis: ["Completion rate", "Error frequency"],
        quick_troubleshooting: "If issues occur, consult the Manager immediately."
    };
};

const generateMockStrategy = (user: User, query: string): StrategyReport => {
    const q = query.toLowerCase();
    const location = user.location || "General Market";
    
    if (q.includes('marketing') || q.includes('sale') || q.includes('footfall')) {
        return {
            summary: [
                `Marketing Strategy for ${user.restaurantName} in ${location}.`,
                "Analysis of local competition suggests a gap in digital engagement.",
                "Weather patterns indicate a need for comfort food promotions."
            ],
            causes: ["Low social visibility vs local competitors", "Lack of loyalty program", "Seasonal dip in footfall"],
            action_plan: [
                { initiative: "Launch Instagram Reel Campaign targeting local area", impact_estimate: "High (Reach)", cost_estimate: "Low", priority: "High" },
                { initiative: "Corporate Lunch Partnerships with nearby offices", impact_estimate: "Medium", cost_estimate: "Low", priority: "Medium" },
                { initiative: "Happy Hour Specials (4PM-7PM)", impact_estimate: "Medium", cost_estimate: "Medium", priority: "Medium" }
            ],
            seasonal_menu_suggestions: [
                { type: "add", item: "Power Lunch Combo", reason: "Attract office crowd in " + location }
            ],
            roadmap: [
                { phase_name: "Awareness", duration: "Week 1", steps: ["Social Ads", "Flyers"], milestone: "10k Impressions" },
                { phase_name: "Conversion", duration: "Week 2-4", steps: ["Discount Codes", "Events"], milestone: "15% Sales Uplift" }
            ]
        };
    } 
    return {
        summary: [
            `Strategic analysis for ${user.restaurantName} (${user.cuisineType}).`,
            `Focused on optimizing operations in ${location}.`,
            "Data suggests focusing on operational efficiency and customer retention."
        ],
        causes: ["Market saturation in " + location, "Operational variance in food cost"],
        action_plan: [
            { initiative: "Review Menu Pricing vs Competitors", impact_estimate: "High", cost_estimate: "Low", priority: "High" },
            { initiative: "Staff Training Refresh", impact_estimate: "Medium", cost_estimate: "Low", priority: "Medium" }
        ],
        seasonal_menu_suggestions: [
            { type: "add", item: "Seasonal Special", reason: "High margin potential for current weather." }
        ],
        roadmap: [
            { phase_name: "Phase 1: Analysis", duration: "1 Day", steps: ["Review Data", "Set Goals"], milestone: "Plan Approved" }
        ]
    };
};

const generateMockPurchaseOrder = (supplier: string, items: {name: string, parLevel: number, currentStock: number}[]): PurchaseOrder => {
    return {
        id: `PO-${Date.now()}`,
        supplier,
        items: items.map(i => ({ name: i.name, qty: Math.ceil(i.parLevel - i.currentStock + 1), unit: 'units', estimatedCost: 100 })),
        totalEstimatedCost: items.length * 100,
        status: 'draft',
        generatedDate: new Date().toISOString(),
        emailBody: `Dear ${supplier},\n\nPlease fulfill the attached order for:\n\n` + items.map(i => `- ${i.name}: ${Math.ceil(i.parLevel - i.currentStock + 1)} units`).join('\n')
    };
};

const generateMockMenu = (cuisine: string): MenuStructure => {
    const c = cuisine.toLowerCase();
    const isIndian = c.includes('indian') || c.includes('curry');
    const isItalian = c.includes('italian') || c.includes('pizza') || c.includes('pasta');
    const isCafe = c.includes('cafe') || c.includes('coffee') || c.includes('burger');

    return {
        title: "Menu Preview",
        tagline: "Generated Offline Mode",
        currency: "₹",
        sections: [
            {
                title: "Starters",
                items: [
                    { name: isIndian ? "Paneer Tikka" : isItalian ? "Bruschetta" : "Truffle Fries", description: "Freshly prepared appetizer.", price: "250", tags: ["Veg"] },
                    { name: isIndian ? "Chicken 65" : isItalian ? "Calamari" : "Chicken Wings", description: "Spicy and crispy.", price: "350", tags: ["Spicy"] }
                ]
            },
            {
                title: "Mains",
                items: [
                    { name: isIndian ? "Butter Chicken" : isItalian ? "Margherita Pizza" : "Classic Burger", description: "Chef's signature dish.", price: "450", tags: ["Bestseller"] },
                    { name: isIndian ? "Dal Makhani" : isItalian ? "Penne Alfredo" : "Club Sandwich", description: "Rich and creamy.", price: "350", tags: ["Veg"] }
                ]
            }
        ]
    };
};

// --- API HANDLING ---

const getApiKey = (): string => {
  const localKey = localStorage.getItem('gemini_api_key');
  if (localKey && localKey.length > 10) return localKey;
  if (process.env.API_KEY && process.env.API_KEY.length > 10) return process.env.API_KEY;
  return PREVIEW_KEY;
};

export const setStoredApiKey = (key: string) => {
    if (!key) return;
    localStorage.setItem('gemini_api_key', key.trim());
};

export const hasValidApiKey = (): boolean => {
    const key = getApiKey();
    return !!key && key.length > 10;
};

// Helper to clean AI output
export const cleanAndParseJSON = <T>(text: string | undefined): T => {
    if (!text) throw new Error("Empty response from AI");
    try {
        let clean = text.replace(/```json\n?|```/g, '').trim();
        const firstOpen = clean.indexOf('{');
        const lastClose = clean.lastIndexOf('}');
        if (firstOpen !== -1 && lastClose !== -1) {
            clean = clean.substring(firstOpen, lastClose + 1);
        }
        return JSON.parse(clean) as T;
    } catch (e) {
        console.error("JSON Parse Error", e);
        throw new Error("Failed to parse AI response.");
    }
};

const createAIClient = () => {
    const key = getApiKey();
    if (!key || key.length < 10) return null;
    return new GoogleGenAI({ apiKey: key });
};

// --- SERVICES ---

const RECIPE_SCHEMA: Schema = {
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
          ingredient_id: { type: Type.STRING },
          name: { type: Type.STRING },
          qty: { type: Type.STRING },
          qty_per_serving: { type: Type.NUMBER },
          cost_per_unit: { type: Type.NUMBER },
          unit: { type: Type.STRING },
          cost_per_serving: { type: Type.NUMBER }
        },
        required: ["name", "qty", "unit"]
      }
    },
    yield: { type: Type.NUMBER },
    preparation_steps: { type: Type.ARRAY, items: { type: Type.STRING } },
    equipment_needed: { type: Type.ARRAY, items: { type: Type.STRING } },
    portioning_guideline: { type: Type.STRING },
    allergens: { type: Type.ARRAY, items: { type: Type.STRING } },
    shelf_life_hours: { type: Type.NUMBER },
    food_cost_per_serving: { type: Type.NUMBER },
    suggested_selling_price: { type: Type.NUMBER },
    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
    human_summary: { type: Type.STRING },
    reasoning: { type: Type.STRING },
    confidence: { type: Type.STRING },
    prep_time_minutes: { type: Type.NUMBER },
    cook_time_minutes: { type: Type.NUMBER },
    total_time_minutes: { type: Type.NUMBER }
  },
  required: ["name", "ingredients", "preparation_steps", "food_cost_per_serving", "suggested_selling_price"]
};

// ... (Other standard functions)

export const verifyLocationWithMaps = async (locationQuery: string): Promise<string> => {
  const ai = createAIClient();
  if (!ai) return "Mock Verified: " + locationQuery;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: `Verify this location: "${locationQuery}". Return formatted address.` }] }],
      config: { tools: [{ googleMaps: {} }] }
    });
    return response.text || "Verified";
  } catch (error: any) {
      return "Location verification unavailable.";
  }
};

export const estimateMarketRates = async (ingredients: string[], location: string): Promise<Record<string, number>> => {
    const ai = createAIClient();
    if (!ai) {
        await new Promise(r => setTimeout(r, 1000));
        const mockRates: Record<string, number> = {};
        ingredients.forEach(i => mockRates[i] = Math.floor(Math.random() * 200) + 50);
        return mockRates;
    }
    try {
        const prompt = `Task: Estimate current market rates for: ${ingredients.join(', ')} in ${location}. Return JSON object {name: cost_per_unit_number}.`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        return cleanAndParseJSON<Record<string, number>>(response.text);
    } catch (e) {
        return {};
    }
};

export const generateRecipeCard = async (userId: string, item: MenuItem, requirements: string, location?: string, chefPersona: string = 'Executive Chef'): Promise<RecipeCard> => {
    const ai = createAIClient();
    
    if (!ai) {
        await new Promise(r => setTimeout(r, 1500));
        return generateMockRecipe(item, requirements);
    }

    // 1. Text Prompt demanding Agentic Workflow and Search Grounding
    const prompt = `
    Role: You are an elite AI Chef Agent acting as a '${chefPersona}'.
    Task: Architect a comprehensive, operational-grade recipe card for "${item.name}".
    Context: ${requirements}
    Location: ${location || 'India'}

    AGENTIC WORKFLOW:
    1. RESEARCH: Use Google Search to validate authenticity, modern techniques, and local ingredient availability for ${location}.
    2. COST ENGINEERING: Analyze every component (including "hidden" costs like oil, spices, waste). Estimate market rates for ${location}.
    3. OPERATIONAL FEASIBILITY: Ensure steps are executable in a commercial kitchen by line cooks.
    4. PERSONA APPLICATION:
       - If 'Executive Chef': Focus on consistency, standard operating procedures, and balance.
       - If 'The Alchemist': Use modern techniques (sous-vide, foams), unusual pairings.
       - If 'The Accountant': Minimize waste, maximize yield, substitute expensive imports with local premium.
       - If 'The Purist': Stick to traditional methods, authentic sourcing.
       - If 'The Wellness Guru': Focus on macros, clean ingredients, allergen-free alternatives.

    CRITICAL REQUIREMENTS:
    1. INGREDIENTS: List EVERY single ingredient found in your research. Use precise metric units (g, ml).
    2. PREPARATION STEPS: Granular steps using professional culinary terms (brunoise, sweat, deglaze). Include temps and times.
    3. COSTING: Estimate realistic ingredient costs.
    4. PRICING: Suggested Selling Price based on 30% Food Cost.
    5. TIME: Estimate Prep vs Cook time.
    6. EQUIPMENT & ALLERGENS: Explicitly list required equipment (e.g., Blender, Sous-vide) and allergens.
    7. REASONING: Explain your choices based on your Persona (e.g., "Chosen X because...").
    
    OUTPUT FORMAT:
    Return a single valid JSON object matching this structure. Do not include markdown blocks.
    
    {
      "sku_id": "string",
      "name": "string",
      "ingredients": [{"name": "string", "qty": "string", "cost_per_unit": number, "unit": "string", "cost_per_serving": number, "qty_per_serving": number}],
      "preparation_steps": ["string"],
      "food_cost_per_serving": number,
      "suggested_selling_price": number,
      "prep_time_minutes": number,
      "cook_time_minutes": number,
      "total_time_minutes": number,
      "equipment_needed": ["string"],
      "allergens": ["string"],
      "human_summary": "string",
      "reasoning": "string"
    }
    `;

    try {
        // Use Google Search Tool for Grounding
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // Switched to Flash for efficiency
            contents: prompt,
            config: { 
                tools: [{ googleSearch: {} }],
                maxOutputTokens: 8192
            }
        });
        
        // Manual Parsing because we used Tools
        const parsed = cleanAndParseJSON<RecipeCard>(response.text);
        
        if (!parsed.sku_id) parsed.sku_id = `AI-${Date.now().toString().slice(-6)}`;
        // Ensure reasoning is present if API skipped it
        if (!parsed.reasoning) parsed.reasoning = `Generated by ${chefPersona} Agent based on market data.`;
        
        return parsed;

    } catch (e) {
        console.error("AI Generation Failed, falling back to mock:", e);
        return generateMockRecipe(item, requirements);
    }
};

export const generateRecipeVariation = async (userId: string, original: RecipeCard, variationType: string, location?: string): Promise<RecipeCard> => {
    const ai = createAIClient();
    if (!ai) {
        await new Promise(r => setTimeout(r, 1000));
        return { 
            ...original, 
            name: `${original.name} (${variationType})`, 
            tags: [...(original.tags||[]), variationType, "Mock Variation"] 
        };
    }

    try {
        const prompt = `
        Role: Expert Cost Controller & Chef Agent.
        Task: Engineer a "${variationType}" variation of the existing recipe below.
        
        Original Recipe JSON: ${JSON.stringify(original)}

        VARIATION STRATEGIES:
        - If "Vegan": Replace animal products. Ensure protein balance.
        - If "Low-Calorie": Reduce fats/sugars. Use steaming/grilling.
        - If "Spicy": Introduce hot peppers/oils.
        - If "Budget-Friendly": Replace premium ingredients with local alternatives. Maximize yield.
        - If "Gluten-Free": Eliminate wheat.

        REQUIREMENTS:
        1. Maintain core dish identity.
        2. STRICT RE-COSTING AUDIT: Recalculate 'cost_per_serving' for every new ingredient. Sum new costs.
        3. Reasoning: Explain substitutions.
        
        Return valid JSON.
        `;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', 
            contents: prompt,
            config: { 
                responseMimeType: 'application/json',
                responseSchema: RECIPE_SCHEMA,
                maxOutputTokens: 8192 
            }
        });
        const parsed = JSON.parse(response.text || '{}');
        return parsed as RecipeCard;
    } catch (e) {
        return { ...original, name: `${original.name} (${variationType} - Mock)`, tags: [...(original.tags||[]), "Generated"] };
    }
};

export const substituteIngredient = async (recipe: RecipeCard, ingredientName: string, location?: string): Promise<RecipeCard> => {
    // ... (unchanged)
    const ai = createAIClient();
    if (!ai) {
        await new Promise(r => setTimeout(r, 800));
        const newIngs = recipe.ingredients.map(i => i.name === ingredientName ? { ...i, name: `${i.name} Substitute (Mock)`, cost_per_unit: i.cost_per_unit ? i.cost_per_unit * 0.9 : 0 } : i);
        return { ...recipe, ingredients: newIngs };
    }
    try {
        const prompt = `Task: Find a culinary substitute for "${ingredientName}" in this recipe. Update quantities, costs, and explain reasoning. Return full JSON. Recipe: ${JSON.stringify(recipe)}`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json', responseSchema: RECIPE_SCHEMA }
        });
        return JSON.parse(response.text || '{}');
    } catch (e) {
        const newIngs = recipe.ingredients.map(i => i.name === ingredientName ? { ...i, name: `${i.name} Substitute (Alt)`, cost_per_unit: i.cost_per_unit ? i.cost_per_unit * 0.9 : 0 } : i);
        return { ...recipe, ingredients: newIngs };
    }
};

// ... (Rest of file: generateSOP, generateStrategy, etc. remain unchanged)
export const generateSOP = async (topic: string): Promise<SOP> => {
    const ai = createAIClient();
    if (!ai) { await new Promise(r => setTimeout(r, 1500)); return generateMockSOP(topic); }
    const template = `{ "sop_id": "gen", "title": "Title", "scope": "Scope", "prerequisites": "Pre", "materials_equipment": ["M1"], "stepwise_procedure": [{"step_no": 1, "action": "Act", "responsible_role": "Role"}], "critical_control_points": ["C1"], "monitoring_checklist": ["Ch1"], "kpis": ["K1"], "quick_troubleshooting": "Fix" }`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Create SOP for "${topic}". Return JSON: ${template}`,
            config: { responseMimeType: 'application/json' }
        });
        return cleanAndParseJSON<SOP>(response.text);
    } catch (e) { return generateMockSOP(topic); }
};

export const generateStrategy = async (user: User, query: string, salesSummary: string): Promise<StrategyReport> => {
    const ai = createAIClient();
    if (!ai) { await new Promise(r => setTimeout(r, 2000)); return generateMockStrategy(user, query); }
    const template = `{ "summary": ["P1"], "causes": ["C1"], "action_plan": [{"initiative": "I1", "impact_estimate": "H", "cost_estimate": "L", "priority": "High"}], "seasonal_menu_suggestions": [{"type": "add", "item": "I", "reason": "R"}], "roadmap": [{"phase_name": "P1", "duration": "D", "steps": ["S"], "milestone": "M"}] }`;
    const prompt = `Role: Senior Restaurant Strategist. Context: ${user.location}, ${salesSummary}. Query: ${query}. Return JSON: ${template}`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        return cleanAndParseJSON<StrategyReport>(response.text);
    } catch (e) { return generateMockStrategy(user, query); }
};

export const generateImplementationPlan = async (title: string): Promise<ImplementationGuide> => {
    const ai = createAIClient();
    if (!ai) return { objective: "Impl " + title, phases: [], estimated_timeline: "2w" };
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Impl guide for "${title}". JSON.`,
            config: { responseMimeType: 'application/json' }
        });
        return cleanAndParseJSON<ImplementationGuide>(response.text);
    } catch (e) { return { objective: "Failed", phases: [], estimated_timeline: "Unknown" }; }
};

export const generateMarketingVideo = async (images: string[], prompt: string, aspectRatio: string): Promise<string> => {
    const ai = createAIClient();
    if (!ai) { await new Promise(r => setTimeout(r, 3000)); return "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"; }
    try {
        const validRatio = aspectRatio === '9:16' ? '9:16' : '16:9';
        const key = getApiKey();
        const generateRequest: any = { model: 'veo-3.1-fast-generate-preview', prompt: prompt, config: { numberOfVideos: 1, aspectRatio: validRatio, resolution: '720p' } };
        if (images.length > 0 && images[0].startsWith('data:')) {
            const match = images[0].match(/^data:(.+);base64,(.+)$/);
            if (match) generateRequest.image = { mimeType: match[1], imageBytes: match[2] };
        }
        let operation = await ai.models.generateVideos(generateRequest);
        let retries = 0;
        while (!operation.done && retries < 60) { await new Promise(r => setTimeout(r, 2000)); operation = await ai.operations.getVideosOperation({operation}); retries++; }
        const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (uri) return `${uri}&key=${key}`;
        throw new Error("No URI");
    } catch (e) { return "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"; }
};

export const generateMarketingImage = async (prompt: string, aspectRatio: string): Promise<string> => {
    const ai = createAIClient();
    const fallbackUrl = () => {
        const width = aspectRatio === '16:9' ? 1280 : aspectRatio === '9:16' ? 720 : 1024;
        const height = aspectRatio === '16:9' ? 720 : aspectRatio === '9:16' ? 1280 : 1024;
        return `https://pollinations.ai/p/${encodeURIComponent(prompt)}?width=${width}&height=${height}&model=flux`;
    };

    if (!ai) return fallbackUrl();
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image', // Nano Banana
            contents: { parts: [{ text: prompt }] },
            config: { imageConfig: { aspectRatio: aspectRatio === '9:16' ? '9:16' : aspectRatio === '16:9' ? '16:9' : '1:1' } }
        });
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
        throw new Error("No image data");
    } catch (e) { 
        return fallbackUrl();
    }
};

export const generateKitchenWorkflow = async (desc: string): Promise<string> => {
    const ai = createAIClient();
    if (!ai) return "# Workflow\nGenerated offline.";
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze: ${desc}. Return Markdown.`,
            config: { systemInstruction: MARKDOWN_INSTRUCTION }
        });
        return response.text || "";
    } catch (e) { return "# Offline"; }
};

export const generateMenu = async (request: MenuGenerationRequest): Promise<string> => {
    const ai = createAIClient();
    // Improved Fallback with smart mock
    if (!ai) return JSON.stringify(generateMockMenu(request.cuisineType));
    
    const prompt = `Task: Design menu for "${request.restaurantName}". Context: ${request.cuisineType}, ${request.targetAudience}, ${request.budgetRange}. Output JSON {title, tagline, currency, sections:[{title, items:[{name, description, price, tags, pairing}]}]}.`;
    
    try {
        const response = await ai.models.generateContent({ 
            model: 'gemini-2.5-flash', // Switched to Flash/Nano for efficiency
            contents: prompt, 
            config: { responseMimeType: 'application/json', maxOutputTokens: 8192 } 
        });
        return response.text || JSON.stringify(generateMockMenu(request.cuisineType));
    } catch (e) { return JSON.stringify(generateMockMenu(request.cuisineType)); }
};

export const generatePurchaseOrder = async (supplier: string, items: InventoryItem[]): Promise<PurchaseOrder> => {
    const ai = createAIClient();
    if (!ai) { await new Promise(r => setTimeout(r, 1500)); return generateMockPurchaseOrder(supplier, items); }
    try {
        const lowStock = items.map(i => `${i.name}: Stock ${i.currentStock} ${i.unit}, Par ${i.parLevel}`).join(', ');
        const prompt = `Create PO for ${supplier}. Items: ${lowStock}. Return JSON {supplier, items:[{name, qty, unit, estimatedCost}], totalEstimatedCost, emailBody}.`;
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } });
        const parsed = cleanAndParseJSON<Partial<PurchaseOrder>>(response.text);
        return { id: `PO-${Date.now()}`, status: 'draft', generatedDate: new Date().toISOString(), supplier, items: parsed.items||[], totalEstimatedCost: parsed.totalEstimatedCost||0, emailBody: parsed.emailBody||"" };
    } catch (e) { return generateMockPurchaseOrder(supplier, items); }
};

export const forecastInventoryNeeds = async (inventory: InventoryItem[], salesSummary: any): Promise<any> => {
    const ai = createAIClient();
    if (!ai) return { recommendations: [] };
    const prompt = `Forecast inventory for: ${JSON.stringify(inventory.map(i=>({name: i.name, current: i.currentStock})))}. Sales context: ${JSON.stringify(salesSummary)}. Return JSON {recommendations: [{itemName, suggestedOrder, reason}]}`;
    try {
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } });
        return cleanAndParseJSON(response.text);
    } catch (e) { return { recommendations: [] }; }
};

export const getChatResponse = async (history: any[], message: string): Promise<string> => {
    const ai = createAIClient();
    if (!ai) return "Demo Mode. Connect Key.";
    try {
        const chat = ai.chats.create({ model: 'gemini-2.5-flash', history: history.map(h => ({ role: h.role, parts: [{ text: h.text }] })), config: { systemInstruction: APP_CONTEXT } });
        const result = await chat.sendMessage({ message });
        return result.text || "Listening...";
    } catch (e) { return "Connection error."; }
};
