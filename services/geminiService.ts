import { GoogleGenAI, Type, Schema } from "@google/genai";
import { 
    RecipeCard, 
    SOP, 
    StrategyReport, 
    MenuStructure, 
    KitchenLayout, 
    MenuItem, 
    ABTestResult, 
    UnifiedSchema,
    CCTVAnalysisResult,
    MenuGenerationRequest,
    User,
    PurchaseOrder,
    InventoryItem
} from '../types';
import { UNIFIED_SYSTEM_PROMPT, SYSTEM_INSTRUCTION, APP_CONTEXT, MARKDOWN_INSTRUCTION, CCTV_SYSTEM_PROMPT } from '../constants';
import { ingredientService } from './ingredientService';

// --- CONFIGURATION ---

const getApiKey = (): string => {
    try {
        // Prioritize local storage for manual overrides in live deployments
        const localKey = localStorage.getItem('bistro_api_key');
        if (localKey) return localKey;
        
        return process.env.API_KEY || "";
    } catch (e) {
        return "";
    }
};

export const hasValidApiKey = (): boolean => {
    try {
        const key = getApiKey();
        return !!key && key.length > 0 && key !== 'undefined';
    } catch (e) {
        return false;
    }
};

const createAIClient = () => {
    const apiKey = getApiKey();
    if (!apiKey) return null;
    try {
        return new GoogleGenAI({ apiKey });
    } catch (e) {
        console.error("Failed to initialize GoogleGenAI client");
        return null;
    }
};

// --- HELPER FUNCTIONS ---

export function cleanAndParseJSON<T>(text: string | undefined | null, defaultValue?: T): T {
    try {
        if (!text) {
            if (defaultValue !== undefined) return defaultValue;
            throw new Error("Empty response received from AI");
        }
        
        // 1. Locate the first '{' or '['
        const firstOpenBrace = text.indexOf('{');
        const firstOpenBracket = text.indexOf('[');
        
        let startIdx = -1;
        if (firstOpenBrace !== -1 && firstOpenBracket !== -1) {
            startIdx = Math.min(firstOpenBrace, firstOpenBracket);
        } else if (firstOpenBrace !== -1) {
            startIdx = firstOpenBrace;
        } else {
            startIdx = firstOpenBracket;
        }

        if (startIdx === -1) throw new Error("No JSON object or array found.");

        // 2. Locate the last '}' or ']'
        const lastCloseBrace = text.lastIndexOf('}');
        const lastCloseBracket = text.lastIndexOf(']');
        const endIdx = Math.max(lastCloseBrace, lastCloseBracket);

        if (endIdx === -1 || endIdx <= startIdx) throw new Error("Invalid JSON structure.");

        // 3. Extract the substring
        let clean = text.substring(startIdx, endIdx + 1);

        // 4. Cleanup common LLM errors (trailing commas)
        clean = clean.replace(/,(\s*[}\]])/g, '$1');

        return JSON.parse(clean) as T;
    } catch (e) {
        console.warn("JSON Parse Failed:", e);
        if (defaultValue !== undefined) return defaultValue;
        // If no default value is provided, rethrow so the caller knows something went wrong
        throw new Error("Failed to parse AI response.");
    }
}

// Helper to extract mime type from base64 string
const getMimeTypeFromBase64 = (base64String: string): string => {
    const matches = base64String.match(/^data:(image\/[a-zA-Z+]+);base64,/);
    if (matches && matches[1]) {
        return matches[1];
    }
    return "image/jpeg"; // Default fallback
};

// Helper to handle API errors gracefully
async function safeGenerate<T>(
    operationName: string, 
    fallback: T, 
    apiCall: () => Promise<T>
): Promise<T> {
    try {
        return await apiCall();
    } catch (e: any) {
        const key = getApiKey();
        const msg = e.toString().replace(key, '[REDACTED]');
        
        console.error(`[${operationName}] Error:`, msg); // Log full error for debugging

        if (msg.includes("403") || msg.includes("PERMISSION_DENIED")) {
            console.warn(`[${operationName}] API Key Restricted/Invalid. Switching to Demo Mode.`);
        } else {
            console.warn(`[${operationName}] Failed. Using fallback.`);
        }
        return fallback;
    }
}

