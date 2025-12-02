
export interface Ingredient {
  ingredient_id: string;
  name: string;
  qty?: string;
  qty_per_serving?: number;
  cost_per_unit?: number;
  unit?: string;
  cost_per_serving?: number;
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
    numberOfItems?: number;
    requestDate: string;
    generatedMenu?: string;
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
  
  // Legacy trial fields (deprecated but kept for compatibility)
  queriesUsed?: number;
  queryLimit?: number; 
  isTrial?: boolean;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  RECIPES = 'RECIPES',
  SOP = 'SOP',
  STRATEGY = 'STRATEGY',
  VIDEO = 'VIDEO',
  KITCHEN_WORKFLOW = 'KITCHEN_WORKFLOW',
  MENU_GENERATOR = 'MENU_GENERATOR',
  INTEGRATIONS = 'INTEGRATIONS',
  BILLING = 'BILLING'
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
}

export interface RazorpayResponse {
    razorpay_payment_id: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
}

declare global {
    interface Window {
        Razorpay: new (options: RazorpayOptions) => { open: () => void };
        // aistudio definition removed to avoid conflict with existing global type
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
