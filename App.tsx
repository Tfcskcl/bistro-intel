
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { RecipeHub } from './pages/RecipeHub';
import { SOPStudio } from './pages/SOPStudio';
import { Strategy } from './pages/Strategy';
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
  
  // Theme State - Initialize with local storage to persist preference
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
    // Check for existing session
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
    setLoading(false);
    
    // Initialize Tracking Session
    trackingService.initSession(currentUser || undefined);
  }, []);

  // Track View Changes
  useEffect(() => {
    trackingService.trackPageView(currentView, user || undefined);
  }, [currentView, user]);

  const handleLogin = (userData: User) => {
    setUser(userData);
    setCurrentView(AppView.DASHBOARD);
    setShowLogin(false);
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setCurrentView(AppView.DASHBOARD);
    setShowLogin(false); // Go back to landing page state
  };

  const onUserUpdate = (updatedUser: User) => {
      authService.updateUser(updatedUser);
      setUser(updatedUser);
  };

  const handleUpgrade = (plan: PlanType) => {
      if (user) {
          // If upgrading from trial, remove trial flag
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
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-400">Loading BistroIntelligence...</div>;
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