// --- CORE SERVICES ---

export const getChatResponse = async (history: { role: string, text: string }[], currentMessage: string): Promise<string> => {
    return safeGenerate("Chat", "I'm currently in offline mode. Please check your API key connection.", async () => {
        const client = createAIClient();
        if (!client) throw new Error("No Client");

        const contents = [
            { role: 'user', parts: [{ text: APP_CONTEXT }] },
            ...history.map(msg => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.text }]
            })),
            { role: 'user', parts: [{ text: currentMessage }] }
        ];

        const response = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: contents,
        });

        return response.text || "I couldn't process that.";
    });
};

export const generateRecipeCard = async (userId: string, item: MenuItem, requirements: string): Promise<RecipeCard> => {
    const fallback: RecipeCard = {
        ...item,
        yield: 4,
        preparation_steps: ["Step 1 (Demo)", "Step 2 (Demo)"],
        equipment_needed: ["Pan"],
        portioning_guideline: "1 portion",
        allergens: [],
        shelf_life_hours: 24,
        food_cost_per_serving: 100,
        suggested_selling_price: 300,
        tags: ["Demo"],
        human_summary: "Generated in demo mode.",
        ingredients: [],
        nutritional_info: { calories: 350, protein: 20, carbs: 45, fat: 12 },
        imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c"
    };

    return safeGenerate("Recipe", fallback, async () => {
        const client = createAIClient();
        if (!client) throw new Error("No Client");

        // Fetch user context (mocked for now, in real app would get learned prices)
        const learnedPrices = ingredientService.getAll(userId).map(i => `${i.name}: ₹${i.cost_per_unit}/${i.unit}`).join('\n');

        const prompt = `
        Create a detailed professional recipe card for "${item.name}".
        Category: ${item.category}.
        Context/Requirements: ${requirements}.
        
        Available Ingredient Price Knowledge (Use these costs if applicable, else estimate India market rates):
        ${learnedPrices}

        IMPORTANT:
        - 'preparation_steps': Must be an ARRAY OF STRINGS. Each string is a step.
        - 'ingredients': List all ingredients with accurate quantities and estimated costs.
        - 'nutritional_info': Estimate calories, protein, carbs, fat.
        `;

        // STRICT SCHEMA DEFINITION
        const schema: Schema = {
            type: Type.OBJECT,
            properties: {
                sku_id: { type: Type.STRING },
                name: { type: Type.STRING },
                category: { type: Type.STRING },
                prep_time_min: { type: Type.NUMBER },
                cook_time_minutes: { type: Type.NUMBER },
                total_time_minutes: { type: Type.NUMBER },
                current_price: { type: Type.NUMBER },
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
                visual_description: { type: Type.STRING },
                ingredients: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            ingredient_id: { type: Type.STRING },
                            name: { type: Type.STRING },
                            qty: { type: Type.STRING },
                            cost_per_unit: { type: Type.NUMBER },
                            unit: { type: Type.STRING },
                            cost_per_serving: { type: Type.NUMBER },
                            waste_pct: { type: Type.NUMBER }
                        }
                    }
                },
                nutritional_info: {
                    type: Type.OBJECT,
                    properties: {
                        calories: { type: Type.NUMBER },
                        protein: { type: Type.NUMBER },
                        carbs: { type: Type.NUMBER },
                        fat: { type: Type.NUMBER }
                    }
                }
            }
        };

        const response = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { 
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: "application/json",
                responseSchema: schema
            }
        });

        // With strict schema, we can trust the text is valid JSON, but still use helper for safety
        const result = cleanAndParseJSON<RecipeCard>(response.text, {} as RecipeCard);
        
        // Merge with fallback to ensure arrays exist
        const finalResult = { ...fallback, ...result };

        // Post-processing to ensure IDs
        finalResult.sku_id = item.sku_id;
        finalResult.ingredients = (finalResult.ingredients || []).map((ing, i) => ({
            ...ing,
            ingredient_id: ing.ingredient_id || `new_${Date.now()}_${i}`
        }));

        // --- AUTO-CALCULATION FIX ---
        // 1. Recalculate Food Cost based on ingredients to ensure accuracy
        let calculatedFoodCost = 0;
        finalResult.ingredients.forEach(ing => {
            // Ensure numbers
            ing.cost_per_serving = Number(ing.cost_per_serving) || 0;
            calculatedFoodCost += ing.cost_per_serving;
        });
        
        // If AI calculated food cost is missing or wildly different, prefer the sum
        if (calculatedFoodCost > 0) {
            finalResult.food_cost_per_serving = parseFloat(calculatedFoodCost.toFixed(2));
        }

        // 2. Auto-suggest selling price if AI missed it
        if (!finalResult.suggested_selling_price || finalResult.suggested_selling_price === 0) {
            // Default to 33% food cost (Multiplier x3)
            finalResult.suggested_selling_price = parseFloat((finalResult.food_cost_per_serving * 3).toFixed(0));
        }

        // Learn new prices
        ingredientService.learnPrices(finalResult.ingredients);

        // --- Generate Reference Image ---
        try {
            const visualDesc = finalResult.visual_description || finalResult.human_summary || '';
            const platingDetails = finalResult.portioning_guideline || '';
            
            // Simplified Image Prompt for better compatibility with flash-image models
            const imagePrompt = `Professional food photography of ${finalResult.name}. Visuals: ${visualDesc}. Plating: ${platingDetails}. Style: ${requirements}. High resolution, appetizing, 8k, photorealistic, cinematic lighting, no text.`;

            // We use the image generator directly. The safeGenerate wrapper will catch errors.
            // If the user's key supports it, this will yield a custom image.
            const imgUrl = await generateMarketingImage(imagePrompt, "1:1");
            finalResult.imageUrl = imgUrl;
        } catch (imgError) {
            console.warn("Failed to generate recipe image:", imgError);
            finalResult.imageUrl = fallback.imageUrl;
        }

        return finalResult;
    });
};

