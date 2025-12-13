

import React, { useState, useEffect } from 'react';
import { StatCard } from '../components/StatCard';
import { User, AppView, UserRole, SystemActivity, VisitorSession, PlanType } from '../types';
import { storageService, storageEvents } from '../services/storageService';
import { analyzeUnifiedRestaurantData } from '../services/geminiService';
import { authService } from '../services/authService';
import { trackingService } from '../services/trackingService';
import { Activity, AlertTriangle, DollarSign, ShoppingBag, TrendingUp, Sparkles, Brain, ArrowRight, Utensils, FileText, BarChart3, Clock, Calendar, Users, MapPin, Globe, Zap, List, AlertOctagon, MousePointer2, Smartphone, Monitor, CheckCircle2, ClipboardList, ListTodo, Shield, Laptop, Tablet, Lock, Store } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend, BarChart, Bar } from 'recharts';

// Colors
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

// Mock Data remains for specific charts where real data might be sparse in demo
const MOCK_CATEGORY_DATA = [
    { name: 'Mains', value: 45 },
    { name: 'Starters', value: 25 },
    { name: 'Beverages', value: 20 },
    { name: 'Desserts', value: 10 },
];

const MOCK_TOP_ITEMS = [
    { name: 'Truffle Risotto', qty: 124, revenue: 68200 },
    { name: 'Avocado Toast', qty: 98, revenue: 34300 },
    { name: 'Butter Chicken', qty: 85, revenue: 38250 },
    { name: 'Mango Smoothie', qty: 76, revenue: 19000 },
];

// --- COMPONENTS ---

const QuickActions = ({ onChangeView }: { onChangeView: (v: AppView) => void }) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <button onClick={() => onChangeView(AppView.RECIPES)} className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all group text-left shadow-sm hover:shadow-md">
            <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Utensils size={20} />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">New Recipe</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Cost & engineer a dish</p>
        </button>
        <button onClick={() => onChangeView(AppView.SOP)} className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all group text-left shadow-sm hover:shadow-md">
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <FileText size={20} />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">Create SOP</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Standardize procedures</p>
        </button>
        <button onClick={() => onChangeView(AppView.INVENTORY)} className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-purple-500 dark:hover:border-purple-500 transition-all group text-left shadow-sm hover:shadow-md">
            <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <ShoppingBag size={20} />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">Check Stock</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">View low stock alerts</p>
        </button>
        <button onClick={() => onChangeView(AppView.STRATEGY)} className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-500 transition-all group text-left shadow-sm hover:shadow-md">
            <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Brain size={20} />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">AI Strategy</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Get growth insights</p>
        </button>
    </div>
);

const OperationalPulse = ({ unifiedData }: { unifiedData: any }) => (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-3"><Activity className="text-blue-500"/> Operational Pulse</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase">Efficiency</span>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{unifiedData?.workflow_analysis?.efficiency || 85}%</p>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg">
                <span className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase">Compliance</span>
                <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{((unifiedData?.sop_compliance?.rate || 0)*100).toFixed(0)}%</p>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg">
                <span className="text-xs font-bold text-red-800 dark:text-red-400 uppercase">Alerts</span>
                <p className="text-2xl font-black text-red-600 dark:text-red-400">{unifiedData?.sop_compliance?.violations?.length || 0}</p>
            </div>
        </div>
    </div>
);

const SystemIntelligence = ({ unifiedData }: { unifiedData: any }) => (
    <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl -mr-10 -mt-10"></div>
        <h3 className="font-bold flex items-center gap-2 mb-4 relative z-10"><Brain className="text-purple-400"/> AI System Intelligence</h3>
        <p className="text-sm text-slate-300 mb-4 relative z-10">{unifiedData?.summary || "System analyzing..."}</p>
        <div className="space-y-2 relative z-10">
            {unifiedData?.wastage_root_causes?.map((cause: string, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs bg-white/10 p-2 rounded backdrop-blur-sm border border-white/5">
                    <AlertTriangle size={12} className="text-yellow-400"/> {cause}
                </div>
            ))}
        </div>
    </div>
);

