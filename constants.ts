
import { MenuItem, Ingredient, PlanType } from './types';

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
    MENU_GEN: 40
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

export const MOCK_PURCHASES = [
    { date: "2023-10-01", ingredient_id: "ING01", ingredient_name: "Acai Puree", qty: 5, unit: "kg", cost: 7250 },
    { date: "2023-10-03", ingredient_id: "ING05", ingredient_name: "Avocado", qty: 20, unit: "pc", cost: 1600 },
    { date: "2023-10-05", ingredient_id: "ING07", ingredient_name: "Frozen Mango", qty: 10, unit: "kg", cost: 3000 },
];

export const MOCK_EXPENSES = [
    { date: "2023-10-01", type: "Rent", amount: 50000 },
    { date: "2023-10-05", type: "Utilities", amount: 12000 },
    { date: "2023-10-02", type: "Marketing", amount: 8000 },
    { date: "2023-10-06", type: "Wages", amount: 35000 },
];

export const MOCK_EMPLOYEES = [
    { employee_id: "E001", role: "Manager", monthly_cost: 35000 },
    { employee_id: "E002", role: "Head Cook", monthly_cost: 28000 },
    { employee_id: "E003", role: "Helper", monthly_cost: 15000 },
    { employee_id: "E004", role: "Server", monthly_cost: 12000 },
];

export const BUSINESS_GOALS = {
    target_monthly_revenue: 1500000,
    desired_food_cost_pct: 30
};
