
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
    PurchaseOrder
} from '../types';
import { UNIFIED_SYSTEM_PROMPT, SYSTEM_INSTRUCTION, CCTV_SYSTEM_PROMPT, APP_CONTEXT, MARKDOWN_INSTRUCTION } from '../constants';
import { ingredientService } from './ingredientService';

// --- CONFIGURATION ---

export const hasValidApiKey = (): boolean => {
    try {
        // Robust check for process.env.API_KEY
        if (typeof process !== 'undefined' && process.env) {
             const key = process.env.API_KEY;
             return !!key && key.trim().length > 0;
        }
        return false;
    } catch (e) {
        return false;
    }
};

const getApiKey = (): string => {
    try {
        return process.env.API_KEY || "";
    } catch (e) {
        return "";
    }
};

const createAIClient = () => {
    const apiKey = getApiKey();
    if (!apiKey) return null;
    try {
        return new GoogleGenAI({ apiKey });
    } catch (e) {
        // Suppress initialization errors to avoid leaking key
        console.error("Failed to initialize GoogleGenAI client");
        return null;
    }
};

// --- HELPER FUNCTIONS ---

export function cleanAndParseJSON<T>(text: string, defaultValue?: T): T {
    try {
        if (!text) throw new Error("Empty response");
        
        // Remove markdown code blocks (```json ... ```)
        let clean = text.replace(/```json\s*/g, '').replace(/```/g, ''); 
        
        // Find the outer-most JSON object or array
        const firstOpenBrace = clean.indexOf('{');
        const firstOpenBracket = clean.indexOf('[');
        const lastCloseBrace = clean.lastIndexOf('}');
        const lastCloseBracket = clean.lastIndexOf(']');
        
        let start = -1;
        let end = -1;

        // Determine if object or array is first
        if (firstOpenBrace !== -1 && (firstOpenBracket === -1 || firstOpenBrace < firstOpenBracket)) {
            start = firstOpenBrace;
            end = lastCloseBrace;
        } else if (firstOpenBracket !== -1) {
            start = firstOpenBracket;
            end = lastCloseBracket;
        }

        if (start !== -1 && end !== -1 && end > start) {
            clean = clean.substring(start, end + 1);
        }
        
        // Remove trailing commas (simple regex approach for common JSON errors)
        clean = clean.replace(/,(\s*[}\]])/g, '$1');

        return JSON.parse(clean) as T;
    } catch (e) {
        // console.error("JSON Parse Error on:", text); // Suppress log for cleaner console
        if (defaultValue !== undefined) return defaultValue;
        throw new Error("Failed to parse AI response.");
    }
}

// Helper to handle API errors gracefully without spamming console
async function safeGenerate<T>(
    operationName: string, 
    fallback: T, 
    apiCall: () => Promise<T>
): Promise<T> {
    try {
        return await apiCall();
    } catch (e: any) {
        const key = getApiKey();
        // Redact key from error message if present
        const msg = e.toString().replace(key, '[REDACTED]');
        
        if (msg.includes("403") || msg.includes("PERMISSION_DENIED")) {
            console.warn(`[${operationName}] API Key Restricted/Invalid. Switching to Demo Mode.`);
        } else {
            console.warn(`[${operationName}] Failed: ${msg}. Using fallback.`);
        }
        return fallback;
    }
}

// --- RECIPE SCHEMA ---
const RECIPE_SCHEMA: Schema = {
    type: Type.OBJECT,
    properties: {
        sku_id: { type: Type.STRING },
        name: { type: Type.STRING },
        category: { type: Type.STRING },
        prep_time_min: { type: Type.NUMBER },
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
                    waste_pct: { type: Type.NUMBER },
                    qty_per_serving: { type: Type.NUMBER },
                    cost_per_serving: { type: Type.NUMBER }
                }
            }
        },
        cook_time_minutes: { type: Type.NUMBER },
        prep_time_minutes: { type: Type.NUMBER }
    },
    required: ["name", "ingredients", "preparation_steps", "food_cost_per_serving", "suggested_selling_price"]
};

