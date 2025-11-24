import React, { useState } from 'react';
import { ArrowRight, AlertCircle, CheckCircle2, ArrowLeft, Mail, KeyRound, Store, MapPin, ChefHat, ShieldCheck, User as UserIcon, Shield } from 'lucide-react';
import { User, UserRole, PlanType } from '../types';
import { authService } from '../services/authService';
import { Logo } from '../components/Logo';

interface LoginProps {
  onLogin: (user: User) => void;
  onBack: () => void;
}

type AuthMode = 'login' | 'signup' | 'forgot';

export const Login: React.FC<LoginProps> = ({ onLogin, onBack }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  // New fields for restaurant profile
  const [restaurantName, setRestaurantName] = useState('');
  const [location, setLocation] = useState('');
  const [cuisineType, setCuisineType] = useState('');

  const [role, setRole] = useState<UserRole>(UserRole.OWNER);
  const [plan, setPlan] = useState<PlanType>(PlanType.FREE);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      // Simulate network delay for feel
      await new Promise(resolve => setTimeout(resolve, 600));

      if (mode === 'forgot') {
        await authService.resetPassword(email);
        setSuccessMsg(`If an account exists for ${email}, you will receive a password reset link shortly.`);
        setLoading(false);
        return;
      }

      if (mode === 'login') {
        const user = authService.login(email, password);
        onLogin(user);
      } else if (mode === 'signup') {
        const newUser: User = {
          id: 'usr_' + Date.now(),
          name,
          email,
          role,
          plan,
          restaurantName,
          location,
          cuisineType,
          joinedDate: new Date().toISOString().split('T')[0]
        };
        const user = authService.signup(newUser, password);
        onLogin(user);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      if (mode !== 'forgot') setLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setSuccessMsg(null);
  };

  const fillCredentials = (role: 'owner' | 'admin' | 'super') => {
    if (role === 'owner') {
      setEmail('owner@bistro.com');
      setPassword('pass');
    } else if (role === 'admin') {
      setEmail('admin@bistro.com');
      setPassword('pass');
    } else {
      setEmail('super@bistro.com');
      setPassword('pass');
    }
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans relative">
      
      <button 
        onClick={onBack}
        className="absolute top-6 left-6 flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-medium"
      >
        <ArrowLeft size={20} /> Back to Home
      </button>

      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-fade-in-up my-8">
        {/* Header */}
        <div className="p-8 text-center bg-slate-900">
            <div className="flex justify-center mb-6">
                <Logo light={true} iconSize={32} className="scale-125" />
            </div>
          <p className="text-slate-400 mt-2 text-sm">
            {mode === 'login' ? 'Sign in to access your dashboard' : 
             mode === 'signup' ? 'Create your restaurant workspace' : 
             'Reset your password'}
          </p>
        </div>
        
        {mode === 'forgot' && successMsg ? (
          <div className="p-8 text-center space-y-6 animate-fade-in">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
              <Mail size={32} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Check your inbox</h3>
              <p className="text-slate-600 mt-2 text-sm leading-relaxed">{successMsg}</p>
            </div>
            <button 
              onClick={() => switchMode('login')}
              className="w-full py-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-all"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {mode === 'signup' && (
              <div className="space-y-2 animate-fade-in">
                <label className="text-sm font-bold text-slate-700">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none transition-all bg-slate-50 focus:bg-white"
                  placeholder="John Doe"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Email Address</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none transition-all bg-slate-50 focus:bg-white"
                placeholder="name@restaurant.com"
              />
            </div>

            {mode !== 'forgot' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-slate-700">Password</label>
                  {mode === 'login' && (
                    <button 
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none transition-all bg-slate-50 focus:bg-white"
                  placeholder="••••••••"
                />
              </div>
            )}

            {/* Business Details - Signup Only */}
            {mode === 'signup' && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-4 animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                        <Store size={16} className="text-blue-600" />
                        <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Business Details</p>
                    </div>
                    <div className="space-y-3">
                        <input 
                            type="text" 
                            required
                            value={restaurantName}
                            onChange={e => setRestaurantName(e.target.value)}
                            placeholder="Restaurant Name (e.g. Spicy Wok)"
                            className="w-full px-3 py-2 text-sm rounded border border-slate-300 outline-none focus:border-blue-500"
                        />
                        <div className="flex gap-3">
                            <div className="flex-1 relative">
                                <MapPin size={14} className="absolute left-2 top-2.5 text-slate-400"/>
                                <input 
                                    type="text" 
                                    required
                                    value={location}
                                    onChange={e => setLocation(e.target.value)}
                                    placeholder="City / Area"
                                    className="w-full pl-7 pr-3 py-2 text-sm rounded border border-slate-300 outline-none focus:border-blue-500"
                                />
                            </div>
                             <div className="flex-1 relative">
                                <ChefHat size={14} className="absolute left-2 top-2.5 text-slate-400"/>
                                <input 
                                    type="text" 
                                    required
                                    value={cuisineType}
                                    onChange={e => setCuisineType(e.target.value)}
                                    placeholder="Cuisine Type"
                                    className="w-full pl-7 pr-3 py-2 text-sm rounded border border-slate-300 outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Role & Plan Selection - Signup Only */}
            {mode === 'signup' && (
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4 animate-fade-in">
                <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Plan Selection</p>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Role</label>
                        <select 
                            value={role} 
                            onChange={e => setRole(e.target.value as UserRole)}
                            className="w-full text-sm p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                        >
                            <option value={UserRole.OWNER}>Owner</option>
                            <option value={UserRole.ADMIN}>Admin</option>
                            <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Plan</label>
                        <select 
                            value={plan} 
                            onChange={e => setPlan(e.target.value as PlanType)}
                            className="w-full text-sm p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                        >
                            <option value={PlanType.FREE}>Basic (1 Free Query, then ₹199)</option>
                            <option value={PlanType.PRO}>Pro (₹9,999/mo)</option>
                            <option value={PlanType.PRO_PLUS}>Pro+ (₹24,999/mo)</option>
                        </select>
                    </div>
                </div>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 active:transform active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : (
                mode === 'login' ? 'Login' : 
                mode === 'signup' ? 'Create Account' : 
                'Send Reset Link'
              )} 
              {!loading && (mode === 'forgot' ? <Mail size={18} /> : <ArrowRight size={18} />)}
            </button>
          </form>
        )}

        <div className="p-6 text-center bg-slate-50 border-t border-slate-100">
            {mode === 'forgot' ? (
               <button 
                  onClick={() => switchMode('login')}
                  className="text-sm text-slate-600 hover:text-slate-900 font-medium flex items-center justify-center gap-2 mx-auto"
               >
                  <ArrowLeft size={16} /> Back to Login
               </button>
            ) : (
              <p className="text-sm text-slate-600">
                {mode === 'login' ? "Don't have an account?" : "Already have an account?"} 
                <button 
                    onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')} 
                    className="ml-1 text-emerald-600 font-bold hover:text-emerald-700 transition-colors"
                >
                    {mode === 'login' ? 'Sign Up' : 'Login'}
                </button>
              </p>
            )}
        </div>

        {/* Quick Access Helper */}
        {mode === 'login' && (
          <div className="bg-white p-4 border-t border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide text-center mb-3">
              Quick Demo Access
            </p>
            <div className="flex gap-2 justify-center">
              <button 
                onClick={() => fillCredentials('owner')}
                className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-600 transition-colors flex items-center gap-1.5"
              >
                <UserIcon size={12} /> Owner
              </button>
              <button 
                onClick={() => fillCredentials('admin')}
                className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-600 transition-colors flex items-center gap-1.5"
              >
                <Shield size={12} /> Admin
              </button>
              <button 
                onClick={() => fillCredentials('super')}
                className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-600 transition-colors flex items-center gap-1.5 border border-slate-200"
              >
                <ShieldCheck size={12} className="text-emerald-600" /> Super Admin
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};