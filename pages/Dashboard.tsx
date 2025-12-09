
import React, { useState, useEffect } from 'react';
import { StatCard } from '../components/StatCard';
import { User, AppView } from '../types';
import { storageService, storageEvents } from '../services/storageService';
import { analyzeUnifiedRestaurantData } from '../services/geminiService';
import { Activity, AlertTriangle, DollarSign, ShoppingBag, TrendingUp, Sparkles, Brain, ArrowRight, Utensils, FileText, BarChart3, Clock, Calendar } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';

// Colors for charts
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

// Mock Data for Categories (since we don't have full transaction history in storageService yet)
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

// --- WIDGETS ---
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

export const Dashboard: React.FC<{ user: User, onChangeView: (v: AppView) => void }> = ({ user, onChangeView }) => {
    const [unifiedData, setUnifiedData] = useState<any>(null);
    const [sales, setSales] = useState<any[]>([]);
    const [timeRange, setTimeRange] = useState<'7d'|'30d'>('30d');

    useEffect(() => {
        const load = async () => {
            const allSales = storageService.getSalesData(user.id);
            // Filter sales based on timeRange
            const slicedSales = timeRange === '7d' ? allSales.slice(-7) : allSales.slice(-30);
            setSales(slicedSales);
            
            const data = await analyzeUnifiedRestaurantData({});
            setUnifiedData(data);
        };
        load();
        
        // Event Listener for live updates
        const handler = () => load();
        window.addEventListener(storageEvents.DATA_UPDATED, handler);
        return () => window.removeEventListener(storageEvents.DATA_UPDATED, handler);
    }, [user.id, timeRange]);

    // Calculate Totals
    const totalRevenue = sales.reduce((acc, curr) => acc + curr.revenue, 0);
    const totalOrders = sales.reduce((acc, curr) => acc + curr.items_sold, 0);

    return (
        <div className="space-y-8 pb-12">
            {/* Header Area with Greeting */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
                        Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {user.name.split(' ')[0]} 👋
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Here's what's happening at {user.restaurantName || 'your restaurant'} today.</p>
                </div>
                <div className="flex bg-white dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <button onClick={() => setTimeRange('7d')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${timeRange === '7d' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}>Last 7 Days</button>
                    <button onClick={() => setTimeRange('30d')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${timeRange === '30d' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}>Last 30 Days</button>
                </div>
            </div>

            {/* Quick Actions Row */}
            <QuickActions onChangeView={onChangeView} />

            {/* Key Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    label="Total Revenue" 
                    value={`₹${totalRevenue.toLocaleString()}`} 
                    trend="+12.5%" 
                    trendUp={true} 
                    icon={DollarSign} 
                    colorClass="bg-emerald-100 text-emerald-600" 
                />
                <StatCard 
                    label="Total Orders" 
                    value={totalOrders.toString()} 
                    trend="+8.2%" 
                    trendUp={true} 
                    icon={ShoppingBag} 
                    colorClass="bg-blue-100 text-blue-600" 
                />
                <StatCard 
                    label="Food Cost" 
                    value="32.4%" 
                    trend="-1.2%" 
                    trendUp={true} // Lower is better for cost
                    icon={TrendingUp} 
                    colorClass="bg-amber-100 text-amber-600" 
                />
                <StatCard 
                    label="Avg. Ticket Size" 
                    value={`₹${totalOrders ? (totalRevenue/totalOrders).toFixed(0) : 0}`} 
                    trend="+3.1%" 
                    trendUp={true} 
                    icon={BarChart3} 
                    colorClass="bg-purple-100 text-purple-600" 
                />
            </div>
            
            {/* Main Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Revenue Chart */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-[350px]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <TrendingUp className="text-emerald-500" size={20}/> Revenue & Sales Trend
                            </h3>
                        </div>
                        <ResponsiveContainer width="100%" height="85%">
                            <ComposedChart data={sales.length ? sales : [{date:'1', revenue:0, items_sold: 0}]}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                <XAxis dataKey="date" hide axisLine={false} tickLine={false} />
                                <YAxis yAxisId="left" hide />
                                <YAxis yAxisId="right" orientation="right" hide />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" name="Revenue (₹)" />
                                <Line yAxisId="right" type="monotone" dataKey="items_sold" stroke="#3b82f6" strokeWidth={2} dot={{r:3, fill:'#3b82f6'}} name="Items Sold" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Operational Pulse */}
                    <OperationalPulse unifiedData={unifiedData} />
                </div>
                
                <div className="space-y-6">
                    {/* System Intelligence (AI Summary) */}
                    <SystemIntelligence unifiedData={unifiedData} />

                    {/* Sales by Category (Pie) */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm min-h-[300px]">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-4">Sales by Category</h3>
                        <div className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={MOCK_CATEGORY_DATA}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {MOCK_CATEGORY_DATA.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Row: Top Items & Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Selling Items */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <Sparkles className="text-yellow-500" size={20} /> Top Selling Items
                    </h3>
                    <div className="space-y-4">
                        {MOCK_TOP_ITEMS.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-600 dark:text-slate-300">
                                        #{idx + 1}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-slate-800 dark:text-white">{item.name}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{item.qty} orders</p>
                                    </div>
                                </div>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">₹{item.revenue.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                    <button className="w-full mt-4 py-2 text-sm text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-white flex items-center justify-center gap-1">
                        View Full Menu Analytics <ArrowRight size={14} />
                    </button>
                </div>

                {/* Recent Activity / Insights */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <Clock className="text-blue-500" size={20} /> Recent System Activity
                    </h3>
                    <div className="space-y-0 relative">
                        <div className="absolute top-2 bottom-2 left-3.5 w-0.5 bg-slate-100 dark:bg-slate-800"></div>
                        {[
                            { title: "New Recipe Created", desc: "Spicy Tuna Tartare added to menu", time: "2h ago", icon: Utensils, color: "bg-emerald-100 text-emerald-600" },
                            { title: "Inventory Low", desc: "Truffle Oil below par level (0.5L)", time: "4h ago", icon: AlertTriangle, color: "bg-red-100 text-red-600" },
                            { title: "SOP Generated", desc: "Opening Checklist for Kitchen", time: "Yesterday", icon: FileText, color: "bg-blue-100 text-blue-600" },
                            { title: "Strategy Report", desc: "Cost reduction analysis completed", time: "2 days ago", icon: Brain, color: "bg-purple-100 text-purple-600" },
                        ].map((activity, idx) => (
                            <div key={idx} className="flex gap-4 p-3 relative hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors">
                                <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${activity.color} text-xs`}>
                                    <activity.icon size={14} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800 dark:text-white">{activity.title}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{activity.desc}</p>
                                    <span className="text-[10px] text-slate-400 mt-1 block">{activity.time}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
