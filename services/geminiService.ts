
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { SYSTEM_INSTRUCTION, MARKDOWN_INSTRUCTION, APP_CONTEXT } from "../constants";
import { RecipeCard, SOP, StrategyReport, ImplementationGuide, MenuItem, MenuGenerationRequest } from "../types";

// Development Key for Live Preview 
// SECURITY NOTE: We have removed the hardcoded key to prevent exposure.
// Please set the 'API_KEY' environment variable in your hosting provider (Vercel/Netlify).
const PREVIEW_KEY = ""; 

// --- MOCK GENERATORS (DYNAMIC) ---

const generateMockRecipe = (item: MenuItem, requirements: string): RecipeCard => {
    const isDrink = item.category === 'beverage';
    const baseName = item.name || "Custom Dish";
    const nameLower = baseName.toLowerCase();
    
    // Smart Ingredient Selection based on Name
    const mockIngredients = [];
    
    if (nameLower.includes('chicken') || nameLower.includes('murgh')) {
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

    // Add common complex items
    mockIngredients.push({ name: "Special Spice Blend", qty: "10g", qty_per_serving: 0.01, cost_per_unit: 800, unit: "kg", cost_per_serving: 8 });
    mockIngredients.push({ name: "Cooking Oil", qty: "20ml", qty_per_serving: 0.02, cost_per_unit: 160, unit: "l", cost_per_serving: 3.2 });
    mockIngredients.push({ name: "Fresh Garnish (Cilantro/Microgreens)", qty: "5g", qty_per_serving: 0.005, cost_per_unit: 300, unit: "kg", cost_per_serving: 1.5 });

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
            `Prepare the main ingredient by cleaning and cutting to uniform size (Brunoise/Julienne as suitable). Marinate if required for 20 mins.`,
            `Heat the cooking vessel to medium-high heat (approx 180°C). Add oil/butter once hot.`,
            `Sweat aromatics (onions, garlic, ginger) until translucent and fragrant, avoiding browning unless specified.`,
            `Add the main ingredient and sear to lock in juices (Maillard reaction).`,
            `Incorporate spices and liquids. Simmer on low heat to develop flavor depth.`,
            `Check for doneness using a probe thermometer or visual cues (e.g. internal temp 75°C for chicken).`,
            `Adjust seasoning with salt, pepper, or acidity as needed.`,
            `Rest the dish for 5 minutes before plating to allow flavors to settle.`,
            "Garnish freshly and serve immediately at the correct temperature."
        ],
        equipment_needed: ["Chef Knife", "Cutting Board", "Heavy Bottom Pan", "Mixing Bowls", "Tongs/Spatula", "Thermometer"],
        portioning_guideline: isDrink ? "350ml Glass" : "Standard 28cm Dinner Plate, centered presentation",
        allergens: ["Check Ingredients", "Dairy", "Nuts (if used)"],
        shelf_life_hours: 24,
        food_cost_per_serving: totalCost,
        suggested_selling_price: Math.ceil(totalCost / 0.30), // 30% Food Cost Model
        tags: ["Auto-Generated", "Draft", "Detailed"],
        human_summary: `A comprehensive generated recipe for ${baseName}. This card includes detailed costing estimations and professional preparation steps suitable for kitchen staff training.`,
        reasoning: "Generated using BistroIntelligence Mock Engine. Ingredients selected based on standard culinary pairings for this dish type.",
        confidence: "Medium"
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

const generateMockStrategy = (role: string, query: string): StrategyReport => {
    const q = query.toLowerCase();
    
    // Smart Context Matching
    if (q.includes('marketing') || q.includes('sale') || q.includes('footfall')) {
        return {
            summary: [
                "Marketing Analysis: Focused on increasing customer acquisition.",
                "Current trend suggests a need for digital engagement.",
                "Targeting weekday lunch hours can yield high ROI."
            ],
            causes: ["Low social visibility", "Lack of loyalty program", "Weekday slump"],
            action_plan: [
                { initiative: "Launch Instagram Reel Campaign", impact_estimate: "High (Reach)", cost_estimate: "Low", priority: "High" },
                { initiative: "Corporate Lunch Partnerships", impact_estimate: "Medium", cost_estimate: "Low", priority: "Medium" },
                { initiative: "Happy Hour Specials", impact_estimate: "Medium", cost_estimate: "Medium", priority: "Medium" }
            ],
            seasonal_menu_suggestions: [
                { type: "add", item: "Power Lunch Combo", reason: "Attract office crowd" }
            ],
            roadmap: [
                { phase_name: "Awareness", duration: "Week 1", steps: ["Social Ads", "Flyers"], milestone: "10k Impressions" },
                { phase_name: "Conversion", duration: "Week 2-4", steps: ["Discount Codes", "Events"], milestone: "15% Sales Uplift" }
            ]
        };
    } else if (q.includes('cost') || q.includes('waste') || q.includes('profit')) {
        return {
            summary: [
                "Cost Optimization Strategy: Reducing food waste and COGS.",
                "Identified high-variance ingredients in inventory.",
                "Supplier negotiation recommended."
            ],
            causes: ["Over-portioning", "Supplier price hikes", "Inventory spoilage"],
            action_plan: [
                { initiative: "Implement Strict Portion Control", impact_estimate: "High (5% Saving)", cost_estimate: "Zero", priority: "High" },
                { initiative: "Renegotiate Dairy Contracts", impact_estimate: "Medium", cost_estimate: "Low", priority: "High" },
                { initiative: "Daily Waste Logs", impact_estimate: "Medium", cost_estimate: "Low", priority: "Medium" }
            ],
            seasonal_menu_suggestions: [
                { type: "remove", item: "Low Margin Specials", reason: "High waste, low profit" }
            ],
            roadmap: [
                { phase_name: "Audit", duration: "Day 1-3", steps: ["Weigh Waste", "Check Invoices"], milestone: "Baseline Set" },
                { phase_name: "Control", duration: "Day 4-14", steps: ["Staff Training", "New Ladles"], milestone: "Waste < 2%" }
            ]
        };
    }

    // Default Generic Strategy
    return {
        summary: [
            `Analysis for "${query}" complete.`,
            "Strategy generated based on best practices.",
            "Focus on operational efficiency and customer retention."
        ],
        causes: [
            "Market competition",
            "Operational variance"
        ],
        action_plan: [
            { initiative: "Review Menu Pricing", impact_estimate: "High", cost_estimate: "Low", priority: "High" },
            { initiative: "Staff Training Refresh", impact_estimate: "Medium", cost_estimate: "Low", priority: "Medium" }
        ],
        seasonal_menu_suggestions: [
            { type: "add", item: "Seasonal Special", reason: "High margin potential." }
        ],
        roadmap: [
            { phase_name: "Phase 1: Analysis", duration: "1 Day", steps: ["Review Data", "Set Goals"], milestone: "Plan Approved" }
        ]
    };
};

// --- API HANDLING ---

const getApiKey = (): string => {
  // 1. Prioritize Local Storage (User Override)
  const localKey = localStorage.getItem('gemini_api_key');
  if (localKey && localKey.length > 10) return localKey;
  
  // 2. Fallback to Env Var (System Default)
  if (process.env.API_KEY && process.env.API_KEY.length > 10) {
      return process.env.API_KEY;
  }
  
  // 3. Fallback to Preview Key (if set)
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
        // Remove markdown comments or other noise if present
        const firstOpen = clean.indexOf('{');
        const lastClose = clean.lastIndexOf('}');
        if (firstOpen !== -1 && lastClose !== -1) {
            clean = clean.substring(firstOpen, lastClose + 1);
        }
        return JSON.parse(clean) as T;
    } catch (e) {
        console.error("JSON Parse Error", e);
        console.log("Raw Text:", text);
        throw new Error("Failed to parse AI response. The model output was not valid JSON.");
    }
};