export const generateSOP = async (topic: string): Promise<SOP> => {
    const fallback: SOP = {
        sop_id: "sop_demo",
        title: topic,
        scope: "Demo Scope",
        prerequisites: "None",
        materials_equipment: [],
        stepwise_procedure: [{ step_no: 1, action: "Demo Action", responsible_role: "Staff" }],
        critical_control_points: [],
        monitoring_checklist: [],
        kpis: [],
        quick_troubleshooting: "None"
    };

    return safeGenerate("SOP", fallback, async () => {
        const client = createAIClient();
        if (!client) throw new Error("No Client");

        const prompt = `
        Generate a comprehensive Standard Operating Procedure (SOP) for: "${topic}".
        Ensure it follows industry standards for food safety and operational efficiency.
        `;

        const schema: Schema = {
            type: Type.OBJECT,
            properties: {
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
                        },
                        required: ["step_no", "action", "responsible_role"]
                    }
                },
                critical_control_points: { type: Type.ARRAY, items: { type: Type.STRING } },
                monitoring_checklist: { type: Type.ARRAY, items: { type: Type.STRING } },
                kpis: { type: Type.ARRAY, items: { type: Type.STRING } },
                quick_troubleshooting: { type: Type.STRING }
            },
            required: ["title", "scope", "stepwise_procedure", "critical_control_points"]
        };

        const response = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { 
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: "application/json",
                responseSchema: schema
            }
        });

        const result = cleanAndParseJSON<SOP>(response.text, {} as SOP);
        return { ...fallback, ...result, sop_id: `sop_${Date.now()}` };
    });
};

