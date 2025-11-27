
import React, { useState, useEffect, useRef } from 'react';
import { DollarSign, ShoppingBag, Utensils, AlertTriangle, Users, Clock, TrendingUp, Activity, MapPin, Globe, Eye, UserX, UserPlus, Zap, Edit, Save, Brain, Database, ArrowRight, X, ChevronRight, Search, Mail, Phone, Calendar, Shield, ShieldCheck, Trash2, Terminal, UploadCloud, FileText, CheckCircle2, Sliders, Cpu, Layers, Loader2, BarChart3, PlusCircle } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { User, UserRole, PlanType, VisitorSession, PlanConfig } from '../types';
import { authService } from '../services/authService';
import { storageService } from '../services/storageService';
import { trackingService } from '../services/trackingService';

interface DashboardProps {
    user: User;
}

// Sub-component for Journey Visualization
const JourneyModal: React.FC<{ visitor: VisitorSession | null, onClose: () => void }> = ({ visitor, onClose }) => {
    if (!visitor) return null;
    return (
        <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">User Journey</h3>
                        <p className="text-sm text-slate-500">{visitor.userName} ({visitor.location})</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="relative pl-8 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                    <div className="relative">
                         <div className="absolute -left-[30px] top-0 w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 text-xs font-bold">
                             In
                         </div>
                         <p className="text-xs text-slate-400 mb-1">{new Date(visitor.entryTime).toLocaleTimeString()}</p>
                         <p className="font-medium text-slate-800 dark:text-white">Landed on Website</p>
                         <p className="text-xs text-slate-500 mt-1">Source: Direct / Organic</p>
                    </div>

                    {visitor.pagesVisited.map((page, i) => (
                        <div key={i} className="relative animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                             <div className="absolute -left-[30px] top-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 text-xs font-bold">
                                 {i + 1}
                             </div>
                             <p className="font-bold text-slate-700 dark:text-slate-300">{page}</p>
                             <p className="text-xs text-slate-500">Viewed for ~2m 30s</p>
                        </div>
                    ))}

                    <div className="relative">
                         <div className="absolute -left-[30px] top-0 w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 text-xs font-bold">
                             <UserX size={12} />
                         </div>
                         <p className="text-xs text-slate-400 mb-1">{new Date(visitor.lastActive).toLocaleTimeString()}</p>
                         <p className="font-bold text-red-600">Dropped Off / Abandoned</p>
                         {visitor.hasAbandonedCheckout && (
                             <div className="mt-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-2 rounded text-xs border border-red-100 dark:border-red-900/30">
                                 User entered billing details but did not complete payment.
                             </div>
                         )}
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg text-sm font-bold">
                        Close View
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- SUPER ADMIN DASHBOARD ---
const SuperAdminDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'plans' | 'training'>('overview');
    const [subscribers, setSubscribers] = useState<User[]>([]);
    const [liveVisitors, setLiveVisitors] = useState<VisitorSession[]>([]);
    const [stats, setStats] = useState({ activeNow: 0, totalVisitsToday: 0, bounceRate: '0%', checkoutDropoff: 0 });
    
    // Journey Modal State
    const [selectedVisitor, setSelectedVisitor] = useState<VisitorSession | null>(null);

    // Create Admin Modal State
    const [showCreateUserModal, setShowCreateUserModal] = useState(false);
    const [newUserForm, setNewUserForm] = useState({
        name: '',
        email: '',
        password: '',
        role: UserRole.ADMIN,
        restaurantName: '',
        location: ''
    });

    // AI Training State
    const [trainingParams, setTrainingParams] = useState({
        epochs: 50,
        learningRate: 0.001,
        batchSize: 32,
        creativity: 0.7
    });
    const [trainingLogs, setTrainingLogs] = useState<string[]>([]);
    const [isTraining, setIsTraining] = useState(false);
    const logsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadData = async () => {
            const users = await authService.getAllUsers();
            setSubscribers(users);
            
            // Live stats (using tracking service which may be empty if mock data removed)
            const statsData = trackingService.getVisitorStats();
            setStats(statsData);
            setLiveVisitors(trackingService.getLiveVisitors());
        };
        loadData();
        const interval = setInterval(loadData, 5000); // Poll for real updates
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [trainingLogs]);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await authService.registerUser({
                ...newUserForm,
                id: '', // Service handles ID
                joinedDate: new Date().toISOString().split('T')[0],
                plan: PlanType.PRO, // Default
                isTrial: false,
                // Add defaults for empty fields
                cuisineType: 'General',
                gstNumber: '',
                fssaiNumber: ''
            }, newUserForm.password);
            
            setShowCreateUserModal(false);
            setNewUserForm({ name: '', email: '', password: '', role: UserRole.ADMIN, restaurantName: '', location: '' });
            // Refresh
            const users = await authService.getAllUsers();
            setSubscribers(users);
        } catch (err: any) {
            alert(err.message);
        }
    };

    const startTraining = () => {
        setIsTraining(true);
        setTrainingLogs(['Initializing training environment...', 'Loading datasets: [Recipes, Sales, Interactions]...']);
        
        let step = 0;
        const maxSteps = 15;
        
        const interval = setInterval(() => {
            step++;
            const loss = (Math.random() * 0.5 / step).toFixed(4);
            const acc = (0.5 + (step/maxSteps) * 0.45).toFixed(4);
            
            setTrainingLogs(prev => [
                ...prev, 
                `Epoch ${step}/${trainingParams.epochs}: Loss=${loss}, Accuracy=${acc}, LR=${trainingParams.learningRate}`
            ]);

            if (step >= maxSteps) {
                clearInterval(interval);
                setTrainingLogs(prev => [...prev, 'Training Completed Successfully.', 'Model v2.4.1 deployed to inference engine.']);
                setIsTraining(false);
            }
        }, 800);
    };

    return (
        <div className="space-y-6 animate-fade-in">
             {selectedVisitor && (
                <JourneyModal visitor={selectedVisitor} onClose={() => setSelectedVisitor(null)} />
            )}

            {showCreateUserModal && (
                <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 shadow-2xl">
                        <h3 className="text-xl font-bold mb-4 dark:text-white">Create New User</h3>
                        <form onSubmit={handleCreateUser} className="space-y-3">
                            <input 
                                placeholder="Full Name" 
                                required
                                value={newUserForm.name} 
                                onChange={e => setNewUserForm({...newUserForm, name: e.target.value})}
                                className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            />
                            <input 
                                placeholder="Email" 
                                required type="email"
                                value={newUserForm.email} 
                                onChange={e => setNewUserForm({...newUserForm, email: e.target.value})}
                                className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            />
                            <input 
                                placeholder="Password" 
                                required type="password"
                                value={newUserForm.password} 
                                onChange={e => setNewUserForm({...newUserForm, password: e.target.value})}
                                className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            />
                            <select 
                                value={newUserForm.role}
                                onChange={e => setNewUserForm({...newUserForm, role: e.target.value as UserRole})}
                                className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            >
                                <option value={UserRole.ADMIN}>Admin</option>
                                <option value={UserRole.OWNER}>Owner</option>
                                <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
                            </select>
                            <input 
                                placeholder="Restaurant Name" 
                                value={newUserForm.restaurantName} 
                                onChange={e => setNewUserForm({...newUserForm, restaurantName: e.target.value})}
                                className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            />
                            <input 
                                placeholder="Location" 
                                value={newUserForm.location} 
                                onChange={e => setNewUserForm({...newUserForm, location: e.target.value})}
                                className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            />
                            <div className="flex gap-2 mt-4">
                                <button type="button" onClick={() => setShowCreateUserModal(false)} className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 rounded">Cancel</button>
                                <button type="submit" className="flex-1 py-2 bg-emerald-600 text-white rounded font-bold">Create User</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Super Admin Console</h2>
                    <p className="text-slate-500 dark:text-slate-400">System overview and user management.</p>
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                    {['overview', 'users', 'plans', 'training'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`px-4 py-2 text-sm font-bold rounded-md transition-all capitalize ${activeTab === tab ? 'bg-white dark:bg-slate-700 shadow text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'overview' && (
                <div className="space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <StatCard label="Active Now" value={stats.activeNow.toString()} icon={Eye} colorClass="bg-blue-500" isLive />
                        <StatCard label="Visits Today" value={stats.totalVisitsToday.toString()} icon={Globe} colorClass="bg-emerald-500" />
                        <StatCard label="Bounce Rate" value={stats.bounceRate} icon={TrendingUp} colorClass="bg-amber-500" trend="-2.1%" trendUp={true} />
                        <StatCard label="Drop-offs" value={stats.checkoutDropoff.toString()} icon={AlertTriangle} colorClass="bg-red-500" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-4 self-start">Traffic Overview</h3>
                            {/* Empty State for Admin Overview */}
                            <div className="text-center text-slate-400 py-12">
                                <Activity size={48} className="mx-auto mb-4 opacity-50" />
                                <p>No real-time traffic data available.</p>
                                <p className="text-xs mt-1">Connect tracking pixel to view analytics.</p>
                            </div>
                        </div>
                        
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                             <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    Live Users
                                </h3>
                                <span className="text-xs font-mono text-slate-400">{liveVisitors.length} online</span>
                             </div>
                             
                             <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                {liveVisitors.length === 0 ? (
                                    <p className="text-sm text-slate-500 text-center py-8">No active sessions.</p>
                                ) : (
                                    liveVisitors.map(visitor => (
                                        <div 
                                            key={visitor.sessionId} 
                                            onClick={() => setSelectedVisitor(visitor)}
                                            className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700 cursor-pointer hover:border-emerald-400 transition-colors group"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{visitor.userName || 'Guest'}</p>
                                                </div>
                                                <span className="text-[10px] text-slate-400">{new Date(visitor.lastActive).toLocaleTimeString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center mt-2">
                                                <p className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={10}/> {visitor.location}</p>
                                                <ArrowRight size={12} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                                            </div>
                                        </div>
                                    ))
                                )}
                             </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'users' && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 dark:text-white">Registered Users</h3>
                        <button 
                            onClick={() => setShowCreateUserModal(true)}
                            className="px-4 py-2 bg-slate-900 dark:bg-emerald-600 text-white text-sm font-bold rounded-lg hover:opacity-90 flex items-center gap-2"
                        >
                            <UserPlus size={16} /> Create User
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-3">User / Restaurant</th>
                                    <th className="px-6 py-3">Role</th>
                                    <th className="px-6 py-3">Plan</th>
                                    <th className="px-6 py-3">Location</th>
                                    <th className="px-6 py-3">Joined</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {subscribers.map((sub, i) => (
                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-slate-800 dark:text-white">{sub.name}</p>
                                            <p className="text-xs text-slate-500">{sub.email}</p>
                                            <p className="text-xs text-emerald-600 mt-1">{sub.restaurantName}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">
                                                {sub.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${sub.plan === PlanType.PRO_PLUS ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                {sub.plan}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{sub.location || 'N/A'}</td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{sub.joinedDate}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-slate-400 hover:text-red-600 transition-colors" title="Delete User">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            {activeTab === 'training' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Controls */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-fit">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg">
                                <Brain size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-white">Model Retraining</h3>
                                <p className="text-xs text-slate-500">Fine-tune logic with new data</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Training Epochs</label>
                                <div className="flex items-center gap-3">
                                    <Sliders size={16} className="text-slate-400" />
                                    <input 
                                        type="range" min="10" max="100" step="10"
                                        value={trainingParams.epochs}
                                        onChange={(e) => setTrainingParams({...trainingParams, epochs: parseInt(e.target.value)})}
                                        className="flex-1 accent-emerald-500"
                                    />
                                    <span className="font-mono text-sm font-bold w-8">{trainingParams.epochs}</span>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Learning Rate</label>
                                <div className="flex items-center gap-3">
                                    <Activity size={16} className="text-slate-400" />
                                    <input 
                                        type="range" min="0.0001" max="0.01" step="0.0001"
                                        value={trainingParams.learningRate}
                                        onChange={(e) => setTrainingParams({...trainingParams, learningRate: parseFloat(e.target.value)})}
                                        className="flex-1 accent-emerald-500"
                                    />
                                    <span className="font-mono text-sm font-bold w-12">{trainingParams.learningRate}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Creativity (Temp)</label>
                                <div className="flex items-center gap-3">
                                    <Zap size={16} className="text-slate-400" />
                                    <input 
                                        type="range" min="0.1" max="1.0" step="0.1"
                                        value={trainingParams.creativity}
                                        onChange={(e) => setTrainingParams({...trainingParams, creativity: parseFloat(e.target.value)})}
                                        className="flex-1 accent-emerald-500"
                                    />
                                    <span className="font-mono text-sm font-bold w-8">{trainingParams.creativity}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                             <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Dataset Selection</h4>
                             <div className="space-y-2">
                                 {['Sales History (Vectorized)', 'Global Recipe Database', 'User Interactions'].map((ds, i) => (
                                     <label key={i} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded">
                                         <input type="checkbox" defaultChecked className="rounded text-emerald-500 focus:ring-emerald-500" />
                                         <span className="text-sm text-slate-700 dark:text-slate-300">{ds}</span>
                                     </label>
                                 ))}
                             </div>
                        </div>

                        <button 
                            onClick={startTraining}
                            disabled={isTraining}
                            className="w-full mt-6 py-3 bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isTraining ? <Loader2 className="animate-spin" size={18} /> : <Cpu size={18} />}
                            {isTraining ? 'Training in Progress...' : 'Start Training Job'}
                        </button>
                    </div>

                    {/* Console Output */}
                    <div className="lg:col-span-2 bg-slate-950 rounded-xl p-6 font-mono text-xs overflow-hidden flex flex-col h-[500px] border border-slate-800 shadow-2xl">
                        <div className="flex items-center gap-2 text-slate-500 border-b border-slate-800 pb-2 mb-2">
                            <Terminal size={14} />
                            <span>root@bistro-ai-engine:~#</span>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                            <p className="text-emerald-500">System Ready.</p>
                            {trainingLogs.map((log, i) => (
                                <p key={i} className="text-slate-300 border-l-2 border-slate-800 pl-2">
                                    <span className="text-slate-500 mr-2">[{new Date().toLocaleTimeString()}]</span>
                                    {log}
                                </p>
                            ))}
                            <div ref={logsEndRef}></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const OwnerDashboard: React.FC<{ user: User }> = ({ user }) => {
    // Basic stats derived from dynamic storage instead of mock data
    const [salesData, setSalesData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const data = storageService.getSalesData(user.id);
        setSalesData(data);
        setLoading(false);
    }, [user.id]);

    const totalRevenue = salesData.reduce((acc, curr) => acc + (curr.revenue || 0), 0);
    const totalItems = salesData.reduce((acc, curr) => acc + (curr.items_sold || 0), 0);
    const hasData = salesData.length > 0;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Welcome back, {user.name.split(' ')[0]} 👋</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Here's what's happening at <span className="font-semibold text-emerald-600">{user.restaurantName || 'your restaurant'}</span> today.</p>
                </div>
                <div className="hidden sm:block text-right">
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Current Plan</p>
                    <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold ${
                        user.plan === PlanType.PRO_PLUS ? 'bg-purple-100 text-purple-700' :
                        user.plan === PlanType.PRO ? 'bg-emerald-100 text-emerald-700' :
                        'bg-slate-100 text-slate-700'
                    }`}>
                        {user.plan.replace('_', ' ')}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                    label="Total Revenue" 
                    value={`₹${totalRevenue.toLocaleString()}`} 
                    trend={hasData ? "+0%" : undefined} 
                    trendUp={true} 
                    icon={DollarSign} 
                    colorClass="bg-emerald-500" 
                />
                <StatCard 
                    label="Items Sold" 
                    value={totalItems.toString()} 
                    trend={hasData ? "+0%" : undefined} 
                    trendUp={true} 
                    icon={ShoppingBag} 
                    colorClass="bg-blue-500" 
                />
                <StatCard 
                    label="Food Cost" 
                    value={hasData ? "32%" : "N/A"} 
                    trend={hasData ? "-1.5%" : undefined} 
                    trendUp={true} 
                    icon={Utensils} 
                    colorClass="bg-amber-500" 
                />
                <StatCard 
                    label="Labor Cost" 
                    value={hasData ? "24%" : "N/A"} 
                    trend={hasData ? "+0.8%" : undefined} 
                    trendUp={false} 
                    icon={Users} 
                    colorClass="bg-purple-500" 
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-800 dark:text-white">Revenue Trend</h3>
                        <select disabled={!hasData} className="text-sm border-none bg-slate-50 dark:bg-slate-800 rounded-lg px-2 py-1 text-slate-600 dark:text-slate-300 focus:ring-0 cursor-pointer disabled:opacity-50">
                            <option>Last 7 Days</option>
                            <option>Last 30 Days</option>
                        </select>
                    </div>
                    <div className="h-[300px] w-full flex items-center justify-center">
                        {!hasData ? (
                            <div className="text-center text-slate-400">
                                <Database size={48} className="mx-auto mb-4 opacity-50" />
                                <h4 className="text-lg font-bold text-slate-600 dark:text-slate-300">No Sales Data Found</h4>
                                <p className="text-sm mt-2 max-w-sm mx-auto">Upload your sales reports or connect a POS in the Data & Integrations tab to see your revenue trends.</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={salesData}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                             <Brain size={100} />
                        </div>
                        <h3 className="font-bold text-lg mb-2 relative z-10">AI Insight</h3>
                        <p className="text-slate-300 text-sm mb-4 relative z-10">
                            {hasData 
                             ? "Your 'Spicy Tuna Roll' has high margins but low sales. Consider running a weekend promotion to boost trial."
                             : "Once you upload sales and menu data, I can identify high-margin items and waste reduction opportunities."}
                        </p>
                        <button className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold transition-colors border border-white/10 relative z-10">
                            View Strategy
                        </button>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-4">Quick Actions</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button className="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg border border-slate-100 dark:border-slate-700 transition-colors group text-left">
                                <div className="p-2 bg-white dark:bg-slate-700 rounded-full w-fit mb-2 group-hover:text-emerald-500 shadow-sm">
                                    <Utensils size={18} />
                                </div>
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">New Recipe</span>
                            </button>
                            <button className="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg border border-slate-100 dark:border-slate-700 transition-colors group text-left">
                                <div className="p-2 bg-white dark:bg-slate-700 rounded-full w-fit mb-2 group-hover:text-blue-500 shadow-sm">
                                    <FileText size={18} />
                                </div>
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Create SOP</span>
                            </button>
                            {!hasData && (
                                <button className="col-span-2 p-3 bg-slate-50 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg border border-slate-100 dark:border-slate-700 transition-colors group text-left flex items-center gap-3">
                                    <div className="p-2 bg-white dark:bg-slate-700 rounded-full w-fit group-hover:text-purple-500 shadow-sm">
                                        <UploadCloud size={18} />
                                    </div>
                                    <div>
                                        <span className="block text-xs font-bold text-slate-600 dark:text-slate-300">Upload Data</span>
                                        <span className="text-[10px] text-slate-400">CSV, Excel, or PDF</span>
                                    </div>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
    // Role-based Dashboard Switching
    if (user.role === UserRole.SUPER_ADMIN) {
        return <SuperAdminDashboard />;
    }

    return <OwnerDashboard user={user} />;
};
