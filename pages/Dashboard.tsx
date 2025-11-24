import React, { useState, useEffect } from 'react';
import { DollarSign, ShoppingBag, Utensils, AlertTriangle, Users, Clock, Globe, TrendingUp, Activity, MapPin, Store, Calendar } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { MOCK_SALES_DATA, PLANS } from '../constants';
import { User, UserRole, PlanType } from '../types';
import { authService } from '../services/authService';

interface DashboardProps {
    user: User;
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {

  const renderOwnerDashboard = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Total Revenue" 
          value="₹1,28,450" 
          trend="12.5%" 
          trendUp={true} 
          icon={DollarSign} 
          colorClass="text-emerald-600 bg-emerald-600" 
        />
        <StatCard 
          label="Food Cost %" 
          value="32.4%" 
          trend="1.2%" 
          trendUp={false} 
          icon={Utensils} 
          colorClass="text-orange-600 bg-orange-600" 
        />
        <StatCard 
          label="Net Profit (Est)" 
          value="₹24,500" 
          trend="8.1%" 
          trendUp={true} 
          icon={TrendingUp} 
          colorClass="text-blue-600 bg-blue-600" 
        />
        <StatCard 
          label="Critical Alerts" 
          value="3" 
          icon={AlertTriangle} 
          colorClass="text-red-600 bg-red-600" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Revenue Trend</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_SALES_DATA}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} />
                <YAxis tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`₹${value}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Financial Insights</h3>
          <div className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
              <div className="flex gap-2">
                <AlertTriangle className="text-red-500 shrink-0" size={18} />
                <div>
                  <h4 className="text-sm font-semibold text-red-800">Margin Squeeze</h4>
                  <p className="text-xs text-red-600 mt-1">Avocado price spike reduced 'Smashed Avo' margin to 55%.</p>
                </div>
              </div>
            </div>
             <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
              <div className="flex gap-2">
                <DollarSign className="text-emerald-500 shrink-0" size={18} />
                <div>
                  <h4 className="text-sm font-semibold text-emerald-800">Upsell Opportunity</h4>
                  <p className="text-xs text-emerald-600 mt-1">Customers buying 'Acai Bowl' are 40% likely to buy coffee. Create combo.</p>
                </div>
              </div>
            </div>
          </div>
          <button className="w-full mt-4 py-2 text-sm text-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors">
            View Strategy Report
          </button>
        </div>
      </div>
    </>
  );

  const renderAdminDashboard = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Orders Today" 
          value="48" 
          trend="12" 
          trendUp={true} 
          icon={ShoppingBag} 
          colorClass="text-blue-600 bg-blue-600" 
        />
        <StatCard 
          label="Avg Prep Time" 
          value="14m" 
          trend="2m" 
          trendUp={false} 
          icon={Clock} 
          colorClass="text-orange-600 bg-orange-600" 
        />
         <StatCard 
          label="Staff Active" 
          value="8/12" 
          icon={Users} 
          colorClass="text-purple-600 bg-purple-600" 
        />
        <StatCard 
          label="Inventory Alerts" 
          value="5" 
          icon={AlertTriangle} 
          colorClass="text-red-600 bg-red-600" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Live Operations</h3>
            <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-sm font-medium text-slate-700">Kitchen Load</span>
                    <span className="text-xs font-bold px-2 py-1 bg-green-100 text-green-700 rounded">Moderate</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-sm font-medium text-slate-700">Pending Deliveries</span>
                    <span className="text-sm font-bold text-slate-900">3 Orders</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-sm font-medium text-slate-700">SOP Completion</span>
                    <div className="w-24 bg-slate-200 rounded-full h-2">
                        <div className="bg-emerald-500 h-2 rounded-full" style={{width: '80%'}}></div>
                    </div>
                </div>
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Inventory Watchlist</h3>
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span className="text-sm text-slate-700">Acai Puree</span>
                    </div>
                    <span className="text-xs font-bold text-red-600">Reorder Now</span>
                </div>
                 <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        <span className="text-sm text-slate-700">Almond Milk</span>
                    </div>
                    <span className="text-xs font-bold text-yellow-600">Low Stock</span>
                </div>
                 <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span className="text-sm text-slate-700">Coffee Beans</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-600">OK</span>
                </div>
            </div>
        </div>
      </div>
    </>
  );

  const SuperAdminDashboard = () => {
      const [subscribers, setSubscribers] = useState<User[]>([]);

      useEffect(() => {
          setSubscribers(authService.getAllUsers());
      }, []);

      const calculateRevenue = () => {
          return subscribers.reduce((acc, curr) => {
              return acc + (PLANS[curr.plan].price || 0);
          }, 0);
      };

      return (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
            label="Total Subscribers" 
            value={subscribers.length.toString()} 
            trend="+2 this week" 
            trendUp={true} 
            icon={Users} 
            colorClass="text-indigo-600 bg-indigo-600" 
            />
            <StatCard 
            label="Monthly Recurring Revenue" 
            value={`₹${calculateRevenue().toLocaleString()}`} 
            trend="15%" 
            trendUp={true} 
            icon={DollarSign} 
            colorClass="text-emerald-600 bg-emerald-600" 
            />
            <StatCard 
            label="Pro+ Users" 
            value={subscribers.filter(u => u.plan === PlanType.PRO_PLUS).length.toString()} 
            trend="High Value" 
            trendUp={true} 
            icon={Globe} 
            colorClass="text-purple-600 bg-purple-600" 
            />
             <StatCard 
            label="Active Markets" 
            value={new Set(subscribers.map(u => u.location?.split(',')[0].trim()).filter(Boolean)).size.toString()} 
            icon={MapPin} 
            colorClass="text-blue-600 bg-blue-600" 
            />
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Global Subscriber Intelligence</h3>
                    <p className="text-sm text-slate-500">Detailed view of all registered restaurants and their plan status.</p>
                </div>
                <button className="text-sm text-emerald-600 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100">Export CSV</button>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                        <tr>
                            <th className="px-6 py-4">Restaurant</th>
                            <th className="px-6 py-4">Plan Status</th>
                            <th className="px-6 py-4">Location</th>
                            <th className="px-6 py-4">Cuisine / Menu</th>
                            <th className="px-6 py-4">Joined</th>
                            <th className="px-6 py-4 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {subscribers.map((sub) => (
                            <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-slate-200 flex items-center justify-center text-slate-500">
                                            <Store size={16} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800">{sub.restaurantName || sub.name}</p>
                                            <p className="text-xs text-slate-400">{sub.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                                        sub.plan === PlanType.PRO_PLUS ? 'bg-purple-100 text-purple-700' :
                                        sub.plan === PlanType.PRO ? 'bg-emerald-100 text-emerald-700' :
                                        'bg-slate-100 text-slate-600'
                                    }`}>
                                        {sub.plan === PlanType.PRO_PLUS && <Globe size={10} />}
                                        {sub.plan === PlanType.PRO && <TrendingUp size={10} />}
                                        {sub.plan === PlanType.FREE ? 'BASIC' : sub.plan.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-600">
                                    <div className="flex items-center gap-2">
                                        <MapPin size={14} className="text-slate-400"/>
                                        {sub.location || 'N/A'}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-slate-600">
                                    <div className="flex items-center gap-2">
                                        <Utensils size={14} className="text-slate-400"/>
                                        {sub.cuisineType || 'N/A'}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-slate-500">
                                     <div className="flex items-center gap-2">
                                        <Calendar size={14} className="text-slate-400"/>
                                        {sub.joinedDate || '2023-10-01'}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <button className="text-blue-600 hover:underline font-medium text-xs">Analyze</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
        </>
      );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">
                {user.role === UserRole.SUPER_ADMIN ? 'Network Overview' : 
                 user.role === UserRole.ADMIN ? 'Operations Dashboard' : 'Owner Overview'}
            </h2>
            <p className="text-sm text-slate-500">Welcome back, {user.name}</p>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-white border border-slate-200 rounded-md text-sm text-slate-600">
            Last 7 Days
          </span>
        </div>
      </div>

      {user.role === UserRole.SUPER_ADMIN && <SuperAdminDashboard />}
      {user.role === UserRole.OWNER && renderOwnerDashboard()}
      {user.role === UserRole.ADMIN && renderAdminDashboard()}
    </div>
  );
};