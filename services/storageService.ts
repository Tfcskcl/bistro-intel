import { RecipeCard, SOP, AppNotification, UserRole, POSChangeRequest } from '../types';

const RECIPES_KEY = 'bistro_saved_recipes';
const SOPS_KEY = 'bistro_saved_sops';
const NOTIFICATIONS_KEY = 'bistro_notifications';
const POS_REQUESTS_KEY = 'bistro_pos_requests';

// Seed Notifications
const SEED_NOTIFICATIONS: AppNotification[] = [
    {
        id: 'n1',
        title: 'Welcome to BistroIntelligence',
        message: 'Your dashboard is ready. Connect data to get started.',
        type: 'success',
        read: false,
        date: new Date().toISOString()
    },
    {
        id: 'n2',
        title: 'Low Inventory Alert',
        message: 'Acai Puree stock is below 10%. Reorder recommended.',
        type: 'warning',
        read: false,
        date: new Date().toISOString(),
        role: [UserRole.ADMIN, UserRole.OWNER]
    },
    {
        id: 'n3',
        title: 'New Subscriber',
        message: 'Cafe Mocha (Mumbai) just subscribed to Pro+ plan.',
        type: 'info',
        read: false,
        date: new Date().toISOString(),
        role: [UserRole.SUPER_ADMIN]
    }
];

export const storageService = {
    // --- RECIPES ---
    saveRecipe: (recipe: RecipeCard) => {
        const stored = localStorage.getItem(RECIPES_KEY);
        const recipes: RecipeCard[] = stored ? JSON.parse(stored) : [];
        // Check if exists/overwrite or push
        const existsIndex = recipes.findIndex(r => r.sku_id === recipe.sku_id && r.name === recipe.name);
        if (existsIndex >= 0) {
            recipes[existsIndex] = recipe;
        } else {
            recipes.push(recipe);
        }
        localStorage.setItem(RECIPES_KEY, JSON.stringify(recipes));
    },

    getSavedRecipes: (): RecipeCard[] => {
        const stored = localStorage.getItem(RECIPES_KEY);
        return stored ? JSON.parse(stored) : [];
    },

    // --- SOPS ---
    saveSOP: (sop: SOP) => {
        const stored = localStorage.getItem(SOPS_KEY);
        const sops: SOP[] = stored ? JSON.parse(stored) : [];
        const existsIndex = sops.findIndex(s => s.sop_id === sop.sop_id);
        if (existsIndex >= 0) {
            sops[existsIndex] = sop;
        } else {
            sops.push(sop);
        }
        localStorage.setItem(SOPS_KEY, JSON.stringify(sops));
    },

    getSavedSOPs: (): SOP[] => {
        const stored = localStorage.getItem(SOPS_KEY);
        return stored ? JSON.parse(stored) : [];
    },

    // --- POS REQUESTS ---
    addPOSChangeRequest: (request: POSChangeRequest) => {
        const stored = localStorage.getItem(POS_REQUESTS_KEY);
        const requests: POSChangeRequest[] = stored ? JSON.parse(stored) : [];
        requests.push(request);
        localStorage.setItem(POS_REQUESTS_KEY, JSON.stringify(requests));
    },

    getPOSChangeRequests: (): POSChangeRequest[] => {
        const stored = localStorage.getItem(POS_REQUESTS_KEY);
        return stored ? JSON.parse(stored) : [];
    },

    updatePOSChangeRequest: (id: string, status: 'approved' | 'rejected') => {
        const stored = localStorage.getItem(POS_REQUESTS_KEY);
        if (stored) {
            let requests: POSChangeRequest[] = JSON.parse(stored);
            requests = requests.map(r => r.id === id ? { ...r, status } : r);
            localStorage.setItem(POS_REQUESTS_KEY, JSON.stringify(requests));
        }
    },

    // --- NOTIFICATIONS ---
    getNotifications: (userRole: UserRole): AppNotification[] => {
        const stored = localStorage.getItem(NOTIFICATIONS_KEY);
        let notifications: AppNotification[] = stored ? JSON.parse(stored) : SEED_NOTIFICATIONS;
        
        // Save seed if first run
        if (!stored) {
            localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(SEED_NOTIFICATIONS));
        }

        // Filter by role
        return notifications.filter(n => !n.role || n.role.includes(userRole)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },

    markAsRead: (id: string) => {
        const stored = localStorage.getItem(NOTIFICATIONS_KEY);
        if (stored) {
            const notifications: AppNotification[] = JSON.parse(stored);
            const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
            localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
        }
    },

    markAllRead: (userRole: UserRole) => {
        const stored = localStorage.getItem(NOTIFICATIONS_KEY);
        if (stored) {
            const notifications: AppNotification[] = JSON.parse(stored);
            const updated = notifications.map(n => {
                if (!n.role || n.role.includes(userRole)) {
                    return { ...n, read: true };
                }
                return n;
            });
            localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
        }
    }
};