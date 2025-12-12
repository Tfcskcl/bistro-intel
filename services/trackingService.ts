
import { VisitorSession, User, AppView } from '../types';
import { storageService } from './storageService';

const SESSION_KEY = 'bistro_analytics_session';

const getMockLocation = () => {
    const locations = ['Mumbai, IN', 'Delhi, IN', 'Bangalore, IN', 'New York, US', 'London, UK'];
    return locations[Math.floor(Math.random() * locations.length)];
};

export const trackingService = {
    // --- Current Session Management ---
    initSession: (user?: User): string => {
        let sessionId = sessionStorage.getItem(SESSION_KEY);
        let session: VisitorSession | null = null;

        // Try to recover session from storage based on ID
        if (sessionId) {
            const sessions = storageService.getVisitorSessions();
            session = sessions.find(s => s.sessionId === sessionId) || null;
        }

        if (!session) {
            sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            session = {
                sessionId,
                userId: user?.id,
                userName: user ? user.name : 'Guest',
                location: getMockLocation(), // In real app, use IP geo API
                device: /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
                entryTime: new Date().toISOString(),
                lastActive: new Date().toISOString(),
                pagesVisited: ['/landing'],
                isOnline: true,
                hasAbandonedCheckout: false,
                intentScore: 10,
                actions: ['Site Visit']
            };
            sessionStorage.setItem(SESSION_KEY, sessionId);
            storageService.saveVisitorSession(session);
        } else {
            // Update existing session
            session.isOnline = true;
            session.lastActive = new Date().toISOString();
            if (user) {
                session.userId = user.id;
                session.userName = user.name;
            }
            storageService.saveVisitorSession(session);
        }
        
        return sessionId;
    },

    trackAction: (action: string) => {
        const sessionId = sessionStorage.getItem(SESSION_KEY);
        if (!sessionId) return;

        const sessions = storageService.getVisitorSessions();
        const session = sessions.find(s => s.sessionId === sessionId);
        
        if (session) {
            session.lastActive = new Date().toISOString();
            session.actions.push(action);
            
            // Heuristic scoring
            if (action.includes('Pricing') || action.includes('Checkout')) session.intentScore += 20;
            if (action.includes('Demo')) session.intentScore += 15;
            if (action.includes('Login')) session.intentScore += 10;

            if (action.includes('Checkout Start')) session.hasAbandonedCheckout = true;
            if (action.includes('Purchase') || action.includes('Signup')) {
                session.hasAbandonedCheckout = false; // Resolved
                session.intentScore = 100;
            }

            storageService.saveVisitorSession(session);
        }
    },

    trackPageView: (view: string, user?: User) => {
        const sessionId = trackingService.initSession(user);
        const sessions = storageService.getVisitorSessions();
        const session = sessions.find(s => s.sessionId === sessionId);

        if (session) {
            if (!session.pagesVisited.includes(view)) {
                session.pagesVisited.push(view);
            }
            session.lastActive = new Date().toISOString();
            // If they hit login or pricing, flag abandonment potential
            if (view === 'LOGIN' || view === 'BILLING') {
                session.hasAbandonedCheckout = true;
            }
            storageService.saveVisitorSession(session);
        }
    },

    trackCheckoutStart: (user: User) => {
        trackingService.trackAction('Started Checkout');
    },

    // --- Super Admin Data Providers ---

    getLiveVisitors: (): VisitorSession[] => {
        const sessions = storageService.getVisitorSessions();
        // Consider "Live" if active in last 5 minutes
        const now = new Date().getTime();
        return sessions.filter(s => {
            const last = new Date(s.lastActive).getTime();
            return (now - last) < 5 * 60 * 1000;
        });
    },

    getVisitorStats: () => {
        const sessions = storageService.getVisitorSessions();
        const activeNow = trackingService.getLiveVisitors().length;
        // Simple metric mocks based on session data
        const totalVisitsToday = sessions.filter(s => new Date(s.entryTime).toDateString() === new Date().toDateString()).length;
        const dropoffs = sessions.filter(s => s.hasAbandonedCheckout).length;
        
        return {
            activeNow,
            totalVisitsToday,
            bounceRate: '42%',
            checkoutDropoff: dropoffs
        };
    }
};
