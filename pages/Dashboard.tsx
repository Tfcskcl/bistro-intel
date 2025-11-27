
import React, { useState, useEffect, useRef } from 'react';
import { DollarSign, ShoppingBag, Utensils, AlertTriangle, Users, Clock, TrendingUp, Activity, MapPin, Globe, Eye, UserX, UserPlus, Zap, Edit, Save, Brain, Database, ArrowRight, X, ChevronRight, Search, Mail, Phone, Calendar, Shield, ShieldCheck, Trash2, Terminal, UploadCloud, FileText, CheckCircle2, Sliders, Cpu, Layers, Loader2 } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { User, UserRole, PlanType, VisitorSession, PlanConfig } from '../types';
import { authService } from '../services/authService';
import { storageService } from '../services/storageService';
import { trackingService } from '../services/trackingService';
import { MOCK_SALES_DATA } from '../constants';

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
    const [error, setError] = useState<string | null>(null);
    
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

    // Manage User State
    const [managingUser, setManagingUser] = useState<User | null>(null);
    const [editForm, setEditForm] = useState<Partial<User>>({});

    // Plan Editing State
    const [plans, setPlans] = useState<Record<PlanType, PlanConfig>>(storageService.getPlans());
    const [editingPlan, setEditingPlan] = useState<PlanType | null>(null);

    // AI Training State
    const [trainingStatus, setTrainingStatus] = useState<'idle' | 'training' | 'complete'>('idle');
    const [trainingLogs, setTrainingLogs] = useState<string[]>([]);
    
    const logsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [trainingLogs]);

    useEffect(() => {
        const fetchUsers = async () => {
           setError(null);
           try {
              const users = await authService.getAllUsers();
              setSubscribers(users);
           } catch (err: any) {
              console.error("Failed to fetch users", err);
              setError("Unable to load user data. Please check your connection.");
           }
        };
        fetchUsers();
        
        // Initial Load
        updateTrackingData();
    }, [activeTab]);

    const updateTrackingData = () => {
        setLiveVisitors(trackingService.getLiveVisitors());
        setStats(trackingService.getVisitorStats());
    };

    const calculateRevenue = () => {
        return subscribers.reduce((acc, curr) => {
            // Simplified Revenue Calc
            const price = plans[curr.plan]?.price || 0;
            return acc + price;
        }, 0);
    };

    // --- Plan Management Handlers ---
    const handlePlanChange = (type: PlanType, field: keyof PlanConfig, value: any) => {
        const updated = { ...plans, [type]: { ...plans[type], [field]: value } };
        setPlans(updated);
    };

    const savePlans = () => {
        storageService.savePlans(plans);
        setEditingPlan(null);
        alert("Plans updated successfully! Changes are live.");
    };

    // --- Create User Handlers ---
    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const newUser: User = {
                id: `created_${Date.now()}`,
                name: newUserForm.name,
                email: newUserForm.email,
                role: newUserForm.role,
                plan: PlanType.PRO, // Default plan for created admins
                restaurantName: newUserForm.restaurantName,
                location: newUserForm.location,
                joinedDate: new Date().toISOString().split('T')[0],
                isTrial: false
            };
            
            await authService.registerUser(newUser, newUserForm.password);
            
            const users = await authService.getAllUsers();
            setSubscribers(users);
            setShowCreateUserModal(false);
            setNewUserForm({ name: '', email: '', password: '', role: UserRole.ADMIN, restaurantName: '', location: '' });
            alert(`Successfully created new ${newUserForm.role === UserRole.ADMIN ? 'Admin' : 'User'}`);
        } catch (err: any) {
            alert(err.message || 'Failed to create user');
        }
    };

    // --- Manage User Handlers ---
    const openManageUser = (user: User) => {
        setManagingUser(user);
        setEditForm(user);
    };

    const handleSaveUserChanges = async () => {
        if (!managingUser) return;
        const updatedUser = { ...managingUser, ...editForm } as User;
        await authService.updateUser(updatedUser);
        const users = await authService.getAllUsers();
        setSubscribers(users);
        setManagingUser(null);
        alert("User details updated successfully.");
    };

    const handleDeleteUser = async () => {
        if (!managingUser) return;
        if (confirm(`Are you sure you want to permanently delete ${managingUser.name}? This action cannot be undone.`)) {
            await authService.deleteUser(managingUser.id);
            const users = await authService.getAllUsers();
            setSubscribers(users);
            setManagingUser(null);
        }
    };

    const startTraining = () => {
        setTrainingStatus('training');
        setTrainingLogs(['Initializing training sequence...']);
        let step = 0;
        const interval = setInterval(() => {
            step++;
            const logs = [
                "Loading dataset: sales_history_v4.csv...",
                "Normalizing ingredient vectors...",
                `Epoch ${step}/20: Loss ${(Math.random() * 0.5).toFixed(4)} - Accuracy ${(0.7 + (step * 0.01)).toFixed(2)}`,
            ];
            setTrainingLogs(prev => [...prev, logs[step % logs.length]]);
            
            if (step >= 20) {
                clearInterval(interval);
                setTrainingStatus('complete');
                setTrainingLogs(prev => [...prev, "Model Fine-Tuning Complete. Deployed to v2.4 endpoint."]);
            }
        }, 800);
    };

    return (
        <div className="space-y-8 animate-fade-in max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <ShieldCheck className="text-emerald-500" /> Super Admin Console
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage subscribers, monitor live traffic, and fine-tune AI models.</p>
                </div>
                <div className="flex bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                    {['overview', 'users', 'plans', 'training'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`px-4 py-2 rounded-md text-sm font-bold capitalize transition-all ${
                                activeTab === tab 
                                ? 'bg-slate-900 text-white shadow-sm' 
                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'overview' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard 
                            label="Total Revenue" 
                            value={`₹${calculateRevenue().toLocaleString()}`} 
                            icon={DollarSign} 
                            colorClass="bg-emerald-500 text-emerald-500" 
                            trend="+12%" 
                            trendUp={true}
                        />
                        <StatCard 
                            label="Active Subscribers" 
                            value={subscribers.length.toString()} 
                            icon={Users} 
                            colorClass="bg-blue-500 text-blue-500" 
                            trend="+5" 
                            trendUp={true}
                        />
                        <StatCard 
                            label="Live Visitors Now" 
                            value={stats.activeNow.toString()} 
                            icon={Activity} 
                            colorClass="bg-red-500 text-red-500"
                            isLive={true} 
                        />
                        <StatCard 
                            label="AI Queries Today" 
                            value="1,284" 
                            icon={Brain} 
                            colorClass="bg-purple-500 text-purple-500" 
                            trend="+8%" 
                            trendUp={true}
                        />
                    </div>

                    {/* Live Traffic */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Globe size={18} className="text-blue-500" /> Live Visitor Traffic
                            </h3>
                            <button onClick={updateTrackingData} className="text-xs font-bold text-emerald-600 flex items-center gap-1 hover:bg-emerald-50 px-2 py-1 rounded">
                                <Activity size={12} /> Refresh
                            </button>
                        </div>
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                <tr>
                                    <th className="px-6 py-3">User / Location</th>
                                    <th className="px-6 py-3">Current Page</th>
                                    <th className="px-6 py-3">Device</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {liveVisitors.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-slate-400">No active visitors at the moment.</td>
                                    </tr>
                                ) : (
                                    liveVisitors.map((v) => (
                                        <tr key={v.sessionId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-slate-700 dark:text-slate-200">{v.userName || 'Guest'}</p>
                                                <p className="text-xs text-slate-400 flex items-center gap-1"><MapPin size={10} /> {v.location}</p>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs font-mono border border-slate-200 dark:border-slate-700">
                                                    {v.pagesVisited[v.pagesVisited.length - 1] || '/'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{v.device}</td>
                                            <td className="px-6 py-4">
                                                {v.hasAbandonedCheckout ? (
                                                    <span className="text-xs font-bold text-red-600 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded-full">Checkout Dropoff</span>
                                                ) : (
                                                    <span className="text-xs font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-full flex items-center w-fit gap-1">
                                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Online
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    onClick={() => setSelectedVisitor(v)}
                                                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-xs font-bold"
                                                >
                                                    View Journey
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {activeTab === 'training' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                            <Database size={20} className="text-purple-600" /> Fine-Tuning Datasets
                        </h3>
                        <div className="space-y-3 mb-6">
                            <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <FileText className="text-slate-400" />
                                    <div>
                                        <p className="font-bold text-sm text-slate-700 dark:text-slate-200">Global Recipe DB</p>
                                        <p className="text-xs text-slate-500">2.4GB • Updated yesterday</p>
                                    </div>
                                </div>
                                <input type="checkbox" checked readOnly className="accent-emerald-500" />
                            </div>
                            <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <TrendingUp className="text-slate-400" />
                                    <div>
                                        <p className="font-bold text-sm text-slate-700 dark:text-slate-200">Sales Trends (Anonymized)</p>
                                        <p className="text-xs text-slate-500">1.1GB • Live Sync</p>
                                    </div>
                                </div>
                                <input type="checkbox" checked readOnly className="accent-emerald-500" />
                            </div>
                        </div>
                        
                        <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                            <Sliders size={20} className="text-blue-600" /> Hyperparameters
                        </h3>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Epochs</label>
                                <input type="number" value={20} readOnly className="w-full mt-1 p-2 border rounded bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Learning Rate</label>
                                <input type="text" value="0.001" readOnly className="w-full mt-1 p-2 border rounded bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm" />
                            </div>
                        </div>

                        <button 
                            onClick={startTraining}
                            disabled={trainingStatus === 'training'}
                            className="w-full py-3 bg-slate-900 dark:bg-emerald-600 text-white font-bold rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                        >
                            {trainingStatus === 'training' ? <Loader2 className="animate-spin" /> : <Cpu size={20} />}
                            {trainingStatus === 'training' ? 'Training in Progress...' : 'Start Fine-Tuning'}
                        </button>
                    </div>

                    <div className="bg-black text-green-400 p-6 rounded-xl font-mono text-sm overflow-y-auto h-[500px] shadow-2xl border border-slate-800 relative">
                        <div className="absolute top-4 right-4 flex gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        </div>
                        <p className="mb-4 text-slate-500"># System Terminal - v2.4.1</p>
                        {trainingLogs.map((log, i) => (
                            <p key={i} className="mb-2">> {log}</p>
                        ))}
                        <div ref={logsEndRef} />
                        {trainingStatus === 'training' && <span className="animate-pulse">_</span>}
                    </div>
                </div>
            )}

            {/* Journey Modal */}
            {selectedVisitor && (
                <JourneyModal visitor={selectedVisitor} onClose={() => setSelectedVisitor(null)} />
            )}
        </div>
    );
};

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
    if (user.role === UserRole.SUPER_ADMIN) {
        return <SuperAdminDashboard />;
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-8 rounded-2xl shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10">
                    <h2 className="text-3xl font-bold mb-2">Welcome back, {user.name}</h2>
                    <p className="text-slate-300">Here's what's happening at {user.restaurantName || 'your kitchen'} today.</p>
                </div>
            </div>

            {/* Standard Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    label="Today's Revenue" 
                    value="₹24,500" 
                    trend="+12%" 
                    trendUp={true} 
                    icon={DollarSign} 
                    colorClass="bg-emerald-500 text-emerald-500" 
                />
                <StatCard 
                    label="Food Cost" 
                    value="28.4%" 
                    trend="-2.1%" 
                    trendUp={true} 
                    icon={Utensils} 
                    colorClass="bg-blue-500 text-blue-500" 
                />
                <StatCard 
                    label="Orders" 
                    value="92" 
                    trend="+5" 
                    trendUp={true} 
                    icon={ShoppingBag} 
                    colorClass="bg-purple-500 text-purple-500" 
                />
                <StatCard 
                    label="Low Stock Items" 
                    value="3" 
                    trend="Urgent" 
                    trendUp={false} 
                    icon={AlertTriangle} 
                    colorClass="bg-amber-500 text-amber-500" 
                />
            </div>

            {/* Main Chart Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-800 dark:text-white">Revenue Overview</h3>
                        <select className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm px-3 py-1 outline-none text-slate-600 dark:text-slate-300">
                            <option>Last 7 Days</option>
                            <option>Last 30 Days</option>
                        </select>
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={MOCK_SALES_DATA}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12}} tickFormatter={(str) => new Date(str).getDate().toString()} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} tickFormatter={(num) => `₹${num/1000}k`} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                    formatter={(value: number) => [`₹${value}`, 'Revenue']}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="font-bold text-slate-800 dark:text-white mb-6">Quick Actions</h3>
                    <div className="space-y-3">
                        <button className="w-full p-3 flex items-center gap-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors group">
                            <div className="p-2 bg-white dark:bg-slate-700 rounded-lg shadow-sm text-emerald-600 group-hover:text-emerald-700">
                                <Brain size={20} />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-sm text-slate-700 dark:text-slate-200">Create New Recipe</p>
                                <p className="text-xs text-slate-500">AI-assisted costing</p>
                            </div>
                            <ArrowRight size={16} className="ml-auto text-slate-400 group-hover:text-emerald-500" />
                        </button>
                        
                        <button className="w-full p-3 flex items-center gap-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group">
                            <div className="p-2 bg-white dark:bg-slate-700 rounded-lg shadow-sm text-blue-600 group-hover:text-blue-700">
                                <UploadCloud size={20} />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-sm text-slate-700 dark:text-slate-200">Upload Invoices</p>
                                <p className="text-xs text-slate-500">Update inventory</p>
                            </div>
                            <ArrowRight size={16} className="ml-auto text-slate-400 group-hover:text-blue-500" />
                        </button>

                        <button className="w-full p-3 flex items-center gap-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors group">
                            <div className="p-2 bg-white dark:bg-slate-700 rounded-lg shadow-sm text-purple-600 group-hover:text-purple-700">
                                <TrendingUp size={20} />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-sm text-slate-700 dark:text-slate-200">Generate Report</p>
                                <p className="text-xs text-slate-500">Weekly P&L Analysis</p>
                            </div>
                            <ArrowRight size={16} className="ml-auto text-slate-400 group-hover:text-purple-500" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};