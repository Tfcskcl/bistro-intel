import { RecipeCard, SOP, AppNotification, UserRole, POSChangeRequest, MenuItem, PlanConfig, PlanType, RecipeRequest, SOPRequest, MarketingRequest, CreditTransaction, SocialStats, KitchenWorkflowRequest, MenuGenerationRequest, InventoryItem, OnboardingState, Task, SystemActivity, VisitorSession, RecipeComment } from '../types';
import { MOCK_MENU, MOCK_SALES_DATA, MOCK_INGREDIENT_PRICES, MOCK_RECIPES, PLANS as DEFAULT_PLANS } from '../constants';
import { ingredientService } from './ingredientService';

const getKey = (userId: string, key: string) => `bistro_${userId}_${key}`;
const PLANS_KEY = 'bistro_system_plans';
const GLOBAL_NOTIFICATIONS_KEY = 'bistro_global_notifications';
const GLOBAL_ACTIVITY_KEY = 'bistro_system_activity_log';
const VISITOR_SESSIONS_KEY = 'bistro_visitor_sessions';

// Unified Event Names
export const storageEvents = {
  DATA_UPDATED: "bistroconnect-data-updated",
};

// Dispatch Helper
export function dispatchDataUpdatedEvent() {
  window.dispatchEvent(new CustomEvent(storageEvents.DATA_UPDATED));
}

// --- INDEXED DB HELPER (For Large Data) ---
const DB_NAME = 'BistroDB';
const STORE_NAME = 'bistro_store';
let dbPromise: Promise<IDBDatabase> | null = null;

const getDB = () => {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1);
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    return dbPromise;
};

const idbGet = async <T>(key: string): Promise<T | null> => {
    try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result !== undefined ? req.result : null);
            req.onerror = () => reject(req.error);
        });
    } catch (e) { 
        console.warn("IDB Get Error", e); 
        return null; 
    }
};

const idbSet = async (key: string, val: any) => {
    try {
        const db = await getDB();
        return new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.put(val, key);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    } catch (e) { console.warn("IDB Set Error", e); }
};

const WELCOME_NOTIFICATION: AppNotification = {
    id: 'n_welcome',
    title: 'Welcome to BistroIntelligence',
    message: 'Your dashboard is ready. Complete onboarding to unlock full power.',
    type: 'success',
    read: false,
    date: new Date().toISOString()
};

// Helper to get future date
const getFutureDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
};

const MOCK_INVENTORY: InventoryItem[] = [
    { id: 'inv_1', name: 'Arborio Rice', category: 'Dry Goods', currentStock: 12, unit: 'kg', costPerUnit: 300, parLevel: 10, supplier: 'Metro Cash & Carry', lastUpdated: new Date().toISOString(), expiryDate: getFutureDate(180) },
    { id: 'inv_2', name: 'Truffle Oil', category: 'Pantry', currentStock: 0.5, unit: 'l', costPerUnit: 1800, parLevel: 1, supplier: 'Gourmet Imports', lastUpdated: new Date().toISOString(), expiryDate: getFutureDate(90) },
    { id: 'inv_3', name: 'Chicken Breast', category: 'Meat', currentStock: 15, unit: 'kg', costPerUnit: 250, parLevel: 20, supplier: 'Fresh Meats Co', lastUpdated: new Date().toISOString(), expiryDate: getFutureDate(3) }, // Expiring soon
    { id: 'inv_4', name: 'Heavy Cream', category: 'Dairy', currentStock: 5, unit: 'l', costPerUnit: 220, parLevel: 8, supplier: 'Milky Way', lastUpdated: new Date().toISOString(), expiryDate: getFutureDate(5) },
];

