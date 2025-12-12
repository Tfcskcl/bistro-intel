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
import { KitchenWorkflow } from './pages/KitchenWorkflow';
import { MenuGenerator } from './pages/MenuGenerator';
import { InventoryManager } from './pages/InventoryManager'; 
import { CCTVAnalytics } from './pages/CCTVAnalytics';
import { KitchenLayoutDesigner } from './pages/KitchenLayoutDesigner';
import { TaskManager } from './pages/TaskManager';
import OnboardingWizard from './components/OnboardingWizard';
import { ChatAssistant } from './components/ChatAssistant';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppView, User } from './types';
import { authService } from './services/authService';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [showLogin, setShowLogin] = useState(false);
  const [theme, setTheme] = useState<'light'|'dark'>('light');

  useEffect(() => {
    return authService.subscribe((u) => setUser(u));
  }, []);

  const handleOnboardingComplete = async () => {
      if (user) {
          const updated = { ...user, setupComplete: true };
          await authService.updateUser(updated);
          setUser(updated);
      }
  };

  if (!user && !showLogin) return <Landing onGetStarted={() => setShowLogin(true)} />;
  if (!user && showLogin) return <Login onLogin={() => setShowLogin(false)} onBack={() => setShowLogin(false)} />;

  if (user && !user.setupComplete) {
      return <OnboardingWizard user={user} onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex transition-colors ${theme}`}>
      <Sidebar currentView={currentView} onChangeView={setCurrentView} user={user!} onLogout={authService.logout} />
      <div className="flex-1 ml-64 flex flex-col">
        <Header theme={theme} toggleTheme={() => setTheme(t => t==='light'?'dark':'light')} currentView={currentView} onChangeView={setCurrentView} />
        <main className="p-8 flex-1 overflow-y-auto">
          <ErrorBoundary>
            {currentView === AppView.DASHBOARD && <Dashboard user={user!} onChangeView={setCurrentView} />}
            {currentView === AppView.CCTV_ANALYTICS && <CCTVAnalytics user={user!} />}
            {currentView === AppView.TASKS && <TaskManager user={user!} />}
            {currentView === AppView.RECIPES && <RecipeHub user={user!} />}
            {currentView === AppView.INVENTORY && <InventoryManager user={user!} />}
            {currentView === AppView.MENU_GENERATOR && <MenuGenerator user={user!} />}
            {currentView === AppView.SOP && <SOPStudio user={user!} />}
            {currentView === AppView.STRATEGY && <Strategy user={user!} />}
            {currentView === AppView.KITCHEN_WORKFLOW && <KitchenWorkflow user={user!} />}
            {currentView === AppView.LAYOUT_DESIGN && <KitchenLayoutDesigner user={user!} onUserUpdate={setUser} />}
            {currentView === AppView.VIDEO && <VideoStudio user={user!} />}
            {currentView === AppView.INTEGRATIONS && <Integrations />}
            {currentView === AppView.BILLING && <Billing user={user!} />}
          </ErrorBoundary>
        </main>
      </div>
      <ChatAssistant />
    </div>
  );
}

export default App;