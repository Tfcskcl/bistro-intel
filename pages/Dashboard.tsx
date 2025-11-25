
import React, { useState, useEffect, useRef } from 'react';
import { DollarSign, ShoppingBag, Utensils, AlertTriangle, Users, Clock, TrendingUp, Activity, MapPin, Globe, Eye, UserX, UserPlus, Zap, Edit, Save, Brain, Database, ArrowRight, X, ChevronRight, Search, Mail, Phone, Calendar, Shield, ShieldCheck, Trash2, Terminal, UploadCloud, FileText, CheckCircle2 } from 'lucide-react';
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

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [salesData, setSalesData] = useState<any[]>([]);

  useEffect(() => {
    const data = storageService.getSalesData(user.id);
    setSalesData(data);
  }, [user.id]);

  // --- SUPER ADMIN DASHBOARD LOGIC ---
  const SuperAdminDashboard = () => {
      const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'plans' | 'training'>('overview');
      const [subscribers, setSubscribers] = useState<User[]>([]);
      const [liveVisitors, setLiveVisitors] = useState<VisitorSession[]>([]);
      const [stats, setStats] = useState({ activeNow: 0, totalVisitsToday: 0, bounceRate: '0%', checkoutDropoff: 0 });
      const [liveNotification, setLiveNotification] = useState<{msg: string, loc: string} | null>(null);
      
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
      const [trainingProgress, setTrainingProgress] = useState(0);
      const [trainingLogs, setTrainingLogs] = useState<string[]>([]);
      const logsEndRef = useRef<HTMLDivElement>(null);
      
      // File Upload State for Training
      const [customTrainingFiles, setCustomTrainingFiles] = useState<{name: string, size: string, type: string}[]>([]);
      const fileInputRef = useRef<HTMLInputElement>(null);

      useEffect(() => {
          if (logsEndRef.current) {
              logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
          }
      }, [trainingLogs]);

      useEffect(() => {
          const fetchUsers = async () => {
             const users = await authService.getAllUsers();
             setSubscribers(users);
          };
          fetchUsers();
          
          // Initial Load
          updateTrackingData();

          // Simulate Live Updates
          const interval = setInterval(() => {
              updateTrackingData();
              
              // Randomly trigger a "New Visitor" notification (only on overview)
              if (activeTab === 'overview' && Math.random() > 0.8) {
                  const locs = ['Mumbai', 'Delhi', 'Bangalore', 'Pune', 'New York', 'London'];
                  const loc = locs[Math.floor(Math.random() * locs.length)];
                  setLiveNotification({ msg: 'New visitor landed on Landing Page', loc });
                  setTimeout(() => setLiveNotification(null), 4000);
              }
          }, 5000);

          return () => clearInterval(interval);
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

      const abandonedCheckouts = liveVisitors.filter(v => v.hasAbandonedCheckout);

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

      // --- AI Training Handlers ---
      const handleTrainingFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
          if (e.target.files && e.target.files.length > 0) {
              const file = e.target.files[0];
              setCustomTrainingFiles(prev => [...prev, {
                  name: file.name,
                  size: (file.size / 1024).toFixed(1) + ' KB',
                  type: file.type || 'Unknown'
              }]);
              // Reset input
              if (fileInputRef.current) fileInputRef.current.value = '';
          }
      };

      const startTraining = () => {
          setTrainingStatus('training');
          setTrainingProgress(0);
          setTrainingLogs(['Initializing training sequence...', 'Connecting to data lake...']);
          
          let progress = 0;
          const interval = setInterval(() => {
              progress += Math.floor(Math.random() * 4) + 1;
              if (progress >= 100) {
                  clearInterval(interval);
                  setTrainingStatus('complete');
                  setTrainingProgress(100);
                  setTrainingLogs(prev => [...prev, 'Weights updated.', 'Validation score: 98.4%', 'Training Complete.']);
              } else {
                  setTrainingProgress(progress);
                  if (Math.random() > 0.6) {
                      const msgs = [
                          'Vectorizing recipe data...',
                          'Processing sales anomalies...',
                          'Optimizing neural weights...',
                          'Ingesting user feedback...',
                          'Calibrating loss function...',
                          'Syncing with global model...'
                      ];
                      
                      // Inject custom file logs occasionally
                      if (customTrainingFiles.length > 0 && Math.random() > 0.7) {
                          const randomFile = customTrainingFiles[Math.floor(Math.random() * customTrainingFiles.length)];
                          setTrainingLogs(prev => [...prev, `Ingesting custom dataset: ${randomFile.name}...`, `Parsing ${randomFile.size} of data...`]);
                      } else {
                          setTrainingLogs(prev => [...prev, msgs[Math.floor(Math.random() * msgs.length)]]);
                      }
                  }
              }
          }, 300);
      };

      return (
        <div className="space-y-6 relative">
            <JourneyModal visitor={selectedVisitor} onClose={() => setSelectedVisitor(null)} />

            {/* Create User Modal */}
            {showCreateUserModal && (
                <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <UserPlus size={20} className="text-emerald-600"/> Create New Admin
                            </h3>
                            <button onClick={() => setShowCreateUserModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                                <input 
                                    type="text" required 
                                    value={newUserForm.name} 
                                    onChange={e => setNewUserForm({...newUserForm, name: e.target.value})}
                                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Email Address</label>
                                <input 
                                    type="email" required 
                                    value={newUserForm.email} 
                                    onChange={e => setNewUserForm({...newUserForm, email: e.target.value})}
                                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Password</label>
                                <input 
                                    type="password" required 
                                    value={newUserForm.password} 
                                    onChange={e => setNewUserForm({...newUserForm, password: e.target.value})}
                                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Role</label>
                                    <select 
                                        value={newUserForm.role}
                                        onChange={e => setNewUserForm({...newUserForm, role: e.target.value as UserRole})}
                                        className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm"
                                    >
                                        <option value={UserRole.ADMIN}>Admin</option>
                                        <option value={UserRole.OWNER}>Owner</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Location</label>
                                    <input 
                                        type="text" 
                                        value={newUserForm.location} 
                                        onChange={e => setNewUserForm({...newUserForm, location: e.target.value})}
                                        className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded"
                                        placeholder="City"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Restaurant / Org Name</label>
                                <input 
                                    type="text" 
                                    value={newUserForm.restaurantName} 
                                    onChange={e => setNewUserForm({...newUserForm, restaurantName: e.target.value})}
                                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded"
                                />
                            </div>
                            <button type="submit" className="w-full py-2 bg-slate-900 dark:bg-emerald-600 text-white font-bold rounded-lg hover:opacity-90 mt-4">
                                Create User
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Manage User Modal */}
            {managingUser && (
                <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Edit size={20} className="text-blue-600"/> Manage User
                            </h3>
                            <button onClick={() => setManagingUser(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                                <input 
                                    type="text"
                                    value={editForm.name || ''} 
                                    onChange={e => setEditForm({...editForm, name: e.target.value})}
                                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Email Address</label>
                                <input 
                                    type="email"
                                    value={editForm.email || ''} 
                                    onChange={e => setEditForm({...editForm, email: e.target.value})}
                                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Role</label>
                                    <select 
                                        value={editForm.role}
                                        onChange={e => setEditForm({...editForm, role: e.target.value as UserRole})}
                                        className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm"
                                    >
                                        <option value={UserRole.ADMIN}>Admin</option>
                                        <option value={UserRole.OWNER}>Owner</option>
                                        <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Plan</label>
                                    <select 
                                        value={editForm.plan}
                                        onChange={e => setEditForm({...editForm, plan: e.target.value as PlanType})}
                                        className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm"
                                    >
                                        <option value={PlanType.FREE}>Free</option>
                                        <option value={PlanType.PRO}>Pro</option>
                                        <option value={PlanType.PRO_PLUS}>Pro+</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Restaurant / Org</label>
                                <input 
                                    type="text" 
                                    value={editForm.restaurantName || ''} 
                                    onChange={e => setEditForm({...editForm, restaurantName: e.target.value})}
                                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded"
                                />
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
                                <button 
                                    onClick={handleDeleteUser}
                                    className="flex-1 py-2 bg-red-50 text-red-600 border border-red-200 font-bold rounded-lg hover:bg-red-100 flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={16} /> Delete
                                </button>
                                <button 
                                    onClick={handleSaveUserChanges}
                                    className="flex-[2] py-2 bg-slate-900 dark:bg-emerald-600 text-white font-bold rounded-lg hover:opacity-90 flex items-center justify-center gap-2"
                                >
                                    <Save size={16} /> Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Live Notification Toast */}
            {liveNotification && (
                <div className="fixed bottom-6 right-6 bg-slate-900 text-white p-4 rounded-lg shadow-2xl z-50 animate-fade-in-up flex items-center gap-3 border border-slate-700">
                    <div className="bg-emerald-500 rounded-full p-2 animate-pulse">
                        <Globe size={16} />
                    </div>
                    <div>
                        <p className="text-sm font-bold">{liveNotification.msg}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                            <MapPin size={10} /> {liveNotification.loc}
                        </p>
                    </div>
                </div>
            )}

            {/* Sub-Navigation */}
            <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-1 overflow-x-auto">
                {[
                    { id: 'overview', label: 'Overview & Traffic', icon: Activity },
                    { id: 'users', label: 'User Management', icon: Users },
                    { id: 'plans', label: 'Plans & Pricing', icon: DollarSign },
                    { id: 'training', label: 'AI Model Training', icon: Brain },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
                            activeTab === tab.id 
                            ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' 
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                    >
                        <tab.icon size={16} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* --- TAB CONTENT: OVERVIEW --- */}
            {activeTab === 'overview' && (
                <>
                    {/* Top Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
                        <StatCard 
                            label="Active Visitors Now" 
                            value={stats.activeNow.toString()} 
                            trend="Live"
                            trendUp={true}
                            icon={Eye} 
                            colorClass="text-emerald-500 bg-emerald-500" 
                        />
                        <StatCard 
                            label="Checkout Drop-offs" 
                            value={stats.checkoutDropoff.toString()} 
                            trend="Requires Action"
                            trendUp={false}
                            icon={UserX} 
                            colorClass="text-red-500 bg-red-500" 
                        />
                        <StatCard 
                            label="Total Subscribers" 
                            value={subscribers.length.toString()} 
                            icon={Users} 
                            colorClass="text-indigo-600 bg-indigo-600" 
                        />
                        <StatCard 
                            label="Monthly Recurring Revenue" 
                            value={`₹${calculateRevenue().toLocaleString()}`} 
                            icon={DollarSign} 
                            colorClass="text-emerald-600 bg-emerald-600" 
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up">
                        {/* Live Traffic Feed */}
                        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Globe size={20} className="text-blue-500" /> Live Visitor Traffic
                                </h3>
                                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-full animate-pulse">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div> Real-time
                                </div>
                            </div>
                            <div className="p-0 overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                                        <tr>
                                            <th className="px-6 py-3">Visitor</th>
                                            <th className="px-6 py-3">Location</th>
                                            <th className="px-6 py-3">Current Page</th>
                                            <th className="px-6 py-3">Device</th>
                                            <th className="px-6 py-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {liveVisitors.slice(0, 8).map((visitor, i) => (
                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-200">
                                                    {visitor.userName || 'Guest'}
                                                    {visitor.userId && <span className="block text-[10px] text-slate-400 font-mono">{visitor.userId}</span>}
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                                    <div className="flex items-center gap-1.5">
                                                        <MapPin size={14} className="text-slate-400" />
                                                        {visitor.location}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded text-xs border border-slate-200 dark:border-slate-700">
                                                        {visitor.pagesVisited[visitor.pagesVisited.length - 1]}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs">{visitor.device}</td>
                                                <td className="px-6 py-4">
                                                    {visitor.isOnline ? (
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> Online
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                                                            <div className="w-1.5 h-1.5 bg-slate-300 rounded-full"></div> Away
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Abandoned Cart / Checkout */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <AlertTriangle size={20} className="text-amber-500" /> Abandoned Checkouts
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Users who reached payment but didn't buy.</p>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[400px]">
                                {abandonedCheckouts.length === 0 ? (
                                    <div className="text-center p-8 text-slate-400">No drop-offs recently!</div>
                                ) : (
                                    abandonedCheckouts.map((v, i) => (
                                        <div key={i} className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{v.userName}</h4>
                                                <span className="text-[10px] text-slate-400">{new Date(v.lastActive).toLocaleTimeString()}</span>
                                            </div>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-1">
                                                <MapPin size={10} /> {v.location}
                                            </p>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => setSelectedVisitor(v)}
                                                    className="flex-1 py-1.5 text-xs bg-slate-900 dark:bg-slate-700 text-white rounded font-medium hover:bg-slate-800 flex items-center justify-center gap-1"
                                                >
                                                    <Eye size={12} /> View Journey
                                                </button>
                                                <button className="flex-1 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded font-medium hover:bg-slate-50">
                                                    Send Email
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* --- TAB CONTENT: USERS --- */}
            {activeTab === 'users' && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-fade-in">
                     <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                        <div className="flex items-center gap-4">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Registered Userbase</h3>
                            <button 
                                onClick={() => setShowCreateUserModal(true)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 shadow-sm"
                            >
                                <UserPlus size={14} /> Create Admin
                            </button>
                        </div>
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                            <input type="text" placeholder="Search users..." className="pl-9 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm dark:bg-slate-900 dark:text-white"/>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                             <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4">Name / ID</th>
                                    <th className="px-6 py-4">Contact</th>
                                    <th className="px-6 py-4">Restaurant</th>
                                    <th className="px-6 py-4">Role / Plan</th>
                                    <th className="px-6 py-4">Joined</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {subscribers.map((sub) => (
                                    <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900 dark:text-white">{sub.name}</div>
                                            <div className="text-xs text-slate-400 font-mono">{sub.id}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1 text-xs">
                                                <span className="flex items-center gap-1.5"><Mail size={12}/> {sub.email}</span>
                                                <span className="flex items-center gap-1.5 text-slate-400"><Phone size={12}/> --</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-slate-700 dark:text-slate-300 font-medium">{sub.restaurantName || 'N/A'}</div>
                                            <div className="text-xs text-slate-500">{sub.location}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1 items-start">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                                    sub.role === UserRole.SUPER_ADMIN ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                                    sub.role === UserRole.ADMIN ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                    'bg-slate-50 text-slate-600 border-slate-200'
                                                }`}>
                                                    {sub.role.replace('_', ' ')}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                    sub.plan === PlanType.PRO_PLUS ? 'bg-purple-100 text-purple-700' :
                                                    sub.plan === PlanType.PRO ? 'bg-emerald-100 text-emerald-700' :
                                                    'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {sub.plan.replace('_', ' ')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-xs">
                                            {sub.joinedDate || 'Unknown'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => openManageUser(sub)}
                                                className="text-emerald-600 hover:text-emerald-700 font-bold text-xs border border-emerald-200 rounded px-2 py-1 hover:bg-emerald-50"
                                            >
                                                Manage
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- TAB CONTENT: PLANS --- */}
            {activeTab === 'plans' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
                    {Object.entries(plans).map(([key, plan]) => {
                        const planType = key as PlanType;
                        const isEditing = editingPlan === planType;
                        return (
                             <div key={key} className={`bg-white dark:bg-slate-900 p-6 rounded-xl border shadow-sm flex flex-col ${isEditing ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200 dark:border-slate-800'}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className={`font-bold text-lg ${planType === PlanType.PRO_PLUS ? 'text-purple-600' : 'text-slate-800 dark:text-white'}`}>{plan.name}</h3>
                                    <button 
                                        onClick={() => isEditing ? savePlans() : setEditingPlan(planType)}
                                        className={`p-2 rounded-lg transition-colors ${isEditing ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500 hover:text-blue-600'}`}
                                    >
                                        {isEditing ? <Save size={18} /> : <Edit size={18} />}
                                    </button>
                                </div>
                                
                                <div className="space-y-4 flex-1">
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase">Description</label>
                                        <input 
                                            type="text"
                                            disabled={!isEditing}
                                            value={plan.description || ''}
                                            onChange={(e) => handlePlanChange(planType, 'description', e.target.value)}
                                            className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-800 dark:text-white disabled:bg-transparent disabled:border-transparent disabled:p-0"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase">Monthly Price (₹)</label>
                                        <input 
                                            type="number"
                                            disabled={!isEditing}
                                            value={plan.price}
                                            onChange={(e) => handlePlanChange(planType, 'price', parseInt(e.target.value))}
                                            className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono font-bold text-slate-800 dark:text-white disabled:bg-transparent disabled:border-transparent disabled:p-0 disabled:text-xl"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase">Quarterly Price (₹)</label>
                                        <input 
                                            type="number"
                                            disabled={!isEditing}
                                            value={plan.quarterlyPrice}
                                            onChange={(e) => handlePlanChange(planType, 'quarterlyPrice', parseInt(e.target.value))}
                                            className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono text-slate-600 dark:text-slate-300 disabled:bg-transparent disabled:border-transparent disabled:p-0"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Features (Comma separated)</label>
                                        {isEditing ? (
                                            <textarea 
                                                value={plan.features.join(', ')}
                                                onChange={(e) => handlePlanChange(planType, 'features', e.target.value.split(',').map(s => s.trim()))}
                                                className="w-full h-32 p-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:ring-2 focus:ring-blue-500"
                                            />
                                        ) : (
                                            <ul className="list-disc pl-5 space-y-1 text-sm text-slate-600 dark:text-slate-400">
                                                {plan.features.map((f, i) => <li key={i}>{f}</li>)}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                             </div>
                        );
                    })}
                </div>
            )}

            {/* --- TAB CONTENT: TRAINING --- */}
            {activeTab === 'training' && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-fade-in">
                    <div className="p-8 text-center max-w-3xl mx-auto">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Brain size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Train the AI Model</h2>
                        <p className="text-slate-500 dark:text-slate-400 mb-8">
                            Enhance the AI's accuracy by feeding it anonymized, aggregated data from live user sessions, recipes, and sales trends.
                        </p>
                        
                        {trainingStatus === 'idle' ? (
                            <div className="mb-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-left">
                                    {[
                                        { label: 'Sales Patterns', desc: 'Seasonality & trend data from 500+ outlets', count: '12.5MB' },
                                        { label: 'Recipe Correlations', desc: 'Ingredient pairings and costing logic', count: '8.2MB' },
                                        { label: 'User Interactions', desc: 'Common strategy queries and corrections', count: '4.1MB' },
                                        { label: 'Market Prices', desc: 'Real-time ingredient pricing scrape', count: '1.2MB' }
                                    ].map((item, i) => (
                                        <label key={i} className="flex items-start gap-3 p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                                            <input type="checkbox" defaultChecked className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                                            <div>
                                                <div className="font-bold text-slate-800 dark:text-slate-200">{item.label}</div>
                                                <div className="text-xs text-slate-500 mt-0.5">{item.desc}</div>
                                            </div>
                                            <div className="ml-auto text-xs font-mono font-bold text-slate-400">{item.count}</div>
                                        </label>
                                    ))}
                                    
                                    {/* Custom Uploaded Files */}
                                    {customTrainingFiles.map((file, i) => (
                                        <label key={`custom-${i}`} className="flex items-start gap-3 p-4 border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl cursor-pointer">
                                            <input type="checkbox" defaultChecked className="mt-1 w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" />
                                            <div>
                                                <div className="font-bold text-emerald-800 dark:text-emerald-300">{file.name}</div>
                                                <div className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5 flex items-center gap-1">
                                                    <CheckCircle2 size={10} /> Ready to ingest
                                                </div>
                                            </div>
                                            <div className="ml-auto text-xs font-mono font-bold text-slate-400">{file.size}</div>
                                        </label>
                                    ))}
                                </div>

                                {/* File Upload Area */}
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group mb-8"
                                >
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors">
                                            <UploadCloud size={20} />
                                        </div>
                                        <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Upload Custom Training Data</p>
                                        <p className="text-xs text-slate-400">Supports .csv, .json, .pdf (Max 50MB)</p>
                                    </div>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        className="hidden" 
                                        onChange={handleTrainingFileUpload}
                                        accept=".csv,.json,.pdf,.txt"
                                    />
                                </div>
                            </div>
                        ) : trainingStatus === 'training' ? (
                            <div className="mb-8 text-left">
                                <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
                                    <div 
                                        className="h-full bg-blue-600 transition-all duration-200"
                                        style={{ width: `${trainingProgress}%` }}
                                    ></div>
                                </div>
                                <p className="text-sm font-bold text-blue-600 animate-pulse text-center mb-4">Processing vector embeddings... {trainingProgress}%</p>
                                
                                {/* Terminal Logs */}
                                <div className="bg-slate-950 rounded-lg p-4 font-mono text-xs text-green-400 h-48 overflow-y-auto border border-slate-800 shadow-inner">
                                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800 text-slate-500">
                                        <Terminal size={12} /> Training Log Stream
                                    </div>
                                    <div className="space-y-1">
                                        {trainingLogs.map((log, i) => (
                                            <div key={i} className="animate-fade-in">&gt; {log}</div>
                                        ))}
                                        <div ref={logsEndRef} className="animate-pulse">&gt; _</div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 p-6 rounded-xl border border-emerald-100 dark:border-emerald-800 mb-8">
                                <div className="text-lg font-bold flex items-center justify-center gap-2 mb-2">
                                    <Zap size={20} fill="currentColor"/> Training Complete!
                                </div>
                                <p>The model has been updated with the latest live data. Accuracy improved by ~4.2%.</p>
                                <div className="mt-4 p-4 bg-slate-900 rounded-lg text-left font-mono text-xs text-green-400 max-h-32 overflow-y-auto">
                                    {trainingLogs.slice(-5).map((log, i) => <div key={i}>&gt; {log}</div>)}
                                </div>
                            </div>
                        )}

                        <button 
                            onClick={trainingStatus === 'idle' ? startTraining : () => setTrainingStatus('idle')}
                            disabled={trainingStatus === 'training'}
                            className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-lg hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 mx-auto"
                        >
                            {trainingStatus === 'idle' ? <><Database size={18} /> Start Training Process</> : 
                             trainingStatus === 'training' ? <><Activity className="animate-spin" size={18}/> Training...</> :
                             'Done'}
                        </button>
                    </div>
                </div>
            )}
        </div>
      );
  };

  const renderOwnerDashboard = () => {
    if (salesData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center animate-fade-in">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 text-slate-400">
            <Activity size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Your Dashboard is Empty</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">
            Connect your POS or upload your sales data to see real-time insights, profitability analysis, and AI recommendations.
          </p>
          <div className="flex gap-4">
             <button className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-colors">
               Go to Data Integrations
             </button>
          </div>
        </div>
      );
    }

    const latestRevenue = salesData[salesData.length - 1]?.revenue || 0;
    const totalRevenue = salesData.reduce((acc, curr) => acc + (curr.revenue || 0), 0);

    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
          <StatCard 
            label="Total Revenue" 
            value={`₹${totalRevenue.toLocaleString()}`} 
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
            value={`₹${(totalRevenue * 0.2).toLocaleString()}`} 
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Revenue Trend</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
                  <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} />
                  <YAxis tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value/1000}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    labelStyle={{ color: '#94a3b8' }}
                    formatter={(value: number) => [`₹${value}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Financial Insights</h3>
            <div className="space-y-4">
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg">
                <div className="flex gap-2">
                  <AlertTriangle className="text-red-500 dark:text-red-400 shrink-0" size={18} />
                  <div>
                    <h4 className="text-sm font-semibold text-red-800 dark:text-red-200">Margin Squeeze</h4>
                    <p className="text-xs text-red-600 dark:text-red-300 mt-1">Check recent ingredient cost spikes.</p>
                  </div>
                </div>
              </div>
               <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 rounded-lg">
                <div className="flex gap-2">
                  <DollarSign className="text-emerald-500 dark:text-emerald-400 shrink-0" size={18} />
                  <div>
                    <h4 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Growth Detected</h4>
                    <p className="text-xs text-emerald-600 dark:text-emerald-300 mt-1">Revenue is up 12% week over week.</p>
                  </div>
                </div>
              </div>
            </div>
            <button className="w-full mt-4 py-2 text-sm text-emerald-600 dark:text-emerald-400 border border-emerald-600 dark:border-emerald-500 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors">
              View Strategy Report
            </button>
          </div>
        </div>
      </>
    );
  };

  const renderAdminDashboard = () => (
    <>
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Orders Today" value="0" icon={ShoppingBag} colorClass="text-blue-600 bg-blue-600" />
        <StatCard label="Avg Prep Time" value="--m" icon={Clock} colorClass="text-orange-600 bg-orange-600" />
        <StatCard label="Staff Active" value="0/0" icon={Users} colorClass="text-purple-600 bg-purple-600" />
        <StatCard label="Inventory Alerts" value="0" icon={AlertTriangle} colorClass="text-red-600 bg-red-600" />
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                {user.role === UserRole.SUPER_ADMIN ? 'Network Operations Center' : 
                 user.role === UserRole.ADMIN ? 'Operations Dashboard' : 'Owner Overview'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
                {user.role === UserRole.SUPER_ADMIN ? 'Live visitor analytics and platform health' : `Welcome back, ${user.name}`}
            </p>
        </div>
        {user.role !== UserRole.SUPER_ADMIN && salesData.length > 0 && (
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-sm text-slate-600 dark:text-slate-300">
              Last 7 Days
            </span>
          </div>
        )}
      </div>

      {user.role === UserRole.SUPER_ADMIN && <SuperAdminDashboard />}
      {user.role === UserRole.OWNER && renderOwnerDashboard()}
      {user.role === UserRole.ADMIN && renderAdminDashboard()}
    </div>
  );
};