// --- MENU SCHEMA ---
const MENU_SCHEMA: Schema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING },
        tagline: { type: Type.STRING },
        currency: { type: Type.STRING },
        sections: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    items: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                description: { type: Type.STRING },
                                price: { type: Type.STRING },
                                tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                                pairing: { type: Type.STRING }
                            },
                            required: ["name", "price", "description"]
                        }
                    }
                },
                required: ["title", "items"]
            }
        },
        footer_note: { type: Type.STRING }
    },
    required: ["title", "currency", "sections"]
};

// --- LAYOUT SCHEMA ---
const LAYOUT_SCHEMA: Schema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING },
        total_area_sqft: { type: Type.NUMBER },
        type: { type: Type.STRING },
        zones: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    description: { type: Type.STRING },
                    placement_hint: { type: Type.STRING },
                    required_equipment: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                power_rating: { type: Type.STRING },
                                water_connection: { type: Type.STRING },
                                dimensions: { type: Type.STRING },
                                quantity: { type: Type.NUMBER }
                            },
                            required: ["name"]
                        }
                    },
                    width_pct: { type: Type.NUMBER },
                    height_pct: { type: Type.NUMBER }
                },
                required: ["name", "required_equipment"]
            }
        },
        total_power_load_kw: { type: Type.NUMBER },
        total_water_points: { type: Type.NUMBER },
        summary: { type: Type.STRING }
    },
    required: ["title", "zones"]
};

// --- FORECAST SCHEMA ---
const FORECAST_SCHEMA: Schema = {
    type: Type.OBJECT,
    properties: {
        recommendations: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    item: { type: Type.STRING },
                    action: { type: Type.STRING },
                    reason: { type: Type.STRING }
                },
                required: ["item", "action", "reason"]
            }
        }
    },
    required: ["recommendations"]
};

// --- SOP SCHEMA ---
const SOP_SCHEMA: Schema = {
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
                },
                required: ["step_no", "action", "responsible_role"]
            }
        },
        critical_control_points: { type: Type.ARRAY, items: { type: Type.STRING } },
        monitoring_checklist: { type: Type.ARRAY, items: { type: Type.STRING } },
        kpis: { type: Type.ARRAY, items: { type: Type.STRING } },
        quick_troubleshooting: { type: Type.STRING }
    },
    required: ["title", "stepwise_procedure", "kpis"]
};

// --- STRATEGY SCHEMA ---
const STRATEGY_SCHEMA: Schema = {
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
                    priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] }
                },
                required: ["initiative", "priority"]
            }
        },
        seasonal_menu_suggestions: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    type: { type: Type.STRING, enum: ["add", "remove"] },
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
    },
    required: ["summary", "action_plan", "roadmap"]
};

// --- AB TEST SCHEMA ---
const AB_TEST_SCHEMA: Schema = {
    type: Type.OBJECT,
    properties: {
        query: { type: Type.STRING },
        baseline_metric: {
            type: Type.OBJECT,
            properties: {
                label: { type: Type.STRING },
                value: { type: Type.NUMBER }
            }
        },
        variant_a: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING },
                focus: { type: Type.STRING },
                description: { type: Type.STRING },
                pros: { type: Type.ARRAY, items: { type: Type.STRING } },
                cons: { type: Type.ARRAY, items: { type: Type.STRING } },
                projected_revenue_lift_pct: { type: Type.NUMBER },
                implementation_difficulty: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
                key_steps: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["name", "description", "projected_revenue_lift_pct"]
        },
        variant_b: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING },
                focus: { type: Type.STRING },
                description: { type: Type.STRING },
                pros: { type: Type.ARRAY, items: { type: Type.STRING } },
                cons: { type: Type.ARRAY, items: { type: Type.STRING } },
                projected_revenue_lift_pct: { type: Type.NUMBER },
                implementation_difficulty: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
                key_steps: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["name", "description", "projected_revenue_lift_pct"]
        },
        recommendation: { type: Type.STRING }
    },
    required: ["variant_a", "variant_b", "recommendation"]
};

