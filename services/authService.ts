
import { User, UserRole, PlanType } from '../types';
import { auth, db, isFirebaseConfigured } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

const STORAGE_USER_KEY = 'bistro_current_user_cache';
const MOCK_DB_USERS_KEY = 'bistro_mock_users_db'; // For local storage mock DB

// Mock DB Helpers
const getMockUsers = (): Record<string, User & {password?: string}> => {
    try {
        const s = localStorage.getItem(MOCK_DB_USERS_KEY);
        return s ? JSON.parse(s) : {};
    } catch (e) {
        return {};
    }
};

const saveMockUser = (user: User, password?: string) => {
    const users = getMockUsers();
    users[user.id] = { ...user, password };
    localStorage.setItem(MOCK_DB_USERS_KEY, JSON.stringify(users));
};

// Backup Demo Data for Auto-Creation
const DEMO_USERS: (User & {password: string})[] = [
  {
    id: 'demo_owner', 
    name: 'Jane Owner',
    email: 'owner@bistro.com',
    password: 'pass',
    role: UserRole.OWNER,
    plan: PlanType.PRO_PLUS, // Unlocked all options
    restaurantName: "The Golden Spoon",
    location: "Mumbai, Bandra",
    cuisineType: "Modern European",
    joinedDate: "2023-09-15",
    isTrial: false
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
    joinedDate: "2023-09-20",
    isTrial: false
  },
  {
    id: 'sa_info_bistro',
    name: 'Info BistroConnect',
    email: 'info@bistroconnect.in',
    password: 'Bistro@2403',
    role: UserRole.SUPER_ADMIN,
    plan: PlanType.PRO_PLUS,
    restaurantName: "BistroHQ",
    location: "Indore",
    cuisineType: "HQ",
    joinedDate: "2023-01-01",
    isTrial: false
  },
  {
    id: 'sa_amit',
    name: 'Amit (Super Admin)',
    email: 'amit@chef-hire.in',
    password: 'Bistro@2403',
    role: UserRole.SUPER_ADMIN,
    plan: PlanType.PRO_PLUS,
    restaurantName: "BistroHQ",
    location: "Indore",
    cuisineType: "HQ",
    joinedDate: "2023-01-01",
    isTrial: false
  },
  {
    id: 'sa_info_chef',
    name: 'Info Chef-Hire',
    email: 'info@chef-hire.in',
    password: 'Bistro@2403',
    role: UserRole.SUPER_ADMIN,
    plan: PlanType.PRO_PLUS,
    restaurantName: "BistroHQ",
    location: "Indore",
    cuisineType: "HQ",
    joinedDate: "2023-01-01",
    isTrial: false
  }
];

// Mock Observer Pattern to notify App.tsx of state changes
const observers: ((user: User | null) => void)[] = [];
const notifyObservers = (user: User | null) => {
    observers.forEach(cb => {
        try {
            cb(user);
        } catch (e) {
            console.error("Error in auth observer", e);
        }
    });
};