export const suggestSOPsFromImage = async (image: string): Promise<string[]> => {
    const fallback = ["General Hygiene", "Safety Check", "Cleaning Procedure", "Closing Checklist"];
    
    return safeGenerate("SOP_Vision", fallback, async () => {
        const client = createAIClient();
        if (!client) throw new Error("No Client");

        const mimeType = getMimeTypeFromBase64(image);
        const cleanBase64 = image.replace(/^data:image\/(png|jpeg|jpg|webp|heic);base64,/, "");

        const prompt = `
        Analyze this image of a restaurant environment (Kitchen, Store, Dining Area, Bar, etc.).
        1. Identify the specific zone/area shown.
        2. List 6-8 essential Standard Operating Procedures (SOP titles only) required for this specific area to ensure compliance, safety, and efficiency.
        
        Example Output: ["Deep Fryer Cleaning", "Oil Filtration Process", "Hot Line Setup", "Fire Safety Check"]
        Return ONLY a JSON array of strings.
        `;

        const response = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: {
                parts: [
                    { inlineData: { mimeType: mimeType, data: cleanBase64 } },
                    { text: prompt }
                ]
            },
            config: { responseMimeType: "application/json" }
        });

        return cleanAndParseJSON<string[]>(response.text, fallback);
    });
};

export const generateStrategy = async (user: User, query: string, salesContext: string): Promise<StrategyReport> => {
    const fallback: StrategyReport = {
        summary: ["Demo Strategy: Focus on marketing."],
        causes: [],
        action_plan: [{ initiative: "Run Ads", impact_estimate: "High", cost_estimate: "Low", priority: "High" }],
        seasonal_menu_suggestions: [],
        roadmap: []
    };

    return safeGenerate("Strategy", fallback, async () => {
        const client = createAIClient();
        if (!client) throw new Error("No Client");

        const prompt = `
        Restaurant Context: ${user.restaurantName} (${user.cuisineType}).
        Sales Context: ${salesContext}.
        User Query: "${query}".
        
        Generate a strategic report in JSON matching StrategyReport interface.
        `;

        const response = await client.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: prompt,
            config: { 
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: "application/json" 
            }
        });

        const result = cleanAndParseJSON<any>(response.text, {});
        
        return {
            summary: Array.isArray(result.summary) ? result.summary : fallback.summary,
            causes: Array.isArray(result.causes) ? result.causes : fallback.causes,
            action_plan: Array.isArray(result.action_plan) ? result.action_plan : fallback.action_plan,
            seasonal_menu_suggestions: Array.isArray(result.seasonal_menu_suggestions) ? result.seasonal_menu_suggestions : fallback.seasonal_menu_suggestions,
            roadmap: Array.isArray(result.roadmap) ? result.roadmap : fallback.roadmap
        };
    });
};

export const generateABTestStrategy = async (user: User, query: string, salesContext: string): Promise<ABTestResult> => {
    const fallback: ABTestResult = {
        query,
        baseline_metric: { label: "Revenue", value: 100000 },
        variant_a: { name: "A", description: "Demo A", focus: "Cost", pros: [], cons: [], projected_revenue_lift_pct: 5, implementation_difficulty: "Low", key_steps: [] },
        variant_b: { name: "B", description: "Demo B", focus: "Growth", pros: [], cons: [], projected_revenue_lift_pct: 10, implementation_difficulty: "High", key_steps: [] },
        recommendation: "Choose B"
    };

    return safeGenerate("ABTest", fallback, async () => {
        const client = createAIClient();
        if (!client) throw new Error("No Client");

        const prompt = `
        Design an A/B Strategy Test for: "${query}".
        Restaurant: ${user.restaurantName}.
        Sales Context: ${salesContext}.
        
        Output JSON matching ABTestResult interface.
        Compare two distinct approaches (Variant A vs Variant B).
        `;

        const response = await client.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: prompt,
            config: { 
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: "application/json" 
            }
        });

        const result = cleanAndParseJSON<ABTestResult>(response.text, {} as ABTestResult);
        return { ...fallback, ...result };
    });
};