// --- CORE EXPORTS ---

export async function analyzeUnifiedRestaurantData(context: any): Promise<UnifiedSchema> {
    const fallbackData: UnifiedSchema = {
        workflow_analysis: { efficiency: 88, bottlenecks: [] },
        sop_compliance: { rate: 0.95, violations: [] },
        inventory_verification: { status: 'Good' },
        wastage_root_causes: ['Data unavailable - Demo Mode'],
        recipe_costing_impact: { savings_potential: 0 },
        profitability_insights: { top_item: 'N/A' },
        strategy_plan_7_days: { focus: 'Monitor' },
        marketing_assets: { suggested_posts: [] },
        summary: "System running in Demo Mode. Connect API Key for live AI analysis."
    };

    const client = createAIClient();
    if (!client) return fallbackData;

    return safeGenerate('UnifiedAnalysis', fallbackData, async () => {
        const response = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Analyze this context: ${JSON.stringify(context)}. Provide unified insights.`,
            config: {
                systemInstruction: UNIFIED_SYSTEM_PROMPT,
                responseMimeType: "application/json"
            }
        });
        return cleanAndParseJSON(response.text || '{}', fallbackData);
    });
}

export async function analyzeStaffMovement(context: string, zones: string[]): Promise<CCTVAnalysisResult> {
    const client = createAIClient();
    
    // Mock Response for Demo/Fallback
    const mockResponse: CCTVAnalysisResult = {
        events: [
            { event_id: 'e1', type: 'dwell', person_id: 'Staff_A', zone_id: zones[0] || 'prep', start_time: '12:00', confidence: 0.9, role: 'Chef', mapped_step_id: null },
            { event_id: 'e2', type: 'action', person_id: 'Staff_B', zone_id: zones[1] || 'cook', start_time: '12:05', confidence: 0.8, role: 'Cook', mapped_step_id: null }
        ],
        workflow_correlations: [],
        inventory_impact: [],
        bottlenecks: [],
        sop_deviations: [
            { 
                step_id: zones[0] || 'prep', 
                person_id: 'Staff_A', 
                deviation_type: 'Cross Contamination Risk', 
                confidence: 0.85, 
                explanation: 'Moved from raw meat zone to veg prep without handwash.', 
                business_impact: { cost_impact_inr: 500, time_lost_seconds: 0, quality_risk: 'high' } 
            }
        ],
        performance_scores: { kitchen_efficiency: 78, inventory_health: 92, congestion_score: 45, sop_adherence_score: 82 },
        financial_impact_summary: { daily_loss_due_to_errors: 1250, potential_savings: 45000 },
        recommendations: [{ type: 'staffing', priority: 'high', text: 'Rotate staff at prep station', expected_impact: 'High', confidence: 0.9 }],
        summary_report: "Detected potential cross-contamination event at Prep Station. Workflow efficiency is acceptable but congestion noted near pass.",
        processing_time_ms: 450,
        model_version: 'v1.0',
        warnings: []
    };

    if (!client) return mockResponse;

    return safeGenerate('CCTVAnalysis', mockResponse, async () => {
        const response = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Analyze simulated staff movement for zones: ${zones.join(', ')}. Context: ${context}`,
            config: {
                systemInstruction: CCTV_SYSTEM_PROMPT,
                responseMimeType: "application/json"
            }
        });
        
        const data = cleanAndParseJSON<CCTVAnalysisResult>(response.text || '{}');
        return { ...mockResponse, ...data, events: [...mockResponse.events, ...(data.events || [])] };
    });
}

