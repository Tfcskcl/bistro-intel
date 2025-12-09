import { RecipeCard, SOP, AppNotification, UserRole, POSChangeRequest, MenuItem, PlanConfig, PlanType, RecipeRequest, SOPRequest, MarketingRequest, CreditTransaction, SocialStats, KitchenWorkflowRequest, MenuGenerationRequest, InventoryItem, OnboardingState, Task } from '../types';
import { MOCK_MENU, MOCK_SALES_DATA, MOCK_INGREDIENT_PRICES, MOCK_RECIPES, PLANS as DEFAULT_PLANS } from '../constants';
import { ingredientService } from './ingredientService';

const getKey = (userId: string, key: string) => `bistro_${userId}_${key}`;
const PLANS_KEY = 'bistro_system_plans';
const GLOBAL_NOTIFICATIONS_KEY = 'bistro_global_notifications';

// Unified Event Names
export const storageEvents = {
  DATA_UPDATED: "bistroconnect-data-updated",
};

// Dispatch Helper
export function dispatchDataUpdatedEvent() {
  window.dispatchEvent(new CustomEvent(storageEvents.DATA_UPDATED));
}

const WELCOME_NOTIFICATION: AppNotification = {
    id: 'n_welcome',
    title: 'Welcome to BistroIntelligence',
    message: 'Your dashboard is ready. Complete onboarding to unlock full power.',
    type: 'success',
    read: false,
    date: new Date().toISOString()
};

const MOCK_INVENTORY: InventoryItem[] = [
    { id: 'inv_1', name: 'Arborio Rice', category: 'Dry Goods', currentStock: 12, unit: 'kg', costPerUnit: 300, parLevel: 10, supplier: 'Metro Cash & Carry', lastUpdated: new Date().toISOString() },
    { id: 'inv_2', name: 'Truffle Oil', category: 'Pantry', currentStock: 0.5, unit: 'l', costPerUnit: 1800, parLevel: 1, supplier: 'Gourmet Imports', lastUpdated: new Date().toISOString() },
    { id: 'inv_3', name: 'Chicken Breast', category: 'Meat', currentStock: 15, unit: 'kg', costPerUnit: 250, parLevel: 20, supplier: 'Fresh Meats Co', lastUpdated: new Date().toISOString() },
];