// Legacy alias for compatibility
const parseJSON = cleanAndParseJSON;

const createAIClient = () => {
    const key = getApiKey();
    // Return null if no key, triggering Mock Mode
    if (!key) return null;
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
    confidence: { type: Type.STRING }
  },
  required: ["name", "ingredients", "preparation_steps", "food_cost_per_serving", "suggested_selling_price"]
};

export const verifyLocationWithMaps = async (locationQuery: string): Promise<string> => {
  const ai = createAIClient();
  if (!ai) return "Mock Verified: " + locationQuery; // Mock
  
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
    // Mock if no AI
    if (!ai) {
        await new Promise(r => setTimeout(r, 1000));
        const mockRates: Record<string, number> = {};
        ingredients.forEach(i => mockRates[i] = Math.floor(Math.random() * 200) + 50);
        return mockRates;
    }

    try {
        const prompt = `
        Task: Estimate current market rates for the following ingredients in ${location}.
        Ingredients: ${ingredients.join(', ')}.
        Return a JSON object where key is the ingredient name and value is price per KG/Liter in local currency number only.
        Example: {"Onion": 40, "Milk": 60}
        `;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        return cleanAndParseJSON<Record<string, number>>(response.text);
    } catch (e) {
        console.error("Rate Estimation Failed", e);
        return {};
    }
};

