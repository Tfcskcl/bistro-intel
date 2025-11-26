
import { RecipeCard, SOP, AppNotification, UserRole, POSChangeRequest, MenuItem, PlanConfig, PlanType, RecipeRequest, SOPRequest } from '../types';
import { MOCK_MENU, MOCK_SALES_DATA, MOCK_INGREDIENT_PRICES, PLANS as DEFAULT_PLANS } from '../constants';
import { ingredientService } from './ingredientService';

const getKey = (userId: string, key: string) => `bistro_${userId}_${key}`;
const PLANS_KEY = 'bistro_system_plans';
const GLOBAL_RECIPE_REQUESTS_KEY = 'bistro_global_recipe_requests';
const GLOBAL_SOP_REQUESTS_KEY = 'bistro_global_sop_requests';

// Seed Notifications for new users (Generic welcome)
const WELCOME_NOTIFICATION: AppNotification = {
    id: 'n_welcome',
    title: 'Welcome to BistroIntelligence',
    message: 'Your dashboard is ready. Go to Data & Integrations to upload your data.',
    type: 'success',
    read: false,
    date: new Date().toISOString()
};

export const storageService = {
    // --- GENERIC HELPERS ---
    getItem: <T>(userId: string, key: string, defaultValue: T): T => {
        const stored = localStorage.getItem(getKey(userId, key));
        return stored ? JSON.parse(stored) : defaultValue;
    },

    setItem: (userId: string, key: string, data: any) => {
        localStorage.setItem(getKey(userId, key), JSON.stringify(data));
    },

    // --- PLANS (SYSTEM WIDE) ---
    getPlans: (): Record<PlanType, PlanConfig> => {
        const stored = localStorage.getItem(PLANS_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
        // Initialize if empty
        localStorage.setItem(PLANS_KEY, JSON.stringify(DEFAULT_PLANS));
        return DEFAULT_PLANS;
    },

    savePlans: (plans: Record<PlanType, PlanConfig>) => {
        localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
    },

    // --- MENU ---
    getMenu: (userId: string): MenuItem[] => {
        return storageService.getItem<MenuItem[]>(userId, 'menu', []);
    },

    saveMenu: (userId: string, menu: MenuItem[]) => {
        storageService.setItem(userId, 'menu', menu);
    },

    // --- SALES DATA ---
    getSalesData: (userId: string): any[] => {
        return storageService.getItem<any[]>(userId, 'sales', []);
    },

    saveSalesData: (userId: string, data: any[]) => {
        storageService.setItem(userId, 'sales', data);
    },

    // --- RECIPES ---
    saveRecipe: (userId: string, recipe: RecipeCard) => {
        const recipes = storageService.getSavedRecipes(userId);
        const existsIndex = recipes.findIndex(r => r.sku_id === recipe.sku_id && r.name === recipe.name);
        if (existsIndex >= 0) {
            recipes[existsIndex] = recipe;
        } else {
            recipes.push(recipe);
        }
        storageService.setItem(userId, 'saved_recipes', recipes);
    },

    getSavedRecipes: (userId: string): RecipeCard[] => {
        return storageService.getItem<RecipeCard[]>(userId, 'saved_recipes', []);
    },

    // --- RECIPE REQUESTS (GLOBAL/ADMIN ACCESS) ---
    getAllRecipeRequests: (): RecipeRequest[] => {
        const stored = localStorage.getItem(GLOBAL_RECIPE_REQUESTS_KEY);
        return stored ? JSON.parse(stored) : [];
    },

    saveRecipeRequest: (request: RecipeRequest) => {
        const requests = storageService.getAllRecipeRequests();
        requests.push(request);
        localStorage.setItem(GLOBAL_RECIPE_REQUESTS_KEY, JSON.stringify(requests));
    },

    updateRecipeRequest: (updatedRequest: RecipeRequest) => {
        const requests = storageService.getAllRecipeRequests();
        const index = requests.findIndex(r => r.id === updatedRequest.id);
        if (index >= 0) {
            requests[index] = updatedRequest;
            localStorage.setItem(GLOBAL_RECIPE_REQUESTS_KEY, JSON.stringify(requests));
        }
    },

    // --- SOPS ---
    saveSOP: (userId: string, sop: SOP) => {
        const sops = storageService.getSavedSOPs(userId);
        const existsIndex = sops.findIndex(s => s.sop_id === sop.sop_id);
        if (existsIndex >= 0) {
            sops[existsIndex] = sop;
        } else {
            sops.push(sop);
        }
        storageService.setItem(userId, 'saved_sops', sops);
    },

    getSavedSOPs: (userId: string): SOP[] => {
        return storageService.getItem<SOP[]>(userId, 'saved_sops', []);
    },

    // --- SOP REQUESTS ---
    getAllSOPRequests: (): SOPRequest[] => {
        const stored = localStorage.getItem(GLOBAL_SOP_REQUESTS_KEY);
        return stored ? JSON.parse(stored) : [];
    },

    saveSOPRequest: (request: SOPRequest) => {
        const requests = storageService.getAllSOPRequests();
        requests.push(request);
        localStorage.setItem(GLOBAL_SOP_REQUESTS_KEY, JSON.stringify(requests));
    },

    updateSOPRequest: (updatedRequest: SOPRequest) => {
        const requests = storageService.getAllSOPRequests();
        const index = requests.findIndex(r => r.id === updatedRequest.id);
        if (index >= 0) {
            requests[index] = updatedRequest;
            localStorage.setItem(GLOBAL_SOP_REQUESTS_KEY, JSON.stringify(requests));
        }
    },

    // --- POS REQUESTS ---
    addPOSChangeRequest: (userId: string, request: POSChangeRequest) => {
        const requests = storageService.getPOSChangeRequests(userId);
        requests.push(request);
        storageService.setItem(userId, 'pos_requests', requests);
    },

    getPOSChangeRequests: (userId: string): POSChangeRequest[] => {
        return storageService.getItem<POSChangeRequest[]>(userId, 'pos_requests', []);
    },

    updatePOSChangeRequest: (userId: string, id: string, status: 'approved' | 'rejected') => {
        const requests = storageService.getPOSChangeRequests(userId);
        const updated = requests.map(r => r.id === id ? { ...r, status } : r);
        storageService.setItem(userId, 'pos_requests', updated);
    },

    // --- NOTIFICATIONS ---
    getNotifications: (userId: string, userRole: UserRole): AppNotification[] => {
        const stored = localStorage.getItem(getKey(userId, 'notifications'));
        let notifications: AppNotification[] = stored ? JSON.parse(stored) : [WELCOME_NOTIFICATION];
        
        // Filter by role (if notification is targeted)
        return notifications.filter(n => !n.role || n.role.includes(userRole)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },

    markAsRead: (userId: string, id: string) => {
        // We get all, update, and save back. Role filtering happens on read.
        const stored = localStorage.getItem(getKey(userId, 'notifications'));
        let notifications: AppNotification[] = stored ? JSON.parse(stored) : [WELCOME_NOTIFICATION];
        
        const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
        storageService.setItem(userId, 'notifications', updated);
    },

    markAllRead: (userId: string, userRole: UserRole) => {
        const stored = localStorage.getItem(getKey(userId, 'notifications'));
        let notifications: AppNotification[] = stored ? JSON.parse(stored) : [WELCOME_NOTIFICATION];
        
        const updated = notifications.map(n => ({ ...n, read: true }));
        storageService.setItem(userId, 'notifications', updated);
    },

    // --- DEMO SEEDING ---
    // Only called for Quick Demo Access users, not new signups
    seedDemoData: (userId: string) => {
        if (!localStorage.getItem(getKey(userId, 'seeded'))) {
            console.log(`Seeding demo data for ${userId}...`);
            storageService.setItem(userId, 'menu', MOCK_MENU);
            storageService.setItem(userId, 'sales', MOCK_SALES_DATA);
            
            // Seed Ingredients via service
            ingredientService.save(userId, MOCK_INGREDIENT_PRICES);

            // Seed a sample SOP
            const sampleSOP: SOP = {
                sop_id: 'demo_sop_1',
                title: 'Daily Opening Checklist',
                scope: 'Front of House & Kitchen',
                prerequisites: 'Staff must be in uniform',
                materials_equipment: ['Keys', 'Tablet', 'Sanitizer'],
                stepwise_procedure: [
                    { step_no: 1, action: 'Disable Alarm', responsible_role: 'Manager', time_limit: '08:00 AM' },
                    { step_no: 2, action: 'Turn on HVAC and Lights', responsible_role: 'Manager' },
                    { step_no: 3, action: 'Check Inventory Deliveries', responsible_role: 'Head Chef' },
                    { step_no: 4, action: 'Boot up POS Terminals', responsible_role: 'Server' }
                ],
                critical_control_points: ['Fridge Temp Check < 4°C'],
                monitoring_checklist: ['Music On', 'Floors Clean', 'Bathrooms Stocked'],
                kpis: ['Opened by 08:30 AM'],
                quick_troubleshooting: 'Call maintenance if HVAC fails'
            };
            storageService.setItem(userId, 'saved_sops', [sampleSOP]);
            
            // Seed sample notifications
            const demoNotifs: AppNotification[] = [
                {
                    id: 'n_demo_1',
                    title: 'Food Cost Alert',
                    message: 'Avocado prices have spiked 15%. Consider adjusting the "Smashed Avo Toast" price.',
                    type: 'warning',
                    read: false,
                    date: new Date().toISOString()
                },
                {
                    id: 'n_demo_2',
                    title: 'Weekly Sales Report',
                    message: 'Revenue is up 12% compared to last week. Great job!',
                    type: 'success',
                    read: false,
                    date: new Date(Date.now() - 86400000).toISOString()
                },
                WELCOME_NOTIFICATION
            ];
            storageService.setItem(userId, 'notifications', demoNotifs);

            localStorage.setItem(getKey(userId, 'seeded'), 'true');
        }
    }
};