export const generateKitchenWorkflow = async (description: string): Promise<string> => {
    return safeGenerate("Workflow", "# Demo Workflow\n1. Step 1\n2. Step 2", async () => {
        const client = createAIClient();
        if (!client) throw new Error("No Client");

        const prompt = `
        Design an optimized kitchen workflow based on this request: "${description}".
        Output in Markdown. Use headers for zones and bullet points for steps.
        Include a 'Bottleneck Analysis' section.
        `;

        const response = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { systemInstruction: MARKDOWN_INSTRUCTION }
        });

        return response.text || "Failed to generate workflow.";
    });
};

export const generateMenu = async (request: MenuGenerationRequest): Promise<string> => {
    const fallback = JSON.stringify({
        title: request.restaurantName,
        tagline: "Generated Offline Mode",
        currency: "₹",
        sections: [
            { 
                title: "Signature Starters", 
                items: [
                    { name: "Truffle Mushroom Bruschetta", description: "Toasted sourdough topped with creamy wild mushroom ragout and truffle oil.", price: "350", tags: ["Bestseller", "Veg"] },
                    { name: "Spicy Crispy Calamari", description: "Golden fried calamari rings tossed with chili garlic salt, served with lemon aioli.", price: "450", tags: ["New"] },
                    { name: "Burrata & Heirloom Tomato", description: "Fresh burrata cheese, basil pesto, balsamic glaze, and pine nuts.", price: "520", tags: ["GF"] }
                ] 
            },
            {
                title: "Main Courses",
                items: [
                    { name: "Herb Crusted Salmon", description: "Pan-seared salmon fillet with lemon butter sauce, asparagus, and mashed potatoes.", price: "950", tags: ["Healthy"], pairing: "Chardonnay" },
                    { name: "Classic Risotto", description: "Creamy arborio rice cooked with saffron, parmesan, and white wine.", price: "650", tags: ["Veg"] }
                ]
            },
            {
                title: "Desserts",
                items: [
                    { name: "Dark Chocolate Fondant", description: "Molten center chocolate cake served with vanilla bean ice cream.", price: "320", tags: ["Sweet"] }
                ]
            }
        ],
        footer_note: "All prices are exclusive of government taxes. Service charge of 10% is discretionary."
    });

    return safeGenerate("MenuGen", fallback, async () => {
        const client = createAIClient();
        if (!client) throw new Error("No Client");

        const prompt = `
        You are a Michelin-star Menu Designer. Create a structured menu for a restaurant.
        
        **Restaurant Profile:**
        - Name: ${request.restaurantName}
        - Cuisine: ${request.cuisineType}
        - Theme: ${request.themeStyle}
        - Target Audience: ${request.targetAudience}
        - Dietary Focus: ${request.dietaryRestrictions.join(', ') || 'None'}
        - Specific Items to Include: ${request.mustIncludeItems || 'None'}
        
        **Requirements:**
        1. Create 3-5 distinct sections (e.g., Appetizers, Mains, Desserts, Drinks).
        2. Each section should have 3-6 items.
        3. Descriptions must be appetizing, detailed, and about 15-25 words each.
        4. Prices should be realistic for the target audience (Currency: ₹).
        5. Include a "pairing" suggestion for main dishes (e.g. specific wine or drink).
        6. Use tags like "Bestseller", "Spicy", "Vegan", "GF".

        **Output Schema (JSON Only):**
        {
            "title": "Restaurant Name",
            "tagline": "Catchy slogan",
            "currency": "₹",
            "sections": [
                {
                    "title": "Section Name",
                    "items": [
                        {
                            "name": "Dish Name",
                            "description": "Mouth-watering description...",
                            "price": "450",
                            "tags": ["Spicy", "New"],
                            "pairing": "Sauvignon Blanc"
                        }
                    ]
                }
            ],
            "footer_note": "Footer text regarding service charge or allergies"
        }
        `;

        const response = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { 
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: "application/json" 
            }
        });

        return response.text || fallback;
    });
};

export const generateMarketingVideo = async (imageFrames: string[], prompt: string, aspectRatio: string): Promise<string> => {
    return "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4";
};

