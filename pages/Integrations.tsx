import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Database, CheckCircle2, Server, Loader2, X, RefreshCw, FileSpreadsheet, Download, Settings, Key, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import { storageService } from '../services/storageService';
import { POSChangeRequest, User, UserRole } from '../types';
import { authService } from '../services/authService';

export const Integrations: React.FC = () => {
  const [integrations, setIntegrations] = useState([
    { id: 'petpooja', name: 'Petpooja', icon: 'P', status: 'connected', lastSync: '10 mins ago' },
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
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const purchaseInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      const requests = storageService.getPOSChangeRequests().filter(r => r.status === 'pending');
      setPendingRequests(requests);
  }, []);

  const toggleConnection = (id: string) => {
      // Set loading state
      setIntegrations(prev => prev.map(int => {
          if (int.id === id) return { ...int, loading: true };
          return int;
      }));

      // Simulate API handshake delay
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
      }, 1500);
  };

  const handleUploadClick = () => {
      fileInputRef.current?.click();
  };

  const handlePurchaseClick = () => {
      purchaseInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
      if (e.target.files && e.target.files.length > 0) {
          const fileName = e.target.files[0].name;
          setUploading(type);
          setUploadSuccess(null);
          
          // Simulate upload delay
          setTimeout(() => {
              setUploading(null);
              setUploadSuccess(`${type}: ${fileName} processed successfully.`);
              // Reset input
              if (fileInputRef.current) fileInputRef.current.value = '';
              if (purchaseInputRef.current) purchaseInputRef.current.value = '';
          }, 2000);
      }
  };

  const handleProcessPOSRequest = (req: POSChangeRequest, action: 'approved' | 'rejected') => {
      if (action === 'approved' && currentUser?.role !== UserRole.OWNER) {
          alert("Only the Restaurant Owner can confirm POS changes.");
          return;
      }

      // In a real app, this is where we would send confirm=true to the API
      if (action === 'approved') {
          console.log(`Sending API Request to POS: Update SKU ${req.sku_id} price to ${req.new_price} with confirm=true`);
      }

      storageService.updatePOSChangeRequest(req.id, action);
      setPendingRequests(prev => prev.filter(p => p.id !== req.id));
      
      if (action === 'approved') {
        setUploadSuccess(`Updated ${req.item_name} on POS successfully.`);
        setTimeout(() => setUploadSuccess(null), 3000);
      }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
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
                        
                        {/* Placeholder UI for connection details */}
                        {pos.status === 'connected' && (
                            <div className="mt-4 pt-3 border-t border-emerald-200/50 animate-fade-in">
                                <div className="flex items-center justify-between text-xs mb-2">
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <Key size={12} />
                                        <span className="font-semibold">API Key:</span>
                                        <span className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-100 text-slate-400">sk_live_••••••••</span>
                                    </div>
                                    <button className="text-emerald-700 hover:text-emerald-900 font-medium flex items-center gap-1">
                                        <Settings size={12} /> Configure
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-emerald-600 bg-emerald-100/50 px-2 py-1 rounded inline-flex">
                                    <RefreshCw size={10} /> Auto-sync enabled (Daily)
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>

        {/* Manual Uploads */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
             <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <UploadCloud size={20} className="text-yellow-600"/> Manual Data Upload
                </h3>
                <p className="text-sm text-slate-500 mt-1">Upload CSV/Excel files if you don't use a supported POS.</p>
            </div>

            {uploadSuccess && (
                <div className="mb-4 p-3 bg-emerald-50 text-emerald-800 text-sm rounded-lg flex items-center justify-between border border-emerald-100 animate-fade-in">
                    <span className="flex items-center gap-2"><CheckCircle2 size={16} /> {uploadSuccess}</span>
                    <button onClick={() => setUploadSuccess(null)} className="text-emerald-600 hover:text-emerald-900"><X size={14}/></button>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                    { label: 'Sales Data', type: 'sales' },
                    { label: 'Expense Report', type: 'expenses' },
                    { label: 'Employee Payroll', type: 'payroll' },
                    { label: 'Marketing Spend', type: 'marketing' }
                ].map((item) => (
                    <div 
                        key={item.type}
                        onClick={() => {
                            // Trigger hidden file input logic per type would go here
                            // For demo, we just trigger the one ref
                            handleUploadClick();
                        }}
                        className={`relative p-5 border border-dashed rounded-xl cursor-pointer group transition-all overflow-hidden ${
                            uploading === item.type 
                                ? 'bg-slate-50 border-slate-300' 
                                : 'border-slate-300 hover:border-yellow-400 hover:bg-yellow-50/30'
                        }`}
                    >
                        {uploading === item.type ? (
                            <div className="flex flex-col items-center justify-center h-full py-2">
                                <Loader2 className="animate-spin text-slate-400 mb-2" size={24} />
                                <span className="text-xs text-slate-500 font-medium">Processing...</span>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between mb-2">
                                    <FileSpreadsheet className="text-slate-400 group-hover:text-yellow-600 transition-colors" size={24} />
                                    <UploadCloud className="text-slate-300 group-hover:text-yellow-600 transition-colors opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0" size={16} />
                                </div>
                                <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">{item.label}</span>
                                <p className="text-[10px] text-slate-400 mt-1">Supports .csv, .xlsx</p>
                            </>
                        )}
                        
                        {/* Hidden Input for this item (conceptual) */}
                        <input 
                            type="file" 
                            ref={fileInputRef}
                            className="hidden" 
                            accept=".csv,.xlsx"
                            onChange={(e) => handleFileChange(e, item.label)}
                        />
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* Dedicated Purchase Upload Section */}
      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <FileSpreadsheet size={20} className="text-emerald-600"/> Bulk Purchase Import
                </h3>
                <p className="text-sm text-slate-500 mt-1">Upload your invoice CSVs or Purchase Logs to automatically update ingredient prices and stock levels.</p>
            </div>
            <button className="text-sm text-emerald-600 font-bold hover:text-emerald-700 flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-colors">
                <Download size={16} /> Download Template
            </button>
        </div>

        <div 
            onClick={handlePurchaseClick}
            className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-all cursor-pointer group ${
                uploading === 'purchases' ? 'bg-slate-50 border-slate-300' : 'border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/10'
            }`}
        >
             {uploading === 'purchases' ? (
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="animate-spin text-emerald-500" size={32} />
                    <p className="text-slate-600 font-medium">Analyzing purchase data...</p>
                </div>
            ) : (
                <>
                    <div className="w-16 h-16 bg-slate-50 text-slate-400 group-hover:text-emerald-600 group-hover:bg-emerald-50 rounded-full flex items-center justify-center mb-4 transition-all">
                        <UploadCloud size={32} />
                    </div>
                    <p className="text-slate-900 font-bold text-lg">Click to upload Purchase Data</p>
                    <p className="text-sm text-slate-500 mt-1">or drag and drop CSV / Excel file here</p>
                    <p className="text-xs text-slate-400 mt-4 bg-slate-100 px-3 py-1 rounded-full">Max file size: 10MB</p>
                </>
            )}
            <input 
                type="file" 
                ref={purchaseInputRef} 
                className="hidden" 
                accept=".csv,.xlsx"
                onChange={(e) => handleFileChange(e, 'Purchases')}
            />
        </div>
      </div>
            
      <div className="p-4 bg-blue-50 text-blue-800 rounded-xl text-sm flex items-start gap-3 border border-blue-100">
        <Database size={18} className="mt-0.5 shrink-0 text-blue-600"/>
        <div>
            <p className="font-bold mb-1">AI Data Engine Active</p>
            <p className="text-blue-700/80 text-xs leading-relaxed">
                Uploaded data is automatically cleaned and fed into the Strategy AI. 
                Financial reports are updated within 30 seconds of upload.
            </p>
        </div>
      </div>
    </div>
  );
};