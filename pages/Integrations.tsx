
import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Database, CheckCircle2, Server, Loader2, X, RefreshCw, FileSpreadsheet, Download, Settings, Key, AlertTriangle, ArrowRight, ShieldCheck, BookOpen, Copy, ExternalLink, Save, Receipt } from 'lucide-react';
import { storageService } from '../services/storageService';
import { POSChangeRequest, User, UserRole } from '../types';
import { authService } from '../services/authService';

interface IntegrationItem {
  id: string;
  name: string;
  icon: string;
  status: string;
  lastSync?: string;
  loading?: boolean;
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

  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<POSChangeRequest[]>([]);
  const currentUser = authService.getCurrentUser();
  
  // Configuration Modal State
  const [configuringId, setConfiguringId] = useState<string | null>(null);
  const [configTab, setConfigTab] = useState<'guide' | 'settings'>('guide');
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [savingConfig, setSavingConfig] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const purchaseInputRef = useRef<HTMLInputElement>(null);
  const expenseInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      if (currentUser) {
          const requests = storageService.getPOSChangeRequests(currentUser.id).filter(r => r.status === 'pending');
          setPendingRequests(requests);
      }
  }, [currentUser]);

  const toggleConnection = (id: string) => {
      setIntegrations(prev => prev.map(int => {
          if (int.id === id) return { ...int, loading: true };
          return int;
      }));

      setTimeout(() => {
          setIntegrations(prev => prev.map(int => {
              if (int.id === id) {
                  const isConnected = int.status === 'connected';
                  // If connecting, we might normally require config first, but for demo we allow simple toggle
                  return {
                      ...int,
                      status: isConnected ? 'disconnected' : 'connected',
                      lastSync: !isConnected ? 'Just now' : undefined,
                      loading: false
                  };
              }
              return int;
          }));
          
          // If connecting, open config automatically
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
          setTimeout(() => setUploadSuccess(null), 3000);
      }, 1000);
  };

  const handleUploadClick = () => {
      fileInputRef.current?.click();
  };

  const handlePurchaseClick = () => {
      purchaseInputRef.current?.click();
  };
  
  const handleExpenseClick = () => {
      expenseInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
      if (e.target.files && e.target.files.length > 0) {
          const fileName = e.target.files[0].name;
          setUploading(type);
          setUploadSuccess(null);
          
          setTimeout(() => {
              setUploading(null);
              setUploadSuccess(`${type}: ${fileName} processed successfully.`);
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

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto relative">
      
      {/* Configuration Modal */}
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
            <p className="text-slate-500 mt-1">Connect your billing software or upload operational data for AI analysis.</p>
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
        {/* POS Integrations */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
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
                                onClick={() => toggleConnection(pos.id)}
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

        {/* Data Upload Section */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
            <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <UploadCloud size={20} className="text-emerald-600"/> Manual Data Upload
                </h3>
                <p className="text-sm text-slate-500 mt-1">Upload CSV/Excel files if you don't use a supported POS.</p>
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
                    <p className="text-xs text-slate-400 mt-1">Drag & drop or click to browse</p>
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={(e) => handleFileChange(e, 'Sales Data')}
                        className="hidden" 
                        accept=".csv,.xlsx"
                    />
                </div>

                {/* Purchase Upload */}
                <div 
                    onClick={handlePurchaseClick}
                    className="p-6 border-2 border-dashed border-slate-200 rounded-xl hover:bg-slate-50 hover:border-blue-300 transition-all cursor-pointer group text-center"
                >
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                        <Database size={24} />
                    </div>
                    <h4 className="font-bold text-slate-700">Upload Purchase Logs</h4>
                    <p className="text-xs text-slate-400 mt-1">For accurate inventory costing</p>
                    <input 
                        type="file" 
                        ref={purchaseInputRef}
                        onChange={(e) => handleFileChange(e, 'Purchase Logs')}
                        className="hidden" 
                        accept=".csv,.xlsx"
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
                    <p className="text-xs text-slate-400 mt-1">PDF, Images, Excel, etc.</p>
                    <input 
                        type="file" 
                        ref={expenseInputRef}
                        onChange={(e) => handleFileChange(e, 'Operational Expenses')}
                        className="hidden" 
                        accept=".pdf,image/*,.csv,.xlsx,.doc,.docx"
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
                        <p className="text-xs text-slate-400">Parsing rows and normalizing data</p>
                    </div>
                  </>
              ) : (
                  <>
                    <CheckCircle2 className="text-emerald-400" size={24} />
                     <div>
                        <p className="font-bold">Upload Complete</p>
                        <p className="text-xs text-slate-400">{uploadSuccess}</p>
                    </div>
                  </>
              )}
          </div>
      )}
    </div>
  );
};
