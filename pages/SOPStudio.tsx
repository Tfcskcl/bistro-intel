
import React, { useState, useEffect } from 'react';
import { User, SOP, SOPRequest, UserRole } from '../types';
import { generateSOP } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { CREDIT_COSTS } from '../constants';
import { FileText, Loader2, Sparkles, Save, Search, AlertCircle, CheckCircle2, Clock, Wallet, BookOpen, Printer, Share2, User as UserIcon, X, Copy, Mail, Key } from 'lucide-react';

interface SOPStudioProps {
  user: User;
  onUserUpdate?: (user: User) => void;
}

export const SOPStudio: React.FC<SOPStudioProps> = ({ user, onUserUpdate }) => {
  const isAdmin = [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(user.role);
  const [viewMode, setViewMode] = useState<'create' | 'saved' | 'requests'>('create');
  
  // Generator State
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSOP, setGeneratedSOP] = useState<SOP | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(true);

  // Saved SOPs
  const [savedSOPs, setSavedSOPs] = useState<SOP[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Requests
  const [requests, setRequests] = useState<SOPRequest[]>([]);

  // Sharing Modal
  const [shareSOP, setShareSOP] = useState<SOP | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  useEffect(() => {
    loadSavedSOPs();
    if (isAdmin) {
      loadRequests();
    }
  }, [user.id, isAdmin]);

  // Poll for API Key Status
  useEffect(() => {
    const checkKey = async () => {
        if ((window as any).aistudio) {
            try {
                const has = await (window as any).aistudio.hasSelectedApiKey();
                setHasApiKey(has);
                if (has && error && error.includes("API Key")) setError(null);
            } catch (e) {
                console.error("Error checking API key", e);
            }
        }
    };
    checkKey();
    const interval = setInterval(checkKey, 2000);
    return () => clearInterval(interval);
  }, [error]);

  const loadSavedSOPs = () => {
    setSavedSOPs(storageService.getSavedSOPs(user.id));
  };

  const loadRequests = () => {
    setRequests(storageService.getAllSOPRequests().filter(r => r.status === 'pending'));
  };

  const handleGenerate = async () => {
    if (!topic) return;
    
    if (!hasApiKey) {
        handleConnectKey();
        return;
    }

    if (!isAdmin) {
      if (user.credits < CREDIT_COSTS.SOP) {
        setError(`Insufficient credits. Required: ${CREDIT_COSTS.SOP}, Available: ${user.credits}`);
        return;
      }
    }

    setIsGenerating(true);
    setError(null);

    try {
      if (!isAdmin && onUserUpdate) {
        const success = storageService.deductCredits(user.id, CREDIT_COSTS.SOP, `SOP Generation: ${topic}`);
        if (!success) throw new Error("Credit deduction failed");
        onUserUpdate({ ...user, credits: user.credits - CREDIT_COSTS.SOP });
      }

      const sop = await generateSOP(topic);
      setGeneratedSOP(sop);
    } catch (err: any) {
      setError(err.message || "Failed to generate SOP");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConnectKey = async () => {
      if ((window as any).aistudio) {
          try {
              await (window as any).aistudio.openSelectKey();
              setHasApiKey(true);
              setError(null);
          } catch (e) {
              console.error(e);
          }
      }
  };

  const handleSave = () => {
    if (generatedSOP) {
      storageService.saveSOP(user.id, generatedSOP);
      loadSavedSOPs();
      setViewMode('saved');
      setGeneratedSOP(null);
      setTopic('');
    }
  };

  const handleFulfillRequest = async (req: SOPRequest) => {
    setIsGenerating(true);
    try {
        const sop = await generateSOP(req.topic);
        storageService.updateSOPRequest({
            ...req,
            status: 'completed',
            completedDate: new Date().toISOString()
        });
        loadRequests();
    } catch (err: any) {
        alert("Failed to generate SOP for request: " + err.message);
    } finally {
        setIsGenerating(false);
    }
  };

  const openShareModal = (e: React.MouseEvent, sop: SOP) => {
      e.stopPropagation();
      setShareSOP(sop);
      setCopyStatus(null);
  };

  const handleCopyLink = () => {
      if (!shareSOP) return;
      const dummyLink = `https://bistroconnect.in/sop/view/${shareSOP.sop_id}`;
      navigator.clipboard.writeText(dummyLink);
      setCopyStatus("Link copied!");
      setTimeout(() => setCopyStatus(null), 2000);
  };

  const handleEmailShare = () => {
      if (!shareSOP) return;
      const subject = `SOP: ${shareSOP.title}`;
      const body = `Hi,\n\nHere is the Standard Operating Procedure for ${shareSOP.title}.\n\nScope: ${shareSOP.scope}\n\nView full details here: https://bistroconnect.in/sop/view/${shareSOP.sop_id}\n\nRegards,\n${user.name}`;
      window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col gap-6 relative">
      
      {/* Share Modal */}
      {shareSOP && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white dark:bg-slate-900 rounded-xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-scale-in">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                          <Share2 size={18} className="text-blue-500" /> Share SOP
                      </h3>
                      <button onClick={() => setShareSOP(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                          <X size={20} />
                      </button>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 truncate font-medium">"{shareSOP.title}"</p>
                  
                  <div className="space-y-3">
                      <button 
                        onClick={handleCopyLink}
                        className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                      >
                          <div className="flex items-center gap-3">
                              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                                  <Copy size={18} />
                              </div>
                              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Copy Link</span>
                          </div>
                          {copyStatus ? <span className="text-xs text-emerald-600 font-bold">{copyStatus}</span> : null}
                      </button>

                      <button 
                        onClick={handleEmailShare}
                        className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                      >
                          <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                                  <Mail size={18} />
                              </div>
                              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Send via Email</span>
                          </div>
                      </button>
                  </div>
              </div>
          </div>
      )}

      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <button 
             onClick={() => setViewMode('create')}
             className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'create' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
           >
             Create SOP
           </button>
           <button 
             onClick={() => setViewMode('saved')}
             className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'saved' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
           >
             Saved Library
           </button>
           {isAdmin && (
             <button 
               onClick={() => setViewMode('requests')}
               className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'requests' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
             >
               User Requests
             </button>
           )}
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 rounded-full text-xs font-bold">
            <Wallet size={12} fill="currentColor" />
            Credits: {user.credits}
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col transition-colors">
        {viewMode === 'create' && (
          <div className="flex h-full">
            <div className="w-1/3 border-r border-slate-200 dark:border-slate-800 p-6 bg-slate-50 dark:bg-slate-800/50 overflow-y-auto">
               <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                 <FileText className="text-blue-600 dark:text-blue-400" /> Standard Operating Procedure
               </h3>
               
               <div className="space-y-4">
                 <div>
                   <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">SOP Topic / Title</label>
                   <input 
                     type="text" 
                     value={topic}
                     onChange={(e) => setTopic(e.target.value)}
                     placeholder="e.g. Daily Kitchen Opening Checklist"
                     className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                   />
                 </div>

                 {error && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <AlertCircle size={16} /> {error}
                        </div>
                        <button onClick={() => setError(null)} className="text-xs hover:underline">Dismiss</button>
                    </div>
                 )}

                 {hasApiKey ? (
                     <button 
                       onClick={handleGenerate}
                       disabled={isGenerating || !topic}
                       className="w-full py-3 bg-slate-900 dark:bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                     >
                       {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                       Generate ({CREDIT_COSTS.SOP} CR)
                     </button>
                 ) : (
                     <button 
                       onClick={handleConnectKey}
                       className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                     >
                       <Key size={20} /> Connect API Key
                     </button>
                 )}
               </div>
            </div>

            <div className="flex-1 p-8 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50">
               {generatedSOP ? (
                 <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 animate-fade-in">
                    <div className="flex justify-between items-start mb-8 border-b border-slate-100 dark:border-slate-800 pb-4">
                       <div>
                         <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{generatedSOP.title}</h1>
                         <p className="text-slate-500 dark:text-slate-400 mt-1">ID: {generatedSOP.sop_id} • Scope: {generatedSOP.scope}</p>
                       </div>
                       <div className="flex gap-2">
                           <button 
                             onClick={(e) => openShareModal(e, generatedSOP)}
                             className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                           >
                             <Share2 size={18} /> Share
                           </button>
                           <button 
                             onClick={handleSave}
                             className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-500/20"
                           >
                             <Save size={18} /> Save SOP
                           </button>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 mb-8">
                       <div>
                          <h3 className="font-bold text-slate-800 dark:text-white mb-2 uppercase text-xs tracking-wider">Prerequisites</h3>
                          <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3 rounded border border-slate-100 dark:border-slate-700">{generatedSOP.prerequisites}</p>
                       </div>
                       <div>
                          <h3 className="font-bold text-slate-800 dark:text-white mb-2 uppercase text-xs tracking-wider">Materials Needed</h3>
                          <div className="flex flex-wrap gap-2">
                             {generatedSOP.materials_equipment.map((item, i) => (
                               <span key={i} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs rounded border border-slate-200 dark:border-slate-700">{item}</span>
                             ))}
                          </div>
                       </div>
                    </div>

                    <div className="mb-8">
                       <h3 className="font-bold text-slate-800 dark:text-white mb-4 uppercase text-xs tracking-wider">Step-by-Step Procedure</h3>
                       <div className="space-y-3">
                          {generatedSOP.stepwise_procedure.map((step, i) => (
                             <div key={i} className="flex gap-4 p-4 border border-slate-100 dark:border-slate-700 rounded-lg hover:border-blue-200 dark:hover:border-blue-700 transition-colors bg-white dark:bg-slate-800">
                                <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white flex items-center justify-center font-bold shrink-0">
                                   {step.step_no}
                                </div>
                                <div className="flex-1">
                                   <p className="font-bold text-slate-800 dark:text-white text-sm">{step.action}</p>
                                   <div className="flex gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
                                      <span className="flex items-center gap-1"><UserIcon size={12} className="inline"/> {step.responsible_role}</span>
                                      {step.time_limit && <span className="flex items-center gap-1"><Clock size={12} className="inline"/> {step.time_limit}</span>}
                                   </div>
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                       <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-100 dark:border-red-900/50">
                          <h3 className="font-bold text-red-800 dark:text-red-400 mb-2 text-sm">Critical Control Points</h3>
                          <ul className="list-disc pl-4 space-y-1 text-sm text-red-700 dark:text-red-300">
                             {generatedSOP.critical_control_points.map((pt, i) => (
                               <li key={i}>{pt}</li>
                             ))}
                          </ul>
                       </div>
                       <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
                          <h3 className="font-bold text-emerald-800 dark:text-emerald-400 mb-2 text-sm">KPIs & Monitoring</h3>
                          <ul className="list-disc pl-4 space-y-1 text-sm text-emerald-700 dark:text-emerald-300">
                             {generatedSOP.kpis.map((kpi, i) => (
                               <li key={i}>{kpi}</li>
                             ))}
                          </ul>
                       </div>
                    </div>

                 </div>
               ) : (
                 <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 opacity-60">
                    <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                      <BookOpen size={48} />
                    </div>
                    <p className="text-lg font-medium">Standardize your operations</p>
                    <p className="text-sm">Generate checklists, training manuals, and procedures instantly.</p>
                 </div>
               )}
            </div>
          </div>
        )}

        {viewMode === 'saved' && (
           <div className="p-6 h-full flex flex-col">
              <div className="flex gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search SOPs..."
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto">
                 {savedSOPs
                   .filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
                   .map((sop, idx) => (
                     <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:border-blue-500 dark:hover:border-blue-500 transition-colors shadow-sm group cursor-pointer" onClick={() => setGeneratedSOP(sop)}>
                        <h4 className="font-bold text-lg text-slate-800 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400 mb-2">{sop.title}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">{sop.scope}</p>
                        <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
                           <span className="text-xs font-bold text-slate-400 dark:text-slate-500">{sop.stepwise_procedure.length} Steps</span>
                           <div className="flex gap-1">
                                <button 
                                    onClick={(e) => openShareModal(e, sop)}
                                    className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                                    title="Share SOP"
                                >
                                    <Share2 size={16} />
                                </button>
                                <button className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors">
                                    <Printer size={16} />
                                </button>
                           </div>
                        </div>
                     </div>
                   ))}
              </div>
           </div>
        )}

        {viewMode === 'requests' && isAdmin && (
           <div className="p-6 h-full overflow-y-auto">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Pending SOP Requests</h3>
              <div className="space-y-4">
                 {requests.length === 0 ? <p className="text-slate-500 dark:text-slate-400 text-center py-12">No requests pending.</p> : requests.map(req => (
                    <div key={req.id} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-center justify-between">
                       <div>
                          <h4 className="font-bold text-slate-800 dark:text-white">{req.topic}</h4>
                          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{req.details}</p>
                          <p className="text-xs text-slate-400 mt-2">Requested by: {req.userName}</p>
                       </div>
                       <div>
                          {req.status === 'completed' ? (
                             <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-full">Completed</span>
                          ) : (
                             <button 
                               onClick={() => handleFulfillRequest(req)}
                               disabled={isGenerating}
                               className="px-4 py-2 bg-slate-900 dark:bg-emerald-600 text-white text-xs font-bold rounded hover:bg-blue-600 dark:hover:bg-emerald-700 transition-colors flex items-center gap-2"
                             >
                               {isGenerating ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />} Fulfill
                             </button>
                          )}
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        )}
      </div>
    </div>
  );
};