export async function generateRecipeCard(userId: string, item: MenuItem, requirements: string, location?: string, persona?: string): Promise<RecipeCard> {
    const client = createAIClient();
    
    const mockRecipe: RecipeCard = {
        ...item,
        yield: 4,
        preparation_steps: ["Step 1: Prep ingredients thoroughly", "Step 2: Cook securely with attention to heat", "Step 3: Plate and serve immediately"],
        equipment_needed: ["Pan", "Knife", "Cutting Board"],
        portioning_guideline: "200g per serve",
        allergens: ["None detected in mock mode"],
        shelf_life_hours: 24,
        food_cost_per_serving: 150,
        suggested_selling_price: 450,
        tags: ["Mock", "Demo"],
        human_summary: "Generated in Demo Mode due to API limit or connection issue. Connect API Key for full AI generation.",
        confidence: 'High',
        ingredients: [
            { ingredient_id: 'm1', name: 'Mock Ingredient 1', qty: '100g', cost_per_unit: 50, unit: 'kg', cost_per_serving: 5, waste_pct: 0 },
            { ingredient_id: 'm2', name: 'Mock Ingredient 2', qty: '2 pcs', cost_per_unit: 10, unit: 'pc', cost_per_serving: 20, waste_pct: 0 }
        ]
    };

    if (!client) return mockRecipe;

    return safeGenerate('RecipeGen', mockRecipe, async () => {
        const prompt = `Create a detailed recipe for "${item.name}". Requirements: ${requirements}. Location: ${location || 'General'}. Persona: ${persona}.`;
        const response = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: "application/json",
                responseSchema: RECIPE_SCHEMA
            }
        });
        
        const text = response.text || '{}';
        const parsed = cleanAndParseJSON<any>(text);
        
        if (parsed.ingredients) {
            parsed.ingredients = parsed.ingredients.map((ing: any, idx: number) => ({
                ...ing,
                ingredient_id: ing.ingredient_id || `gen_${Date.now()}_${idx}`
            }));
        }
        
        return { ...item, ...parsed };
    });
}

export async function generateRecipeVariation(userId: string, original: RecipeCard, type: string, location?: string): Promise<RecipeCard> {
    const client = createAIClient();
    const mockVariation = { ...original, name: `${original.name} (${type})`, human_summary: `Mock ${type} variation (Demo Mode).` };
    
    if (!client) return mockVariation;
    
    return safeGenerate('RecipeVariation', mockVariation, async () => {
        const response = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Create a "${type}" variation of this recipe: ${JSON.stringify(original)}.`,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: "application/json",
                responseSchema: RECIPE_SCHEMA
            }
        });
        return cleanAndParseJSON(response.text || '{}', mockVariation);
    });
}

export async function substituteIngredient(recipe: RecipeCard, ingredientName: string, location?: string): Promise<RecipeCard> {
    const client = createAIClient();
    if (!client) return recipe;
    
    return safeGenerate('SubstituteIng', recipe, async () => {
        const response = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Substitute "${ingredientName}" in this recipe with a cheaper or more available alternative in ${location}: ${JSON.stringify(recipe)}.`,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: "application/json",
                responseSchema: RECIPE_SCHEMA
            }
        });
        return cleanAndParseJSON(response.text || '{}', recipe);
    });
}

