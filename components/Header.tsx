import React, { useState, useEffect } from 'react';
import { Bell, Search, X, Check } from 'lucide-react';
import { authService } from '../services/authService';
import { storageService } from '../services/storageService';
import { AppNotification } from '../types';

export const Header: React.FC = () => {
  const user = authService.getCurrentUser();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (user) {
        const list = storageService.getNotifications(user.role);
        setNotifications(list);
    }
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkRead = (id: string) => {
      storageService.markAsRead(id);
      if (user) setNotifications(storageService.getNotifications(user.role));
  };

  const handleMarkAllRead = () => {
      if (user) {
          storageService.markAllRead(user.role);
          setNotifications(storageService.getNotifications(user.role));
      }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
      <div className="relative w-96">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="Search recipes, ingredients, or reports..." 
          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        />
      </div>
      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <div className="relative">
            <button 
                onClick={() => setShowDropdown(!showDropdown)}
                className={`relative p-2 transition-colors ${showDropdown ? 'text-slate-800 bg-slate-100 rounded-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
                )}
            </button>

            {showDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-fade-in z-50">
                    <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <span className="text-xs font-bold text-slate-600">Notifications</span>
                        {unreadCount > 0 && (
                            <button onClick={handleMarkAllRead} className="text-[10px] text-emerald-600 font-bold hover:underline">
                                Mark all read
                            </button>
                        )}
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-sm">No notifications</div>
                        ) : (
                            notifications.map(n => (
                                <div key={n.id} className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors ${n.read ? 'opacity-60' : 'bg-white'}`}>
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className={`text-sm font-semibold ${n.type === 'warning' ? 'text-red-600' : 'text-slate-800'}`}>{n.title}</h4>
                                        {!n.read && (
                                            <button onClick={() => handleMarkRead(n.id)} className="text-emerald-500 hover:text-emerald-700">
                                                <Check size={14} />
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 leading-relaxed">{n.message}</p>
                                    <span className="text-[10px] text-slate-300 mt-2 block">{new Date(n.date).toLocaleDateString()}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>

        <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="text-sm hidden md:block">
            <p className="font-semibold text-slate-700">{user?.name || 'User'}</p>
            <p className="text-xs text-slate-400">{user?.role?.replace('_', ' ') || 'Guest'}</p>
          </div>
        </div>
      </div>
    </header>
  );
};