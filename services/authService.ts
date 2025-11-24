import { User, UserRole, PlanType } from '../types';

const USERS_KEY = 'bistro_users';
const SESSION_KEY = 'bistro_session';

interface StoredUser extends User {
  password: string;
}

// Seed data for easy testing
const DEMO_USERS: StoredUser[] = [
  {
    id: 'demo_owner',
    name: 'Jane Owner',
    email: 'owner@bistro.com',
    password: 'pass',
    role: UserRole.OWNER,
    plan: PlanType.PRO,
    restaurantName: "The Golden Spoon",
    location: "Mumbai, Bandra",
    cuisineType: "Modern European",
    joinedDate: "2023-09-15"
  },
  {
    id: 'demo_admin',
    name: 'Mark Admin',
    email: 'admin@bistro.com',
    password: 'pass',
    role: UserRole.ADMIN,
    plan: PlanType.PRO,
    restaurantName: "The Golden Spoon",
    location: "Mumbai, Bandra",
    cuisineType: "Modern European",
    joinedDate: "2023-09-20"
  },
  {
    id: 'demo_super',
    name: 'Super User',
    email: 'super@bistro.com',
    password: 'pass',
    role: UserRole.SUPER_ADMIN,
    plan: PlanType.PRO_PLUS,
    restaurantName: "BistroIntel HQ",
    location: "Bangalore",
    cuisineType: "Tech Ops",
    joinedDate: "2023-01-01"
  },
  {
    id: 'cust_001',
    name: 'Rahul Verma',
    email: 'rahul@curryhouse.com',
    password: 'pass',
    role: UserRole.OWNER,
    plan: PlanType.FREE,
    restaurantName: "Rahul's Curry House",
    location: "Delhi, CP",
    cuisineType: "North Indian",
    joinedDate: "2023-10-05"
  },
  {
    id: 'cust_002',
    name: 'Sarah Jenkins',
    email: 'sarah@beanroast.com',
    password: 'pass',
    role: UserRole.OWNER,
    plan: PlanType.PRO_PLUS,
    restaurantName: "Bean & Roast Chain",
    location: "Bangalore, Indiranagar",
    cuisineType: "Cafe & Bakery",
    joinedDate: "2023-10-12"
  }
];

export const authService = {
  // Initialize with demo users if empty
  init: () => {
    if (!localStorage.getItem(USERS_KEY)) {
      localStorage.setItem(USERS_KEY, JSON.stringify(DEMO_USERS));
    }
  },

  signup: (userData: User, password: string): User => {
    authService.init();
    const usersStr = localStorage.getItem(USERS_KEY);
    const users: StoredUser[] = usersStr ? JSON.parse(usersStr) : [];

    if (users.find(u => u.email.toLowerCase() === userData.email.toLowerCase())) {
      throw new Error('User with this email already exists');
    }

    const newUser: StoredUser = { ...userData, password };
    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    
    // Auto login
    localStorage.setItem(SESSION_KEY, JSON.stringify(userData));
    return userData;
  },

  login: (email: string, password: string): User => {
    authService.init();
    const usersStr = localStorage.getItem(USERS_KEY);
    const users: StoredUser[] = usersStr ? JSON.parse(usersStr) : [];
    
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const { password: _, ...safeUser } = user;
    localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
    return safeUser;
  },

  logout: () => {
    localStorage.removeItem(SESSION_KEY);
  },

  getCurrentUser: (): User | null => {
    const sessionStr = localStorage.getItem(SESSION_KEY);
    return sessionStr ? JSON.parse(sessionStr) : null;
  },

  // New method for Super Admin to see all users
  getAllUsers: (): User[] => {
    authService.init();
    const usersStr = localStorage.getItem(USERS_KEY);
    const users: StoredUser[] = usersStr ? JSON.parse(usersStr) : [];
    // Return users without passwords
    return users.map(({ password, ...u }) => u);
  },

  updateUser: (updatedUser: User) => {
      const usersStr = localStorage.getItem(USERS_KEY);
      let users: StoredUser[] = usersStr ? JSON.parse(usersStr) : [];
      
      users = users.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u);
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      localStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
  },

  resetPassword: (email: string): Promise<void> => {
    return new Promise((resolve) => {
      // Simulate network request
      setTimeout(() => {
        console.log(`Password reset email sent to ${email}`);
        resolve();
      }, 1500);
    });
  }
};