export const generateMarketingImage = async (prompt: string, aspectRatio: string): Promise<string> => {
    const fallback = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1000&q=80";

    return safeGenerate("ImageGen", fallback, async () => {
        const client = createAIClient();
        if (!client) throw new Error("No Client");

        // Use 'gemini-2.5-flash-image' for general availability
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: prompt }] },
            config: {
                imageConfig: {
                    aspectRatio: aspectRatio,
                    // imageSize: "2K" // Removed: Not supported by flash-image
                }
            }
        });

        if (response.candidates && response.candidates[0].content.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }

        return fallback;
    });
};

export const analyzeUnifiedRestaurantData = async (data: any): Promise<UnifiedSchema> => {
    return {
        workflow_analysis: { efficiency: 88, issues: [] },
        sop_compliance: { rate: 0.92, violations: [] },
        inventory_verification: {},
        wastage_root_causes: ["Over-portioning in Prep", "Tomatoes spoiling"],
        recipe_costing_impact: {},
        profitability_insights: {},
        strategy_plan_7_days: {},
        marketing_assets: {},
        summary: "Operations are stable. Focus on reducing prep waste this week."
    };
};

export const analyzeStaffMovement = async (prompt: string, zones: string[], imageBase64?: string): Promise<CCTVAnalysisResult> => {
    const fallback: CCTVAnalysisResult = {
        staff_tracking: [
            { id: "staff_01", role: "Chef", current_zone: "Prep", action: "Chopping", uniform_compliant: true, hygiene_compliant: true, efficiency_score: 92, alerts: [], last_seen: new Date().toISOString() },
            { id: "staff_02", role: "Commis", current_zone: "Storage", action: "Retrieving Stock", uniform_compliant: true, hygiene_compliant: false, efficiency_score: 78, alerts: ["Mask missing"], last_seen: new Date().toISOString() }
        ],
        live_timeline: [
            { id: "evt_1", time: "10:05 AM", description: "Staff_01 started prep workflow", type: "normal", zone_id: "Prep" },
            { id: "evt_2", time: "10:12 AM", description: "Staff_02 entered storage without mask", type: "violation", zone_id: "Storage" }
        ],
        events: [],
        workflow_correlations: [],
        inventory_impact: [],
        bottlenecks: [],
        sop_deviations: [],
        performance_scores: { kitchen_efficiency: 85, inventory_health: 90, congestion_score: 12, sop_adherence_score: 88 },
        financial_impact_summary: { daily_loss_due_to_errors: 450, potential_savings: 1200 },
        recommendations: [{ type: 'process', priority: 'medium', text: 'Enforce mask policy in storage', expected_impact: 'High Hygiene', confidence: 0.9 }],
        summary_report: "Demo Analysis: Kitchen running efficiently.",
        processing_time_ms: 100,
        model_version: "demo",
        warnings: []
    };

    return safeGenerate("CCTV", fallback, async () => {
        const client = createAIClient();
        if (!client) throw new Error("No Client");

        const parts: any[] = [
            { text: CCTV_SYSTEM_PROMPT },
            { text: `Zones: ${zones.join(', ')}` },
            { text: prompt },
            { text: "CRITICAL: Return a JSON object matching the CCTVAnalysisResult interface. Include 'staff_tracking' array with id, role, current_zone, action, uniform_compliant (bool), hygiene_compliant (bool), efficiency_score (0-100), alerts (string array). Also include 'live_timeline' array and 'sop_deviations' array. Ensure detailed SOP checks (gloves, masks, hat)." }
        ];

        if (imageBase64) {
            const mimeType = getMimeTypeFromBase64(imageBase64);
            const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp|heic);base64,/, "");
            parts.push({
                inlineData: {
                    mimeType: mimeType,
                    data: cleanBase64
                }
            });
        }

        const response = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: parts },
            config: { responseMimeType: "application/json" }
        });

        const result = cleanAndParseJSON<CCTVAnalysisResult>(response.text, {} as CCTVAnalysisResult);
        
        return {
            ...fallback,
            ...result,
            staff_tracking: result.staff_tracking || fallback.staff_tracking,
            live_timeline: result.live_timeline || fallback.live_timeline,
            sop_deviations: result.sop_deviations || fallback.sop_deviations
        };
    });
};

