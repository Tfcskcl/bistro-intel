
import React, { useState, useEffect } from 'react';
import { Bell, Search, X, Check, Moon, Sun } from 'lucide-react';
import { authService } from '../services/authService';
import { storageService } from '../services/storageService';
import { AppNotification } from '../types';

interface HeaderProps {
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({ theme, toggleTheme }) => {
  const user = authService.getCurrentUser();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (user) {
        const list = storageService.getNotifications(user.id, user.role);
        setNotifications(list);
    }
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkRead = (id: string) => {
      if (user) {
          storageService.markAsRead(user.id, id);
          setNotifications(storageService.getNotifications(user.id, user.role));
      }
  };

  const handleMarkAllRead = () => {
      if (user) {
          storageService.markAllRead(user.id, user.role);
          setNotifications(storageService.getNotifications(user.id, user.role));
      }
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-10 transition-colors duration-200">
      <div className="relative flex-1 max-w-xs md:max-w-md mr-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="Search recipes, ingredients, or reports..." 
          className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
        />
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Theme Toggle */}
        <button
            onClick={toggleTheme}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Toggle Dark Mode"
        >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Notification Bell */}
        <div className="relative">
            <button 
                onClick={() => setShowDropdown(!showDropdown)}
                className={`relative p-2 transition-colors ${showDropdown ? 'text-slate-800 bg-slate-100 dark:bg-slate-800 dark:text-slate-200 rounded-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900"></span>
                )}
            </button>

            {showDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-fade-in z-50">
                    <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Notifications</span>
                        {unreadCount > 0 && (
                            <button onClick={handleMarkAllRead} className="text-[10px] text-emerald-600 font-bold hover:underline">
                                Mark all read
                            </button>
                        )}
                    </div>
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-sm">No notifications</div>
                        ) : (
                            notifications.map(n => (
                                <div key={n.id} className={`p-4 border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${n.read ? 'opacity-60' : 'bg-white dark:bg-slate-900'}`}>
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className={`text-sm font-semibold ${n.type === 'warning' ? 'text-red-600' : 'text-slate-800 dark:text-slate-200'}`}>{n.title}</h4>
                                        {!n.read && (
                                            <button onClick={() => handleMarkRead(n.id)} className="text-emerald-500 hover:text-emerald-700">
                                                <Check size={14} />
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{n.message}</p>
                                    <span className="text-[10px] text-slate-300 dark:text-slate-600 mt-2 block">{new Date(n.date).toLocaleDateString()}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>

        <div className="flex items-center gap-3 pl-2 sm:pl-4 border-l border-slate-200 dark:border-slate-700">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="text-sm hidden lg:block">
            <p className="font-semibold text-slate-700 dark:text-slate-200">{user?.name || 'User'}</p>
            <p className="text-xs text-slate-400">{user?.role?.replace('_', ' ') || 'Guest'}</p>
          </div>
        </div>
      </div>
    </header>
  );
};
