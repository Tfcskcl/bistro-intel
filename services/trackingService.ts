
import { VisitorSession, User, AppView } from '../types';

const SESSION_KEY = 'bistro_analytics_session';

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
        console.log(`[Tracking] User ${user?.name || 'Guest'} viewed ${view}`);
    },

    trackCheckoutStart: (user: User) => {
        console.log(`[Tracking] User ${user.name} started checkout`);
    },

    // --- Super Admin Data Providers ---

    // Returns a list of "Live" visitors
    getLiveVisitors: (): VisitorSession[] => {
        // No mock data - return empty list
        return [];
    },

    getVisitorStats: () => {
        return {
            activeNow: 0,
            totalVisitsToday: 0,
            bounceRate: '0%',
            checkoutDropoff: 0
        };
    }
};
