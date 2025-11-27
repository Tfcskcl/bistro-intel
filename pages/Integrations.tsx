
import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, CheckCircle2, Server, Loader2, X, FileSpreadsheet, Download, Settings, Key, AlertTriangle, ArrowRight, ShieldCheck, BookOpen, ExternalLink, Save, Receipt, Instagram, Facebook, MapPin, Megaphone, Image as ImageIcon, Link2, LogOut } from 'lucide-react';
import { storageService } from '../services/storageService';
import { POSChangeRequest, UserRole } from '../types';
import { authService } from '../services/authService';

interface IntegrationItem {
  id: string;
  name: string;
  icon: React.ReactNode;
  status: string;
  lastSync?: string;
  loading?: boolean;
  connectedAccount?: string; // For Social Media handles
}

// Configuration Guidelines & Schema
const POS_CONFIGS: Record<string, {
    steps: string[];
    fields: { key: string; label: string; placeholder: string }[];
    docsUrl: string;
}> = {
    petpooja: {
        steps: [
            "Log in to your Petpooja Admin Dashboard.",
            "Navigate to 'Marketplace' > 'Third Party Integrations' in the sidebar.",
            "Search for 'BistroIntelligence' in the search bar.",
            "Click 'Enable' to generate your API credentials.",
            "Copy the 'App Key' and 'Restaurant ID' and paste them here."
        ],
        fields: [
            { key: 'appKey', label: 'App Key / API Key', placeholder: 'pp_live_...' },
            { key: 'restId', label: 'Restaurant ID', placeholder: 'e.g. 238492' }
        ],
        docsUrl: '#'
    },
    posist: {
        steps: [
            "Log in to the Posist Enterprise portal.",
            "Go to 'Administration' > 'API Management'.",
            "Create a new API Client named 'BistroIntel'.",
            "Note down the 'Customer Key' and base URL provided."
        ],
        fields: [
            { key: 'customerKey', label: 'Customer Key', placeholder: 'Enter Customer Key' },
            { key: 'baseUrl', label: 'Base URL', placeholder: 'https://api.posist.com/...' }
        ],
        docsUrl: '#'
    },
    default: {
        steps: [
            "Contact your POS account manager to request API Access.",
            "Ask for the 'Partner API Key' and 'Secret'.",
            "Enter the credentials below to authorize the connection."
        ],
        fields: [
            { key: 'apiKey', label: 'API Key', placeholder: 'rzp_live_RYndnOARtD6tmd' },
            { key: 'secret', label: 'Client Secret', placeholder: 'Enter Secret' }
        ],
        docsUrl: '#'
    }
};

