

import { MenuItem, Ingredient, PlanType, RecipeCard } from './types';

export const SYSTEM_INSTRUCTION = `
You are BistroAssist — an expert F&B operations and menu-engineering assistant built for BistroIntelligence.
You read and write JSON, CSV and plain text. You produce: standardized recipe cards, costed ingredient sheets, SOPs, training modules, purchase lists, and strategy/analytics from restaurant data.
Always:
• Return STRICT machine-readable JSON. 
• If a human summary is required, include it as a field ('human_summary' or 'summary') WITHIN the JSON object. Do not add text outside the JSON block.
• Show assumptions and calculations step-by-step when doing costing or forecasting.
• Provide actionable next steps (3 priorities).
• Tag confidence for each recommendation (High/Medium/Low).
• Tone: professional, concise, operations-first. Units: INR, grams/ml/serving, dates ISO (YYYY-MM-DD).
`;

export const UNIFIED_SYSTEM_PROMPT = `
SYSTEM:
You are the unified AI engine for BistroConnect Insight — an AI-operated Restaurant OS.

Your responsibilities:
1. Analyze CCTV staff movement and track actions inside kitchen zones.
2. Identify workflow steps, SOP compliance, and bottlenecks.
3. Use recipe definitions to map expected steps vs. actual behavior.
4. Validate inventory consumption using:
   - CCTV-detected ingredient usage,
   - POS sales consumption,
   - Vendor stock data (BistroSupply).
5. Detect mismatches, wastage, misuse, shortfalls, or excess consumption.
6. Generate operational SOPs for each zone and role.
7. Calculate recipe costing, portion economics, food cost %, profitability.
8. Generate business strategy recommendations (menu, staff, layout, prep).
9. Produce marketing images/video scripts/ad copy based on business needs.
10. Always output machine-readable JSON exactly matching the described schema.

Follow these rules:
- Never identify staff personally. Use anonymized IDs (anon_01).
- Be analytical, factual, and structured.
- If data is missing/uncertain, explain assumptions and provide confidence scores.
- Always include root causes, impacts, and recommended corrective actions.
- Always include marketing ideas based on insights.
`;

export const CCTV_SYSTEM_PROMPT = `
You are the BistroConnect Insight Operational Brain for F&B. 
Your role: receive short video clips/frames (staff movement) and kitchen workflow context (SOP, recipe steps, order stream, raw material inventory events), then produce a unified, structured analysis that correlates movement patterns with workflow steps and inventory interactions.

Goals:
1. Map each staff movement event to an expected workflow step (if any). 
2. Detect SOP deviations, missing steps, incorrect sequencing, and inventory-driven friction (e.g., repeated trips to store due to missing ingredient).
3. Detect bottlenecks caused by staff allocation, layout, or raw-material shortages.
4. Produce prioritized, actionable recommendations (staffing, layout, reorder, recipe tweak).
5. Output machine-readable JSON (see schema) followed by a short human summary.
`;

export const CCTV_INTEGRATION_PROMPT = `
You are the Camera Integration Assistant for BistroConnect Insight.
Your job is to help users add and configure CCTV cameras inside restaurant kitchens and connect them to our AI-based operational analytics engine.
`;

export const MARKDOWN_INSTRUCTION = `
You are BistroAssist — an expert F&B operations consultant.
You produce high-quality, readable documents in Markdown format.
Use headers (#, ##), bullet points, bold text, and clear sections.
Tone: professional, actionable, and inspiring.
Do NOT return JSON. Return formatted text.
`;

export const APP_CONTEXT = `
You are BistroAssist, the AI assistant for BistroIntelligence.
You serve as a knowledgeable guide for restaurant owners, chefs, and managers.
Your capabilities include:
- Explaining app features (Recipe Hub, SOP Studio, Strategy AI, etc.)
- Providing operational advice for F&B businesses.
- Assisting with cost control, menu engineering, and marketing ideas.
Tone: Professional, helpful, concise, and industry-focused.
`;

export const CREDIT_COSTS = {
    RECIPE: 10,
    SOP: 15,
    STRATEGY: 12,
    VIDEO: 50,
    IMAGE: 20,
    EXPERT_CONNECT: 50,
    WORKFLOW: 50,
    MENU_GEN: 40,
    LAYOUT: 60
};

export const RECHARGE_RATE = 10; // INR per credit
export const MIN_RECHARGE_CREDITS = 20;

export const PLANS = {
  [PlanType.FREE]: {
    name: 'Basic Starter',
    description: 'Entry-level plan for single outlets.',
    price: 199,
    quarterlyPrice: 539, // Approx 10% discount
    features: ['25 Credits / Month', 'Recipe Costing (10cr)', 'Standard SOPs (15cr)', 'Strategy Add-on Available'],
    color: 'slate',
    monthlyCredits: 25
  },
  [PlanType.PRO]: {
    name: 'Pro Growth',
    description: 'For growing restaurants needing regular operational updates.',
    price: 3999,
    quarterlyPrice: 10799, 
    features: ['500 Credits / Month', 'Advanced Recipe Gen', 'SOP Studio Access', 'Strategy Add-on Available', 'Priority Support'],
    color: 'emerald',
    monthlyCredits: 500
  },
  [PlanType.PRO_PLUS]: {
    name: 'Pro+ Operations',
    description: 'High-volume intelligence for scaling F&B brands.',
    price: 24999,
    quarterlyPrice: 67499,
    features: ['2600 Credits / Month', 'Included AI Strategy', 'Multi-outlet Management', 'Dedicated Account Manager'],
    color: 'purple',
    monthlyCredits: 2600
  }
};