export const storageService = {
    // --- GENERIC HELPERS (LocalStorage) ---
    getItem: <T>(userId: string, key: string, defaultValue: T): T => {
        try {
            const stored = localStorage.getItem(getKey(userId, key));
            return stored ? JSON.parse(stored) : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    },

    setItem: (userId: string, key: string, data: any) => {
        try {
            localStorage.setItem(getKey(userId, key), JSON.stringify(data));
            dispatchDataUpdatedEvent();
        } catch (e: any) {
            console.warn("LocalStorage Full. Switching to IDB for this item might be required.");
            throw e;
        }
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
        
        // Clear IDB
        const req = indexedDB.deleteDatabase(DB_NAME);
        req.onsuccess = () => window.location.reload();
    },

    // --- ACTIVITY LOGGING ---
    logActivity: (userId: string, userName: string, actionType: SystemActivity['actionType'], description: string, metadata?: any) => {
        try {
            const activity: SystemActivity = {
                id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                userId,
                userName,
                actionType,
                description,
                metadata,
                timestamp: new Date().toISOString()
            };
            
            const storedLog = localStorage.getItem(GLOBAL_ACTIVITY_KEY);
            const log: SystemActivity[] = storedLog ? JSON.parse(storedLog) : [];
            log.unshift(activity);
            if (log.length > 200) log.pop();
            localStorage.setItem(GLOBAL_ACTIVITY_KEY, JSON.stringify(log));
            
            dispatchDataUpdatedEvent();
        } catch (e) {
            console.warn("Activity log skipped (storage full)");
        }
    },

    getRecentSystemActivity: (): SystemActivity[] => {
        const storedLog = localStorage.getItem(GLOBAL_ACTIVITY_KEY);
        return storedLog ? JSON.parse(storedLog) : [];
    },

    getUserActivity: (userId: string): SystemActivity[] => {
        const all = storageService.getRecentSystemActivity();
        return all.filter(a => a.userId === userId);
    },

    // --- VISITOR TRACKING ---
    getVisitorSessions: (): VisitorSession[] => {
        const stored = localStorage.getItem(VISITOR_SESSIONS_KEY);
        return stored ? JSON.parse(stored) : [];
    },

    saveVisitorSession: (session: VisitorSession) => {
        try {
            const sessions = storageService.getVisitorSessions();
            const index = sessions.findIndex(s => s.sessionId === session.sessionId);
            if (index > -1) {
                sessions[index] = session;
            } else {
                sessions.push(session);
            }
            const recentSessions = sessions.slice(-50);
            localStorage.setItem(VISITOR_SESSIONS_KEY, JSON.stringify(recentSessions));
            dispatchDataUpdatedEvent();
        } catch (e) {
            console.warn("Visitor session skipped (storage full)");
        }
    },

    // --- PLANS & CREDITS ---
    getPlans: (): Record<PlanType, PlanConfig> => {
        const stored = localStorage.getItem(PLANS_KEY);
        return stored ? JSON.parse(stored) : DEFAULT_PLANS;
    },

    getUserCredits: (userId: string): number => {
        return storageService.getItem<number>(userId, 'credits_balance', 0);
    },

    saveUserCredits: (userId: string, credits: number) => {
        storageService.setItem(userId, 'credits_balance', credits);
    },

    getUserUsage: (userId: string): { recipes: number; menus: number; sops: number; lastReset: string } => {
        const defaultUsage = { recipes: 0, menus: 0, sops: 0, lastReset: new Date().toISOString() };
        return storageService.getItem(userId, 'monthly_usage', defaultUsage);
    },

    incrementUsage: (userId: string, type: 'recipes' | 'menus' | 'sops') => {
        const usage = storageService.getUserUsage(userId);
        const lastReset = new Date(usage.lastReset);
        const now = new Date();
        if (lastReset.getMonth() !== now.getMonth()) {
            usage.recipes = 0;
            usage.menus = 0;
            usage.sops = 0;
            usage.lastReset = now.toISOString();
        }
        usage[type] += 1;
        storageService.setItem(userId, 'monthly_usage', usage);
        return usage[type];
    },

    shouldChargeCredits: (userId: string, type: 'recipes' | 'menus' | 'sops'): boolean => {
        const user = JSON.parse(localStorage.getItem('bistro_current_user_cache') || '{}');
        const plan = DEFAULT_PLANS[user.plan as PlanType] || DEFAULT_PLANS[PlanType.FREE];
        const usage = storageService.getUserUsage(userId);
        const lastReset = new Date(usage.lastReset);
        const now = new Date();
        if (lastReset.getMonth() !== now.getMonth()) return false;
        return usage[type] >= plan.limits[type];
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
        storageService.logActivity(userId, 'System', 'SYSTEM', `Recharged ${amount} credits`);
    },

    // --- RECIPES (Using IDB for Heavy Data) ---
    getSavedRecipesAsync: async (userId: string): Promise<RecipeCard[]> => {
        const key = getKey(userId, 'saved_recipes');
        let recipes = await idbGet<RecipeCard[]>(key);
        
        // Migration: Check LocalStorage if IDB empty
        if (!recipes) {
            const local = localStorage.getItem(key);
            if (local) {
                recipes = JSON.parse(local);
                await idbSet(key, recipes);
                localStorage.removeItem(key); // Free up space
            }
        }
        return recipes || [];
    },

    saveRecipeAsync: async (userId: string, recipe: RecipeCard) => {
        const recipes = await storageService.getSavedRecipesAsync(userId);
        const index = recipes.findIndex(r => r.sku_id === recipe.sku_id);
        const isNew = index === -1;
        
        if (index >= 0) recipes[index] = recipe; else recipes.push(recipe);
        
        const key = getKey(userId, 'saved_recipes');
        await idbSet(key, recipes);
        dispatchDataUpdatedEvent();

        // Automations
        const currentUser = JSON.parse(localStorage.getItem('bistro_current_user_cache') || '{}');
        if (isNew || !recipe.comments) {
             storageService.logActivity(userId, currentUser.name || 'User', 'RECIPE', `Saved Recipe: ${recipe.name}`, {
                purpose: recipe.human_summary || 'Standard Menu Item',
                isNew
            });
        }
    },

    deleteRecipeAsync: async (userId: string, skuId: string) => {
        const recipes = await storageService.getSavedRecipesAsync(userId);
        const updated = recipes.filter(r => r.sku_id !== skuId);
        const key = getKey(userId, 'saved_recipes');
        await idbSet(key, updated);
        dispatchDataUpdatedEvent();
    },

    getSavedRecipes: (userId: string): RecipeCard[] => {
        // Fallback for synchronous calls (might return empty until migrated)
        // Ideally components should switch to getSavedRecipesAsync
        return [];
    },

    saveRecipe: (userId: string, recipe: RecipeCard) => {
        // Sync fallback - redirects to async but doesn't wait
        storageService.saveRecipeAsync(userId, recipe);
    },

    // --- OTHER HEAVY ASSETS (IDB) ---
    
    // Marketing
    getAllMarketingRequestsAsync: async (): Promise<MarketingRequest[]> => {
        const key = 'bistro_marketing_requests';
        let reqs = await idbGet<MarketingRequest[]>(key);
        if (!reqs) {
            const local = localStorage.getItem(key);
            if (local) {
                reqs = JSON.parse(local);
                await idbSet(key, reqs);
                localStorage.removeItem(key);
            }
        }
        return reqs || [];
    },
    saveMarketingRequestAsync: async (request: MarketingRequest) => {
        const list = await storageService.getAllMarketingRequestsAsync();
        list.push(request);
        await idbSet('bistro_marketing_requests', list);
        dispatchDataUpdatedEvent();
    },
    deleteMarketingRequestAsync: async (id: string) => {
        const list = await storageService.getAllMarketingRequestsAsync();
        const filtered = list.filter(r => r.id !== id);
        await idbSet('bistro_marketing_requests', filtered);
        dispatchDataUpdatedEvent();
    },
    getAllMarketingRequests: () => [], // Deprecated sync
    saveMarketingRequest: (r: MarketingRequest) => storageService.saveMarketingRequestAsync(r),
    deleteMarketingRequest: (id: string) => storageService.deleteMarketingRequestAsync(id),

    // Kitchen Workflow
    getAllKitchenWorkflowRequestsAsync: async (): Promise<KitchenWorkflowRequest[]> => {
        const key = 'bistro_kitchen_requests';
        let reqs = await idbGet<KitchenWorkflowRequest[]>(key);
        if (!reqs) {
            const local = localStorage.getItem(key);
            if (local) {
                reqs = JSON.parse(local);
                await idbSet(key, reqs);
                localStorage.removeItem(key);
            }
        }
        return reqs || [];
    },
    saveKitchenWorkflowRequestAsync: async (request: KitchenWorkflowRequest) => {
        const list = await storageService.getAllKitchenWorkflowRequestsAsync();
        list.push(request);
        await idbSet('bistro_kitchen_requests', list);
    },
    updateKitchenWorkflowRequestAsync: async (request: KitchenWorkflowRequest) => {
        const list = await storageService.getAllKitchenWorkflowRequestsAsync();
        const updated = list.map(r => r.id === request.id ? request : r);
        await idbSet('bistro_kitchen_requests', updated);
    },
    getAllKitchenWorkflowRequests: () => [], // Deprecated
    saveKitchenWorkflowRequest: (r: KitchenWorkflowRequest) => storageService.saveKitchenWorkflowRequestAsync(r),
    updateKitchenWorkflowRequest: (r: KitchenWorkflowRequest) => storageService.updateKitchenWorkflowRequestAsync(r),

    // Menu Generation
    getAllMenuGenerationRequestsAsync: async (): Promise<MenuGenerationRequest[]> => {
        const key = 'bistro_menu_requests';
        let reqs = await idbGet<MenuGenerationRequest[]>(key);
        if (!reqs) {
            const local = localStorage.getItem(key);
            if (local) {
                reqs = JSON.parse(local);
                await idbSet(key, reqs);
                localStorage.removeItem(key);
            }
        }
        return reqs || [];
    },
    saveMenuGenerationRequestAsync: async (request: MenuGenerationRequest) => {
        const list = await storageService.getAllMenuGenerationRequestsAsync();
        list.push(request);
        await idbSet('bistro_menu_requests', list);
    },
    getAllMenuGenerationRequests: () => [], // Deprecated
    saveMenuGenerationRequest: (r: MenuGenerationRequest) => storageService.saveMenuGenerationRequestAsync(r),

    // SOPs (Moving to IDB for consistency)
    getSavedSOPsAsync: async (userId: string): Promise<SOP[]> => {
        const key = getKey(userId, 'saved_sops');
        let sops = await idbGet<SOP[]>(key);
        if (!sops) {
            const local = localStorage.getItem(key);
            if (local) {
                sops = JSON.parse(local);
                await idbSet(key, sops);
                localStorage.removeItem(key);
            }
        }
        return sops || [];
    },
    saveSOPAsync: async (userId: string, sop: SOP) => {
        const sops = await storageService.getSavedSOPsAsync(userId);
        const index = sops.findIndex(s => s.sop_id === sop.sop_id);
        if (index >= 0) sops[index] = sop; else sops.push(sop);
        await idbSet(getKey(userId, 'saved_sops'), sops);
    },
    getSavedSOPs: (userId: string) => [], // Deprecated
    saveSOP: (userId: string, sop: SOP) => storageService.saveSOPAsync(userId, sop),

    // --- STANDARD SYNC DATA (LocalStorage OK) ---
    
    // Inventory
    getInventory: (userId: string): InventoryItem[] => storageService.getItem(userId, 'inventory', []),
    saveInventory: (userId: string, items: InventoryItem[]) => storageService.setItem(userId, 'inventory', items),

    // Sales
    getSalesData: (userId: string): any[] => storageService.getItem(userId, 'sales', []),
    saveSalesData: (userId: string, data: any[]) => storageService.setItem(userId, 'sales', data),

    // Tasks
    getTasks: (userId: string): Task[] => storageService.getItem(userId, 'tasks', []),
    saveTasks: (userId: string, tasks: Task[]) => storageService.setItem(userId, 'tasks', tasks),
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
    },

    // --- COLLABORATION ---
    shareRecipeWithUser: async (fromUserId: string, fromUserName: string, toUserId: string, recipe: RecipeCard) => {
        try {
            const targetRecipes = await storageService.getSavedRecipesAsync(toUserId);
            const sharedRecipe: RecipeCard = {
                ...recipe,
                sku_id: `${recipe.sku_id}_shared_${Date.now()}`,
                sharedBy: fromUserName,
                sharedDate: new Date().toISOString(),
                comments: []
            };
            targetRecipes.unshift(sharedRecipe);
            await idbSet(getKey(toUserId, 'saved_recipes'), targetRecipes);
            
            storageService.sendSystemNotification({
                id: `notif_share_${Date.now()}`,
                title: 'New Recipe Shared',
                message: `${fromUserName} shared "${recipe.name}" with you.`,
                type: 'success',
                read: false,
                date: new Date().toISOString()
            });
            return true;
        } catch (e) {
            console.error("Share failed", e);
            return false;
        }
    },

    addRecipeComment: async (userId: string, recipeId: string, comment: RecipeComment) => {
        const recipes = await storageService.getSavedRecipesAsync(userId);
        const updatedRecipes = recipes.map(r => {
            if (r.sku_id === recipeId) {
                const comments = r.comments || [];
                return { ...r, comments: [...comments, comment] };
            }
            return r;
        });
        await idbSet(getKey(userId, 'saved_recipes'), updatedRecipes);
        dispatchDataUpdatedEvent();
    },

    // --- NOTIFICATIONS & REQUESTS ---
    sendSystemNotification: (notification: AppNotification) => {
        try {
            const stored = localStorage.getItem(GLOBAL_NOTIFICATIONS_KEY);
            const list = stored ? JSON.parse(stored) : [];
            list.push(notification);
            if (list.length > 50) list.shift();
            localStorage.setItem(GLOBAL_NOTIFICATIONS_KEY, JSON.stringify(list));
            dispatchDataUpdatedEvent();
        } catch (e) { console.warn("Notification dropped"); }
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

    getAllSOPRequests: (): SOPRequest[] => {
        // Mock simple storage for requests
        return storageService.getItem('admin', 'sop_requests', []);
    },

    getPOSChangeRequests: (userId: string): POSChangeRequest[] => {
        return storageService.getItem(userId, 'pos_requests', []);
    },
    updatePOSChangeRequest: (userId: string, requestId: string, action: string) => {
        const requests = storageService.getPOSChangeRequests(userId);
        const updated = requests.map(r => r.id === requestId ? { ...r, status: action as any } : r);
        storageService.setItem(userId, 'pos_requests', updated);
    },

    getSocialStats: (userId: string): SocialStats[] => {
        return storageService.getItem(userId, 'social_stats', []);
    },
    saveSocialStats: (userId: string, stats: SocialStats[]) => {
        storageService.setItem(userId, 'social_stats', stats);
    },

    getInvoices: (userId: string): any[] => {
        return storageService.getItem(userId, 'invoices', []);
    },
    addInvoice: (userId: string, invoice: any) => {
        const invoices = storageService.getInvoices(userId);
        invoices.unshift(invoice);
        storageService.setItem(userId, 'invoices', invoices);
    },
    
    // --- DEMO SEEDING ---
    seedDemoData: async (userId: string) => {
        if (!localStorage.getItem(getKey(userId, 'seeded'))) {
            storageService.setItem(userId, 'menu', MOCK_MENU);
            storageService.setItem(userId, 'sales', MOCK_SALES_DATA);
            storageService.setItem(userId, 'inventory', MOCK_INVENTORY);
            ingredientService.seedDefaults(userId);
            
            // Seed heavy items to IDB
            await idbSet(getKey(userId, 'saved_recipes'), MOCK_RECIPES);
            
            localStorage.setItem(getKey(userId, 'seeded'), 'true');
        }
    },
    getOnboardingState: (userId: string): OnboardingState => {
        return storageService.getItem<OnboardingState>(userId, 'onboarding', { phaseIdx: 0, data: {}, completed: false });
    },
    saveOnboardingState: (userId: string, state: OnboardingState) => {
        storageService.setItem(userId, 'onboarding', state);
    }
};