export async function estimateMarketRates(ingredients: string[], location: string): Promise<Record<string, number>> {
    const client = createAIClient();
    const rates: Record<string, number> = {};
    ingredients.forEach(i => rates[i] = Math.floor(Math.random() * 500) + 50); // Fallback mock
    
    if (!client) return rates;

    return safeGenerate('MarketRates', rates, async () => {
        const response = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Estimate market rates (INR) for these ingredients in ${location}: ${ingredients.join(', ')}. Return JSON: { "ingredient": price_per_unit_number }`,
            config: { responseMimeType: "application/json" }
        });
        return cleanAndParseJSON(response.text || '{}', rates);
    });
}

export async function generateSOP(topic: string): Promise<SOP> {
    const mockSOP: SOP = {
        sop_id: `sop_${Date.now()}`,
        title: topic,
        scope: "Demo Scope",
        prerequisites: "None",
        materials_equipment: ["None"],
        stepwise_procedure: [{ step_no: 1, action: "Demo Step 1", responsible_role: "Staff" }, { step_no: 2, action: "Demo Step 2", responsible_role: "Staff" }],
        critical_control_points: ["CCP 1"],
        monitoring_checklist: ["Check 1"],
        kpis: ["Efficiency"],
        quick_troubleshooting: "Restart process"
    };

    const client = createAIClient();
    if (!client) return mockSOP;

    return safeGenerate('SOPGen', mockSOP, async () => {
        const response = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Create a detailed Standard Operating Procedure (SOP) for: ${topic}. 
            Include: Scope, Prerequisites, Step-by-step procedure (with role and time limit), Critical Control Points, KPIs, and Troubleshooting.`,
            config: { 
                responseMimeType: "application/json",
                responseSchema: SOP_SCHEMA
            }
        });
        return cleanAndParseJSON(response.text || '{}', mockSOP);
    });
}

export async function generateStrategy(user: User, query: string, context: string): Promise<StrategyReport> {
    const mockStrategy: StrategyReport = { 
        summary: [
            "Market analysis indicates a 12% shift towards healthy, fast-casual dining in your area.",
            "Competitor pricing suggests room for a 5% increase on premium items.",
            "Customer retention has dipped; suggesting loyalty incentives."
        ], 
        causes: [
            "Lack of seasonal menu updates.",
            "Inconsistent portioning driving up food cost.",
            "Staff turnover affecting service speed."
        ], 
        action_plan: [
            { initiative: "Launch 'Happy Hour' 4-7 PM", impact_estimate: "High (Revenue +15%)", cost_estimate: "Low (Marketing only)", priority: "High" },
            { initiative: "Retrain staff on protein portioning", impact_estimate: "Medium (Cost -3%)", cost_estimate: "Low (Time)", priority: "High" },
            { initiative: "Introduce 'Business Lunch' Combo", impact_estimate: "Medium (Volume +10%)", cost_estimate: "Medium (Food Cost)", priority: "Medium" }
        ], 
        seasonal_menu_suggestions: [
            { type: 'add', item: 'Mango Basil Cooler', reason: 'High margin, seasonal fruit availability.' },
            { type: 'remove', item: 'Hot Chocolate', reason: 'Low sales in summer months.' },
            { type: 'add', item: 'Quinoa Salad', reason: 'Rising demand for healthy lunch options.' }
        ], 
        roadmap: [
            { phase_name: "Week 1: Planning", duration: "7 Days", steps: ["Design Menu", "Train Staff"], milestone: "Menu Finalized" },
            { phase_name: "Week 2: Launch", duration: "7 Days", steps: ["Social Media Blast", "In-store Signage"], milestone: "Campaign Live" },
            { phase_name: "Week 3-4: Monitor", duration: "14 Days", steps: ["Track Sales", "Gather Feedback"], milestone: "Review ROI" }
        ] 
    };
    const client = createAIClient();
    if (!client) return mockStrategy;
    
    return safeGenerate('StrategyGen', mockStrategy, async () => {
        const response = await client.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: `Act as a Restaurant Strategy Consultant.
            Query: ${query}.
            Business Context: ${context}.
            
            Provide a strategic report with:
            1. Executive Summary
            2. Root Causes / Analysis
            3. Action Plan (Initiatives with Impact/Cost estimates)
            4. Seasonal Menu Suggestions (Add/Remove items)
            5. Implementation Roadmap (Phased steps)`,
            config: { 
                responseMimeType: "application/json",
                responseSchema: STRATEGY_SCHEMA
            }
        });
        return cleanAndParseJSON(response.text || '{}', mockStrategy);
    });
}