export const Integrations: React.FC = () => {
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([
    { id: 'petpooja', name: 'Petpooja', icon: 'P', status: 'disconnected' },
    { id: 'rista', name: 'Rista', icon: 'R', status: 'disconnected' },
    { id: 'posist', name: 'Posist', icon: 'Po', status: 'disconnected' },
    { id: 'urbanpiper', name: 'UrbanPiper', icon: 'U', status: 'disconnected' },
    { id: 'zomato', name: 'Zomato', icon: 'Z', status: 'disconnected' },
    { id: 'swiggy', name: 'Swiggy', icon: 'S', status: 'disconnected' },
  ]);

  const [marketingApps, setMarketingApps] = useState<IntegrationItem[]>([
      { id: 'instagram', name: 'Instagram', icon: <Instagram size={20} />, status: 'disconnected' },
      { id: 'facebook', name: 'Facebook', icon: <Facebook size={20} />, status: 'disconnected' },
      { id: 'google_business', name: 'Google Business', icon: <MapPin size={20} />, status: 'disconnected' }
  ]);

  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<POSChangeRequest[]>([]);
  const currentUser = authService.getCurrentUser();
  
  // Configuration Modal State
  const [configuringId, setConfiguringId] = useState<string | null>(null);
  const [configTab, setConfigTab] = useState<'guide' | 'settings'>('guide');
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [savingConfig, setSavingConfig] = useState(false);

  // Social Auth Modal State
  const [authModalProvider, setAuthModalProvider] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const purchaseInputRef = useRef<HTMLInputElement>(null);
  const expenseInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      if (currentUser) {
          const requests = storageService.getPOSChangeRequests(currentUser.id).filter(r => r.status === 'pending');
          setPendingRequests(requests);
      }
  }, [currentUser]);

  const togglePOSConnection = (id: string) => {
      setIntegrations(prev => prev.map(int => {
          if (int.id === id) return { ...int, loading: true };
          return int;
      }));

      setTimeout(() => {
          setIntegrations(prev => prev.map(int => {
              if (int.id === id) {
                  const isConnected = int.status === 'connected';
                  return {
                      ...int,
                      status: isConnected ? 'disconnected' : 'connected',
                      lastSync: !isConnected ? 'Just now' : undefined,
                      loading: false
                  };
              }
              return int;
          }));
          
          const target = integrations.find(i => i.id === id);
          if (target && target.status === 'disconnected') {
              handleConfigure(id);
          }
      }, 1500);
  };

  const handleConfigure = (id: string) => {
      setConfiguringId(id);
      setConfigTab('guide'); // Start with guide
      setConfigValues({});
  };

  const handleSaveConfig = () => {
      setSavingConfig(true);
      setTimeout(() => {
          setSavingConfig(false);
          setConfiguringId(null);
          setUploadSuccess(`Configuration for ${integrations.find(i => i.id === configuringId)?.name} saved successfully.`);
          
          // Simulate Data Sync on Connect
          if (currentUser) {
              const mockSales = generateMockSales(30);
              storageService.saveSalesData(currentUser.id, mockSales);
          }
          
          setTimeout(() => setUploadSuccess(null), 3000);
      }, 1000);
  };

  // --- SOCIAL MEDIA HANDLERS ---
  const openSocialAuth = (id: string) => {
      setAuthModalProvider(id);
  };

  const handleSocialConnectSuccess = () => {
      if (!authModalProvider) return;
      setIsAuthenticating(true);

      // Simulate API Handshake
      setTimeout(() => {
          const mockHandle = authModalProvider === 'instagram' ? '@the_golden_spoon_official' 
            : authModalProvider === 'facebook' ? 'The Golden Spoon Page' 
            : 'The Golden Spoon - Bandra';

          setMarketingApps(prev => prev.map(app => {
              if (app.id === authModalProvider) {
                  return {
                      ...app,
                      status: 'connected',
                      connectedAccount: mockHandle,
                      lastSync: 'Just now'
                  };
              }
              return app;
          }));

          setIsAuthenticating(false);
          setAuthModalProvider(null);
          setUploadSuccess(`Successfully linked ${mockHandle}`);
          setTimeout(() => setUploadSuccess(null), 3000);
      }, 2000);
  };

  const handleSocialDisconnect = (id: string) => {
      if (confirm("Are you sure you want to disconnect? Scheduled posts will fail.")) {
        setMarketingApps(prev => prev.map(app => {
            if (app.id === id) {
                return {
                    ...app,
                    status: 'disconnected',
                    connectedAccount: undefined,
                    lastSync: undefined
                };
            }
            return app;
        }));
      }
  };

  // --- FILE UPLOADS ---

  const handleUploadClick = () => {
      fileInputRef.current?.click();
  };

  const handlePurchaseClick = () => {
      purchaseInputRef.current?.click();
  };
  
  const handleExpenseClick = () => {
      expenseInputRef.current?.click();
  };

  // Helper to generate realistic looking daily sales data
  const generateMockSales = (days: number) => {
      const data = [];
      const today = new Date();
      for (let i = days; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          // Random revenue between 15k and 50k
          const rev = Math.floor(Math.random() * 35000) + 15000;
          const items = Math.floor(rev / 350); // Approx avg ticket
          data.push({
              date: d.toISOString().split('T')[0],
              revenue: rev,
              items_sold: items
          });
      }
      return data;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
      if (e.target.files && e.target.files.length > 0) {
          const files = Array.from(e.target.files);
          const count = files.length;
          
          setUploading(type);
          setUploadSuccess(null);
          
          // Simulate Processing Delay
          setTimeout(() => {
              setUploading(null);
              setUploadSuccess(`${type}: ${count} file${count > 1 ? 's' : ''} processed successfully.`);
              
              // --- INJECT DATA EFFECT ---
              if (currentUser) {
                  if (type === 'Sales Data') {
                      // Generate and save sales data to enable Dashboard charts
                      const mockSales = generateMockSales(30);
                      storageService.saveSalesData(currentUser.id, mockSales);
                  }
                  // For expenses/purchases we could assume it affects the same dataset for this demo
                  // or just logging it. But adding Sales data ensures the Dashboard "wakes up"
                  if (type === 'Operational Expenses' || type === 'Purchase Logs') {
                       // Ensure basic sales data exists so the user sees the dashboard
                       const currentSales = storageService.getSalesData(currentUser.id);
                       if (!currentSales || currentSales.length === 0) {
                           const mockSales = generateMockSales(30);
                           storageService.saveSalesData(currentUser.id, mockSales);
                       }
                  }
              }

              if (fileInputRef.current) fileInputRef.current.value = '';
              if (purchaseInputRef.current) purchaseInputRef.current.value = '';
              if (expenseInputRef.current) expenseInputRef.current.value = '';
          }, 2000);
      }
  };

  const handleProcessPOSRequest = (req: POSChangeRequest, action: 'approved' | 'rejected') => {
      if (action === 'approved' && currentUser?.role !== UserRole.OWNER) {
          alert("Only the Restaurant Owner can confirm POS changes.");
          return;
      }
      
      if (!currentUser) return;

      if (action === 'approved') {
          console.log(`Sending API Request to POS: Update SKU ${req.sku_id} price to ${req.new_price} with confirm=true`);
      }

      storageService.updatePOSChangeRequest(currentUser.id, req.id, action);
      setPendingRequests(prev => prev.filter(p => p.id !== req.id));
      
      if (action === 'approved') {
        setUploadSuccess(`Updated ${req.item_name} on POS successfully.`);
        setTimeout(() => setUploadSuccess(null), 3000);
      }
  };

  const selectedConfig = configuringId ? (POS_CONFIGS[configuringId] || POS_CONFIGS['default']) : null;
  const selectedIntegration = integrations.find(i => i.id === configuringId);

  // Social Auth Modal Component logic
  const renderSocialAuthModal = () => {
      if (!authModalProvider) return null;
      
      const config = {
          instagram: { 
              color: 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600', 
              icon: <Instagram size={48} className="text-white"/>,
              title: 'Instagram',
              permissions: ['Manage Posts', 'Read Profile', 'Access Insights'] 
          },
          facebook: { 
              color: 'bg-blue-600', 
              icon: <Facebook size={48} className="text-white"/>,
              title: 'Facebook',
              permissions: ['Manage Pages', 'Publish Content', 'Page Analytics'] 
          },
          google_business: { 
              color: 'bg-white border-2 border-slate-100', 
              icon: <div className="p-2"><MapPin size={40} className="text-blue-500"/></div>,
              title: 'Google Business Profile',
              textColor: 'text-slate-800',
              permissions: ['Manage Locations', 'Reply to Reviews', 'Update Business Info'] 
          }
      }[authModalProvider] || { color: 'bg-slate-800', icon: <Server/>, title: 'App', permissions: [] };

      // @ts-ignore
      const isGoogle = authModalProvider === 'google_business';

      return (
          <div className="fixed inset-0 z-[60] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in relative">
                  <div className={`h-32 ${config.color} flex items-center justify-center`}>
                      {config.icon}
                  </div>
                  
                  <div className="p-8 text-center">
                      <h3 className="text-xl font-bold text-slate-900 mb-2">Connect {config.title}</h3>
                      <p className="text-sm text-slate-500 mb-6">
                          Allow BistroIntelligence to access your {config.title} account to schedule posts and analyze performance.
                      </p>

                      <div className="text-left bg-slate-50 p-4 rounded-lg border border-slate-100 mb-6">
                          <p className="text-xs font-bold text-slate-400 uppercase mb-2">Requested Permissions</p>
                          <ul className="space-y-2">
                              {config.permissions.map(p => (
                                  <li key={p} className="flex items-center gap-2 text-sm text-slate-700">
                                      <CheckCircle2 size={14} className="text-emerald-500"/> {p}
                                  </li>
                              ))}
                          </ul>
                      </div>

                      <button 
                        onClick={handleSocialConnectSuccess}
                        disabled={isAuthenticating}
                        className={`w-full py-3 rounded-lg font-bold text-white transition-all shadow-lg flex items-center justify-center gap-2 ${isGoogle ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-900 hover:bg-slate-800'}`}
                      >
                          {isAuthenticating ? <Loader2 className="animate-spin" size={20} /> : null}
                          {isAuthenticating ? 'Connecting...' : `Continue as ${currentUser?.name || 'User'}`}
                      </button>
                      
                      <button 
                        onClick={() => setAuthModalProvider(null)}
                        className="mt-4 text-sm text-slate-400 hover:text-slate-600 font-medium"
                      >
                          Cancel
                      </button>
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto relative">
      
      {renderSocialAuthModal()}

      {/* POS Configuration Modal */}
      {configuringId && selectedConfig && selectedIntegration && (
          <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xl">
                              {selectedIntegration.icon}
                          </div>
                          <div>
                              <h3 className="text-xl font-bold text-slate-900">Configure {selectedIntegration.name}</h3>
                              <p className="text-sm text-slate-500">Connect your account to sync data</p>
                          </div>
                      </div>
                      <button onClick={() => setConfiguringId(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
                          <X size={20} />
                      </button>
                  </div>
                  
                  <div className="flex border-b border-slate-200">
                      <button 
                        onClick={() => setConfigTab('guide')}
                        className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${configTab === 'guide' ? 'border-emerald-500 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                      >
                          <BookOpen size={16} /> Setup Guide
                      </button>
                      <button 
                        onClick={() => setConfigTab('settings')}
                        className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${configTab === 'settings' ? 'border-emerald-500 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                      >
                          <Settings size={16} /> Credentials
                      </button>
                  </div>

                  <div className="p-8 min-h-[300px]">
                      {configTab === 'guide' ? (
                          <div className="space-y-6">
                              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800 flex gap-3">
                                  <AlertTriangle size={20} className="shrink-0" />
                                  <p>Follow these steps on your {selectedIntegration.name} dashboard to obtain the API credentials required for the connection.</p>
                              </div>
                              <div className="space-y-4">
                                  {selectedConfig.steps.map((step, i) => (
                                      <div key={i} className="flex gap-4">
                                          <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0 mt-0.5">
                                              {i + 1}
                                          </div>
                                          <p className="text-slate-700 text-sm">{step}</p>
                                      </div>
                                  ))}
                              </div>
                              <div className="pt-4 mt-4 border-t border-slate-100">
                                  <a href="#" className="text-emerald-600 font-bold text-sm flex items-center gap-1 hover:underline">
                                      View Official Documentation <ExternalLink size={14} />
                                  </a>
                              </div>
                          </div>
                      ) : (
                          <div className="space-y-4">
                              {selectedConfig.fields.map((field) => (
                                  <div key={field.key}>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{field.label}</label>
                                      <div className="relative">
                                          <input 
                                              type="text" 
                                              placeholder={field.placeholder}
                                              value={configValues[field.key] || ''}
                                              onChange={(e) => setConfigValues({...configValues, [field.key]: e.target.value})}
                                              className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all
                                                  ${['apiKey', 'appKey', 'customerKey'].some(k => field.key === k)
                                                      ? 'border-emerald-300 bg-emerald-50/30 font-mono text-sm shadow-sm' 
                                                      : 'border-slate-300'
                                                  }
                                              `}
                                          />
                                          <Key size={16} className="absolute left-3 top-2.5 text-slate-400" />
                                      </div>
                                  </div>
                              ))}
                              <div className="bg-slate-50 p-3 rounded text-xs text-slate-500 border border-slate-200 mt-4">
                                  Note: Your credentials are encrypted using AES-256 before being stored. We only use read-access for sales data and write-access for menu syncing.
                              </div>
                          </div>
                      )}
                  </div>

                  <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                      <button 
                        onClick={() => setConfiguringId(null)}
                        className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition-colors"
                      >
                          Cancel
                      </button>
                      <button 
                        onClick={configTab === 'guide' ? () => setConfigTab('settings') : handleSaveConfig}
                        disabled={savingConfig}
                        className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2"
                      >
                          {savingConfig ? <Loader2 size={16} className="animate-spin" /> : configTab === 'guide' ? <ArrowRight size={16} /> : <Save size={16} />}
                          {savingConfig ? 'Verifying...' : configTab === 'guide' ? 'Enter Credentials' : 'Save Configuration'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      <div className="flex justify-between items-end border-b border-slate-200 pb-6">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">Data & Integrations</h2>
            <p className="text-slate-500 mt-1">Connect your billing software, social media, or upload operational data.</p>
        </div>
        <div className="flex gap-2">
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-100 flex items-center gap-1">
                <CheckCircle2 size={12} /> System Operational
            </span>
        </div>
      </div>

      {pendingRequests.length > 0 && (
          <div className="bg-amber-50 p-6 rounded-xl border border-amber-200 shadow-sm animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="text-amber-600" size={24} />
                  <div>
                      <h3 className="text-lg font-bold text-slate-800">Pending POS Updates</h3>
                      <p className="text-sm text-slate-600">The following AI-suggested changes require Owner confirmation before syncing to billing.</p>
                  </div>
              </div>
              <div className="bg-white rounded-lg border border-amber-100 overflow-hidden">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-amber-50/50 text-slate-500 font-bold border-b border-amber-100">
                          <tr>
                              <th className="px-4 py-3">Menu Item</th>
                              <th className="px-4 py-3">Current Price</th>
                              <th className="px-4 py-3">New Price</th>
                              <th className="px-4 py-3">Requested By</th>
                              <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-50">
                          {pendingRequests.map(req => (
                              <tr key={req.id} className="hover:bg-slate-50">
                                  <td className="px-4 py-3 font-medium text-slate-800">{req.item_name} <span className="text-xs text-slate-400 font-mono ml-1">({req.sku_id})</span></td>
                                  <td className="px-4 py-3 text-slate-500">₹{req.old_price}</td>
                                  <td className="px-4 py-3 font-bold text-emerald-600 flex items-center gap-1">
                                      ₹{req.new_price}
                                      <span className="text-xs font-normal text-emerald-500 bg-emerald-50 px-1 rounded">
                                          {(((req.new_price - req.old_price) / req.old_price) * 100).toFixed(0)}%
                                      </span>
                                  </td>
                                  <td className="px-4 py-3 text-slate-500 text-xs">
                                      {req.requested_by}<br/>
                                      {new Date(req.requested_date).toLocaleDateString()}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                      <div className="flex justify-end gap-2">
                                          <button 
                                            onClick={() => handleProcessPOSRequest(req, 'rejected')}
                                            className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-red-600 border border-slate-200 rounded hover:bg-red-50"
                                          >
                                              Reject
                                          </button>
                                          <button 
                                            onClick={() => handleProcessPOSRequest(req, 'approved')}
                                            className="px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-emerald-600 rounded flex items-center gap-1 transition-colors disabled:opacity-50"
                                            title={currentUser?.role !== UserRole.OWNER ? "Only Owners can approve" : "Confirm Sync"}
                                          >
                                              {currentUser?.role === UserRole.OWNER ? <ShieldCheck size={12}/> : null} Approve & Sync
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: POS + Marketing */}
        <div className="space-y-8">
            {/* POS Integrations */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Server size={20} className="text-blue-600"/> Billing & POS Connectors
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Real-time sales syncing for accurate inventory & revenue analytics.</p>
                </div>
                
                <div className="space-y-4 flex-1">
                    {integrations.map((pos) => (
                        <div key={pos.id} className={`p-4 border rounded-xl transition-all ${
                            pos.status === 'connected' ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-100 hover:border-slate-300'
                        }`}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-lg shadow-sm ${
                                        pos.status === 'connected' ? 'bg-emerald-500' : 'bg-slate-400'
                                    }`}>
                                        {pos.icon}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800">{pos.name}</h4>
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${pos.status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                                            <p className="text-xs text-slate-500 font-medium">
                                                {pos.status === 'connected' ? `Synced: ${pos.lastSync}` : 'Not Connected'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => togglePOSConnection(pos.id)}
                                    disabled={pos.loading}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm min-w-[100px] flex justify-center ${
                                    pos.status === 'connected' 
                                    ? 'bg-white text-red-600 border border-slate-200 hover:bg-red-50 hover:border-red-200' 
                                    : 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-md'
                                }`}>
                                    {pos.loading ? <Loader2 size={16} className="animate-spin"/> : (pos.status === 'connected' ? 'Disconnect' : 'Connect')}
                                </button>
                            </div>
                            
                            {/* Config Status */}
                            {pos.status === 'connected' && (
                                <div className="mt-4 pt-3 border-t border-emerald-200/50 animate-fade-in">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-emerald-700 font-bold">Configuration Active</span>
                                        <button 
                                            onClick={() => handleConfigure(pos.id)}
                                            className="text-xs flex items-center gap-1 text-emerald-600 hover:text-emerald-800 font-medium"
                                        >
                                            <Settings size={12} /> Settings
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Social & Marketing Integrations */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Megaphone size={20} className="text-pink-600"/> Social Media & Marketing
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Connect accounts to auto-post generated content and track engagement.</p>
                </div>
                
                <div className="space-y-4">
                    {marketingApps.map((app) => (
                        <div key={app.id} className={`p-4 border rounded-xl transition-all ${
                            app.status === 'connected' ? 'border-pink-200 bg-pink-50/30' : 'border-slate-100 hover:border-slate-300'
                        }`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm transition-colors ${
                                        app.status === 'connected' ? (app.id === 'instagram' ? 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600' : app.id === 'facebook' ? 'bg-blue-600' : 'bg-blue-500') : 'bg-slate-400'
                                    }`}>
                                        {app.icon}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800">{app.name}</h4>
                                        <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                            {app.status === 'connected' ? (
                                                <span className="text-pink-600 font-bold flex items-center gap-1">
                                                    <Link2 size={10} /> {app.connectedAccount || 'Linked'}
                                                </span>
                                            ) : 'Not Connected'}
                                        </p>
                                    </div>
                                </div>
                                
                                {app.status === 'connected' ? (
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleSocialDisconnect(app.id)}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Disconnect"
                                        >
                                            <LogOut size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => openSocialAuth(app.id)}
                                        className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold transition-all shadow-sm hover:bg-slate-800"
                                    >
                                        Connect
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Right Column: Data Upload Section */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
            <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <UploadCloud size={20} className="text-emerald-600"/> Manual Data Upload
                </h3>
                <p className="text-sm text-slate-500 mt-1">Upload files in any format if you don't use a supported POS.</p>
            </div>

            <div className="space-y-4 flex-1">
                {/* Sales Upload */}
                <div 
                    onClick={handleUploadClick}
                    className="p-6 border-2 border-dashed border-slate-200 rounded-xl hover:bg-slate-50 hover:border-emerald-300 transition-all cursor-pointer group text-center"
                >
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                        <FileSpreadsheet size={24} />
                    </div>
                    <h4 className="font-bold text-slate-700">Upload Sales Reports</h4>
                    <p className="text-xs text-slate-400 mt-1">CSV, Excel, PDF, Images</p>
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={(e) => handleFileChange(e, 'Sales Data')}
                        className="hidden" 
                        multiple
                        accept=".csv,.xlsx,.xls,.pdf,image/*,.doc,.docx,.txt"
                    />
                </div>

                {/* Purchase Upload */}
                <div 
                    onClick={handlePurchaseClick}
                    className="p-6 border-2 border-dashed border-slate-200 rounded-xl hover:bg-slate-50 hover:border-blue-300 transition-all cursor-pointer group text-center"
                >
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                        <ImageIcon size={24} />
                    </div>
                    <h4 className="font-bold text-slate-700">Upload Purchase Logs & Receipts</h4>
                    <p className="text-xs text-slate-400 mt-1">Invoices, CSV, Excel, or <span className="text-blue-600 font-bold">Photo Receipts</span></p>
                    <input 
                        type="file" 
                        ref={purchaseInputRef}
                        onChange={(e) => handleFileChange(e, 'Purchase Logs')}
                        className="hidden" 
                        multiple
                        accept=".csv,.xlsx,.xls,.pdf,image/*,.doc,.docx,.txt"
                    />
                </div>

                {/* Expense Upload */}
                <div 
                    onClick={handleExpenseClick}
                    className="p-6 border-2 border-dashed border-slate-200 rounded-xl hover:bg-slate-50 hover:border-purple-300 transition-all cursor-pointer group text-center"
                >
                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                        <Receipt size={24} />
                    </div>
                    <h4 className="font-bold text-slate-700">Upload Expenses & Salaries</h4>
                    <p className="text-xs text-slate-400 mt-1">Any format (PDF, Excel, Img)</p>
                    <input 
                        type="file" 
                        ref={expenseInputRef}
                        onChange={(e) => handleFileChange(e, 'Operational Expenses')}
                        className="hidden" 
                        multiple
                        accept=".pdf,image/*,.csv,.xlsx,.xls,.doc,.docx,.txt"
                    />
                </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-100">
                <button className="w-full py-2 flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-emerald-600 font-bold transition-colors">
                    <Download size={16} /> Download CSV Templates
                </button>
            </div>
        </div>
      </div>

      {/* Global Toast for Uploads */}
      {(uploading || uploadSuccess) && (
          <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 animate-fade-in-up z-50">
              {uploading ? (
                  <>
                    <Loader2 className="animate-spin text-emerald-400" size={24} />
                    <div>
                        <p className="font-bold">Processing {uploading}...</p>
                        <p className="text-xs text-slate-400">Parsing data and extracting insights</p>
                    </div>
                  </>
              ) : (
                  <>
                    <CheckCircle2 className="text-emerald-400" size={24} />
                     <div>
                        <p className="font-bold">Success</p>
                        <p className="text-xs text-slate-400">{uploadSuccess}</p>
                    </div>
                  </>
              )}
          </div>
      )}
    </div>
  );
};
