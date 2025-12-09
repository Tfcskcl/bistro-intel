

export interface Ingredient {
  ingredient_id: string;
  name: string;
  qty?: string;
  qty_per_serving?: number;
  cost_per_unit?: number;
  unit?: string;
  cost_per_serving?: number;
  waste_pct?: number;
}

export interface MenuItem {
  sku_id: string;
  name: string;
  ingredients: Ingredient[];
  prep_time_min: number;
  category: 'main' | 'snack' | 'beverage' | 'dessert';
  current_price: number;
  food_cost_pct?: number; // Calculated
  margin_pct?: number; // Calculated
}

export interface NutritionalInfo {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
}

export interface RecipeCard extends MenuItem {
  yield: number;
  preparation_steps: string[];
  equipment_needed: string[];
  portioning_guideline: string;
  allergens: string[];
  shelf_life_hours: number;
  food_cost_per_serving: number;
  suggested_selling_price: number;
  tags: string[];
  human_summary?: string;
  reasoning?: string;
  confidence?: 'High' | 'Medium' | 'Low';
  assignedRestaurantId?: string;
  assignedRestaurantName?: string;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  total_time_minutes?: number;
  nutritional_info?: NutritionalInfo;
}

export interface RecipeRequest {
    id: string;
    userId: string;
    userName: string;
    item: MenuItem;
    requirements: string;
    status: 'pending' | 'completed';
    requestDate: string;
    completedDate?: string;
}

export interface SOP {
  sop_id: string;
  title: string;
  scope: string;
  prerequisites: string;
  materials_equipment: string[];
  stepwise_procedure: { step_no: number; action: string; responsible_role: string; time_limit?: string }[];
  critical_control_points: string[];
  monitoring_checklist: string[];
  kpis: string[];
  quick_troubleshooting: string;
}

export interface SOPRequest {
    id: string;
    userId: string;
    userName: string;
    topic: string;
    details?: string;
    status: 'pending' | 'completed';
    requestDate: string;
    completedDate?: string;
}

export interface MarketingRequest {
    id: string;
    userId: string;
    userName: string;
    type: 'video' | 'image';
    prompt: string;
    images?: string[]; // Array of base64 strings (for video ref)
    youtubeUrl?: string; // Reference video URL
    aspectRatio: '16:9' | '9:16' | '1:1' | '4:3' | '3:4';
    status: 'pending' | 'completed';
    requestDate: string;
    completedDate?: string;
    outputUrl?: string; // URI for video or Base64/URL for image
}

export interface KitchenWorkflowRequest {
    id: string;
    userId: string;
    userName: string;
    title: string;
    description: string;
    mediaFiles: { name: string; type: 'image' | 'video'; size: string }[];
    status: 'pending' | 'in_review' | 'approved' | 'rejected';
    adminResponse?: string; // The generated workflow markdown
    requestDate: string;
    completedDate?: string;
}

export interface MenuStructure {
    title: string;
    tagline?: string;
    currency: string;
    sections: {
        title: string;
        description?: string;
        items: {
            name: string;
            description: string;
            price: string;
            tags: string[]; // e.g., 'Spicy', 'Vegan'
            pairing?: string;
        }[];
    }[];
    footer_note?: string;
}

export interface MenuGenerationRequest {
    id: string;
    userId: string;
    userName: string;
    restaurantName: string;
    cuisineType: string;
    targetAudience: string;
    budgetRange: string;
    mustIncludeItems: string;
    dietaryRestrictions: string[];
    season?: string; // New
    pricingStrategy?: string; // New
    themeStyle?: string; // New
    numberOfItems?: number;
    requestDate: string;
    generatedMenu?: string; // JSON string of MenuStructure
}

export interface RoadmapPhase {
    phase_name: string;
    duration: string;
    steps: string[];
    milestone: string;
}

export interface StrategyReport {
  summary: string[];
  causes: string[];
  action_plan: { initiative: string; impact_estimate: string; cost_estimate: string; priority: 'High' | 'Medium' | 'Low' }[];
  seasonal_menu_suggestions: { type: 'add' | 'remove'; item: string; reason: string }[];
  roadmap: RoadmapPhase[];
}

export interface ABTestVariant {
    name: string;
    focus: string; // e.g. "Aggressive Marketing"
    description: string;
    pros: string[];
    cons: string[];
    projected_revenue_lift_pct: number;
    implementation_difficulty: 'Low' | 'Medium' | 'High';
    key_steps: string[];
}

