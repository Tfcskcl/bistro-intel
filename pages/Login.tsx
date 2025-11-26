
import React, { useState } from 'react';
import { ArrowRight, AlertCircle, CheckCircle2, ArrowLeft, Mail, KeyRound, Store, MapPin, ChefHat, ShieldCheck, User as UserIcon, Shield, FileText, Upload, Loader2 } from 'lucide-react';
import { User, UserRole, PlanType } from '../types';
import { authService } from '../services/authService';
import { storageService } from '../services/storageService';
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
  
  // Compliance & Menu Fields
  const [gstNumber, setGstNumber] = useState('');
  const [fssaiNumber, setFssaiNumber] = useState('');
  const [menuFileName, setMenuFileName] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleMenuUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setMenuFileName(e.target.files[0].name);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'forgot') {
        await authService.resetPassword(email);
        setSuccessMsg(`If an account exists for ${email}, you will receive a password reset link shortly.`);
        setLoading(false);
        return;
      }

      if (mode === 'login') {
        const user = await authService.login(email, password);
        
        // CHECK: If this is a Demo Account or new user, seed data if empty
        storageService.seedDemoData(user.id);

        onLogin(user);
      } else if (mode === 'signup') {
        // Create new user
        const newUser: User = {
          id: '', // Will be set by Firebase UID
          name,
          email,
          role: UserRole.OWNER, // Forced to Owner/F&B Entrepreneur
          plan: PlanType.PRO_PLUS, // Give Full Access initially
          restaurantName,
          location,
          cuisineType,
          joinedDate: new Date().toISOString().split('T')[0],
          gstNumber,
          fssaiNumber,
          menuFile: menuFileName,
          isTrial: true,
          queriesUsed: 0,
          queryLimit: 10
        };
        const user = await authService.signup(newUser, password);
        onLogin(user);
      }
    } catch (err: any) {
      console.error(err);
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

  const fillCredentials = (role: 'owner' | 'admin' | 'super_admin') => {
    if (role === 'owner') {
      setEmail('owner@bistro.com');
      setPassword('pass');
    } else if (role === 'admin') {
      setEmail('admin@bistro.com');
      setPassword('pass');
    } else if (role === 'super_admin') {
      setEmail('info@bistroconnect.in');
      setPassword('Bistro@2403');
    }
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 font-sans relative transition-colors duration-200">
      
      <button 
        onClick={onBack}
        className="absolute top-6 left-6 flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors font-medium"
      >
        <ArrowLeft size={20} /> Back to Home
      </button>

      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-fade-in-up my-8">
        {/* Header */}
        <div className="p-8 text-center bg-slate-900 dark:bg-slate-950 border-b border-slate-800">
            <div className="flex justify-center mb-6">
                <Logo light={true} iconSize={32} className="scale-125" />
            </div>
          <p className="text-slate-400 mt-2 text-sm">
            {mode === 'login' ? 'Sign in to access your dashboard' : 
             mode === 'signup' ? 'Start your 10-Query Free Demo' : 
             'Reset your password'}
          </p>
        </div>
        
        {mode === 'forgot' && successMsg ? (
          <div className="p-8 text-center space-y-6 animate-fade-in">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
              <Mail size={32} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Check your inbox</h3>
              <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm leading-relaxed">{successMsg}</p>
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
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {mode === 'signup' && (
              <div className="space-y-2 animate-fade-in">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none transition-all bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800"
                  placeholder="John Doe"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Email Address</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none transition-all bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800"
                placeholder="name@restaurant.com"
              />
            </div>

            {mode !== 'forgot' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Password</label>
                  {mode === 'login' && (
                    <button 
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-medium"
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
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none transition-all bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800"
                  placeholder="••••••••"
                />
              </div>
            )}

            {/* Business Details - Signup Only */}
            {mode === 'signup' && (
                <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-900/30 space-y-4 animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                        <Store size={16} className="text-blue-600 dark:text-blue-400" />
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Business Profile</p>
                    </div>
                    <div className="space-y-3">
                        <input 
                            type="text" 
                            required
                            value={restaurantName}
                            onChange={e => setRestaurantName(e.target.value)}
                            placeholder="Restaurant Name (e.g. Spicy Wok)"
                            className="w-full px-3 py-2 text-sm rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white outline-none focus:border-blue-500"
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
                                    className="w-full pl-7 pr-3 py-2 text-sm rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white outline-none focus:border-blue-500"
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
                                    className="w-full pl-7 pr-3 py-2 text-sm rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>

                        {/* GST & FSSAI */}
                        <div className="flex gap-3">
                            <input 
                                type="text" 
                                value={gstNumber}
                                onChange={e => setGstNumber(e.target.value)}
                                placeholder="GST No (Optional)"
                                className="w-1/2 px-3 py-2 text-sm rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white outline-none focus:border-blue-500"
                            />
                             <input 
                                type="text" 
                                value={fssaiNumber}
                                onChange={e => setFssaiNumber(e.target.value)}
                                placeholder="FSSAI No (Optional)"
                                className="w-1/2 px-3 py-2 text-sm rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white outline-none focus:border-blue-500"
                            />
                        </div>

                        {/* Menu Upload */}
                         <div className="relative border border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-3 hover:bg-white/50 transition-colors">
                            <input 
                                type="file" 
                                onChange={handleMenuUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                accept=".pdf,.jpg,.png"
                            />
                            <div className="flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400">
                                {menuFileName ? (
                                    <span className="text-sm font-bold text-emerald-600 flex items-center gap-1">
                                        <CheckCircle2 size={14} /> {menuFileName}
                                    </span>
                                ) : (
                                    <>
                                        <Upload size={14} />
                                        <span className="text-xs">Upload Menu (PDF/Img)</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Trial Offer Banner for Signup */}
            {mode === 'signup' && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg border border-emerald-100 dark:border-emerald-800 text-center animate-fade-in">
                    <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wide mb-1">
                        Free Demo Included
                    </p>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300">
                        Get instant full access (10 Queries). <br/>
                        Upgrade to Pro+ for ₹24,999/mo later.
                    </p>
                </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3.5 bg-slate-900 dark:bg-emerald-600 text-white font-bold rounded-lg hover:bg-slate-800 dark:hover:bg-emerald-700 active:transform active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} /> Processing...
                </>
              ) : (
                mode === 'login' ? 'Login' : 
                mode === 'signup' ? 'Start Free Demo' : 
                'Send Reset Link'
              )} 
              {!loading && (mode === 'forgot' ? <Mail size={18} /> : <ArrowRight size={18} />)}
            </button>
          </form>
        )}

        <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
            {mode === 'forgot' ? (
               <button 
                  onClick={() => switchMode('login')}
                  className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium flex items-center justify-center gap-2 mx-auto"
               >
                  <ArrowLeft size={16} /> Back to Login
               </button>
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {mode === 'login' ? "Don't have an account?" : "Already have an account?"} 
                <button 
                    onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')} 
                    className="ml-1 text-emerald-600 dark:text-emerald-400 font-bold hover:text-emerald-700 transition-colors"
                >
                    {mode === 'login' ? 'Start Demo' : 'Login'}
                </button>
              </p>
            )}
        </div>

        {/* Quick Access Helper */}
        {mode === 'login' && (
          <div className="bg-white dark:bg-slate-900 p-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide text-center mb-3">
              Quick Demo Access
            </p>
            <div className="flex gap-2 justify-center">
              <button 
                onClick={() => fillCredentials('owner')}
                className="px-6 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1.5"
              >
                <UserIcon size={12} /> F&B Entrepreneur
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
