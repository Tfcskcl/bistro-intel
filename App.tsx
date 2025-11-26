
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { RecipeHub } from './pages/RecipeHub';
import { SOPStudio } from './pages/SOPStudio';
import { Strategy } from './pages/Strategy';
import { VideoStudio } from './pages/VideoStudio';
import { Login } from './pages/Login';
import { Integrations } from './pages/Integrations';
import { Billing } from './pages/Billing';
import { Landing } from './pages/Landing';
import { AppView, User, PlanType } from './types';
import { authService } from './services/authService';
import { trackingService } from './services/trackingService';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  
  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    // Subscribe to Firebase Auth State
    const unsubscribe = authService.subscribe((u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        trackingService.initSession(u);
      }
    });

    return () => unsubscribe();
  }, []);

  // Track View Changes
  useEffect(() => {
    trackingService.trackPageView(currentView, user || undefined);
  }, [currentView, user]);

  const handleLogin = (userData: User) => {
    // State is handled by subscribe, but we can close modal here
    setShowLogin(false);
    setCurrentView(AppView.DASHBOARD);
  };

  const handleLogout = async () => {
    await authService.logout();
    // User state update handled by subscribe
    setCurrentView(AppView.DASHBOARD);
    setShowLogin(false);
  };

  const onUserUpdate = async (updatedUser: User) => {
      await authService.updateUser(updatedUser);
      // Optimistic update
      setUser(updatedUser);
  };

  const handleUpgrade = (plan: PlanType) => {
      if (user) {
          const updatedUser = { 
              ...user, 
              plan, 
              isTrial: false,
              queriesUsed: undefined,
              queryLimit: undefined
          };
          onUserUpdate(updatedUser);
          alert(`Success! Upgraded to ${plan} plan.`);
      }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-400 flex-col gap-4">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      Loading BistroIntelligence...
    </div>;
  }

  // Route: Authenticated User
  if (user) {
    const renderView = () => {
        switch (currentView) {
          case AppView.DASHBOARD:
            return <Dashboard user={user} />;
          case AppView.RECIPES:
            return <RecipeHub user={user} onUserUpdate={onUserUpdate} />;
          case AppView.SOP:
            return <SOPStudio user={user} onUserUpdate={onUserUpdate} />;
          case AppView.STRATEGY:
            return <Strategy user={user} onUserUpdate={onUserUpdate} />;
          case AppView.VIDEO:
            return <VideoStudio user={user} />;
          case AppView.INTEGRATIONS:
            return <Integrations />;
          case AppView.BILLING:
            return <Billing user={user} onUpgrade={handleUpgrade} />;
          default:
            return <Dashboard user={user} />;
        }
      };
    
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
          <Sidebar 
            currentView={currentView} 
            onChangeView={setCurrentView} 
            user={user}
            onLogout={handleLogout}
          />
          
          <div className="ml-64 flex flex-col min-h-screen">
            <Header theme={theme} toggleTheme={toggleTheme} />
            <main className="flex-1 p-8 overflow-y-auto">
              {renderView()}
            </main>
          </div>
        </div>
      );
  }

  // Route: Public
  if (showLogin) {
      return <Login onLogin={handleLogin} onBack={() => setShowLogin(false)} />;
  }

  return <Landing onGetStarted={() => setShowLogin(true)} />;
}

export default App;