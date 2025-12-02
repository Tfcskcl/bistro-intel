
import React from 'react';
import { LayoutDashboard, ChefHat, FileText, TrendingUp, Database, CreditCard, LogOut, Clapperboard, RefreshCw, GitMerge, BookOpen } from 'lucide-react';
import { AppView, User, PlanType, UserRole } from '../types';
import { Logo } from './Logo';
import { storageService } from '../services/storageService';

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
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, user, onLogout }) => {
  const menuItems: MenuItem[] = [
    { id: AppView.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: AppView.INTEGRATIONS, label: 'Data & Integrations', icon: Database, allowedRoles: [UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.ADMIN] },
    { id: AppView.RECIPES, label: 'Recipe & Costing', icon: ChefHat, allowedRoles: [UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN] },
    { id: AppView.MENU_GENERATOR, label: 'Menu Generator', icon: BookOpen, allowedRoles: [UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN] },
    { id: AppView.SOP, label: 'SOP Studio', icon: FileText, allowedRoles: [UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN] },
    { id: AppView.KITCHEN_WORKFLOW, label: 'Kitchen Workflow', icon: GitMerge, allowedRoles: [UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN] },
    { id: AppView.VIDEO, label: 'Marketing Studio', icon: Clapperboard, allowedRoles: [UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN] },
    { id: AppView.STRATEGY, label: 'Strategy AI', icon: TrendingUp, allowedRoles: [UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN] },
    { id: AppView.BILLING, label: 'Plans & Billing', icon: CreditCard },
  ];

  const allowedItems = menuItems.filter(item => {
      if (item.allowedRoles && !item.allowedRoles.includes(user.role)) return false;
      return true;
  });

  return (
    <div className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen fixed left-0 top-0 z-20 transition-colors duration-200">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <Logo className="mb-2" />
        <p className="text-[10px] text-slate-400 font-mono mt-1">v2.6 (Live)</p>
      </div>

      <div className="flex-1 overflow-y-auto py-6 space-y-1 custom-scrollbar">
        {allowedItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onChangeView(item.id)}
            className={`w-full flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all relative ${
              currentView === item.id
                ? 'text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border-r-4 border-slate-900 dark:border-white'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <item.icon size={20} className={currentView === item.id ? 'text-emerald-600' : ''} />
            {item.label}
          </button>
        ))}
      </div>

      <div className="p-6 border-t border-slate-200 dark:border-slate-800">
        {user.isTrial && (
            <div className="mb-4 bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg border border-emerald-100 dark:border-emerald-800">
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400 mb-1">Free Trial Active</p>
                <button onClick={() => onChangeView(AppView.BILLING)} className="text-[10px] text-emerald-600 dark:text-emerald-300 font-bold hover:underline flex items-center gap-1">
                    Upgrade to Pro <RefreshCw size={10} />
                </button>
            </div>
        )}
        
        {/* Low Balance Warning */}
        {user.credits < 50 && !user.isTrial && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-800 animate-pulse">
                <p className="text-xs font-bold text-red-800 dark:text-red-400 mb-1">Low Balance: {user.credits} CR</p>
                <button onClick={() => onChangeView(AppView.BILLING)} className="w-full text-[10px] bg-red-600 text-white py-1 rounded font-bold hover:bg-red-700">
                    Top Up Now
                </button>
            </div>
        )}

        <button 
            onClick={onLogout}
            className="w-full flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-red-600 transition-colors"
        >
            <LogOut size={18} />
            Sign Out
        </button>
      </div>
    </div>
  );
};
