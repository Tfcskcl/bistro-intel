
import { VisitorSession, User, AppView } from '../types';

const SESSION_KEY = 'bistro_analytics_session';
const MOCK_DATA_KEY = 'bistro_analytics_mock';

// Helper to generate random locations for demo
const DEMO_LOCATIONS = ['Mumbai, IN', 'Delhi, IN', 'Bangalore, IN', 'Pune, IN', 'Hyderabad, IN', 'Chennai, IN', 'Jaipur, IN', 'New York, US', 'London, UK'];
const DEMO_DEVICES = ['Desktop (Chrome)', 'Mobile (iOS)', 'Mobile (Android)', 'Tablet (iPad)'];

export const trackingService = {
    // --- Current Session Management ---
    initSession: (user?: User): string => {
        let sessionId = sessionStorage.getItem(SESSION_KEY);
        if (!sessionId) {
            sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            sessionStorage.setItem(SESSION_KEY, sessionId);
        }
        return sessionId;
    },

    trackPageView: (view: AppView, user?: User) => {
        // In a real app, this sends data to backend. 
        // Here we just log it to console or update local state if needed.
        console.log(`[Tracking] User ${user?.name || 'Guest'} viewed ${view}`);
    },

    trackCheckoutStart: (user: User) => {
        console.log(`[Tracking] User ${user.name} started checkout`);
        // Mark potential abandonment in storage if we had a real backend
    },

    // --- Super Admin Data Providers (Mocked/Simulated) ---

    // Returns a list of "Live" visitors
    getLiveVisitors: (): VisitorSession[] => {
        // We generate some stable mock data mixed with random variations to simulate "Live" updates
        const sessions: VisitorSession[] = [];
        
        // 1. Add some static "active" users
        const count = 5 + Math.floor(Math.random() * 5); // 5 to 10 active users
        
        for (let i = 0; i < count; i++) {
            sessions.push({
                sessionId: `mock_sess_${i}`,
                userId: Math.random() > 0.5 ? `user_${i}` : undefined,
                userName: Math.random() > 0.5 ? `Visitor ${i+1}` : 'Guest',
                location: DEMO_LOCATIONS[Math.floor(Math.random() * DEMO_LOCATIONS.length)],
                device: DEMO_DEVICES[Math.floor(Math.random() * DEMO_DEVICES.length)],
                entryTime: new Date(Date.now() - Math.random() * 3600000).toISOString(),
                lastActive: new Date().toISOString(),
                pagesVisited: [AppView.DASHBOARD, AppView.RECIPES],
                isOnline: true,
                hasAbandonedCheckout: false
            });
        }
        
        // 2. Add specific "Abandoned Checkout" users
        sessions.push({
            sessionId: 'abdn_1',
            userId: 'usr_ab1',
            userName: 'Rahul (Trial User)',
            location: 'Gurgaon, IN',
            device: 'Desktop (Windows)',
            entryTime: new Date(Date.now() - 1500000).toISOString(),
            lastActive: new Date(Date.now() - 300000).toISOString(), // 5 mins ago
            pagesVisited: [AppView.DASHBOARD.toString(), 'Plans', AppView.BILLING.toString()],
            isOnline: false, // Left site
            hasAbandonedCheckout: true
        });

        sessions.push({
            sessionId: 'abdn_2',
            userId: 'usr_ab2',
            userName: 'Cafe Coffee Day Manager',
            location: 'Bangalore, IN',
            device: 'Mobile (Android)',
            entryTime: new Date(Date.now() - 4000000).toISOString(),
            lastActive: new Date(Date.now() - 600000).toISOString(), // 10 mins ago
            pagesVisited: [AppView.RECIPES.toString(), AppView.SOP.toString(), AppView.BILLING.toString()],
            isOnline: false,
            hasAbandonedCheckout: true
        });

        return sessions;
    },

    getVisitorStats: () => {
        return {
            activeNow: 12,
            totalVisitsToday: 145,
            bounceRate: '34%',
            checkoutDropoff: 8 // People who visited billing but didn't pay
        };
    }
};