export const storageService = {
    // --- GENERIC HELPERS ---
    getItem: <T>(userId: string, key: string, defaultValue: T): T => {
        try {
            const stored = localStorage.getItem(getKey(userId, key));
            return stored ? JSON.parse(stored) : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    },

    setItem: (userId: string, key: string, data: any) => {
        localStorage.setItem(getKey(userId, key), JSON.stringify(data));
        dispatchDataUpdatedEvent(); // Notify listeners
    },

    clearAllData: () => {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('bistro_') || key === 'theme')) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
        window.location.reload();
    },

    // --- ONBOARDING ---
    getOnboardingState: (userId: string): OnboardingState => {
        return storageService.getItem<OnboardingState>(userId, 'onboarding', { phaseIdx: 0, data: {}, completed: false });
    },

    saveOnboardingState: (userId: string, state: OnboardingState) => {
        storageService.setItem(userId, 'onboarding', state);
    },

    // --- PLANS ---
    getPlans: (): Record<PlanType, PlanConfig> => {
        const stored = localStorage.getItem(PLANS_KEY);
        return stored ? JSON.parse(stored) : DEFAULT_PLANS;
    },

    // --- CREDITS ---
    getUserCredits: (userId: string): number => {
        return storageService.getItem<number>(userId, 'credits_balance', 0);
    },

    saveUserCredits: (userId: string, credits: number) => {
        storageService.setItem(userId, 'credits_balance', credits);
    },

    deductCredits: (userId: string, amount: number, description: string): boolean => {
        const current = storageService.getUserCredits(userId);
        if (current < amount) return false;
        
        const newBalance = current - amount;
        storageService.saveUserCredits(userId, newBalance);
        return true;
    },

    addCredits: (userId: string, amount: number, description: string) => {
        const current = storageService.getUserCredits(userId);
        storageService.saveUserCredits(userId, current + amount);
    },

    // --- INVENTORY ---
    getInventory: (userId: string): InventoryItem[] => {
        return storageService.getItem<InventoryItem[]>(userId, 'inventory', []);
    },

    saveInventory: (userId: string, items: InventoryItem[]) => {
        storageService.setItem(userId, 'inventory', items);
    },

    // --- KITCHEN ZONES ---
    getKitchenZones: (userId: string): any[] => {
        return storageService.getItem<any[]>(userId, 'kitchen_zones', []);
    },

    saveKitchenZones: (userId: string, zones: any[]) => {
        storageService.setItem(userId, 'kitchen_zones', zones);
    },

    // --- MENU ---
    getMenu: (userId: string): MenuItem[] => {
        return storageService.getItem<MenuItem[]>(userId, 'menu', []);
    },

    saveMenu: (userId: string, menu: MenuItem[]) => {
        storageService.setItem(userId, 'menu', menu);
    },

    // --- SALES ---
    getSalesData: (userId: string): any[] => {
        return storageService.getItem<any[]>(userId, 'sales', []);
    },

    saveSalesData: (userId: string, data: any[]) => {
        // Trigger Inventory Depletion Logic (Mock)
        const inventory = storageService.getInventory(userId);
        if (inventory.length > 0) {
            const updatedInv = inventory.map(i => ({...i, currentStock: Math.max(0, i.currentStock - (Math.random() * 0.5))}));
            storageService.saveInventory(userId, updatedInv);
        }
        storageService.setItem(userId, 'sales', data);
    },

    // --- RECIPES ---
    getSavedRecipes: (userId: string): RecipeCard[] => {
        return storageService.getItem<RecipeCard[]>(userId, 'saved_recipes', []);
    },

    saveRecipe: (userId: string, recipe: RecipeCard) => {
        const recipes = storageService.getSavedRecipes(userId);
        const index = recipes.findIndex(r => r.sku_id === recipe.sku_id);
        if (index >= 0) recipes[index] = recipe; else recipes.push(recipe);
        storageService.setItem(userId, 'saved_recipes', recipes);
    },

    // --- SOPS ---
    getSavedSOPs: (userId: string): SOP[] => {
        return storageService.getItem<SOP[]>(userId, 'saved_sops', []);
    },

    saveSOP: (userId: string, sop: SOP) => {
        const sops = storageService.getSavedSOPs(userId);
        const index = sops.findIndex(s => s.sop_id === sop.sop_id);
        if (index >= 0) sops[index] = sop; else sops.push(sop);
        storageService.setItem(userId, 'saved_sops', sops);
    },

    createTrainingTaskFromDeviation: (userId: string, deviationType: string, explanation: string, staffId: string) => {
        // Create actual task
        storageService.addTask(
            userId,
            `Corrective Training: ${deviationType} for ${staffId}`,
            ['Urgent', 'Kitchen']
        );
    },

    // --- TASKS ---
    getTasks: (userId: string): Task[] => {
        return storageService.getItem<Task[]>(userId, 'tasks', []);
    },

    saveTasks: (userId: string, tasks: Task[]) => {
        storageService.setItem(userId, 'tasks', tasks);
    },

    addTask: (userId: string, taskText: string, tags: string[] = ['Auto-Generated']) => {
        const tasks = storageService.getTasks(userId);
        const newTask: Task = {
            id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            text: taskText,
            completed: false,
            tags: tags,
            createdAt: new Date().toISOString()
        };
        tasks.unshift(newTask);
        storageService.saveTasks(userId, tasks);
        // Optional: Notify via system notification
        storageService.sendSystemNotification({
            id: `notif_${Date.now()}`,
            title: 'New Task Auto-Created',
            message: taskText,
            type: 'info',
            read: false,
            date: new Date().toISOString()
        });
    },

    // --- NOTIFICATIONS ---
    sendSystemNotification: (notification: AppNotification) => {
        const stored = localStorage.getItem(GLOBAL_NOTIFICATIONS_KEY);
        const list = stored ? JSON.parse(stored) : [];
        list.push(notification);
        localStorage.setItem(GLOBAL_NOTIFICATIONS_KEY, JSON.stringify(list));
        dispatchDataUpdatedEvent();
    },

    getNotifications: (userId: string, userRole: UserRole): AppNotification[] => {
        const storedGlobal = localStorage.getItem(GLOBAL_NOTIFICATIONS_KEY);
        let notifications: AppNotification[] = storedGlobal ? JSON.parse(storedGlobal) : [WELCOME_NOTIFICATION];
        return notifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },

    markAsRead: (userId: string, notificationId: string) => {
        const storedGlobal = localStorage.getItem(GLOBAL_NOTIFICATIONS_KEY);
        let notifications: AppNotification[] = storedGlobal ? JSON.parse(storedGlobal) : [];
        notifications = notifications.map(n => n.id === notificationId ? { ...n, read: true } : n);
        localStorage.setItem(GLOBAL_NOTIFICATIONS_KEY, JSON.stringify(notifications));
        dispatchDataUpdatedEvent();
    },

    markAllRead: (userId: string, role: UserRole) => {
        const storedGlobal = localStorage.getItem(GLOBAL_NOTIFICATIONS_KEY);
        let notifications: AppNotification[] = storedGlobal ? JSON.parse(storedGlobal) : [];
        notifications = notifications.map(n => ({ ...n, read: true }));
        localStorage.setItem(GLOBAL_NOTIFICATIONS_KEY, JSON.stringify(notifications));
        dispatchDataUpdatedEvent();
    },

    // --- DEMO SEEDING ---
    seedDemoData: (userId: string) => {
        if (!localStorage.getItem(getKey(userId, 'seeded'))) {
            storageService.setItem(userId, 'menu', MOCK_MENU);
            storageService.setItem(userId, 'saved_recipes', MOCK_RECIPES);
            storageService.setItem(userId, 'sales', MOCK_SALES_DATA);
            storageService.setItem(userId, 'inventory', MOCK_INVENTORY);
            ingredientService.seedDefaults(userId);
            localStorage.setItem(getKey(userId, 'seeded'), 'true');
        }
    },

    // --- REQUESTS & EXTRAS ---
    getAllRecipeRequests: (): RecipeRequest[] => [],
    updateRecipeRequest: (request: RecipeRequest) => {},
    
    getAllSOPRequests: (): SOPRequest[] => [],
    
    getAllMarketingRequests: (): MarketingRequest[] => {
        const stored = localStorage.getItem('bistro_marketing_requests');
        return stored ? JSON.parse(stored) : [];
    },
    saveMarketingRequest: (request: MarketingRequest) => {
        const stored = localStorage.getItem('bistro_marketing_requests');
        const list = stored ? JSON.parse(stored) : [];
        list.push(request);
        localStorage.setItem('bistro_marketing_requests', JSON.stringify(list));
    },
    deleteMarketingRequest: (id: string) => {
        const stored = localStorage.getItem('bistro_marketing_requests');
        let list: MarketingRequest[] = stored ? JSON.parse(stored) : [];
        list = list.filter(r => r.id !== id);
        localStorage.setItem('bistro_marketing_requests', JSON.stringify(list));
    },

    getAllKitchenWorkflowRequests: (): KitchenWorkflowRequest[] => {
        const stored = localStorage.getItem('bistro_kitchen_requests');
        return stored ? JSON.parse(stored) : [];
    },
    saveKitchenWorkflowRequest: (request: KitchenWorkflowRequest) => {
        const stored = localStorage.getItem('bistro_kitchen_requests');
        const list = stored ? JSON.parse(stored) : [];
        list.push(request);
        localStorage.setItem('bistro_kitchen_requests', JSON.stringify(list));
    },
    updateKitchenWorkflowRequest: (request: KitchenWorkflowRequest) => {
        const stored = localStorage.getItem('bistro_kitchen_requests');
        let list: KitchenWorkflowRequest[] = stored ? JSON.parse(stored) : [];
        list = list.map(r => r.id === request.id ? request : r);
        localStorage.setItem('bistro_kitchen_requests', JSON.stringify(list));
    },

    getAllMenuGenerationRequests: (): MenuGenerationRequest[] => {
        const stored = localStorage.getItem('bistro_menu_requests');
        return stored ? JSON.parse(stored) : [];
    },
    saveMenuGenerationRequest: (request: MenuGenerationRequest) => {
        const stored = localStorage.getItem('bistro_menu_requests');
        const list = stored ? JSON.parse(stored) : [];
        list.push(request);
        localStorage.setItem('bistro_menu_requests', JSON.stringify(list));
    },

    getPOSChangeRequests: (userId: string): POSChangeRequest[] => {
        return storageService.getItem<POSChangeRequest[]>(userId, 'pos_requests', []);
    },
    updatePOSChangeRequest: (userId: string, requestId: string, action: string) => {
        const requests = storageService.getPOSChangeRequests(userId);
        const updated = requests.map(r => r.id === requestId ? { ...r, status: action as any } : r);
        storageService.setItem(userId, 'pos_requests', updated);
    },

    getSocialStats: (userId: string): SocialStats[] => {
        return storageService.getItem<SocialStats[]>(userId, 'social_stats', []);
    },
    saveSocialStats: (userId: string, stats: SocialStats[]) => {
        storageService.setItem(userId, 'social_stats', stats);
    },

    getInvoices: (userId: string): any[] => {
        return storageService.getItem<any[]>(userId, 'invoices', []);
    },
    addInvoice: (userId: string, invoice: any) => {
        const invoices = storageService.getInvoices(userId);
        invoices.unshift(invoice);
        storageService.setItem(userId, 'invoices', invoices);
    },
};