export const authService = {
  // Init listener (called in App.tsx)
  subscribe: (callback: (user: User | null) => void) => {
    if (isFirebaseConfigured && auth) {
        return onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            // Fetch extended profile from Firestore
            const userProfile = await authService.getUserProfile(firebaseUser.uid);
            if (userProfile) {
                const fullUser = { ...userProfile, id: firebaseUser.uid, email: firebaseUser.email || '' };
                localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(fullUser));
                callback(fullUser);
            } else {
                callback(null);
            }
        } else {
            localStorage.removeItem(STORAGE_USER_KEY);
            callback(null);
        }
        });
    } else {
        // Mock Subscription (Just check local storage on load)
        try {
            const stored = localStorage.getItem(STORAGE_USER_KEY);
            const user = stored ? JSON.parse(stored) : null;
            callback(user);
        } catch (e) {
            callback(null);
        }

        // Add to observers list for updates
        observers.push(callback);

        // We initialize demo users into mock DB if they don't exist
        const mockUsers = getMockUsers();
        let updated = false;
        DEMO_USERS.forEach(demoUser => {
            // Always update demo users to ensure latest config (like plan changes)
            mockUsers[demoUser.id] = demoUser;
            updated = true;
        });
        if (updated) {
            localStorage.setItem(MOCK_DB_USERS_KEY, JSON.stringify(mockUsers));
        }

        // Return unsubscribe function
        return () => {
            const index = observers.indexOf(callback);
            if (index > -1) observers.splice(index, 1);
        };
    }
  },

  getCurrentUser: (): User | null => {
      try {
          const stored = localStorage.getItem(STORAGE_USER_KEY);
          return stored ? JSON.parse(stored) : null;
      } catch (e) {
          return null;
      }
  },

  signup: async (userData: User, password: string): Promise<User> => {
    if (isFirebaseConfigured && auth) {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, userData.email, password);
            const uid = userCredential.user.uid;
            const { id, ...profileData } = userData;
            await setDoc(doc(db!, "users", uid), {
                ...profileData,
                createdAt: new Date().toISOString()
            });
            const fullUser = { ...userData, id: uid };
            localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(fullUser));
            return fullUser;
        } catch (error: any) {
            throw new Error(authService.mapFirebaseError(error.code));
        }
    } else {
        // Mock Signup
        const mockUsers = getMockUsers();
        const exists = Object.values(mockUsers).find(u => u.email === userData.email);
        if (exists) throw new Error("Email already in use (Mock Mode).");

        const uid = `mock_${Date.now()}`;
        const newUser = { ...userData, id: uid };
        saveMockUser(newUser, password);
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(newUser));
        notifyObservers(newUser);
        return newUser;
    }
  },

  // Create User (Super Admin Functionality)
  registerUser: async (userData: User, password: string): Promise<User> => {
      if (isFirebaseConfigured) {
          return authService.signup(userData, password);
      } else {
          // In mock mode, we just add to DB but don't switch session
          const uid = `mock_${Date.now()}`;
          const newUser = { ...userData, id: uid };
          saveMockUser(newUser, password);
          return newUser;
      }
  },

  login: async (email: string, password: string): Promise<User> => {
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (isFirebaseConfigured && auth) {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
            const uid = userCredential.user.uid;
            const userProfile = await authService.getUserProfile(uid);
            if (!userProfile) throw new Error("User profile not found in database.");
            const fullUser = { ...userProfile, id: uid, email: userCredential.user.email || '' };
            localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(fullUser));
            return fullUser;
        } catch (error: any) {
            throw new Error(authService.mapFirebaseError(error.code));
        }
    } else {
        // Mock Login
        const mockUsers = getMockUsers();
        
        // 1. Check if it's a hardcoded Demo User first (Priority)
        const demoUser = DEMO_USERS.find(u => u.email.toLowerCase() === cleanEmail.toLowerCase());
        
        if (demoUser) {
            if (demoUser.password === cleanPassword) {
                // Force update/save in mock DB to ensure latest details persist
                saveMockUser(demoUser, cleanPassword);
                const { password: _, ...safeUser } = demoUser;
                localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(safeUser));
                notifyObservers(safeUser as User);
                return safeUser as User;
            }
        }

        // 2. Fallback to normal mock DB users (signups)
        const storedUser = Object.values(mockUsers).find(u => u.email.toLowerCase() === cleanEmail.toLowerCase());
        
        if (storedUser && storedUser.password === cleanPassword) {
             const { password: _, ...safeUser } = storedUser;
             localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(safeUser));
             notifyObservers(safeUser as User);
             return safeUser as User;
        }

        throw new Error("Invalid email or password (Mock Mode).");
    }
  },

  logout: async () => {
    if (isFirebaseConfigured && auth) {
        await signOut(auth);
    }
    localStorage.removeItem(STORAGE_USER_KEY);
    notifyObservers(null);
  },

  getUserProfile: async (uid: string): Promise<User | null> => {
    if (isFirebaseConfigured && db) {
        try {
            const docRef = doc(db, "users", uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return docSnap.data() as User;
            }
            return null;
        } catch (e) {
            console.error("Error fetching profile", e);
            return null;
        }
    } else {
        // Mock Profile Fetch
        const mockUsers = getMockUsers();
        const user = mockUsers[uid];
        if (user) {
            const { password, ...safeUser } = user;
            return safeUser as User;
        }
        // Fallback to demo users list if not found in LS
        const demoUser = DEMO_USERS.find(u => u.id === uid);
        if (demoUser) {
             const { password, ...safeUser } = demoUser;
             return safeUser as User;
        }
        return null;
    }
  },

  getAllUsers: async (): Promise<User[]> => {
      if (isFirebaseConfigured && db) {
          console.warn("getAllUsers requires Admin SDK or custom collection query.");
          return []; 
      } else {
          const mockUsers = getMockUsers();
          // Ensure Demo users are included in the list even if not explicitly in LS yet
          DEMO_USERS.forEach(d => {
              if (!mockUsers[d.id]) {
                  mockUsers[d.id] = d;
              }
          });
          return Object.values(mockUsers).map(({ password, ...u }) => u as User);
      }
  },

  updateUser: async (updatedUser: User) => {
      if (!updatedUser.id) return;
      
      if (isFirebaseConfigured && db) {
          const { id, email, ...data } = updatedUser;
          const userRef = doc(db, "users", id);
          await updateDoc(userRef, data);
      } else {
          const mockUsers = getMockUsers();
          const existing = mockUsers[updatedUser.id] || {};
          mockUsers[updatedUser.id] = { ...existing, ...updatedUser };
          localStorage.setItem(MOCK_DB_USERS_KEY, JSON.stringify(mockUsers));
      }
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(updatedUser));
      notifyObservers(updatedUser); 
  },

  deleteUser: async (userId: string) => {
      if (isFirebaseConfigured && db) {
          await deleteDoc(doc(db, "users", userId));
      } else {
          const mockUsers = getMockUsers();
          delete mockUsers[userId];
          localStorage.setItem(MOCK_DB_USERS_KEY, JSON.stringify(mockUsers));
      }
  },

  resetPassword: async (email: string): Promise<void> => {
    if (isFirebaseConfigured && auth) {
        try {
            await sendPasswordResetEmail(auth, email);
        } catch (error: any) {
            throw new Error(authService.mapFirebaseError(error.code));
        }
    } else {
        console.log(`[Mock] Password reset link sent to ${email}`);
    }
  },

  mapFirebaseError: (code: string): string => {
    switch (code) {
      case 'auth/invalid-email': return 'Invalid email address.';
      case 'auth/user-disabled': return 'User account is disabled.';
      case 'auth/user-not-found': return 'User not found.';
      case 'auth/wrong-password': return 'Incorrect password.';
      case 'auth/email-already-in-use': return 'Email already in use.';
      case 'auth/weak-password': return 'Password is too weak.';
      case 'auth/invalid-credential': return 'Invalid credentials.';
      default: return 'Authentication failed. Please check configuration.';
    }
  }
};