export interface ABTestResult {
    query: string;
    baseline_metric: { label: string; value: number }; // e.g. Current Revenue
    variant_a: ABTestVariant;
    variant_b: ABTestVariant;
    recommendation: string;
}

export interface ImplementationGuide {
    objective: string;
    phases: {
        phase_name: string;
        steps: string[];
        resources_needed: string[];
        kpi_to_track: string;
    }[];
    estimated_timeline: string;
}

export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

export enum PlanType {
  FREE = 'FREE',
  PRO = 'PRO',
  PRO_PLUS = 'PRO_PLUS'
}

export interface PlanConfig {
    name: string;
    description?: string;
    price: number;
    quarterlyPrice: number;
    features: string[];
    color: string;
    monthlyCredits: number;
}

export interface CreditTransaction {
    id: string;
    date: string;
    amount: number;
    type: 'credit' | 'debit'; // credit = added (purchase), debit = used
    description: string;
}

export interface SocialStats {
    platform: 'instagram' | 'facebook' | 'google_business';
    handle: string;
    metrics: {
        label: string;
        value: string;
        trend?: number; // percentage
    }[];
    lastSync: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  plan: PlanType;
  // New profile fields
  restaurantName?: string;
  location?: string;
  cuisineType?: string;
  joinedDate?: string;
  
  // Registration extras
  gstNumber?: string;
  fssaiNumber?: string;
  menuFile?: string;

  // Usage Tracking & Credits
  credits: number;
  
  // Setup Status
  setupComplete?: boolean;
  
  // Legacy trial fields (deprecated but kept for compatibility)
  queriesUsed?: number;
  queryLimit?: number; 
  isTrial?: boolean;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  RECIPES = 'RECIPES',
  INVENTORY = 'INVENTORY',
  SOP = 'SOP',
  STRATEGY = 'STRATEGY',
  VIDEO = 'VIDEO',
  KITCHEN_WORKFLOW = 'KITCHEN_WORKFLOW', // Can be kept for backward compat or removed if fully merged
  MENU_GENERATOR = 'MENU_GENERATOR',
  CCTV_ANALYTICS = 'CCTV_ANALYTICS',
  LAYOUT_DESIGN = 'LAYOUT_DESIGN', // New View
  TASKS = 'TASKS',
  INTEGRATIONS = 'INTEGRATIONS',
  BILLING = 'BILLING'
}

export interface Task {
    id: string;
    text: string;
    completed: boolean;
    tags: string[]; // e.g. 'Urgent', 'Kitchen', 'Personal'
    createdAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  read: boolean;
  date: string;
  role?: UserRole[]; // If null, visible to all
}

export interface POSChangeRequest {
    id: string;
    sku_id: string;
    item_name: string;
    old_price: number;
    new_price: number;
    status: 'pending' | 'approved' | 'rejected';
    requested_by: string;
    requested_date: string;
    targetRestaurantId?: string;
    targetRestaurantName?: string;
}

// Inventory Types
export interface InventoryItem {
    id: string;
    name: string;
    category: string;
    currentStock: number;
    unit: string;
    costPerUnit: number;
    parLevel: number; // Minimum stock before reorder
    supplier: string;
    lastUpdated: string;
}

export interface PurchaseOrder {
    id: string;
    supplier: string;
    items: { name: string; qty: number; unit: string; estimatedCost: number }[];
    totalEstimatedCost: number;
    status: 'draft' | 'sent';
    generatedDate: string;
    emailBody?: string;
}

// --- Layout Designer Types ---
export interface EquipmentSpec {
    name: string;
    power_rating: string; // e.g., "5kW, 3-Phase"
    water_connection: string; // e.g., "Inlet + Drain"
    dimensions: string;
    quantity: number;
}

export interface LayoutZone {
    name: string; // e.g., "Hot Line", "Wash Area"
    description: string;
    placement_hint: string; // "Center", "Back Wall"
    required_equipment: EquipmentSpec[];
    width_pct: number;
    height_pct: number;
}

export interface KitchenLayout {
    title: string;
    total_area_sqft: number;
    type: string;
    zones: LayoutZone[];
    total_power_load_kw: number;
    total_water_points: number;
    summary: string;
}

// --- CCTV Analytics Types ---