// Mock Data
export const MOCK_MENU: MenuItem[] = [
  {
    sku_id: "AC01",
    name: "Classic Acai Energy Bowl",
    category: "beverage",
    prep_time_min: 5,
    current_price: 499,
    ingredients: [
      { ingredient_id: "ING01", name: "Acai Puree", qty: "100 g" },
      { ingredient_id: "ING02", name: "Banana", qty: "50 g" },
      { ingredient_id: "ING03", name: "Granola", qty: "30 g" }
    ]
  },
  {
    sku_id: "AV02",
    name: "Smashed Avo Toast",
    category: "main",
    prep_time_min: 8,
    current_price: 350,
    ingredients: [
      { ingredient_id: "ING04", name: "Sourdough", qty: "2 slices" },
      { ingredient_id: "ING05", name: "Avocado", qty: "1 pc" },
      { ingredient_id: "ING06", name: "Feta", qty: "20 g" }
    ]
  },
  {
    sku_id: "SM03",
    name: "Mango Tango Smoothie",
    category: "beverage",
    prep_time_min: 3,
    current_price: 250,
    ingredients: [
      { ingredient_id: "ING07", name: "Frozen Mango", qty: "150 g" },
      { ingredient_id: "ING08", name: "Yogurt", qty: "100 ml" }
    ]
  }
];

export const MOCK_RECIPES: RecipeCard[] = [
  {
    ...MOCK_MENU[0],
    yield: 1,
    preparation_steps: [
      "Blend frozen acai puree with banana until smooth.",
      "Pour into a chilled bowl.",
      "Top evenly with granola and fresh berries."
    ],
    equipment_needed: ["Blender", "Spatula"],
    portioning_guideline: "1 Bowl (350g)",
    allergens: ["Nuts (Granola)"],
    shelf_life_hours: 0,
    food_cost_per_serving: 180,
    suggested_selling_price: 499,
    tags: ["Healthy", "Breakfast", "Vegan"],
    confidence: "High",
    human_summary: "High-margin breakfast item. Ensure acai remains frozen for texture.",
    ingredients: [
        { ingredient_id: "ING01", name: "Acai Puree", qty: "100 g", cost_per_unit: 1450, unit: "kg", cost_per_serving: 145, waste_pct: 0 },
        { ingredient_id: "ING02", name: "Banana", qty: "50 g", cost_per_unit: 60, unit: "kg", cost_per_serving: 3, waste_pct: 5 },
        { ingredient_id: "ING03", name: "Granola", qty: "30 g", cost_per_unit: 400, unit: "kg", cost_per_serving: 12, waste_pct: 0 }
    ]
  },
  {
    ...MOCK_MENU[1],
    yield: 1,
    preparation_steps: [
      "Toast sourdough slices until golden brown.",
      "Mash avocado with lime juice, salt, and pepper.",
      "Spread avocado mix on toast and top with crumbled feta."
    ],
    equipment_needed: ["Toaster", "Mixing Bowl"],
    portioning_guideline: "2 Slices",
    allergens: ["Gluten", "Dairy"],
    shelf_life_hours: 0,
    food_cost_per_serving: 120,
    suggested_selling_price: 350,
    tags: ["Vegetarian", "Brunch"],
    confidence: "High",
    human_summary: "Classic brunch staple. Watch avocado ripeness closely to reduce waste.",
    ingredients: [
        { ingredient_id: "ING04", name: "Sourdough", qty: "2 slices", cost_per_unit: 20, unit: "slice", cost_per_serving: 40, waste_pct: 2 },
        { ingredient_id: "ING05", name: "Avocado", qty: "1 pc", cost_per_unit: 80, unit: "pc", cost_per_serving: 80, waste_pct: 10 },
        { ingredient_id: "ING06", name: "Feta", qty: "20 g", cost_per_unit: 1200, unit: "kg", cost_per_serving: 24, waste_pct: 0 }
    ]
  }
];

export const MOCK_SALES_DATA = [
  { date: "2023-10-01", revenue: 12000, items_sold: 45 },
  { date: "2023-10-02", revenue: 15400, items_sold: 58 },
  { date: "2023-10-03", revenue: 11200, items_sold: 40 },
  { date: "2023-10-04", revenue: 18900, items_sold: 72 },
  { date: "2023-10-05", revenue: 22000, items_sold: 85 },
  { date: "2023-10-06", revenue: 25000, items_sold: 95 },
  { date: "2023-10-07", revenue: 24500, items_sold: 92 },
];

export const MOCK_INGREDIENT_PRICES = [
  { ingredient_id: "ING01", name: "Acai Puree", cost_per_unit: 1450, unit: "kg" },
  { ingredient_id: "ING02", name: "Banana", cost_per_unit: 60, unit: "kg" },
  { ingredient_id: "ING03", name: "Granola", cost_per_unit: 400, unit: "kg" },
  { ingredient_id: "ING04", name: "Sourdough", cost_per_unit: 20, unit: "slice" },
  { ingredient_id: "ING05", name: "Avocado", cost_per_unit: 80, unit: "pc" },
  { ingredient_id: "ING06", name: "Feta", cost_per_unit: 1200, unit: "kg" },
  { ingredient_id: "ING07", name: "Frozen Mango", cost_per_unit: 300, unit: "kg" },
  { ingredient_id: "ING08", name: "Yogurt", cost_per_unit: 100, unit: "l" },
];