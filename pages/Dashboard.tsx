
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DollarSign, ShoppingBag, Utensils, AlertTriangle, Users, Clock, TrendingUp, Activity, MapPin, Globe, Eye, UserX, UserPlus, Zap, Edit, Save, Brain, Database, ArrowRight, X, ChevronRight, Search, Mail, Phone, Calendar, Shield, ShieldCheck, Trash2, Terminal, UploadCloud, FileText, CheckCircle2, Sliders, Cpu, Layers, Loader2, BarChart3, PlusCircle, Wallet, RefreshCw, Instagram, Facebook, Megaphone, Sparkles, Target, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ComposedChart, Line, Bar, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { User, UserRole, PlanType, VisitorSession, PlanConfig, SocialStats, AppView } from '../types';
import { authService } from '../services/authService';
import { storageService } from '../services/storageService';
import { trackingService } from '../services/trackingService';
import { MOCK_SALES_DATA } from '../constants';

interface DashboardProps {
    user: User;
    onChangeView: (view: AppView) => void;
}

// Mock Data for Strategy Impact
const MOCK_STRATEGY_IMPACT = [
    { name: 'Week 1', revenue_base: 42000, revenue_ai: 45000, footfall_base: 120, footfall_ai: 135 },
    { name: 'Week 2', revenue_base: 43000, revenue_ai: 49500, footfall_base: 125, footfall_ai: 148 },
    { name: 'Week 3', revenue_base: 41500, revenue_ai: 52000, footfall_base: 118, footfall_ai: 155 },
    { name: 'Week 4', revenue_base: 44000, revenue_ai: 58000, footfall_base: 130, footfall_ai: 175 },
];

