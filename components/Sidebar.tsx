
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, ChefHat, FileText, TrendingUp, Database, CreditCard, LogOut, Clapperboard, RefreshCw, GitMerge, BookOpen, Package, Activity, PenTool, Key, CheckCircle2, ListTodo, ExternalLink, X, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { AppView, User, PlanType, UserRole } from '../types';
import { Logo } from './Logo';
import { storageService } from '../services/storageService';
import { hasValidApiKey } from '../services/geminiService';

interface SidebarProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  user: User;
  onLogout: () => void;
}

interface MenuItem {
    id: AppView;
    label: string;
    icon: React.ElementType;
    requiredPlan?: PlanType;
    allowedRoles?: UserRole[];
    externalLink?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, user, onLogout }) => {
  const [apiConnected, setApiConnected] = useState(hasValidApiKey());
  const [isAiStudioAvailable, setIsAiStudioAvailable] = useState(false);
  
  // Key Modal State
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [manualKey, setManualKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
      // Periodic check for aistudio availability in case of late load
      const checkInterval = setInterval(() => {
          const aiStudio = (window as any).aistudio;
          if (aiStudio) {
              setIsAiStudioAvailable(true);
              aiStudio.hasSelectedApiKey().then((selected: boolean) => {
                  if (selected || hasValidApiKey()) {
                      setApiConnected(true);
                  }
              }).catch(() => {});
          } else if (hasValidApiKey()) {
              setApiConnected(true);
          }
      }, 1000);

      // Immediate check
      if (hasValidApiKey()) setApiConnected(true);

      return () => clearInterval(checkInterval);
  }, []);

  const handleConnectKey = async () => {
      const aiStudio = (window as any).aistudio;
      if (aiStudio) {
          try {
              await aiStudio.openSelectKey();
              // Assume success immediately to update UI
              setApiConnected(true);
              // Trigger a small timeout to allow env var propagation if needed without full reload
              setTimeout(() => {
                 window.location.reload(); 
              }, 500);
          } catch(e) {
              console.error("Key selection failed", e);
          }
      } else {
          // Open Manual Entry Modal if AI Studio is not available
          setShowKeyModal(true);
      }
  };

  const saveManualKey = () => {
      if (manualKey.trim()) {
          localStorage.setItem('bistro_api_key', manualKey.trim());
          setApiConnected(true);
          setShowKeyModal(false);
          window.location.reload();
      }
  };

  const menuItems: MenuItem[] = [
    { id: AppView.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: AppView.TASKS, label: 'Task Manager', icon: ListTodo, allowedRoles: [UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN] },
    { id: AppView.INVENTORY, label: 'Inventory Manager', icon: Package, allowedRoles: [UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN] },
    { id: AppView.RECIPES, label: 'Recipe & Costing', icon: ChefHat, allowedRoles: [UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN] },
    { id: AppView.MENU_GENERATOR, label: 'Menu Generator', icon: BookOpen, allowedRoles: [UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN] },
    { id: AppView.LAYOUT_DESIGN, label: 'Kitchen Designer', icon: PenTool, allowedRoles: [UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN] },
    { id: AppView.SOP, label: 'SOP Studio', icon: FileText, allowedRoles: [UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN] },
    { 
        id: AppView.CCTV_ANALYTICS, 
        label: 'Operations Center', 
        icon: Activity, 
        allowedRoles: [UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN]
    },
    { id: AppView.VIDEO, label: 'Marketing Studio', icon: Clapperboard, allowedRoles: [UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN] },
    { id: AppView.STRATEGY, label: 'Strategy AI', icon: TrendingUp, allowedRoles: [UserRole.OWNER, UserRole.SUPER_ADMIN] },
    { id: AppView.INTEGRATIONS, label: 'Data & Integrations', icon: Database, allowedRoles: [UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.ADMIN] },
    { id: AppView.BILLING, label: 'Plans & Billing', icon: CreditCard, allowedRoles: [UserRole.OWNER] },
  ];

  const lowCredits = user.credits < 50;

  return (
    <>
    <div className="w-64 bg-white dark:bg-slate-900 text-slate-800 dark:text-white flex flex-col h-screen fixed left-0 top-0 z-20 shadow-xl border-r border-slate-200 dark:border-slate-800 transition-colors duration-200">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="dark:hidden">
            <Logo light={false} iconSize={24} />
        </div>
        <div className="hidden dark:block">
            <Logo light={true} iconSize={24} />
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          if (item.allowedRoles && !item.allowedRoles.includes(user.role)) {
              return null;
          }

          const Icon = item.icon;
          const isActive = currentView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => {
                  if (item.externalLink) {
                      window.open(item.externalLink, '_blank');
                  } else {
                      onChangeView(item.id);
                  }
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/50' 
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium flex-1 text-left">{item.label}</span>
              {item.externalLink && <ExternalLink size={14} className="opacity-50" />}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
        <div className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
                <Key size={14} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">System Status</span>
            </div>
            
            {!apiConnected ? (
                <button 
                    onClick={handleConnectKey}
                    className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 animate-pulse hover:bg-orange-200 transition-colors"
                >
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                    Connect Key
                </button>
            ) : (
                <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${apiConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-orange-500 animate-pulse'}`}></div>
                    <span className={`text-[10px] font-bold ${apiConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'}`}>
                        {apiConnected ? 'Online' : 'Demo'}
                    </span>
                </div>
            )}
        </div>

        <div className={`px-4 py-3 rounded-lg mb-2 border ${lowCredits ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
            <div className="flex justify-between items-center mb-1">
                <p className="text-xs text-slate-500 dark:text-slate-400">Role</p>
                <span className="text-[10px] font-bold uppercase bg-slate-200 dark:bg-slate-700 px-1.5 rounded text-slate-600 dark:text-slate-300">{user.role.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between items-center mt-2">
                <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Credits</p>
                    <p className={`text-sm font-bold ${lowCredits ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {user.credits} CR
                    </p>
                </div>
                {lowCredits && (
                    <button 
                        onClick={() => onChangeView(AppView.BILLING)}
                        className="text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 px-2 py-1 rounded hover:bg-red-200 transition-colors"
                    >
                        Top Up
                    </button>
                )}
            </div>
        </div>
        
        <button 
            onClick={() => {
                if (window.confirm("Start Fresh? This will clear all data.")) {
                    storageService.clearAllData();
                }
            }}
            className="flex items-center gap-3 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 px-4 py-2 w-full transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <RefreshCw size={18} />
          <span className="text-sm">Start Fresh</span>
        </button>

        <button onClick={onLogout} className="flex items-center gap-3 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 px-4 py-2 w-full transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <LogOut size={18} />
          <span className="text-sm">Logout</span>
        </button>
      </div>
    </div>

    {/* API Key Modal */}
    {showKeyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800">
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Key className="text-amber-500" size={24} /> Connect API Key
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Enter your Google Gemini API Key to enable AI features.
                            </p>
                        </div>
                        <button onClick={() => setShowKeyModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={manualKey}
                                onChange={(e) => setManualKey(e.target.value)}
                                placeholder="AIzaSy..."
                                className="w-full pl-4 pr-12 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none font-mono text-sm transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800 flex gap-3">
                            <ShieldCheck className="text-blue-600 dark:text-blue-400 shrink-0" size={18} />
                            <div className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                                Your key is stored securely in your browser's local storage. We do not save it on our servers.
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex gap-3">
                        <a
                            href="https://aistudio.google.com/app/apikey"
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                        >
                            Get Key <ExternalLink size={14} />
                        </a>
                        <button
                            onClick={saveManualKey}
                            disabled={!manualKey}
                            className="flex-1 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-lg text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Save & Connect
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )}
    </>
  );
};