export async function generateABTestStrategy(user: User, query: string, context: string): Promise<ABTestResult> {
    const mockAB: ABTestResult = { 
        query, 
        baseline_metric: { label: 'Revenue', value: 50000 }, 
        variant_a: { 
            name: 'Aggressive Discounting', 
            description: 'Offer flat 20% off to drive immediate volume.', 
            projected_revenue_lift_pct: 15, 
            implementation_difficulty: 'Low', 
            key_steps: ['Create Promo Code', 'Post on Socials'], 
            focus: 'Volume', 
            pros: ['Fast results'], 
            cons: ['Lower margin'] 
        }, 
        variant_b: { 
            name: 'Value Bundling', 
            description: 'Create high-margin combos (Burger + Fries + Drink).', 
            projected_revenue_lift_pct: 12, 
            implementation_difficulty: 'Medium', 
            key_steps: ['Design Combos', 'Update POS'], 
            focus: 'Margin', 
            pros: ['Higher ticket size'], 
            cons: ['Slower adoption'] 
        }, 
        recommendation: "Variant B is recommended for long-term sustainability as it protects your brand value while increasing average ticket size." 
    };
    
    const client = createAIClient();
    if (!client) return mockAB;
    
    return safeGenerate('ABTestGen', mockAB, async () => {
        const response = await client.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: `Conduct an A/B Strategic Test Simulation.
            Query: ${query}.
            Context: ${context}.
            
            Create two distinct strategic variants (A and B) to solve the problem.
            Estimate the projected revenue lift % and difficulty for each.
            Provide a final recommendation.`,
            config: { 
                responseMimeType: "application/json",
                responseSchema: AB_TEST_SCHEMA
            }
        });
        return cleanAndParseJSON(response.text || '{}', mockAB);
    });
}

export async function generateImplementationPlan(strategy: string): Promise<any> {
    return {};
}

export async function generateMenu(request: MenuGenerationRequest): Promise<string> {
    const mockMenu = JSON.stringify({ title: "Demo Menu", sections: [], tagline: "Generated Offline Mode", currency: '₹' });
    const client = createAIClient();
    if (!client) return mockMenu;
    
    return safeGenerate('MenuGen', mockMenu, async () => {
        const prompt = `
        Generate a restaurant menu structure for "${request.restaurantName}".
        Cuisine: ${request.cuisineType}
        Target Audience: ${request.targetAudience || 'General'}
        Budget/Pricing Range: ${request.budgetRange || 'Standard'}
        Pricing Strategy: ${request.pricingStrategy || 'Standard'}
        Season: ${request.season || 'All Season'}
        Must Include: ${request.mustIncludeItems || 'None'}
        Dietary Restrictions: ${request.dietaryRestrictions?.join(', ') || 'None'}
        Visual Theme: ${request.themeStyle || 'Modern'}

        Ensure the menu is categorized into sections (e.g., Starters, Mains, Desserts).
        Prices should be realistic for the cuisine and budget.
        Descriptions should be appetizing and detailed.
        Currency should be appropriate (default to ₹ if not specified).
        `;

        const response = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { 
                responseMimeType: "application/json",
                responseSchema: MENU_SCHEMA
            }
        });
        return response.text || mockMenu;
    });
}

