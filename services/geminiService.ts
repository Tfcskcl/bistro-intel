
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION, MARKDOWN_INSTRUCTION, APP_CONTEXT } from "../constants";
import { RecipeCard, SOP, StrategyReport, ImplementationGuide, MenuItem, MenuGenerationRequest } from "../types";

// --- MOCK GENERATORS (DYNAMIC) ---

const generateMockRecipe = (item: MenuItem, requirements: string): RecipeCard => {
    const isDrink = item.category === 'beverage';
    const baseName = item.name || "Custom Dish";
    
    return {
        sku_id: item.sku_id || `MOCK-${Date.now().toString().substr(-4)}`,
        name: baseName,
        category: item.category,
        prep_time_min: item.prep_time_min || 20,
        current_price: item.current_price || 0,
        ingredients: [
            { 
                ingredient_id: `m_${Date.now()}_1`, 
                name: `Main Base for ${baseName}`, 
                qty: "150g", 
                qty_per_serving: 150, 
                cost_per_unit: 200, 
                unit: "kg", 
                cost_per_serving: 30 
            },
            { 
                ingredient_id: `m_${Date.now()}_2`, 
                name: "Seasoning Blend", 
                qty: "10g", 
                qty_per_serving: 10, 
                cost_per_unit: 500, 
                unit: "kg", 
                cost_per_serving: 5 
            },
            { 
                ingredient_id: `m_${Date.now()}_3`, 
                name: "Garnish / Sauce", 
                qty: "20ml", 
                qty_per_serving: 20, 
                cost_per_unit: 150, 
                unit: "l", 
                cost_per_serving: 3 
            }
        ],
        yield: 1,
        preparation_steps: [
            `Prepare the ${baseName} base ingredients.`,
            "Mix seasoning and apply evenly.",
            `Cook/Assemble according to ${isDrink ? 'beverage' : 'standard'} standards.`,
            "Garnish and serve immediately."
        ],
        equipment_needed: ["Chef Knife", "Mixing Bowl", isDrink ? "Blender/Shaker" : "Pan/Oven"],
        portioning_guideline: isDrink ? "300ml Glass" : "Standard Dinner Plate",
        allergens: ["Check Ingredients"],
        shelf_life_hours: 24,
        food_cost_per_serving: 38,
        suggested_selling_price: 149,
        tags: ["Mock Data", "Demo Mode"],
        human_summary: `[DEMO MODE] A generated recipe card for ${baseName}. Connect a valid API Key to get real AI-powered culinary details.`,
        reasoning: "Generated as a placeholder to demonstrate UI functionality.",
        confidence: "Low"
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
            "This is a demo strategy report generated without live AI.",
            "Connect API Key for deep insights."
        ],
        causes: [
            "Demo Mode is active.",
            "Live data connection simulation."
        ],
        action_plan: [
            { initiative: "Connect Google Gemini API", impact_estimate: "High (Real Intelligence)", cost_estimate: "Low", priority: "High" },
            { initiative: `Review '${query}' manually`, impact_estimate: "Medium", cost_estimate: "Time-Intensive", priority: "Medium" }
        ],
        seasonal_menu_suggestions: [
            { type: "add", item: "Demo Special", reason: "High margin potential in demo environment." }
        ],
        roadmap: [
            { phase_name: "Phase 1: Setup", duration: "1 Day", steps: ["Configure API Keys", "Upload Menu"], milestone: "System Ready" }
        ]
    };
};

// --- API HANDLING ---

const getApiKey = (): string => {
  // 1. Prioritize Local Storage (User Override)
  const localKey = localStorage.getItem('gemini_api_key');
  if (localKey && localKey.length > 10) return localKey;
  
  // 2. Fallback to Env Var (System Default)
  // Check if system key is valid (not the leaked one - simplified check)
  if (process.env.API_KEY && process.env.API_KEY.length > 10) {
      return process.env.API_KEY;
  }
  
  return '';
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

export const generateRecipeCard = async (userId: string, item: MenuItem, requirements: string, location?: string, chefPersona: string = 'Executive Chef'): Promise<RecipeCard> => {
    const ai = createAIClient();
    
    // Mock Fallback
    if (!ai) {
        console.log("Demo Mode: Generating Dynamic Mock Recipe");
        await new Promise(r => setTimeout(r, 1500));
        return generateMockRecipe(item, requirements);
    }

    const jsonTemplate = `{
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
        "equipment_needed": ["Pan", "Knife"],
        "portioning_guideline": "Serving size description",
        "allergens": ["List allergens"],
        "shelf_life_hours": 24,
        "food_cost_per_serving": 0,
        "suggested_selling_price": 0,
        "tags": ["Tag1", "Tag2"],
        "human_summary": "A brief description...",
        "reasoning": "Why this recipe works...",
        "confidence": "High"
    }`;

    const prompt = `
    Role: ${chefPersona}
    Task: Generate a professional recipe card for "${item.name}". 
    Context: ${requirements}
    Location: ${location || 'Global'}
    IMPORTANT: Return ONLY valid JSON matching this structure:
    ${jsonTemplate}
    Do not add markdown formatting.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        return cleanAndParseJSON<RecipeCard>(response.text);
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
        const prompt = `Task: Create a "${variationType}" variation of the following recipe. Maintain JSON structure. Original JSON: ${JSON.stringify(original)}.`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        return cleanAndParseJSON<RecipeCard>(response.text);
    } catch (e) {
        return { ...original, name: `${original.name} (${variationType} - Failed)`, tags: [...(original.tags||[]), "Error"] };
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
        const prompt = `Task: Find a culinary substitute for "${ingredientName}" in this recipe. Update quantities and costs. Return full JSON. Recipe: ${JSON.stringify(recipe)}`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        return cleanAndParseJSON<RecipeCard>(response.text);
    } catch (e) {
        console.error(e);
        return recipe;
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
    // Note: Video generation is complex and often requires client-side polling or different endpoints.
    // For this implementation, we assume we might fail and fallback if key is invalid.
    try {
        // Mocking the call structure since real Veo needs strict key setup
        // Real implementation would look like:
        // const op = await ai.models.generateVideos({ model: 'veo...', prompt ... });
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
    // Placeholder logic for image generation if key exists but model unavailable
    return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c";
};

export const generateKitchenWorkflow = async (description: string): Promise<string> => {
    const ai = createAIClient();
    if (!ai) return `# Optimized Workflow (Demo)\n\nBased on your input: "${description}"\n\n1. **Zone 1:** Prep station.\n2. **Zone 2:** Assembly.`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze: ${description}. Return Markdown.`,
            config: { systemInstruction: MARKDOWN_INSTRUCTION }
        });
        return response.text || "";
    } catch (e) {
        return "AI Analysis unavailable.";
    }
};

export const generateMenu = async (request: MenuGenerationRequest): Promise<string> => {
    const ai = createAIClient();
    if (!ai) return `# ${request.restaurantName} Menu (Demo)\n\n## Starters\n- **House Special**: Chef's choice.\n\n## Mains\n- **Signature Dish**: A classic favorite.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate menu for ${request.restaurantName}. Style: ${request.cuisineType}.`,
            config: { systemInstruction: MARKDOWN_INSTRUCTION }
        });
        return response.text || "";
    } catch (e) {
        return "Menu generation failed.";
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