const MultiOutletPortal: React.FC<{ user: User }> = ({ user }) => {
    // Mock Outlet Data
    const outlets = [
        { id: '1', name: user.restaurantName || 'Main Hub', sales: 45000, efficiency: 92, status: 'Online', alerts: 0 },
        { id: '2', name: 'Downtown Express', sales: 28500, efficiency: 88, status: 'Online', alerts: 2 },
        { id: '3', name: 'Westside Cloud Kitchen', sales: 32000, efficiency: 76, status: 'Warning', alerts: 5 },
    ];

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-xl flex justify-between items-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                <div className="relative z-10">
                    <h2 className="text-2xl font-bold flex items-center gap-2"><Store className="text-emerald-400"/> Enterprise Operations Portal</h2>
                    <p className="text-slate-400 mt-1">Real-time oversight for 3 active outlets</p>
                </div>
                <div className="relative z-10 text-right">
                    <p className="text-xs uppercase font-bold text-slate-400">Network Revenue (Today)</p>
                    <p className="text-3xl font-black">₹1,05,500</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {outlets.map(outlet => (
                    <div key={outlet.id} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-lg ${outlet.status === 'Online' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                <Store size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white">{outlet.name}</h3>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <span className={`w-2 h-2 rounded-full ${outlet.status === 'Online' ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`}></span>
                                    {outlet.status}
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-8">
                            <div className="text-right">
                                <p className="text-xs text-slate-500 uppercase font-bold">Sales</p>
                                <p className="text-lg font-bold text-slate-900 dark:text-white">₹{outlet.sales.toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-500 uppercase font-bold">Efficiency</p>
                                <p className={`text-lg font-bold ${outlet.efficiency > 85 ? 'text-emerald-600' : 'text-amber-600'}`}>{outlet.efficiency}%</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-500 uppercase font-bold">Alerts</p>
                                <p className={`text-lg font-bold ${outlet.alerts > 0 ? 'text-red-600' : 'text-slate-400'}`}>{outlet.alerts}</p>
                            </div>
                            <button className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-400 hover:text-blue-600 transition-colors">
                                <ArrowRight size={20} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- DASHBOARD VARIANTS ---

const TenantDashboard: React.FC<{ user: User, onChangeView: (v: AppView) => void }> = ({ user, onChangeView }) => {
    const [unifiedData, setUnifiedData] = useState<any>(null);
    const [sales, setSales] = useState<any[]>([]);
    const [recentActivity, setRecentActivity] = useState<SystemActivity[]>([]);
    const [timeRange, setTimeRange] = useState<'7d'|'30d'>('30d');

    useEffect(() => {
        const load = async () => {
            const allSales = storageService.getSalesData(user.id);
            const slicedSales = timeRange === '7d' ? allSales.slice(-7) : allSales.slice(-30);
            setSales(slicedSales);
            
            const data = await analyzeUnifiedRestaurantData({});
            setUnifiedData(data);

            const acts = storageService.getUserActivity(user.id);
            setRecentActivity(acts.slice(0, 5)); // Top 5
        };
        load();
        const handler = () => load();
        window.addEventListener(storageEvents.DATA_UPDATED, handler);
        return () => window.removeEventListener(storageEvents.DATA_UPDATED, handler);
    }, [user.id, timeRange]);

    const totalRevenue = sales.reduce((acc, curr) => acc + curr.revenue, 0);
    const totalOrders = sales.reduce((acc, curr) => acc + curr.items_sold, 0);

    // If Pro+, show multi-outlet portal view option
    const [showMultiOutlet, setShowMultiOutlet] = useState(false);

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
                        Good {new Date().getHours() < 12 ? 'Morning' : 'Evening'}, {user.name.split(' ')[0]} 👋
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Here's your operational overview.</p>
                </div>
                <div className="flex gap-4">
                    {user.plan === PlanType.PRO_PLUS && (
                        <button 
                            onClick={() => setShowMultiOutlet(!showMultiOutlet)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${showMultiOutlet ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}
                        >
                            <Store size={16} /> {showMultiOutlet ? 'Detailed View' : 'Multi-Outlet View'}
                        </button>
                    )}
                    <div className="flex bg-white dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <button onClick={() => setTimeRange('7d')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${timeRange === '7d' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow' : 'text-slate-500 dark:text-slate-400'}`}>Last 7 Days</button>
                        <button onClick={() => setTimeRange('30d')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${timeRange === '30d' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow' : 'text-slate-500 dark:text-slate-400'}`}>Last 30 Days</button>
                    </div>
                </div>
            </div>

            {showMultiOutlet && user.plan === PlanType.PRO_PLUS ? (
                <MultiOutletPortal user={user} />
            ) : (
                <>
                    <QuickActions onChangeView={onChangeView} />

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard label="Total Revenue" value={`₹${totalRevenue.toLocaleString()}`} trend="+12.5%" trendUp={true} icon={DollarSign} colorClass="bg-emerald-100 text-emerald-600" />
                        <StatCard label="Total Orders" value={totalOrders.toString()} trend="+8.2%" trendUp={true} icon={ShoppingBag} colorClass="bg-blue-100 text-blue-600" />
                        <StatCard label="Food Cost" value="32.4%" trend="-1.2%" trendUp={true} icon={TrendingUp} colorClass="bg-amber-100 text-amber-600" />
                        <StatCard label="Avg. Ticket Size" value={`₹${totalOrders ? (totalRevenue/totalOrders).toFixed(0) : 0}`} trend="+3.1%" trendUp={true} icon={BarChart3} colorClass="bg-purple-100 text-purple-600" />
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-[350px]">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><TrendingUp className="text-emerald-500" size={20}/> Revenue Trend</h3>
                                </div>
                                <ResponsiveContainer width="100%" height="85%">
                                    <ComposedChart data={sales.length ? sales : [{date:'1', revenue:0, items_sold: 0}]}>
                                        <defs><linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                        <XAxis dataKey="date" hide axisLine={false} tickLine={false} />
                                        <YAxis yAxisId="left" hide />
                                        <YAxis yAxisId="right" orientation="right" hide />
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                        <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" name="Revenue (₹)" />
                                        <Line yAxisId="right" type="monotone" dataKey="items_sold" stroke="#3b82f6" strokeWidth={2} dot={{r:3, fill:'#3b82f6'}} name="Items Sold" />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                            <OperationalPulse unifiedData={unifiedData} />
                        </div>
                        
                        <div className="space-y-6">
                            <SystemIntelligence unifiedData={unifiedData} />
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm min-h-[300px]">
                                <h3 className="font-bold text-slate-800 dark:text-white mb-4">Sales by Category</h3>
                                <div className="h-[200px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={MOCK_CATEGORY_DATA} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                                {MOCK_CATEGORY_DATA.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                            </Pie>
                                            <Tooltip />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><Sparkles className="text-yellow-500" size={20} /> Top Selling Items</h3>
                            <div className="space-y-4">
                                {MOCK_TOP_ITEMS.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-600 dark:text-slate-300">#{idx + 1}</div>
                                            <div>
                                                <p className="font-bold text-sm text-slate-800 dark:text-white">{item.name}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">{item.qty} orders</p>
                                            </div>
                                        </div>
                                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">₹{item.revenue.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><Clock className="text-blue-500" size={20} /> Recent Activity</h3>
                            <div className="space-y-0 relative">
                                <div className="absolute top-2 bottom-2 left-3.5 w-0.5 bg-slate-100 dark:bg-slate-800"></div>
                                {recentActivity.length === 0 ? (
                                    <p className="text-sm text-slate-500 pl-8">No recent activity logged.</p>
                                ) : recentActivity.map((activity, idx) => (
                                    <div key={idx} className="flex gap-4 p-3 relative hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors">
                                        <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300`}>
                                            {activity.actionType === 'RECIPE' ? <Utensils size={14}/> : activity.actionType === 'CCTV' ? <Activity size={14}/> : <Zap size={14}/>}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800 dark:text-white">{activity.description}</p>
                                            <span className="text-[10px] text-slate-400 mt-1 block">{new Date(activity.timestamp).toLocaleTimeString()} • {activity.actionType}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

const SuperAdminDashboard: React.FC = () => {
    // ... (No changes to Super Admin dashboard logic)
    // For brevity, using the same implementation but it's preserved in full context
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [liveVisitors, setLiveVisitors] = useState<VisitorSession[]>([]);
    const [abandonmentAlerts, setAbandonmentAlerts] = useState<VisitorSession[]>([]);
    const [taskStats, setTaskStats] = useState<{name: string, count: number}[]>([]);
    const [recentRecipeActivity, setRecentRecipeActivity] = useState<SystemActivity[]>([]);
    
    // Data Loading
    const loadData = async () => {
        const users = await authService.getAllUsers();
        setAllUsers(users);
        const visitors = trackingService.getLiveVisitors();
        setLiveVisitors(visitors.sort((a,b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime()));
        
        // Find high-intent dropoffs
        const alerts = visitors.filter(v => v.hasAbandonedCheckout && !v.userId);
        setAbandonmentAlerts(alerts);

        // Fetch Global Activity Log for operational insights
        const globalActivity = storageService.getRecentSystemActivity();
        
        // 1. Task Volume by Restaurant
        const taskLog = globalActivity.filter(a => a.actionType === 'TASK');
        const tasksByRest: Record<string, number> = {};
        taskLog.forEach(log => {
            const rest = log.metadata?.restaurant || 'Unknown';
            tasksByRest[rest] = (tasksByRest[rest] || 0) + 1;
        });
        const stats = Object.entries(tasksByRest)
            .map(([name, count]) => ({ name, count }))
            .sort((a,b) => b.count - a.count)
            .slice(0, 5); // Top 5
        setTaskStats(stats);

        // 2. Recent Recipe & Automation Actions
        const recipeLogs = globalActivity.filter(a => a.actionType === 'RECIPE');
        setRecentRecipeActivity(recipeLogs.slice(0, 10)); // Last 10
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 2000); // Fast poll for live dashboard feel
        return () => clearInterval(interval);
    }, []);

    const activeClients = allUsers.length;
    const currentGuests = liveVisitors.filter(v => !v.userId).length;

    return (
        <div className="space-y-6 pb-12">
            {/* Header / Command Center Status */}
            <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-2xl relative overflow-hidden border border-slate-800">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] -mr-32 -mt-32 pointer-events-none"></div>
                <div className="relative z-10 flex justify-between items-end">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                            <span className="text-xs font-mono text-red-400 tracking-widest uppercase">Live System Feed</span>
                        </div>
                        <h1 className="text-3xl font-black tracking-tight text-white">Global Control Room</h1>
                    </div>
                    <div className="flex gap-4 text-right">
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase font-bold">Total Clients</p>
                            <p className="text-2xl font-mono">{activeClients}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase font-bold">Live Guests</p>
                            <p className="text-2xl font-mono text-emerald-400">{currentGuests}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. Operational Oversight (New Section) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* ALL USERS DETAILS TABLE */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Users size={18} className="text-blue-500" /> User Registry & Activity
                            </h3>
                            <span className="text-xs text-slate-500">{allUsers.length} Registered</span>
                        </div>
                        <div className="overflow-x-auto max-h-[400px]">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 dark:bg-slate-800 text-xs text-slate-500 uppercase font-bold sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3">User / Restaurant</th>
                                        <th className="px-4 py-3">Plan & Status</th>
                                        <th className="px-4 py-3">Network Info</th>
                                        <th className="px-4 py-3">Last Active</th>
                                        <th className="px-4 py-3">Activity</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {allUsers.map((u) => (
                                        <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 group">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-600 dark:text-slate-300">
                                                        {u.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 dark:text-white">{u.name}</p>
                                                        <p className="text-xs text-slate-500">{u.restaurantName || u.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${u.plan.includes('PRO') ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                                                    {u.plan.replace('_', ' ')}
                                                </span>
                                                <p className="text-[10px] text-slate-400 mt-1">{u.credits} Credits</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                                                    <Lock size={10} className="text-emerald-500" />
                                                    <span className="font-mono">{u.ipAddress || '---'}</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                                                    {u.userAgent?.includes('Mobile') ? <Smartphone size={10}/> : <Monitor size={10}/>}
                                                    {u.userAgent || 'Unknown'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-xs text-slate-600 dark:text-slate-300">
                                                    {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}
                                                </span>
                                                <p className="text-[10px] text-slate-400">{u.lastLogin ? new Date(u.lastLogin).toLocaleTimeString() : ''}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded w-fit">
                                                    <Activity size={10} className="text-blue-500" /> 
                                                    {u.lastActiveModule || 'None'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Task Volume Chart */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
                            <ListTodo size={20} className="text-blue-500" /> Global Task Volume by Restaurant
                        </h3>
                        <div className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={taskStats} layout="vertical" margin={{top:5, right:30, left:20, bottom:5}}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 11, fill: '#94a3b8'}} />
                                    <Tooltip contentStyle={{borderRadius: '8px', border:'none', background:'#1e293b', color:'#fff'}} cursor={{fill: 'transparent'}}/>
                                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Recipe & Automation Feed */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Utensils size={18} className="text-emerald-500" /> Real-time Activity Stream
                            </h3>
                        </div>
                        <div className="overflow-x-auto max-h-[300px]">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 dark:bg-slate-800 text-xs text-slate-500 uppercase font-bold sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3">Restaurant / User</th>
                                        <th className="px-4 py-3">Action</th>
                                        <th className="px-4 py-3">Context</th>
                                        <th className="px-4 py-3 text-right">Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {recentRecipeActivity.map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="px-4 py-3">
                                                <p className="font-bold text-slate-800 dark:text-white">{log.metadata?.restaurant || 'System'}</p>
                                                <p className="text-xs text-slate-500">{log.userName}</p>
                                            </td>
                                            <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                                                <span className={`text-[10px] uppercase font-bold mr-2 px-1.5 py-0.5 rounded ${log.actionType === 'LOGIN' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                                                    {log.actionType}
                                                </span>
                                                {log.description}
                                            </td>
                                            <td className="px-4 py-3">
                                                {log.metadata?.purpose && <p className="text-xs text-slate-500 italic mb-1">"{log.metadata.purpose}"</p>}
                                                {log.metadata?.isNew && (
                                                    <div className="flex gap-2">
                                                        <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded flex items-center gap-1 border border-blue-200 dark:border-blue-800">
                                                            <ClipboardList size={10} /> Auto-SOP
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right text-xs text-slate-400 font-mono">
                                                {new Date(log.timestamp).toLocaleTimeString()}
                                            </td>
                                        </tr>
                                    ))}
                                    {recentRecipeActivity.length === 0 && (
                                        <tr><td colSpan={4} className="p-4 text-center text-slate-500">No recent activity.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* 2. LIVE TRAFFIC & ALARMS (Right Column) */}
                <div className="space-y-6">
                    {/* The "Alarm" Panel */}
                    <div className="bg-red-950/20 border border-red-900/50 rounded-xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <AlertOctagon size={100} className="text-red-500" />
                        </div>
                        <h3 className="text-lg font-bold text-red-400 flex items-center gap-2 mb-4">
                            <AlertTriangle className="animate-pulse" /> High Intent Drop-offs
                        </h3>
                        
                        {abandonmentAlerts.length === 0 ? (
                            <div className="h-24 flex items-center justify-center text-slate-500 text-sm border border-dashed border-slate-800 rounded-lg">
                                No active alarms. Conversion looks good.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {abandonmentAlerts.map(visitor => (
                                    <div key={visitor.sessionId} className="bg-red-900/10 border border-red-900/30 p-3 rounded-lg flex items-center justify-between animate-fade-in">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-red-900/20 text-red-500 flex items-center justify-center font-bold text-xs">
                                                !
                                            </div>
                                            <div>
                                                <p className="text-red-200 font-bold text-sm">Guest from {visitor.location}</p>
                                                <p className="text-red-400 text-[10px]">Abandoning Checkout Flow</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-slate-400 text-xs font-mono">{new Date(visitor.lastActive).toLocaleTimeString()}</p>
                                            <p className="text-[10px] bg-red-500 text-white px-2 rounded-full mt-1">Score: {visitor.intentScore}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Live Traffic Map/List */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-[400px] flex flex-col">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                            <Globe size={18} className="text-blue-500" /> Live Traffic Monitor
                        </h3>
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                            {liveVisitors.map((visitor, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:bg-slate-800 transition-colors">
                                    <div className="flex items-center gap-3">
                                        {visitor.device === 'Mobile' ? <Smartphone size={14} className="text-slate-500"/> : <Monitor size={14} className="text-slate-500"/>}
                                        <div>
                                            <p className="text-sm font-bold text-slate-200">
                                                {visitor.userId ? (
                                                    <span className="text-emerald-400">{visitor.userName} (Client)</span>
                                                ) : (
                                                    <span className="text-slate-400">Guest from {visitor.location}</span>
                                                )}
                                            </p>
                                            <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                                <MousePointer2 size={10} /> {visitor.pagesVisited[visitor.pagesVisited.length - 1]}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${visitor.intentScore > 50 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                                                {visitor.intentScore}% Intent
                                            </span>
                                            <div className={`w-2 h-2 rounded-full ${visitor.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></div>
                                        </div>
                                        <span className="text-[10px] text-slate-500 font-mono">{new Date(visitor.lastActive).toLocaleTimeString()}</span>
                                    </div>
                                </div>
                            ))}
                            {liveVisitors.length === 0 && <div className="text-center text-slate-500 mt-10">No live activity detected.</div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const Dashboard: React.FC<{ user: User, onChangeView: (v: AppView) => void }> = ({ user, onChangeView }) => {
    if (user.role === UserRole.SUPER_ADMIN) {
        return <SuperAdminDashboard />;
    }
    return <TenantDashboard user={user} onChangeView={onChangeView} />;
};