export async function generateKitchenLayout(
    cuisine: string, 
    type: string, 
    area: number, 
    requirements: string,
    image?: string // New parameter for sketch upload
): Promise<KitchenLayout> {
    // Populated Mock Layout for Demo/Fallback to ensure UI is usable
    const mockLayout: KitchenLayout = { 
        title: "Demo Commercial Kitchen", 
        total_area_sqft: area, 
        type, 
        zones: [
            {
                name: "Cooking Station",
                description: "Main hot line",
                placement_hint: "Center",
                required_equipment: [
                    { name: "4-Burner Range", power_rating: "3kW Gas", water_connection: "None", dimensions: "3x3", quantity: 1 },
                    { name: "Convection Oven", power_rating: "5kW", water_connection: "None", dimensions: "3x3", quantity: 1 }
                ],
                width_pct: 30, height_pct: 40
            },
            {
                name: "Prep Area",
                description: "Vegetable and meat prep",
                placement_hint: "Right",
                required_equipment: [
                    { name: "SS Work Table", power_rating: "None", water_connection: "None", dimensions: "4x3", quantity: 2 },
                    { name: "Prep Counter", power_rating: "0.5kW", water_connection: "None", dimensions: "5x3", quantity: 1 }
                ],
                width_pct: 30, height_pct: 40
            },
            {
                name: "Storage & Cooling",
                description: "Cold storage",
                placement_hint: "Left",
                required_equipment: [
                    { name: "Walk-in Fridge", power_rating: "2kW", water_connection: "Drain", dimensions: "6x5", quantity: 1 },
                    { name: "Reach-in Freezer", power_rating: "1.5kW", water_connection: "None", dimensions: "3x3", quantity: 1 }
                ],
                width_pct: 20, height_pct: 40
            },
            {
                name: "Washing Area",
                description: "Dishwashing",
                placement_hint: "Back",
                required_equipment: [
                    { name: "3-Compartment Sink", power_rating: "None", water_connection: "Hot/Cold", dimensions: "5x3", quantity: 1 },
                    { name: "Dishwasher Hood", power_rating: "6kW", water_connection: "Inlet/Drain", dimensions: "3x3", quantity: 1 }
                ],
                width_pct: 20, height_pct: 40
            }
        ], 
        total_power_load_kw: 18, 
        total_water_points: 3, 
        summary: "Generated in Demo Mode. Connect API Key for live AI layout generation." 
    };

    const client = createAIClient();
    if (!client) return mockLayout;
    
    return safeGenerate('LayoutGen', mockLayout, async () => {
        const textPrompt = `Design a kitchen layout for ${cuisine} (${type}), ${area} sqft. Requirements: ${requirements}.
        Output valid JSON matching the schema.
        Include specific commercial equipment with power (e.g. '3-Phase', '1.5kW') and water (e.g. 'Inlet/Drain') specs in the 'required_equipment' list.
        If an image is provided, analyze the hand-drawn sketch to identify equipment and their arrangement, and return the digital equipment list matching the sketch.`;

        let contentParts: any[] = [{ text: textPrompt }];

        if (image) {
            // SDK expects base64 string in inlineData without the data URL prefix
            // Determine mimeType dynamically
            const match = image.match(/^data:(.+);base64,(.+)$/);
            if (match) {
                contentParts.push({
                    inlineData: {
                        mimeType: match[1], 
                        data: match[2]
                    }
                });
            }
        }

        const response = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: contentParts,
            config: { 
                responseMimeType: "application/json",
                responseSchema: LAYOUT_SCHEMA
            }
        });
        return cleanAndParseJSON(response.text || '{}', mockLayout);
    });
}

