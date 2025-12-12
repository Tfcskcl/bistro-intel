
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

    // --- ACTIVITY LOGGING (NEW) ---
    logActivity: (userId: string, userName: string, actionType: SystemActivity['actionType'], description: string, metadata?: any) => {
        const activity: SystemActivity = {
            id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            userId,
            userName,
            actionType,
            description,
            metadata,
            timestamp: new Date().toISOString()
        };
        
        // Save to global log for Admin
        const storedLog = localStorage.getItem(GLOBAL_ACTIVITY_KEY);
        const log: SystemActivity[] = storedLog ? JSON.parse(storedLog) : [];
        log.unshift(activity); // Add to top
        if (log.length > 500) log.pop(); // Keep limit
        localStorage.setItem(GLOBAL_ACTIVITY_KEY, JSON.stringify(log));
        
        // Also save to user specific log if needed, but global is enough for now
        dispatchDataUpdatedEvent();
    },

    getRecentSystemActivity: (): SystemActivity[] => {
        const storedLog = localStorage.getItem(GLOBAL_ACTIVITY_KEY);
        return storedLog ? JSON.parse(storedLog) : [];
    },

    getUserActivity: (userId: string): SystemActivity[] => {
        const all = storageService.getRecentSystemActivity();
        return all.filter(a => a.userId === userId);
    },

    // --- VISITOR TRACKING (NEW) ---
    getVisitorSessions: (): VisitorSession[] => {
        const stored = localStorage.getItem(VISITOR_SESSIONS_KEY);
        return stored ? JSON.parse(stored) : [];
    },

    saveVisitorSession: (session: VisitorSession) => {
        const sessions = storageService.getVisitorSessions();
        const index = sessions.findIndex(s => s.sessionId === session.sessionId);
        if (index > -1) {
            sessions[index] = session;
        } else {
            sessions.push(session);
        }
        // Keep only recent 100 sessions
        const recentSessions = sessions.slice(-100);
        localStorage.setItem(VISITOR_SESSIONS_KEY, JSON.stringify(recentSessions));
        dispatchDataUpdatedEvent();
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
        storageService.logActivity(userId, 'System', 'SYSTEM', `Recharged ${amount} credits`);
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
        const isNew = index === -1;
        
        if (index >= 0) recipes[index] = recipe; else recipes.push(recipe);
        storageService.setItem(userId, 'saved_recipes', recipes);
        
        // --- AUTOMATION TRIGGERS ---
        // Retrieve current user details for context
        const currentUser = JSON.parse(localStorage.getItem('bistro_current_user_cache') || '{}');
        const userName = currentUser.name || 'User';
        const restaurantName = currentUser.restaurantName || 'Restaurant';

        // 1. Log Activity (Only if it's new or significantly modified)
        if (isNew || !recipe.comments) {
             storageService.logActivity(userId, userName, 'RECIPE', `Saved Recipe: ${recipe.name}`, {
                purpose: recipe.human_summary || 'Standard Menu Item',
                restaurant: restaurantName,
                isNew
            });
        }

        if (isNew) {
            // 2. Auto-Generate SOP Task
            storageService.addTask(
                userId, 
                `Auto-Generate SOP for: ${recipe.name}`, 
                ['SOP', 'Auto-System']
            );
            
            // 3. Auto-Generate Inventory Task
            storageService.addTask(
                userId, 
                `Update Inventory Master for: ${recipe.name}`, 
                ['Inventory', 'Auto-System']
            );

            // Log System Automations
            storageService.logActivity(userId, 'Bistro System', 'SYSTEM', `Auto-triggered SOP & Inventory tasks for ${recipe.name}`, {
                restaurant: restaurantName
            });
        }
    },

    // Share recipe with another user (Collaboration)
    shareRecipeWithUser: (fromUserId: string, fromUserName: string, toUserId: string, recipe: RecipeCard) => {
        try {
            const targetRecipes = storageService.getSavedRecipes(toUserId);
            
            // Create a shared copy with unique ID to avoid conflicts but trace back origin
            const sharedRecipe: RecipeCard = {
                ...recipe,
                sku_id: `${recipe.sku_id}_shared_${Date.now()}`,
                sharedBy: fromUserName,
                sharedDate: new Date().toISOString(),
                comments: []
            };

            const updated = [sharedRecipe, ...targetRecipes];
            storageService.setItem(toUserId, 'saved_recipes', updated);
            
            // Send Notification to recipient
            const notification: AppNotification = {
                id: `notif_share_${Date.now()}`,
                title: 'New Recipe Shared',
                message: `${fromUserName} shared "${recipe.name}" with you.`,
                type: 'success',
                read: false,
                date: new Date().toISOString()
            };
            
            // Since notifications are currently global or by role in this mock, we can just push to global for now
            // In a real app, this would be user-specific. 
            // For this demo, we'll assume the 'Header' component filters correctly or we just use global.
            // Using a hack for demo: Prefix ID with target user ID so we can filter later if needed, 
            // or just rely on the fact that this is a localstorage demo.
            storageService.sendSystemNotification(notification);

            return true;
        } catch (e) {
            console.error("Share failed", e);
            return false;
        }
    },

    addRecipeComment: (userId: string, recipeId: string, comment: RecipeComment) => {
        const recipes = storageService.getSavedRecipes(userId);
        const updatedRecipes = recipes.map(r => {
            if (r.sku_id === recipeId) {
                const comments = r.comments || [];
                return { ...r, comments: [...comments, comment] };
            }
            return r;
        });
        storageService.setItem(userId, 'saved_recipes', updatedRecipes);
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
        
        const user = JSON.parse(localStorage.getItem('bistro_current_user_cache') || '{}');
        storageService.logActivity(userId, user.name || 'User', 'SOP', `Created SOP: ${sop.title}`);
    },

    createTrainingTaskFromDeviation: (userId: string, deviationType: string, explanation: string, staffId: string) => {
        // Create actual task
        storageService.addTask(
            userId,
            `Corrective Training: ${deviationType} for ${staffId}`,
            ['Urgent', 'Kitchen']
        );
        const user = JSON.parse(localStorage.getItem('bistro_current_user_cache') || '{}');
        storageService.logActivity(userId, user.name || 'AI System', 'CCTV', `Flagged ${deviationType} violation`);
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
        
        // Log task creation to global activity for Admin Dashboard
        const currentUser = JSON.parse(localStorage.getItem('bistro_current_user_cache') || '{}');
        const restaurantName = currentUser.restaurantName || 'Unknown';
        const userName = currentUser.name || 'User';

        storageService.logActivity(userId, userName, 'TASK', `Task Created: ${taskText}`, {
            restaurant: restaurantName,
            tags: tags
        });

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
            
            // Seed some activity
            const user = JSON.parse(localStorage.getItem('bistro_current_user_cache') || '{}');
            storageService.logActivity(userId, user.name || 'User', 'LOGIN', 'Account activated');
            storageService.logActivity(userId, user.name || 'User', 'RECIPE', 'Created first recipe');
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
        
        const user = JSON.parse(localStorage.getItem('bistro_current_user_cache') || '{}');
        storageService.logActivity(request.userId, user.name || 'User', 'MENU', `Generated marketing assets`);
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
        
        const user = JSON.parse(localStorage.getItem('bistro_current_user_cache') || '{}');
        storageService.logActivity(request.userId, user.name || 'User', 'LAYOUT', `Requested kitchen workflow`);
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
        
        const user = JSON.parse(localStorage.getItem('bistro_current_user_cache') || '{}');
        storageService.logActivity(request.userId, user.name || 'User', 'MENU', `Generated new menu design`);
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
