
import React from 'react';
import { LayoutDashboard, ChefHat, FileText, TrendingUp, Database, CreditCard, LogOut, Clapperboard } from 'lucide-react';
import { AppView, User, PlanType, UserRole } from '../types';
import { Logo } from './Logo';

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
    { id: AppView.SOP, label: 'SOP Studio', icon: FileText, allowedRoles: [UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN] },
    { id: AppView.VIDEO, label: 'Marketing Studio', icon: Clapperboard, allowedRoles: [UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN] },
    { id: AppView.STRATEGY, label: 'Strategy AI', icon: TrendingUp, requiredPlan: PlanType.PRO_PLUS, allowedRoles: [UserRole.OWNER, UserRole.SUPER_ADMIN] },
    { id: AppView.BILLING, label: 'Plans & Billing', icon: CreditCard, allowedRoles: [UserRole.OWNER] },
  ];

  return (
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
          // Role Check
          if (item.allowedRoles && !item.allowedRoles.includes(user.role)) {
              return null;
          }

          const Icon = item.icon;
          const isActive = currentView === item.id;
          const isLocked = item.requiredPlan && 
            ((item.requiredPlan === PlanType.PRO && user.plan === PlanType.FREE) ||
            (item.requiredPlan === PlanType.PRO_PLUS && user.plan !== PlanType.PRO_PLUS));

          return (
            <button
              key={item.id}
              onClick={() => !isLocked && onChangeView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/50' 
                  : isLocked 
                    ? 'text-slate-400 cursor-not-allowed' 
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium flex-1 text-left">{item.label}</span>
              {isLocked && <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded uppercase">Lock</span>}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
        <div className="px-4 py-2 bg-white dark:bg-slate-800 rounded-lg mb-2 border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center mb-1">
                <p className="text-xs text-slate-500 dark:text-slate-400">Role</p>
                <span className="text-[10px] font-bold uppercase bg-slate-200 dark:bg-slate-700 px-1.5 rounded text-slate-600 dark:text-slate-300">{user.role.replace('_', ' ')}</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Plan</p>
            <p className={`text-sm font-bold ${
                user.plan === PlanType.PRO_PLUS ? 'text-purple-600 dark:text-purple-400' :
                user.plan === PlanType.PRO ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'
            }`}>
                {user.plan === PlanType.PRO_PLUS ? 'PRO+ Operations' :
                 user.plan === PlanType.PRO ? 'PRO' : 'Basic Free'}
            </p>
        </div>
        <button onClick={onLogout} className="flex items-center gap-3 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 px-4 py-2 w-full transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
          <LogOut size={18} />
          <span className="text-sm">Logout</span>
        </button>
      </div>
    </div>
  );
};