export async function generateKitchenWorkflow(description: string): Promise<string> {
    const mockWorkflow = "# Kitchen Workflow (Demo)\n\n1. Receive Goods\n2. Store in Dry/Cold\n3. Prep\n4. Cook\n5. Plate\n6. Serve";
    const client = createAIClient();
    if (!client) return mockWorkflow;
    
    return safeGenerate('WorkflowGen', mockWorkflow, async () => {
        const response = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Design a kitchen workflow based on: ${description}`,
            config: { systemInstruction: MARKDOWN_INSTRUCTION }
        });
        return response.text || mockWorkflow;
    });
}

export async function generateMarketingVideo(images: string[], prompt: string, aspectRatio: string): Promise<string> {
    const client = createAIClient();
    // Default fallback video
    const fallback = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4";
    if (!client) return fallback;

    return safeGenerate('VideoGen', fallback, async () => {
        // Prepare image payload if reference images exist
        let imagePayload = undefined;
        if (images && images.length > 0) {
            // Extract actual mime type from data URI
            const match = images[0].match(/^data:(.+);base64,(.+)$/);
            if (match) {
                imagePayload = {
                    imageBytes: match[2],
                    mimeType: match[1],
                };
            }
        }

        let operation = await client.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: prompt,
            image: imagePayload,
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: aspectRatio === '16:9' ? '16:9' : '9:16'
            }
        });

        // Polling loop
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            operation = await client.operations.getVideosOperation({operation: operation});
        }

        const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (videoUri) {
            // The URI is directly accessible with the API key appended
            return `${videoUri}&key=${getApiKey()}`;
        }
        return fallback;
    });
}

export async function generateMarketingImage(prompt: string, aspectRatio: string): Promise<string> {
    const client = createAIClient();
    const fallback = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c";
    if (!client) return fallback;

    return safeGenerate('ImageGen', fallback, async () => {
        const response = await client.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: { parts: [{ text: prompt }] },
            config: {
                imageConfig: {
                    aspectRatio: aspectRatio as any
                }
            }
        });
        
        if (response.candidates && response.candidates.length > 0 && response.candidates[0].content.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }
        return fallback;
    });
}

export async function verifyLocationWithMaps(query: string): Promise<string> {
    const client = createAIClient();
    const fallback = "Maps Verification: Mock Location Found (Demo)";
    if (!client) return fallback;
    
    return safeGenerate('MapsVerify', fallback, async () => {
        const response = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Verify this location: ${query}`,
            config: { tools: [{ googleMaps: {} }] }
        });
        return response.text || "Location verified.";
    });
}

export async function getChatResponse(history: any[], message: string): Promise<string> {
    const client = createAIClient();
    const fallback = "I am in demo mode. Please connect an API key to chat with me!";
    if (!client) return fallback;
    
    return safeGenerate('Chat', fallback, async () => {
        const chat = client.chats.create({
            model: "gemini-2.5-flash",
            config: { systemInstruction: APP_CONTEXT },
            history: history.map(h => ({ role: h.role === 'assistant' ? 'model' : 'user', parts: [{ text: h.text }] }))
        });
        const result = await chat.sendMessage({ message });
        return result.text || "";
    });
}

export async function generatePurchaseOrder(supplier: string, items: any[]): Promise<PurchaseOrder> {
    const total = items.reduce((acc, i) => acc + (i.parLevel - i.currentStock) * i.costPerUnit, 0);
    return {
        id: `PO-${Date.now()}`,
        supplier,
        items: items.map(i => ({ name: i.name, qty: i.parLevel - i.currentStock, unit: i.unit, estimatedCost: (i.parLevel - i.currentStock) * i.costPerUnit })),
        totalEstimatedCost: total,
        status: 'draft',
        generatedDate: new Date().toISOString(),
        emailBody: `Dear ${supplier},\n\nPlease ship the following items:\n\n${items.map(i => `- ${i.name}: ${i.parLevel - i.currentStock} ${i.unit}`).join('\n')}\n\nThanks.`
    };
}

export async function forecastInventoryNeeds(inventory: any[], context: string): Promise<any> {
    const client = createAIClient();
    const fallback = { recommendations: [{ item: inventory[0]?.name || "Item A", action: "Reorder", reason: "Predicted high usage (Demo)." }] };
    if (!client) return fallback;

    return safeGenerate('InventoryForecast', fallback, async () => {
        const response = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Forecast inventory needs based on: ${JSON.stringify(inventory)} and context: ${context}. Return JSON.`,
            config: { 
                responseMimeType: "application/json",
                responseSchema: FORECAST_SCHEMA
            }
        });
        return cleanAndParseJSON(response.text || '{}');
    });
}