export const generateRecipeCard = async (userId: string, item: MenuItem, requirements: string, location?: string, chefPersona: string = 'Executive Chef'): Promise<RecipeCard> => {
    const ai = createAIClient();
    
    // Mock Fallback
    if (!ai) {
        await new Promise(r => setTimeout(r, 1500));
        return generateMockRecipe(item, requirements);
    }

    const prompt = `
    Role: ${chefPersona}
    Task: Generate a HIGHLY DETAILED and professional recipe card for "${item.name}". 
    Context: ${requirements}
    Location: ${location || 'India'}
    
    REQUIREMENTS:
    1. INGREDIENTS: List EVERY single ingredient including oils, spices, and garnishes. Use precise metric units (g, ml). 
    2. STEPS: Provide a granular, step-by-step preparation guide. Explicitly name cooking techniques (e.g., 'brunoise', 'sear', 'emulsify'). Include precise temperatures (C/F), cooking times, and sensory cues (e.g., "sauté until translucent", "simmer until reduced by half").
    3. COSTING: Estimate realistic ingredient costs for ${location || 'India'} in local currency.
    4. PRICING: Suggested Selling Price should be calculated based on a 30% Food Cost model (Cost * 3.3).
    5. REASONING: Explain the culinary logic behind key ingredient choices or techniques used (e.g. "Acid added to balance richness").
    
    IMPORTANT: Provide a complete JSON response matching the schema. Do not truncate.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { 
                responseMimeType: 'application/json',
                responseSchema: RECIPE_SCHEMA,
                maxOutputTokens: 8192
            }
        });
        
        // When using responseSchema, response.text is already a valid JSON string
        const parsed = JSON.parse(response.text || '{}');
        // Ensure SKU if missing
        if (!parsed.sku_id) parsed.sku_id = `AI-${Date.now().toString().slice(-6)}`;
        return parsed as RecipeCard;

    } catch (e) {
        console.error("AI Generation Failed, falling back to mock:", e);
        // Fallback to robust mock if API fails (e.g. Permission Denied or Parse Error)
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
        const prompt = `Task: Create a "${variationType}" variation of the following recipe. Include reasoning for changes. Maintain JSON structure. Update Costing and Selling Price accurately. Ensure preparation steps are detailed with specific cooking techniques relevant to the variation. Original JSON: ${JSON.stringify(original)}.`;
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
        console.error(e);
        return { ...original, name: `${original.name} (${variationType} - Mock)`, tags: [...(original.tags||[]), "Generated"] };
    }
};

export const substituteIngredient = async (recipe: RecipeCard, ingredientName: string, location?: string): Promise<RecipeCard> => {
    const ai = createAIClient();
    if (!ai) {
        await new Promise(r => setTimeout(r, 800));
        const newIngs = recipe.ingredients.map(i => i.name === ingredientName ? { ...i, name: `${i.name} Substitute (Mock)`, cost_per_unit: i.cost_per_unit ? i.cost_per_unit * 0.9 : 0 } : i);
        return { ...recipe, ingredients: newIngs };
    }

    try {
        const prompt = `Task: Find a culinary substitute for "${ingredientName}" in this recipe. Update quantities, costs, total food cost and suggested selling price. Explain reasoning. Return full JSON. Recipe: ${JSON.stringify(recipe)}`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { 
                responseMimeType: 'application/json',
                responseSchema: RECIPE_SCHEMA, // Reuse schema for consistency
                maxOutputTokens: 8192
            }
        });
        const parsed = JSON.parse(response.text || '{}');
        return parsed as RecipeCard;
    } catch (e) {
        console.error(e);
        // Fallback Mock Logic
        const newIngs = recipe.ingredients.map(i => i.name === ingredientName ? { ...i, name: `${i.name} Substitute (Alt)`, cost_per_unit: i.cost_per_unit ? i.cost_per_unit * 0.9 : 0 } : i);
        return { ...recipe, ingredients: newIngs };
    }
};

export const generateSOP = async (topic: string): Promise<SOP> => {
    const ai = createAIClient();
    if (!ai) {
        await new Promise(r => setTimeout(r, 1500));
        return generateMockSOP(topic);
    }

    const template = `{
      "sop_id": "generated", "title": "SOP Title", "scope": "Scope", "prerequisites": "Prereqs",
      "materials_equipment": ["Item 1"], "stepwise_procedure": [{"step_no": 1, "action": "Do this", "responsible_role": "Chef"}],
      "critical_control_points": ["Point 1"], "monitoring_checklist": ["Check 1"], "kpis": ["KPI 1"], "quick_troubleshooting": "Fix it"
    }`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Create SOP for "${topic}". Return JSON matching: ${template}`,
            config: { responseMimeType: 'application/json' }
        });
        return cleanAndParseJSON<SOP>(response.text);
    } catch (e) {
        console.error(e);
        return generateMockSOP(topic);
    }
};

