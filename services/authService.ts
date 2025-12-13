
import { User, UserRole, PlanType } from '../types';
import { PLANS } from '../constants';
import { storageService } from './storageService';

const STORAGE_USER_KEY = 'bistro_current_user_cache';
const MOCK_DB_USERS_KEY = 'bistro_mock_users_db';

const getMockUsers = (): Record<string, User & {password?: string}> => {
    try {
        const s = localStorage.getItem(MOCK_DB_USERS_KEY);
        return s ? JSON.parse(s) : {};
    } catch (e) { return {}; }
};

const saveMockUser = (user: User, password?: string) => {
    const users = getMockUsers();
    users[user.id] = { ...user, password };
    localStorage.setItem(MOCK_DB_USERS_KEY, JSON.stringify(users));
};

const getMockIP = () => {
    return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
};

const DEMO_USERS: (User & {password: string})[] = [
  {
    id: 'demo_owner', 
    name: 'Jane Owner',
    email: 'owner@bistro.com',
    password: 'pass',
    role: UserRole.OWNER,
    plan: PlanType.PRO_PLUS,
    restaurantName: "The Golden Spoon",
    credits: 2600,
    setupComplete: true,
    ipAddress: '192.168.1.10',
    userAgent: 'Chrome (Mac)',
    lastActiveModule: 'Dashboard',
    lastLogin: new Date().toISOString()
  },
  {
    id: 'demo_admin', 
    name: 'Mike Admin',
    email: 'admin@bistro.com',
    password: 'pass',
    role: UserRole.ADMIN,
    plan: PlanType.PRO,
    restaurantName: "Urban Spices",
    credits: 500,
    setupComplete: true,
    ipAddress: '192.168.1.15',
    userAgent: 'Safari (iOS)',
    lastActiveModule: 'Inventory',
    lastLogin: new Date().toISOString()
  },
  {
    id: 'super_admin', 
    name: 'BistroHQ',
    email: 'info@bistroconnect.in',
    password: 'Bistro@2403',
    role: UserRole.SUPER_ADMIN,
    plan: PlanType.PRO_PLUS,
    restaurantName: "BistroConnect Platform",
    credits: 99999,
    setupComplete: true,
    ipAddress: '10.0.0.1',
    userAgent: 'Admin Console',
    lastActiveModule: 'Admin',
    lastLogin: new Date().toISOString()
  }
];

const observers: ((user: User | null) => void)[] = [];
const notifyObservers = (user: User | null) => {
    observers.forEach(cb => cb(user));
};

export const authService = {
  subscribe: (callback: (user: User | null) => void) => {
    const stored = localStorage.getItem(STORAGE_USER_KEY);
    if (stored) {
        const user = JSON.parse(stored);
        user.credits = storageService.getUserCredits(user.id) || user.credits;
        callback(user);
    } else {
        callback(null);
    }
    observers.push(callback);
    
    // Seed demo users
    const mockUsers = getMockUsers();
    DEMO_USERS.forEach(d => {
        if (!mockUsers[d.id]) {
            mockUsers[d.id] = d;
            storageService.saveUserCredits(d.id, d.credits);
        }
    });
    localStorage.setItem(MOCK_DB_USERS_KEY, JSON.stringify(mockUsers));

    return () => {
        const index = observers.indexOf(callback);
        if (index > -1) observers.splice(index, 1);
    };
  },

  getCurrentUser: (): User | null => {
      const stored = localStorage.getItem(STORAGE_USER_KEY);
      return stored ? JSON.parse(stored) : null;
  },

  login: async (email: string, password: string): Promise<User> => {
    const mockUsers = getMockUsers();
    const user = Object.values(mockUsers).find(u => u.email === email && u.password === password);
    if (!user) throw new Error("Invalid credentials");
    
    const safeUser = { 
        ...user, 
        lastLogin: new Date().toISOString(),
        // Keep existing IP if not present, in real world we'd update it
        ipAddress: user.ipAddress || getMockIP(),
        userAgent: navigator.userAgent.includes('Mobile') ? 'Mobile Web' : 'Desktop Web'
    };
    
    delete (safeUser as any).password;
    safeUser.credits = storageService.getUserCredits(safeUser.id) || safeUser.credits;
    
    // Update DB record for login timestamp
    saveMockUser(safeUser, password); // Re-save with password to persist update
    
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(safeUser));
    notifyObservers(safeUser);
    
    storageService.logActivity(safeUser.id, safeUser.name, 'LOGIN', 'User logged in');
    
    return safeUser;
  },

  logout: async () => {
    localStorage.removeItem(STORAGE_USER_KEY);
    notifyObservers(null);
  },

  updateUser: async (updatedUser: User) => {
      const mockUsers = getMockUsers();
      if (mockUsers[updatedUser.id]) {
          mockUsers[updatedUser.id] = { ...mockUsers[updatedUser.id], ...updatedUser };
          localStorage.setItem(MOCK_DB_USERS_KEY, JSON.stringify(mockUsers));
      }
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(updatedUser));
      notifyObservers(updatedUser);
  },
  
  signup: async (u: User, p: string) => { 
      const uid = `usr_${Date.now()}`;
      const newUser: User = {
          ...u, 
          id: uid,
          ipAddress: getMockIP(), // Mock an IP
          userAgent: navigator.userAgent.includes('Mobile') ? 'Mobile Web' : 'Desktop Web',
          lastActiveModule: 'Dashboard',
          lastLogin: new Date().toISOString()
      };
      saveMockUser(newUser, p);
      storageService.saveUserCredits(uid, u.credits);
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(newUser));
      notifyObservers(newUser);
      
      storageService.logActivity(uid, newUser.name, 'LOGIN', 'New account created from ' + newUser.ipAddress);
      
      return newUser;
  },
  resetPassword: async (e: string) => {},
  
  // New Admin Method
  getAllUsers: async (): Promise<User[]> => {
      const users = getMockUsers();
      return Object.values(users).map(u => {
          const { password, ...rest } = u;
          return { 
              ...rest, 
              credits: storageService.getUserCredits(rest.id) || rest.credits,
              // Fallbacks if older data exists
              ipAddress: rest.ipAddress || 'Unknown',
              lastActiveModule: rest.lastActiveModule || 'Inactive'
          };
      });
  }
};