const MOCK_RADAR_DATA = [
    { subject: 'Revenue', A: 100, B: 135, fullMark: 150 },
    { subject: 'Cost Efficiency', A: 90, B: 130, fullMark: 150 },
    { subject: 'Footfall', A: 85, B: 125, fullMark: 150 },
    { subject: 'Retention', A: 95, B: 110, fullMark: 150 },
    { subject: 'Menu Health', A: 80, B: 140, fullMark: 150 },
];

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
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'credits' | 'training'>('overview');
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

    // Credit Management State
    const [creditUpdateUser, setCreditUpdateUser] = useState<string>('');
    const [creditAmount, setCreditAmount] = useState<number>(0);

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
    const trainingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

    // Cleanup training interval on unmount
    useEffect(() => {
        return () => {
            if (trainingIntervalRef.current) {
                clearInterval(trainingIntervalRef.current);
            }
        };
    }, []);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await authService.registerUser({
                ...newUserForm,
                id: '', // Service handles ID
                joinedDate: new Date().toISOString().split('T')[0],
                plan: PlanType.PRO, // Default
                isTrial: false,
                credits: 25, // Default start
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

    const handleCreditUpdate = (userId: string, amount: number) => {
        if (amount === 0) return;
        if (amount > 0) {
            storageService.addCredits(userId, amount, 'Admin Manual Top-up');
        } else {
            storageService.deductCredits(userId, Math.abs(amount), 'Admin Manual Deduction');
        }
        alert("Credits updated successfully.");
        setCreditUpdateUser('');
        setCreditAmount(0);
        // Refresh users
        authService.getAllUsers().then(setSubscribers);
    };

    const startTraining = () => {
        if (isTraining) return;
        
        setIsTraining(true);
        setTrainingLogs(['Initializing training environment...', 'Loading datasets: [Recipes, Sales, Interactions]...']);
        
        let step = 0;
        const maxSteps = 15;
        
        trainingIntervalRef.current = setInterval(() => {
            step++;
            const loss = (Math.random() * 0.5 / step).toFixed(4);
            const acc = (0.5 + (step/maxSteps) * 0.45).toFixed(4);
            
            setTrainingLogs(prev => [
                ...prev, 
                `Epoch ${step}/${trainingParams.epochs}: Loss=${loss}, Accuracy=${acc}, LR=${trainingParams.learningRate}`
            ]);

            if (step >= maxSteps) {
                if (trainingIntervalRef.current) clearInterval(trainingIntervalRef.current);
                setIsTraining(false);
                setTrainingLogs(prev => [...prev, 'Training Complete. Model Saved v2.4.1']);
            }
        }, 800);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Super Admin Console</h1>
            
            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800">
                {['overview', 'users', 'credits', 'training'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`px-6 py-3 text-sm font-bold capitalize transition-colors border-b-2 ${
                            activeTab === tab 
                            ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white' 
                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard label="Total Users" value={subscribers.length.toString()} icon={Users} colorClass="bg-blue-500" />
                    <StatCard label="Live Visitors" value={liveVisitors.length.toString()} icon={Eye} colorClass="bg-emerald-500" isLive />
                    <StatCard label="System Load" value="12%" icon={Cpu} colorClass="bg-purple-500" />
                    <StatCard label="Total Credits" value={subscribers.reduce((acc, u) => acc + (u.credits || 0), 0).toLocaleString()} icon={Wallet} colorClass="bg-yellow-500" />
                </div>
            )}

            {activeTab === 'users' && (
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">User Management</h3>
                        <button onClick={() => setShowCreateUserModal(true)} className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-sm font-bold flex items-center gap-2">
                            <PlusCircle size={16} /> Add User
                        </button>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3 rounded-l-lg">User</th>
                                    <th className="px-4 py-3">Role</th>
                                    <th className="px-4 py-3">Plan</th>
                                    <th className="px-4 py-3">Credits</th>
                                    <th className="px-4 py-3 rounded-r-lg">Joined</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {subscribers.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-4 py-3">
                                            <p className="font-bold text-slate-800 dark:text-white">{user.name}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                                        </td>
                                        <td className="px-4 py-3 text-xs uppercase font-bold text-slate-500">{user.role}</td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-bold rounded-full">
                                                {user.plan}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">{user.credits}</td>
                                        <td className="px-4 py-3 text-slate-500">{new Date(user.joinedDate || '').toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Credit Management Tab */}
            {activeTab === 'credits' && (
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Manual Credit Adjustment</h3>
                    <div className="max-w-md space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Select User</label>
                            <select 
                                value={creditUpdateUser}
                                onChange={(e) => setCreditUpdateUser(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                            >
                                <option value="">Select a user...</option>
                                {subscribers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Amount (Positive to Add, Negative to Deduct)</label>
                            <input 
                                type="number" 
                                value={creditAmount}
                                onChange={(e) => setCreditAmount(parseInt(e.target.value))}
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>
                        <button 
                            onClick={() => handleCreditUpdate(creditUpdateUser, creditAmount)}
                            disabled={!creditUpdateUser || creditAmount === 0}
                            className="w-full py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                        >
                            Update Balance
                        </button>
                    </div>
                </div>
            )}

            {/* AI Training Tab */}
            {activeTab === 'training' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                            <Brain className="text-purple-500" /> Fine-Tune AI Models
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Epochs</label>
                                <input type="number" value={trainingParams.epochs} onChange={(e) => setTrainingParams({...trainingParams, epochs: +e.target.value})} className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Learning Rate</label>
                                <input type="number" step="0.0001" value={trainingParams.learningRate} onChange={(e) => setTrainingParams({...trainingParams, learningRate: +e.target.value})} className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
                            </div>
                            <button 
                                onClick={startTraining}
                                disabled={isTraining}
                                className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-lg flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
                            >
                                {isTraining ? <Loader2 className="animate-spin" size={20} /> : <Terminal size={20} />}
                                {isTraining ? 'Training in Progress...' : 'Start Training Run'}
                            </button>
                        </div>
                    </div>
                    
                    <div className="bg-slate-950 rounded-xl shadow-sm border border-slate-800 p-6 font-mono text-xs text-green-400 h-[400px] overflow-y-auto">
                        {trainingLogs.length === 0 ? (
                            <p className="text-slate-600 opacity-50">// System Idle. Ready for commands.</p>
                        ) : (
                            trainingLogs.map((log, i) => (
                                <p key={i} className="mb-1 border-l-2 border-slate-800 pl-2">{log}</p>
                            ))
                        )}
                        <div ref={logsEndRef} />
                    </div>
                </div>
            )}

            {/* Modals */}
            {showCreateUserModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-md p-6 shadow-2xl">
                        <h3 className="text-lg font-bold mb-4 dark:text-white">Create New User</h3>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <input type="text" placeholder="Name" required value={newUserForm.name} onChange={e => setNewUserForm({...newUserForm, name: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                            <input type="email" placeholder="Email" required value={newUserForm.email} onChange={e => setNewUserForm({...newUserForm, email: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                            <input type="password" placeholder="Password" required value={newUserForm.password} onChange={e => setNewUserForm({...newUserForm, password: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                            <select value={newUserForm.role} onChange={e => setNewUserForm({...newUserForm, role: e.target.value as UserRole})} className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                                <option value={UserRole.ADMIN}>Admin</option>
                                <option value={UserRole.OWNER}>Owner</option>
                                <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
                            </select>
                            <div className="flex gap-2 justify-end pt-4">
                                <button type="button" onClick={() => setShowCreateUserModal(false)} className="px-4 py-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded font-bold hover:bg-emerald-700">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {selectedVisitor && (
                <JourneyModal visitor={selectedVisitor} onClose={() => setSelectedVisitor(null)} />
            )}
        </div>
    );
};

// --- OWNER/ADMIN DASHBOARD ---
export const Dashboard: React.FC<DashboardProps> = ({ user, onChangeView }) => {
    if (user.role === UserRole.SUPER_ADMIN) {
        return <SuperAdminDashboard />;
    }

    // --- OWNER / ADMIN VIEW LOGIC ---
    const [dateRange, setDateRange] = useState<'7d' | '30d'>('7d');
    
    // Retrieve data
    const rawSalesData = storageService.getSalesData(user.id).length > 0 ? storageService.getSalesData(user.id) : MOCK_SALES_DATA;
    
    // Filter logic
    const salesData = useMemo(() => {
        const days = dateRange === '7d' ? 7 : 30;
        return rawSalesData.slice(-days);
    }, [rawSalesData, dateRange]);

    const socialStats = storageService.getSocialStats(user.id);
    
    // Derived Stats
    const totalRevenue = salesData.reduce((acc: number, curr: any) => acc + curr.revenue, 0);
    const totalOrders = salesData.reduce((acc: number, curr: any) => acc + curr.items_sold, 0);
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
    
    // Alerts (using Notifications)
    const notifications = storageService.getNotifications(user.id, user.role);
    const recentAlerts = notifications.filter(n => !n.read && n.type === 'warning').slice(0, 3);

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Welcome Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {user.name.split(' ')[0]}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Here's what's happening in your restaurant today.</p>
                </div>
                <button 
                    onClick={() => onChangeView(AppView.RECIPES)}
                    className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors shadow-lg shadow-slate-900/10"
                >
                    <PlusCircle size={16} /> New Recipe
                </button>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    label="Total Revenue (7d)" 
                    value={`₹${totalRevenue.toLocaleString()}`} 
                    trend="+12.5%" 
                    trendUp={true} 
                    icon={DollarSign} 
                    colorClass="text-emerald-600 bg-emerald-100" 
                />
                <StatCard 
                    label="Total Orders" 
                    value={totalOrders.toString()} 
                    trend="+5.2%" 
                    trendUp={true} 
                    icon={ShoppingBag} 
                    colorClass="text-blue-600 bg-blue-100" 
                />
                <StatCard 
                    label="Avg. Order Value" 
                    value={`₹${avgOrderValue}`} 
                    trend="-2.1%" 
                    trendUp={false} 
                    icon={TrendingUp} 
                    colorClass="text-purple-600 bg-purple-100" 
                />
                <StatCard 
                    label="Food Cost" 
                    value="32%" 
                    trend="-1.5%" 
                    trendUp={true} // Lower is better for cost
                    icon={Utensils} 
                    colorClass="text-orange-600 bg-orange-100" 
                />
            </div>

            {/* Charts & Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-800 dark:text-white text-lg">Sales Overview</h3>
                        <select 
                            value={dateRange} 
                            onChange={(e) => setDateRange(e.target.value as '7d' | '30d')}
                            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded-lg px-3 py-1 outline-none"
                        >
                            <option value="7d">Last 7 Days</option>
                            <option value="30d">Last 30 Days</option>
                        </select>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={salesData}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                <XAxis 
                                    dataKey="date" 
                                    tickFormatter={(str) => new Date(str).getDate().toString()} 
                                    stroke="#94a3b8" 
                                    tick={{fontSize: 12}} 
                                    axisLine={false} 
                                    tickLine={false} 
                                    dy={10} 
                                />
                                {/* Left Axis for Revenue */}
                                <YAxis 
                                    yAxisId="revenue"
                                    stroke="#10b981" 
                                    tick={{fontSize: 12}} 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tickFormatter={(val) => `₹${val/1000}k`} 
                                />
                                {/* Right Axis for Items Sold */}
                                <YAxis 
                                    yAxisId="items"
                                    orientation="right"
                                    stroke="#3b82f6" 
                                    tick={{fontSize: 12}} 
                                    axisLine={false} 
                                    tickLine={false} 
                                />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(value: number, name: string) => {
                                        if (name === 'Revenue') return [`₹${value}`, name];
                                        return [value, name];
                                    }}
                                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                                />
                                <Legend />
                                <Area 
                                    yAxisId="revenue"
                                    type="monotone" 
                                    dataKey="revenue" 
                                    name="Revenue"
                                    stroke="#10b981" 
                                    strokeWidth={3} 
                                    fillOpacity={1} 
                                    fill="url(#colorRevenue)" 
                                />
                                <Line
                                    yAxisId="items"
                                    type="monotone"
                                    dataKey="items_sold"
                                    name="Items Sold"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: "#3b82f6", strokeWidth: 2, stroke: "#fff" }}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Side Panel: Alerts & Social */}
                <div className="space-y-6">
                    {/* Action Needed */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
                        <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-4 flex items-center gap-2">
                            <AlertTriangle size={20} className="text-amber-500" /> Action Needed
                        </h3>
                        <div className="space-y-3">
                            {recentAlerts.length > 0 ? recentAlerts.map(alert => (
                                <div key={alert.id} className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-lg">
                                    <p className="text-sm font-semibold text-slate-800 dark:text-white">{alert.title}</p>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{alert.message}</p>
                                </div>
                            )) : (
                                <div className="text-center py-6 text-slate-400">
                                    <CheckCircle2 size={32} className="mx-auto mb-2 opacity-50 text-emerald-500" />
                                    <p className="text-sm">All systems normal</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Social Snapshot */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-800 dark:text-white text-lg">Social Reach</h3>
                            <button onClick={() => onChangeView(AppView.INTEGRATIONS)} className="text-xs text-blue-600 hover:underline">Manage</button>
                        </div>
                        
                        {socialStats.length > 0 ? (
                            <div className="space-y-4">
                                {socialStats.map(stat => (
                                    <div key={stat.platform} className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full text-white ${stat.platform === 'instagram' ? 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600' : stat.platform === 'facebook' ? 'bg-blue-600' : 'bg-green-600'}`}>
                                            {stat.platform === 'instagram' ? <Instagram size={16}/> : stat.platform === 'facebook' ? <Facebook size={16}/> : <MapPin size={16}/>}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 capitalize">{stat.platform.replace('_', ' ')}</p>
                                            <p className="text-xs text-slate-500">{stat.handle}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-slate-800 dark:text-white">{stat.metrics[0].value}</p>
                                            <p className={`text-[10px] font-bold ${stat.metrics[0].trend && stat.metrics[0].trend > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {stat.metrics[0].trend && stat.metrics[0].trend > 0 ? '+' : ''}{stat.metrics[0].trend}%
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6">
                                <Megaphone size={32} className="mx-auto mb-2 text-slate-300" />
                                <p className="text-sm text-slate-500 mb-2">No accounts linked</p>
                                <button onClick={() => onChangeView(AppView.INTEGRATIONS)} className="text-xs bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 py-1.5 rounded-lg font-bold">Connect Now</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* AI Strategy Impact Forecast */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-white text-lg flex items-center gap-2">
                            <Sparkles size={20} className="text-purple-500" /> AI Strategy Impact Forecast
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Projected business outcomes over the next 4 weeks based on active strategies.</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-xs font-bold border border-purple-100 dark:border-purple-800">
                        <Brain size={14} /> Confidence Score: 94%
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Forecast Chart */}
                    <div className="lg:col-span-2 h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={MOCK_STRATEGY_IMPACT}>
                                <defs>
                                    <linearGradient id="colorAiRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                <XAxis 
                                    dataKey="name" 
                                    stroke="#94a3b8" 
                                    tick={{fontSize: 12}} 
                                    axisLine={false} 
                                    tickLine={false} 
                                    dy={10} 
                                />
                                <YAxis 
                                    yAxisId="left"
                                    stroke="#64748b" 
                                    tick={{fontSize: 12}} 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tickFormatter={(val) => `₹${val/1000}k`}
                                />
                                <YAxis 
                                    yAxisId="right"
                                    orientation="right"
                                    stroke="#f59e0b" 
                                    tick={{fontSize: 12}} 
                                    axisLine={false} 
                                    tickLine={false} 
                                />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(value: number, name: string) => {
                                        if (name.includes('Revenue')) return [`₹${value.toLocaleString()}`, name];
                                        return [value, name];
                                    }}
                                />
                                <Legend />
                                
                                {/* Baseline Revenue */}
                                <Area 
                                    yAxisId="left"
                                    type="monotone" 
                                    dataKey="revenue_base" 
                                    name="Baseline Revenue" 
                                    stroke="#94a3b8" 
                                    strokeDasharray="5 5" 
                                    fill="transparent" 
                                    strokeWidth={2}
                                />
                                
                                {/* AI Optimized Revenue */}
                                <Area 
                                    yAxisId="left"
                                    type="monotone" 
                                    dataKey="revenue_ai" 
                                    name="AI Optimized Revenue" 
                                    stroke="#8b5cf6" 
                                    strokeWidth={3}
                                    fill="url(#colorAiRev)"
                                />

                                {/* Footfall Trend */}
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="footfall_ai"
                                    name="Projected Footfall"
                                    stroke="#f59e0b"
                                    strokeWidth={2}
                                    dot={{r: 4}}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Impact Metrics Side Panel */}
                    <div className="space-y-4 flex flex-col h-full">
                        {/* Radar Chart for Health Score */}
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-2 border border-slate-100 dark:border-slate-700 flex-1 relative min-h-[200px]">
                            <p className="absolute top-2 left-3 text-xs font-bold text-slate-500 uppercase tracking-wide z-10">Operational Health Score</p>
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="65%" data={MOCK_RADAR_DATA}>
                                    <PolarGrid stroke="#e2e8f0" opacity={0.5} />
                                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                                    <Radar name="Current" dataKey="A" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.3} />
                                    <Radar name="AI Target" dataKey="B" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                                    <Legend wrapperStyle={{ fontSize: '10px', marginTop: '10px' }} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800">
                                <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase mb-1">Rev Lift</p>
                                <div className="flex items-center gap-1">
                                    <span className="text-lg font-black text-emerald-700 dark:text-emerald-300">+12%</span>
                                    <ArrowUpRight size={14} className="text-emerald-600" />
                                </div>
                            </div>
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                                <p className="text-[10px] font-bold text-blue-800 dark:text-blue-400 uppercase mb-1">Cost Save</p>
                                <div className="flex items-center gap-1">
                                    <span className="text-lg font-black text-blue-700 dark:text-blue-300">5%</span>
                                    <ArrowDownRight size={14} className="text-blue-600" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