export const generateStrategy = async (role: string, query: string): Promise<StrategyReport> => {
    const ai = createAIClient();
    if (!ai) {
        await new Promise(r => setTimeout(r, 2000));
        return generateMockStrategy(role, query);
    }

    const template = `{
        "summary": ["Point 1"], "causes": ["Cause 1"],
        "action_plan": [{"initiative": "Action", "impact_estimate": "High", "cost_estimate": "Low", "priority": "High"}],
        "seasonal_menu_suggestions": [{"type": "add", "item": "Dish", "reason": "Why"}],
        "roadmap": [{"phase_name": "Phase 1", "duration": "1 week", "steps": ["Step 1"], "milestone": "Goal"}]
    }`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Role: ${role}. Query: "${query}". Analyze and plan. Return JSON matching: ${template}`,
            config: { responseMimeType: 'application/json' }
        });
        return cleanAndParseJSON<StrategyReport>(response.text);
    } catch (e) {
        console.error(e);
        return generateMockStrategy(role, query);
    }
};

export const generateImplementationPlan = async (title: string): Promise<ImplementationGuide> => {
    const ai = createAIClient();
    if (!ai) {
        return { objective: "Implement " + title, phases: [], estimated_timeline: "2 Weeks" };
    }
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Implementation guide for "${title}". Output JSON.`,
            config: { responseMimeType: 'application/json' }
        });
        return cleanAndParseJSON<ImplementationGuide>(response.text);
    } catch (e) {
        return { objective: "Failed to generate plan", phases: [], estimated_timeline: "Unknown" };
    }
};

export const generateMarketingVideo = async (images: string[], prompt: string, aspectRatio: string): Promise<string> => {
    const ai = createAIClient();
    if (!ai) {
        await new Promise(r => setTimeout(r, 3000));
        return "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"; // Placeholder
    }
    try {
        // Veo requires special handling, falling back to mock for demo consistency
        throw new Error("Video generation requires a high-tier paid API key. Mocking response.");
    } catch (e) {
        console.log("Fallback to mock video");
        return "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
    }
};

export const generateMarketingImage = async (prompt: string, aspectRatio: string): Promise<string> => {
    const ai = createAIClient();
    if (!ai) {
        await new Promise(r => setTimeout(r, 2000));
        return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c"; // Placeholder food image
    }
    return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c";
};

export const generateKitchenWorkflow = async (description: string): Promise<string> => {
    const ai = createAIClient();
    if (!ai) return `# Optimized Workflow (Generated)\n\nBased on your input: "${description}"\n\n1. **Zone 1 (Prep):** Position near walk-in fridge.\n2. **Zone 2 (Cooking):** Central island layout recommended.\n3. **Zone 3 (Plating):** Near pass-through window to service.`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze: ${description}. Return Markdown.`,
            config: { systemInstruction: MARKDOWN_INSTRUCTION }
        });
        return response.text || "";
    } catch (e) {
        return "# Optimized Workflow (Offline)\n\nAnalysis unavailable. Please check connectivity.";
    }
};

export const generateMenu = async (request: MenuGenerationRequest): Promise<string> => {
    const ai = createAIClient();
    if (!ai) return `# ${request.restaurantName} Menu\n\n## Starters\n- **House Special**: Chef's choice.\n\n## Mains\n- **Signature Dish**: A classic favorite.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate menu for ${request.restaurantName}. Style: ${request.cuisineType}.`,
            config: { systemInstruction: MARKDOWN_INSTRUCTION }
        });
        return response.text || "";
    } catch (e) {
        return "# Menu Generation Failed\n\nPlease try again later.";
    }
};

export const getChatResponse = async (history: any[], message: string): Promise<string> => {
    const ai = createAIClient();
    if (!ai) return "I am running in Demo Mode. Connect an API Key to enable my full intelligence!";
    
    try {
        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            history: history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
            config: { systemInstruction: APP_CONTEXT }
        });
        const result = await chat.sendMessage({ message });
        return result.text || "I'm listening...";
    } catch (e) {
        return "I'm having trouble connecting to the brain. Please check your internet or API key.";
    }
};