export interface CCTVEvent {
    event_id: string;
    type: 'enter_zone' | 'exit_zone' | 'dwell' | 'trip' | 'action';
    person_id: string;
    role: string; // e.g., 'Chef', 'Prep Cook'
    mapped_step_id: string | null;
    zone_id: string;
    start_time: string;
    end_time?: string;
    duration_seconds?: number;
    inventory_interaction?: {
        item_id: string;
        qty: number;
        interaction_type: 'pickup' | 'return' | 'drop' | null;
    };
    confidence: number;
    notes?: string;
    clip_url?: string; 
    violation_severity?: 'low' | 'medium' | 'high'; // Added
}

export interface WorkflowCorrelation {
    order_id: string;
    recipe_id: string;
    step_id: string;
    expected_zone: string;
    actual_events: string[];
    on_time: boolean;
    sequence_ok: boolean;
    deviation: boolean;
    deviation_reason: string | null;
    confidence: number;
}

export interface InventoryImpact {
    item_id: string;
    observed_shortage: boolean;
    shortage_qty: number;
    related_events: string[];
    root_cause: string;
    recommendation: string;
    confidence: number;
}

export interface Bottleneck {
    zone_id: string;
    severity: 'low' | 'medium' | 'high';
    evidence: string[];
    root_cause: string;
    recommendation: string;
    confidence: number;
}

export interface SOPDeviation {
    step_id: string;
    person_id: string;
    deviation_type: string;
    confidence: number;
    explanation: string;
    business_impact: {
        cost_impact_inr: number;
        time_lost_seconds: number;
        quality_risk: 'low' | 'medium' | 'high';
    };
}

export interface Recommendation {
    type: 'staffing' | 'layout' | 'inventory' | 'training' | 'process';
    priority: 'high' | 'medium' | 'low';
    text: string;
    expected_impact: string;
    confidence: number;
}

// API Output Schema (The full response)
export interface CCTVAnalysisResult {
    events: CCTVEvent[];
    workflow_correlations: WorkflowCorrelation[];
    inventory_impact: InventoryImpact[];
    bottlenecks: Bottleneck[];
    sop_deviations: SOPDeviation[];
    performance_scores: {
        kitchen_efficiency: number;
        inventory_health: number;
        congestion_score: number;
        sop_adherence_score: number; // Added
    };
    financial_impact_summary: {
        daily_loss_due_to_errors: number;
        potential_savings: number;
    };
    recommendations: Recommendation[];
    summary_report: string;
    processing_time_ms: number;
    model_version: string;
    warnings: string[];
    
    // Legacy fields mapped for backward compatibility if needed
    heatmap?: Record<string, number>; 
    dwell_times?: Record<string, number>;
}

// Unified AI Schema
export interface UnifiedSchema {
    workflow_analysis: any;
    sop_compliance: { rate: number; violations: any[] };
    inventory_verification: any;
    wastage_root_causes: string[];
    recipe_costing_impact: any;
    profitability_insights: any;
    strategy_plan_7_days: any;
    marketing_assets: any;
    summary: string;
}

// Onboarding State
export interface OnboardingState {
    phaseIdx: number;
    data: Record<string, any>;
    completed: boolean;
}

// Razorpay Types
export interface RazorpayOptions {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    image?: string;
    order_id?: string; // Optional for client-side demo
    handler: (response: RazorpayResponse) => void;
    prefill?: {
        name?: string;
        email?: string;
        contact?: string;
    };
    notes?: Record<string, string>;
    theme?: {
        color?: string;
    };
    modal?: {
        ondismiss?: () => void;
    };
}

export interface RazorpayResponse {
    razorpay_payment_id: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
}

declare global {
    interface Window {
        Razorpay: new (options: RazorpayOptions) => { open: () => void };
    }
}

// Analytics Types
export interface VisitorSession {
    sessionId: string;
    userId?: string;
    userName?: string; // 'Guest' if not logged in
    location: string;
    device: string;
    entryTime: string;
    lastActive: string;
    pagesVisited: string[];
    isOnline: boolean;
    hasAbandonedCheckout: boolean;
}

export interface AnalyticsEvent {
    id: string;
    sessionId: string;
    type: 'PAGE_VIEW' | 'CLICK' | 'CHECKOUT_START' | 'PURCHASE';
    detail: string;
    timestamp: string;
}
