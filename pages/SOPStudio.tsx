
import React, { useState, useEffect } from 'react';
import { User, SOP, SOPRequest, UserRole } from '../types';
import { generateSOP } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { CREDIT_COSTS } from '../constants';
import { FileText, Loader2, Sparkles, Save, Search, AlertCircle, CheckCircle2, Clock, Wallet, BookOpen, Printer, Share2, User as UserIcon, X, Copy, Mail, Key, Link } from 'lucide-react';

interface SOPStudioProps {
  user: User;
  onUserUpdate?: (user: User) => void;
}

export const SOPStudio: React.FC<SOPStudioProps> = ({ user, onUserUpdate }) => {
  const isAdmin = [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(user.role);
  const [viewMode, setViewMode] = useState<'create' | 'saved' | 'requests'>('create');
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSOP, setGeneratedSOP] = useState<SOP | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedSOPs, setSavedSOPs] = useState<SOP[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [requests, setRequests] = useState<SOPRequest[]>([]);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  useEffect(() => {
    loadSavedSOPs();
    if (isAdmin) loadRequests();
  }, [user.id, isAdmin]);

  const loadSavedSOPs = () => setSavedSOPs(storageService.getSavedSOPs(user.id));
  const loadRequests = () => setRequests(storageService.getAllSOPRequests().filter(r => r.status === 'pending'));

  const handleGenerate = async () => {
    if (!topic) return;
    if (!isAdmin && user.credits < CREDIT_COSTS.SOP) {
        setError(`Insufficient credits.`);
        return;
    }
    setIsGenerating(true);
    setError(null);
    try {
      if (!isAdmin && onUserUpdate) {
        storageService.deductCredits(user.id, CREDIT_COSTS.SOP, `SOP Gen: ${topic}`);
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

  const handleCopyLink = (sop: SOP) => {
      const link = `${window.location.origin}/sop/share/${sop.sop_id}`;
      navigator.clipboard.writeText(link);
      setCopyStatus("Shareable link copied to clipboard!");
      setTimeout(() => setCopyStatus(null), 3000);
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col gap-6 relative">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <button onClick={() => setViewMode('create')} className={`px-4 py-2 rounded-lg text-sm font-bold ${viewMode === 'create' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`}>Create SOP</button>
          <button onClick={() => setViewMode('saved')} className={`px-4 py-2 rounded-lg text-sm font-bold ${viewMode === 'saved' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`}>Saved Library</button>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-bold"><Wallet size={12}/> Credits: {user.credits}</div>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col transition-colors">
        {viewMode === 'create' && (
          <div className="flex h-full">
            <div className="w-1/3 border-r border-slate-200 dark:border-slate-800 p-6 bg-slate-50 dark:bg-slate-800/50 overflow-y-auto">
               <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2"><FileText className="text-blue-600" /> Standard Operating Procedure</h3>
               <div className="space-y-4">
                 <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-2">SOP Topic</label>
                   <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Closing Checklist" className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:bg-slate-800 dark:text-white" />
                 </div>
                 {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}
                 <button onClick={handleGenerate} disabled={isGenerating || !topic} className="w-full py-3 bg-slate-900 text-white font-bold rounded-lg flex items-center justify-center gap-2 hover:opacity-90">
                   {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />} Generate ({CREDIT_COSTS.SOP} CR)
                 </button>
               </div>
            </div>
            <div className="flex-1 p-8 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50">
               {generatedSOP ? (
                 <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <div className="flex justify-between items-start mb-8 border-b pb-4">
                       <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{generatedSOP.title}</h1>
                       <div className="flex gap-2">
                           <button onClick={() => handleCopyLink(generatedSOP)} className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-lg flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800">
                               <Link size={18} /> Share
                           </button>
                           <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors">
                               <Save size={18} /> Save
                           </button>
                       </div>
                    </div>
                    {/* Render SOP Details */}
                    <div className="space-y-6">
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-white mb-2">Scope & Prerequisites</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-300 mb-2"><strong>Scope:</strong> {generatedSOP.scope}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-300"><strong>Prerequisites:</strong> {generatedSOP.prerequisites}</p>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-white mb-2">Procedure</h3>
                            <div className="space-y-2">
                                {generatedSOP.stepwise_procedure.map((s,i)=>(
                                    <div key={i} className="flex gap-3 text-sm p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                        <span className="font-bold text-slate-400">{s.step_no}.</span>
                                        <div className="flex-1">
                                            <p className="text-slate-800 dark:text-slate-200 font-medium">{s.action}</p>
                                            <div className="flex gap-2 mt-1 text-xs text-slate-500">
                                                <span className="bg-white dark:bg-slate-700 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600">{s.responsible_role}</span>
                                                {s.time_limit && <span className="flex items-center gap-1"><Clock size={10}/> {s.time_limit}</span>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-white mb-2 text-sm uppercase">Equipment</h3>
                                <ul className="list-disc pl-5 text-sm text-slate-600 dark:text-slate-300">{generatedSOP.materials_equipment.map((m,i)=><li key={i}>{m}</li>)}</ul>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-white mb-2 text-sm uppercase">KPIs</h3>
                                <ul className="list-disc pl-5 text-sm text-slate-600 dark:text-slate-300">{generatedSOP.kpis.map((k,i)=><li key={i}>{k}</li>)}</ul>
                            </div>
                        </div>
                    </div>
                 </div>
               ) : (
                 <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                    <BookOpen size={48} className="mb-4" />
                    <p>Standardize your operations</p>
                 </div>
               )}
            </div>
          </div>
        )}
        {viewMode === 'saved' && (
           <div className="p-6 h-full flex flex-col">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto">
                 {savedSOPs.map((sop, idx) => (
                     <div key={idx} className="relative bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl p-5 hover:border-blue-500 dark:hover:border-blue-500 cursor-pointer group transition-all shadow-sm hover:shadow-md">
                        <div onClick={() => {setGeneratedSOP(sop); setViewMode('create');}}>
                            <h4 className="font-bold text-lg text-slate-800 dark:text-white mb-1">{sop.title}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{sop.scope}</p>
                            <div className="mt-3 flex gap-2">
                                <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded">{sop.stepwise_procedure.length} Steps</span>
                            </div>
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleCopyLink(sop); }}
                            className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Share Link"
                        >
                            <Share2 size={16} />
                        </button>
                     </div>
                 ))}
                 {savedSOPs.length === 0 && (
                     <div className="col-span-full text-center py-12 text-slate-400">
                         <p>No SOPs saved yet.</p>
                     </div>
                 )}
              </div>
           </div>
        )}
      </div>

      {copyStatus && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 animate-fade-in-up">
            <CheckCircle2 size={18} className="text-emerald-400" />
            <span className="font-bold text-sm">{copyStatus}</span>
        </div>
      )}
    </div>
  );
};
