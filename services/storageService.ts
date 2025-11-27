


import { RecipeCard, SOP, AppNotification, UserRole, POSChangeRequest, MenuItem, PlanConfig, PlanType, RecipeRequest, SOPRequest, MarketingRequest } from '../types';
import { MOCK_MENU, MOCK_SALES_DATA, MOCK_INGREDIENT_PRICES, PLANS as DEFAULT_PLANS } from '../constants';
import { ingredientService } from './ingredientService';

const getKey = (userId: string, key: string) => `bistro_${userId}_${key}`;
const PLANS_KEY = 'bistro_system_plans';
const GLOBAL_RECIPE_REQUESTS_KEY = 'bistro_global_recipe_requests';
const GLOBAL_SOP_REQUESTS_KEY = 'bistro_global_sop_requests';
const GLOBAL_MARKETING_REQUESTS_KEY = 'bistro_global_marketing_requests';
const GLOBAL_NOTIFICATIONS_KEY = 'bistro_global_notifications';

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

    importMenuFromCSV: (userId: string, csvText: string): { success: boolean; count: number; message: string } => {
        try {
            const lines = csvText.split(/\r\n|\n/);
            const newItems: MenuItem[] = [];
            
            // Check for header row (heuristic: check if first row has 'name' or 'sku')
            const hasHeader = lines[0].toLowerCase().includes('name') || lines[0].toLowerCase().includes('sku');
            const startIndex = hasHeader ? 1 : 0;

            for (let i = startIndex; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                // Simple split by comma. 
                // Format: sku_id, name, category, price, prep_time
                const parts = line.split(',').map(p => p.trim());
                
                if (parts.length >= 2) {
                    const sku_id = parts[0] || `IMP-${Date.now()}-${i}`;
                    const name = parts[1];
                    
                    if (!name) continue;

                    const catStr = (parts[2] || 'main').toLowerCase();
                    const category: any = ['main', 'snack', 'beverage', 'dessert'].includes(catStr) ? catStr : 'main';
                    
                    const price = parseFloat(parts[3]) || 0;
                    const prepTime = parseInt(parts[4]) || 15;

                    newItems.push({
                        sku_id,
                        name,
                        category,
                        current_price: price,
                        prep_time_min: prepTime,
                        ingredients: []
                    });
                }
            }

            if (newItems.length === 0) {
                return { success: false, count: 0, message: "No valid items found in CSV" };
            }

            const currentMenu = storageService.getMenu(userId);
            // Avoid duplicate SKUs if possible
            const currentSkus = new Set(currentMenu.map(m => m.sku_id));
            const uniqueNewItems = newItems.filter(i => !currentSkus.has(i.sku_id));
            
            if (uniqueNewItems.length === 0 && newItems.length > 0) {
                 return { success: false, count: 0, message: "All items duplicate or skipped" };
            }

            const updatedMenu = [...currentMenu, ...uniqueNewItems];
            storageService.saveMenu(userId, updatedMenu);
            
            return { success: true, count: uniqueNewItems.length, message: `Imported ${uniqueNewItems.length} menu items` };

        } catch (e) {
            console.error(e);
            return { success: false, count: 0, message: "Import failed to parse CSV" };
        }
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

        // Send Notification to Super Admin
        storageService.sendSystemNotification({
            id: `notif_req_${request.id}`,
            title: 'New Recipe Request',
            message: `${request.userName} requested: ${request.item.name}`,
            type: 'info',
            read: false,
            date: new Date().toISOString(),
            role: [UserRole.SUPER_ADMIN, UserRole.ADMIN]
        });
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

        // Send Notification to Super Admin
        storageService.sendSystemNotification({
            id: `notif_sop_${request.id}`,
            title: 'New SOP Request',
            message: `${request.userName} requested SOP: ${request.topic}`,
            type: 'info',
            read: false,
            date: new Date().toISOString(),
            role: [UserRole.SUPER_ADMIN, UserRole.ADMIN]
        });
    },

    updateSOPRequest: (updatedRequest: SOPRequest) => {
        const requests = storageService.getAllSOPRequests();
        const index = requests.findIndex(r => r.id === updatedRequest.id);
        if (index >= 0) {
            requests[index] = updatedRequest;
            localStorage.setItem(GLOBAL_SOP_REQUESTS_KEY, JSON.stringify(requests));
        }
    },

    // --- MARKETING REQUESTS (VIDEO & IMAGE) ---
    getAllMarketingRequests: (): MarketingRequest[] => {
        const stored = localStorage.getItem(GLOBAL_MARKETING_REQUESTS_KEY);
        return stored ? JSON.parse(stored) : [];
    },

    saveMarketingRequest: (request: MarketingRequest) => {
        const requests = storageService.getAllMarketingRequests();
        requests.push(request);
        localStorage.setItem(GLOBAL_MARKETING_REQUESTS_KEY, JSON.stringify(requests));

        // Send Notification to Super Admin
        storageService.sendSystemNotification({
            id: `notif_mkt_${request.id}`,
            title: `New ${request.type === 'image' ? 'Image' : 'Video'} Request`,
            message: `${request.userName} requested a ${request.type} generation.`,
            type: 'info',
            read: false,
            date: new Date().toISOString(),
            role: [UserRole.SUPER_ADMIN, UserRole.ADMIN]
        });
    },

    updateMarketingRequest: (updatedRequest: MarketingRequest) => {
        const requests = storageService.getAllMarketingRequests();
        const index = requests.findIndex(r => r.id === updatedRequest.id);
        if (index >= 0) {
            requests[index] = updatedRequest;
            localStorage.setItem(GLOBAL_MARKETING_REQUESTS_KEY, JSON.stringify(requests));
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

    // --- INVOICES ---
    addInvoice: (userId: string, invoice: any) => {
        const invoices = storageService.getInvoices(userId);
        invoices.unshift(invoice);
        storageService.setItem(userId, 'invoices', invoices);
    },

    getInvoices: (userId: string): any[] => {
        return storageService.getItem<any[]>(userId, 'invoices', []);
    },

    // --- NOTIFICATIONS SYSTEM ---

    // Helper to send a notification to a specific role globally
    sendSystemNotification: (notification: AppNotification) => {
        const stored = localStorage.getItem(GLOBAL_NOTIFICATIONS_KEY);
        const notifications: AppNotification[] = stored ? JSON.parse(stored) : [];
        notifications.push(notification);
        localStorage.setItem(GLOBAL_NOTIFICATIONS_KEY, JSON.stringify(notifications));
    },

    getNotifications: (userId: string, userRole: UserRole): AppNotification[] => {
        // 1. Get Personal Notifications
        const storedPersonal = localStorage.getItem(getKey(userId, 'notifications'));
        let notifications: AppNotification[] = storedPersonal ? JSON.parse(storedPersonal) : [WELCOME_NOTIFICATION];
        
        // 2. Get Global Notifications
        const storedGlobal = localStorage.getItem(GLOBAL_NOTIFICATIONS_KEY);
        if (storedGlobal) {
            const globalNotifs: AppNotification[] = JSON.parse(storedGlobal);
            // Filter global notifications relevant to this user's role
            const applicableGlobal = globalNotifs.filter(n => !n.role || n.role.includes(userRole));
            notifications = [...notifications, ...applicableGlobal];
        }

        // 3. Sort by date
        return notifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },

    markAsRead: (userId: string, id: string) => {
        // 1. Try marking in Personal Storage
        const personalKey = getKey(userId, 'notifications');
        const storedPersonal = localStorage.getItem(personalKey);
        let foundInPersonal = false;

        if (storedPersonal) {
            let notifications: AppNotification[] = JSON.parse(storedPersonal);
            const index = notifications.findIndex(n => n.id === id);
            if (index !== -1) {
                notifications[index].read = true;
                localStorage.setItem(personalKey, JSON.stringify(notifications));
                foundInPersonal = true;
            }
        }

        // 2. If not found in personal, try marking in Global Storage
        // Note: Marking a global notification read marks it read for everyone in this simple implementation
        if (!foundInPersonal) {
            const storedGlobal = localStorage.getItem(GLOBAL_NOTIFICATIONS_KEY);
            if (storedGlobal) {
                let global: AppNotification[] = JSON.parse(storedGlobal);
                const index = global.findIndex(n => n.id === id);
                if (index !== -1) {
                    global[index].read = true;
                    localStorage.setItem(GLOBAL_NOTIFICATIONS_KEY, JSON.stringify(global));
                }
            }
        }
    },

    markAllRead: (userId: string, userRole: UserRole) => {
        // 1. Mark all personal read
        const personalKey = getKey(userId, 'notifications');
        const storedPersonal = localStorage.getItem(personalKey);
        if (storedPersonal) {
            let notifications: AppNotification[] = JSON.parse(storedPersonal);
            const updated = notifications.map(n => ({ ...n, read: true }));
            localStorage.setItem(personalKey, JSON.stringify(updated));
        }

        // 2. Mark all visible global read
        const storedGlobal = localStorage.getItem(GLOBAL_NOTIFICATIONS_KEY);
        if (storedGlobal) {
            let global: AppNotification[] = JSON.parse(storedGlobal);
            const updated = global.map(n => {
                // If the notification targets this user's role, mark it read
                if (!n.role || n.role.includes(userRole)) {
                    return { ...n, read: true };
                }
                return n;
            });
            localStorage.setItem(GLOBAL_NOTIFICATIONS_KEY, JSON.stringify(updated));
        }
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