export const generateKitchenLayout = async (cuisine: string, type: string, area: number, constraints: string, sketchImage?: string): Promise<KitchenLayout> => {
    const fallback: KitchenLayout = { title: "Demo Layout", total_area_sqft: area, type, zones: [], total_power_load_kw: 0, total_water_points: 0, summary: "Demo" };
    
    return safeGenerate("Layout", fallback, async () => {
        const client = createAIClient();
        if (!client) throw new Error("No Client");

        const parts: any[] = [
            { text: `Generate a commercial kitchen layout for ${cuisine} cuisine (${type}, ${area} sqft). Constraints: ${constraints}. Return JSON matching KitchenLayout interface.` }
        ];

        if (sketchImage) {
             const mimeType = getMimeTypeFromBase64(sketchImage);
             const cleanBase64 = sketchImage.replace(/^data:image\/(png|jpeg|jpg|webp|heic);base64,/, "");
             parts.push({
                inlineData: {
                    mimeType: mimeType,
                    data: cleanBase64
                }
            });
            // Improved Prompt for Sketch Analysis
            parts.push({ text: "Analyze this hand-drawn sketch carefully. Identify the zones drawn (e.g. 'Cook line', 'Dishwashing', 'Storage') and their relative positions. Convert this visual layout into a structured list of zones with `placement_hint` (e.g. 'top-left', 'center', 'bottom-right'). List the required equipment for each zone." });
        }

        const response = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: parts },
            config: { 
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: "application/json" 
            }
        });

        const result = cleanAndParseJSON<KitchenLayout>(response.text, {} as KitchenLayout);
        return { ...fallback, ...result };
    });
};

export const generatePurchaseOrder = async (supplier: string, items: InventoryItem[]): Promise<PurchaseOrder> => {
    const poItems = items.map(i => ({
        name: i.name,
        qty: Math.max(1, i.parLevel - i.currentStock),
        unit: i.unit,
        estimatedCost: Math.max(1, i.parLevel - i.currentStock) * i.costPerUnit
    }));
    
    return {
        id: `po_${Date.now()}`,
        supplier,
        items: poItems,
        totalEstimatedCost: poItems.reduce((acc, i) => acc + i.estimatedCost, 0),
        status: 'draft',
        generatedDate: new Date().toISOString(),
        emailBody: `Dear ${supplier},\n\nPlease supply the following items:\n\n${poItems.map(i => `- ${i.name}: ${i.qty} ${i.unit}`).join('\n')}\n\nThanks,\nBistro Manager`
    };
};

export const forecastInventoryNeeds = async (inventory: InventoryItem[], context: string): Promise<any> => {
    return safeGenerate("Forecast", { recommendations: [] }, async () => {
        const client = createAIClient();
        if (!client) throw new Error("No Client");

        const prompt = `
        Inventory Data: ${JSON.stringify(inventory.map(i => ({ name: i.name, stock: i.currentStock, par: i.parLevel })))}
        Context: ${context}
        
        Predict stockouts for next 7 days. Return JSON with 'recommendations' array: { item, action, reason }.
        `;

        const response = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { 
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: "application/json" 
            }
        });

        return cleanAndParseJSON(response.text, { recommendations: [] });
    });
};

export const verifyLocationWithMaps = async (query: string): Promise<string> => {
    return safeGenerate("Maps", "Location verified (Mock)", async () => {
        const client = createAIClient();
        if (!client) throw new Error("No Client");

        const response = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [{ text: `Verify if "${query}" is a valid location for a restaurant. Provide a 1-sentence summary of the area.` }] },
            config: {
                tools: [{ googleSearch: {} }] 
            }
        });

        return response.text || "Location found.";
    });
};