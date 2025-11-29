
import React, { useState, useEffect } from 'react';
import { User, SOP, SOPRequest, UserRole } from '../types';
import { generateSOP } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { CREDIT_COSTS } from '../constants';
import { FileText, Loader2, Sparkles, Save, Search, AlertCircle, CheckCircle2, Clock, Wallet, BookOpen, Printer, Share2, User as UserIcon } from 'lucide-react';

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

  // Saved SOPs
  const [savedSOPs, setSavedSOPs] = useState<SOP[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Requests
  const [requests, setRequests] = useState<SOPRequest[]>([]);

  useEffect(() => {
    loadSavedSOPs();
    if (isAdmin) {
      loadRequests();
    }
  }, [user.id, isAdmin]);

  const loadSavedSOPs = () => {
    setSavedSOPs(storageService.getSavedSOPs(user.id));
  };

  const loadRequests = () => {
    setRequests(storageService.getAllSOPRequests().filter(r => r.status === 'pending'));
  };

  const handleGenerate = async () => {
    if (!topic) return;
    
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

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <button 
             onClick={() => setViewMode('create')}
             className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'create' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
           >
             Create SOP
           </button>
           <button 
             onClick={() => setViewMode('saved')}
             className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'saved' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
           >
             Saved Library
           </button>
           {isAdmin && (
             <button 
               onClick={() => setViewMode('requests')}
               className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'requests' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
             >
               User Requests
             </button>
           )}
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-bold">
            <Wallet size={12} fill="currentColor" />
            Credits: {user.credits}
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {viewMode === 'create' && (
          <div className="flex h-full">
            <div className="w-1/3 border-r border-slate-200 p-6 bg-slate-50 overflow-y-auto">
               <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                 <FileText className="text-blue-600" /> Standard Operating Procedure
               </h3>
               
               <div className="space-y-4">
                 <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-2">SOP Topic / Title</label>
                   <input 
                     type="text" 
                     value={topic}
                     onChange={(e) => setTopic(e.target.value)}
                     placeholder="e.g. Daily Kitchen Opening Checklist"
                     className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                   />
                 </div>

                 {error && (
                    <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                 )}

                 <button 
                   onClick={handleGenerate}
                   disabled={isGenerating || !topic}
                   className="w-full py-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                 >
                   {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                   Generate ({CREDIT_COSTS.SOP} CR)
                 </button>
               </div>
            </div>

            <div className="flex-1 p-8 overflow-y-auto bg-slate-50/50">
               {generatedSOP ? (
                 <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200 animate-fade-in">
                    <div className="flex justify-between items-start mb-8 border-b border-slate-100 pb-4">
                       <div>
                         <h1 className="text-2xl font-bold text-slate-900">{generatedSOP.title}</h1>
                         <p className="text-slate-500 mt-1">ID: {generatedSOP.sop_id} • Scope: {generatedSOP.scope}</p>
                       </div>
                       <button 
                         onClick={handleSave}
                         className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-500/20"
                       >
                         <Save size={18} /> Save SOP
                       </button>
                    </div>

                    <div className="grid grid-cols-2 gap-8 mb-8">
                       <div>
                          <h3 className="font-bold text-slate-800 mb-2 uppercase text-xs tracking-wider">Prerequisites</h3>
                          <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded border border-slate-100">{generatedSOP.prerequisites}</p>
                       </div>
                       <div>
                          <h3 className="font-bold text-slate-800 mb-2 uppercase text-xs tracking-wider">Materials Needed</h3>
                          <div className="flex flex-wrap gap-2">
                             {generatedSOP.materials_equipment.map((item, i) => (
                               <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded border border-slate-200">{item}</span>
                             ))}
                          </div>
                       </div>
                    </div>

                    <div className="mb-8">
                       <h3 className="font-bold text-slate-800 mb-4 uppercase text-xs tracking-wider">Step-by-Step Procedure</h3>
                       <div className="space-y-3">
                          {generatedSOP.stepwise_procedure.map((step, i) => (
                             <div key={i} className="flex gap-4 p-4 border border-slate-100 rounded-lg hover:border-blue-200 transition-colors bg-white">
                                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold shrink-0">
                                   {step.step_no}
                                </div>
                                <div className="flex-1">
                                   <p className="font-bold text-slate-800 text-sm">{step.action}</p>
                                   <div className="flex gap-4 mt-2 text-xs text-slate-500">
                                      <span className="flex items-center gap-1"><UserIcon size={12} className="inline"/> {step.responsible_role}</span>
                                      {step.time_limit && <span className="flex items-center gap-1"><Clock size={12} className="inline"/> {step.time_limit}</span>}
                                   </div>
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                       <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                          <h3 className="font-bold text-red-800 mb-2 text-sm">Critical Control Points</h3>
                          <ul className="list-disc pl-4 space-y-1 text-sm text-red-700">
                             {generatedSOP.critical_control_points.map((pt, i) => (
                               <li key={i}>{pt}</li>
                             ))}
                          </ul>
                       </div>
                       <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                          <h3 className="font-bold text-emerald-800 mb-2 text-sm">KPIs & Monitoring</h3>
                          <ul className="list-disc pl-4 space-y-1 text-sm text-emerald-700">
                             {generatedSOP.kpis.map((kpi, i) => (
                               <li key={i}>{kpi}</li>
                             ))}
                          </ul>
                       </div>
                    </div>

                 </div>
               ) : (
                 <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                    <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
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
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto">
                 {savedSOPs
                   .filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
                   .map((sop, idx) => (
                     <div key={idx} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-500 transition-colors shadow-sm group cursor-pointer" onClick={() => setGeneratedSOP(sop)}>
                        <h4 className="font-bold text-lg text-slate-800 group-hover:text-blue-700 mb-2">{sop.title}</h4>
                        <p className="text-xs text-slate-500 line-clamp-2 mb-4">{sop.scope}</p>
                        <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                           <span className="text-xs font-bold text-slate-400">{sop.stepwise_procedure.length} Steps</span>
                           <button className="text-slate-400 hover:text-blue-600"><Printer size={16} /></button>
                        </div>
                     </div>
                   ))}
              </div>
           </div>
        )}

        {viewMode === 'requests' && isAdmin && (
           <div className="p-6 h-full overflow-y-auto">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Pending SOP Requests</h3>
              <div className="space-y-4">
                 {requests.length === 0 ? <p className="text-slate-500 text-center py-12">No requests pending.</p> : requests.map(req => (
                    <div key={req.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                       <div>
                          <h4 className="font-bold text-slate-800">{req.topic}</h4>
                          <p className="text-sm text-slate-600 mt-1">{req.details}</p>
                          <p className="text-xs text-slate-400 mt-2">Requested by: {req.userName}</p>
                       </div>
                       <div>
                          {req.status === 'completed' ? (
                             <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">Completed</span>
                          ) : (
                             <button 
                               onClick={() => handleFulfillRequest(req)}
                               disabled={isGenerating}
                               className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded hover:bg-blue-600 transition-colors flex items-center gap-2"
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
