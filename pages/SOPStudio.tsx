
import React, { useState, useEffect, useRef } from 'react';
import { User, SOP, SOPRequest, UserRole } from '../types';
import { generateSOP, suggestSOPsFromImage } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { CREDIT_COSTS } from '../constants';
import { FileText, Loader2, Sparkles, Save, Search, AlertCircle, CheckCircle2, Clock, Wallet, BookOpen, Printer, Share2, User as UserIcon, X, Copy, Mail, Key, Link, Upload, Camera, CheckSquare, Square } from 'lucide-react';

interface SOPStudioProps {
  user: User;
  onUserUpdate?: (user: User) => void;
}

export const SOPStudio: React.FC<SOPStudioProps> = ({ user, onUserUpdate }) => {
  const isAdmin = [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(user.role);
  const [viewMode, setViewMode] = useState<'create' | 'saved' | 'requests'>('create');
  
  // Generation State
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<string>('');
  const [generatedSOP, setGeneratedSOP] = useState<SOP | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Data State
  const [savedSOPs, setSavedSOPs] = useState<SOP[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [requests, setRequests] = useState<SOPRequest[]>([]);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  
  // Image Analysis & Bulk State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  useEffect(() => {
    loadSavedSOPs();
    if (isAdmin) loadRequests();
  }, [user.id, isAdmin]);

  const loadSavedSOPs = () => setSavedSOPs(storageService.getSavedSOPs(user.id));
  const loadRequests = () => setRequests(storageService.getAllSOPRequests().filter(r => r.status === 'pending'));

  const toggleTopicSelection = (t: string) => {
      if (selectedTopics.includes(t)) {
          setSelectedTopics(prev => prev.filter(item => item !== t));
      } else {
          setSelectedTopics(prev => [...prev, t]);
          setTopic(''); // Clear manual input when selecting suggestions
      }
  };

  const handleGenerate = async () => {
    // Determine mode: Bulk or Single
    const isBulk = selectedTopics.length > 0;
    const topicsToProcess = isBulk ? selectedTopics : (topic ? [topic] : []);

    if (topicsToProcess.length === 0) return;

    const totalCost = topicsToProcess.length * CREDIT_COSTS.SOP;
    
    if (!isAdmin && user.credits < totalCost) {
        setError(`Insufficient credits. Need ${totalCost} CR for ${topicsToProcess.length} SOP(s).`);
        return;
    }

    setIsGenerating(true);
    setError(null);
    setGenerationProgress(isBulk ? `Preparing to generate ${topicsToProcess.length} SOPs...` : 'Generating...');

    try {
      let successCount = 0;
      const newSOPs: SOP[] = [];

      for (let i = 0; i < topicsToProcess.length; i++) {
          const currentTopic = topicsToProcess[i];
          if (isBulk) setGenerationProgress(`Generating ${i + 1}/${topicsToProcess.length}: "${currentTopic}"...`);

          try {
              if (!isAdmin) {
                  storageService.deductCredits(user.id, CREDIT_COSTS.SOP, `SOP Gen: ${currentTopic}`);
              }

              const sop = await generateSOP(currentTopic);
              
              // CRITICAL: Ensure unique ID for every generated SOP to prevent overwrites
              sop.sop_id = `sop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              
              if (isBulk) {
                  // Auto-save generated SOPs in bulk mode
                  storageService.saveSOP(user.id, sop);
                  storageService.addTask(user.id, `Train staff on new SOP: ${sop.title}`, ['SOP', 'Training']);
              }
              
              newSOPs.push(sop);
              successCount++;
          } catch (innerErr) {
              console.error(`Failed to generate SOP for ${currentTopic}`, innerErr);
          }
      }

      // Update User Credits in UI
      if (!isAdmin && onUserUpdate) {
          const newBalance = storageService.getUserCredits(user.id);
          onUserUpdate({ ...user, credits: newBalance });
      }

      loadSavedSOPs();

      if (isBulk) {
          setViewMode('saved');
          setSelectedTopics([]);
          setSuggestedTopics([]);
          setTopic('');
          alert(`Successfully generated and saved ${successCount} SOPs.`);
      } else if (newSOPs.length > 0) {
          // Single mode: Show the generated SOP for editing/viewing
          setGeneratedSOP(newSOPs[0]);
      }

    } catch (err: any) {
      setError(err.message || "Failed to generate SOP sequence.");
    } finally {
      setIsGenerating(false);
      setGenerationProgress('');
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
      const link = `https://bistroconnect.in/sop/view/${sop.sop_id}`;
      navigator.clipboard.writeText(link).then(() => {
          setCopyStatus("Link copied!");
          setTimeout(() => setCopyStatus(null), 3000);
      }).catch(err => {
          console.error('Failed to copy: ', err);
      });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onload = async (ev) => {
              if (ev.target?.result) {
                  setAnalyzingImage(true);
                  setSuggestedTopics([]);
                  setSelectedTopics([]);
                  try {
                      const suggestions = await suggestSOPsFromImage(ev.target.result as string);
                      setSuggestedTopics([...new Set(suggestions)]); // Deduplicate
                  } catch (err) {
                      console.error("Image analysis failed", err);
                      setSuggestedTopics(["Kitchen Hygiene", "Prep Station Setup", "Hand Washing", "Equipment Safety"]);
                  } finally {
                      setAnalyzingImage(false);
                  }
              }
          };
          reader.readAsDataURL(file);
      }
  };

  // derived state for UI
  const isBulkMode = selectedTopics.length > 0;
  const cost = isBulkMode ? selectedTopics.length * CREDIT_COSTS.SOP : CREDIT_COSTS.SOP;

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col gap-6 relative">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <button onClick={() => setViewMode('create')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'create' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>Create SOP</button>
          <button onClick={() => setViewMode('saved')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'saved' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>Saved Library</button>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 rounded-full text-xs font-bold"><Wallet size={12}/> Credits: {user.credits}</div>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col transition-colors">
        {viewMode === 'create' && (
          <div className="flex flex-col md:flex-row h-full">
            {/* Left Sidebar: Controls */}
            <div className="w-full md:w-1/3 border-r border-slate-200 dark:border-slate-800 p-6 bg-slate-50 dark:bg-slate-800/50 overflow-y-auto">
               <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2"><FileText className="text-blue-600" /> Standard Operating Procedure</h3>
               <div className="space-y-6">
                 
                 {/* Image Upload Area */}
                 <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center cursor-pointer hover:bg-white dark:hover:bg-slate-800 transition-colors group" onClick={() => fileInputRef.current?.click()}>
                     {analyzingImage ? (
                         <div className="flex flex-col items-center text-slate-500">
                             <Loader2 size={32} className="animate-spin mb-2 text-blue-500"/>
                             <p className="text-xs font-bold">AI Analyzing Scene...</p>
                         </div>
                     ) : (
                         <div className="flex flex-col items-center text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300 transition-colors">
                             <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center mb-3 shadow-sm">
                                <Camera size={24} className="text-blue-500"/>
                             </div>
                             <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Scan Workplace</p>
                             <p className="text-xs mt-1">Upload a photo to detect needed SOPs</p>
                         </div>
                     )}
                     <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload}/>
                 </div>

                 {/* Suggestions List */}
                 {suggestedTopics.length > 0 && (
                     <div className="space-y-3 animate-fade-in">
                         <div className="flex justify-between items-center">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Detected Requirements</p>
                            {selectedTopics.length > 0 && (
                                <button 
                                    onClick={() => setSelectedTopics([])}
                                    className="text-[10px] text-red-500 hover:underline"
                                >
                                    Clear Selection
                                </button>
                            )}
                         </div>
                         <div className="grid grid-cols-1 gap-2">
                             {suggestedTopics.map((suggestion, idx) => {
                                 const isSelected = selectedTopics.includes(suggestion);
                                 return (
                                     <button 
                                        key={idx}
                                        onClick={() => toggleTopicSelection(suggestion)}
                                        className={`px-3 py-2.5 text-sm rounded-lg border text-left flex items-center gap-3 transition-all ${
                                            isSelected 
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                                        }`}
                                     >
                                         {isSelected ? <CheckSquare size={16} className="shrink-0" /> : <Square size={16} className="shrink-0 opacity-50" />}
                                         <span className="truncate">{suggestion}</span>
                                     </button>
                                 );
                             })}
                         </div>
                     </div>
                 )}

                 {/* Manual Input */}
                 <div className={`transition-opacity ${isBulkMode ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                   <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Or Enter Topic Manually</label>
                   <input 
                        type="text" 
                        value={topic} 
                        onChange={(e) => setTopic(e.target.value)} 
                        disabled={isBulkMode}
                        placeholder={isBulkMode ? "Bulk mode active..." : "e.g. Closing Checklist"} 
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" 
                    />
                 </div>

                 {error && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs rounded-lg flex items-start gap-2">
                        <AlertCircle size={14} className="mt-0.5 shrink-0"/> {error}
                    </div>
                 )}

                 {/* Action Button */}
                 <button 
                    onClick={handleGenerate} 
                    disabled={isGenerating || (!topic && selectedTopics.length === 0)} 
                    className="w-full py-4 bg-slate-900 dark:bg-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all shadow-lg"
                 >
                   {isGenerating ? (
                       <>
                        <Loader2 className="animate-spin" size={20} />
                        <span className="text-sm">{generationProgress || 'Processing...'}</span>
                       </>
                   ) : (
                       <>
                        <Sparkles size={20} /> 
                        {isBulkMode ? `Generate ${selectedTopics.length} SOPs (${cost} CR)` : `Generate SOP (${cost} CR)`}
                       </>
                   )}
                 </button>
               </div>
            </div>

            {/* Right Panel: Content */}
            <div className="flex-1 p-8 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50">
               {generatedSOP ? (
                 <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 animate-fade-in-up">
                    <div className="flex justify-between items-start mb-8 border-b border-slate-100 dark:border-slate-800 pb-4">
                       <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{generatedSOP.title}</h1>
                       <div className="flex gap-2">
                           <button onClick={() => handleCopyLink(generatedSOP)} className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-lg flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800">
                               <Link size={18} /> Share
                           </button>
                           <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors">
                               <Save size={18} /> Save to Library
                           </button>
                       </div>
                    </div>
                    {/* Render SOP Details */}
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
                                <h3 className="font-bold text-slate-800 dark:text-white mb-2 text-sm uppercase">Scope</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-300">{generatedSOP.scope}</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
                                <h3 className="font-bold text-slate-800 dark:text-white mb-2 text-sm uppercase">Prerequisites</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-300">{generatedSOP.prerequisites}</p>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                                Procedure
                            </h3>
                            <div className="space-y-3">
                                {generatedSOP.stepwise_procedure?.map((s,i)=>(
                                    <div key={i} className="flex gap-4 text-sm p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                                        <div className="flex flex-col items-center gap-1 min-w-[3rem]">
                                            <span className="font-bold text-slate-400 text-xs">Step</span>
                                            <span className="font-black text-xl text-slate-800 dark:text-white">{s.step_no}</span>
                                        </div>
                                        <div className="flex-1 border-l border-slate-100 dark:border-slate-800 pl-4">
                                            <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">{s.action}</p>
                                            <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-500">
                                                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 font-semibold">{s.responsible_role}</span>
                                                {s.time_limit && <span className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-2 py-1 rounded"><Clock size={10}/> {s.time_limit}</span>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-white mb-3 text-sm uppercase border-b border-slate-100 dark:border-slate-800 pb-2">Equipment Needed</h3>
                                <ul className="space-y-2">
                                    {generatedSOP.materials_equipment?.map((m,i)=> (
                                        <li key={i} className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div> {m}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-white mb-3 text-sm uppercase border-b border-slate-100 dark:border-slate-800 pb-2">Key Performance Indicators</h3>
                                <ul className="space-y-2">
                                    {generatedSOP.kpis?.map((k,i)=> (
                                        <li key={i} className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
                                            <CheckCircle2 size={14} className="text-emerald-500"/> {k}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                 </div>
               ) : (
                 <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                    <BookOpen size={64} className="mb-6 text-slate-300 dark:text-slate-600" />
                    <h3 className="text-lg font-bold text-slate-500 dark:text-slate-400 mb-1">Standardize Your Operations</h3>
                    <p className="text-sm max-w-xs text-center">Use AI to generate detailed procedures for any task, or upload a photo to get started.</p>
                 </div>
               )}
            </div>
          </div>
        )}
        {viewMode === 'saved' && (
           <div className="p-6 h-full flex flex-col">
              <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white">SOP Library</h2>
                  <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                      <input 
                        type="text" 
                        placeholder="Search SOPs..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 w-64"
                      />
                  </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-10">
                 {savedSOPs.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase())).map((sop, idx) => (
                     <div key={idx} className="relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:border-blue-500 dark:hover:border-blue-500 cursor-pointer group transition-all shadow-sm hover:shadow-md flex flex-col h-full">
                        <div className="flex-1" onClick={() => {setGeneratedSOP(sop); setViewMode('create');}}>
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                                    <FileText size={20} />
                                </div>
                                <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-1 rounded font-mono">
                                    {sop.sop_id.split('_')[1] || 'REF'}
                                </span>
                            </div>
                            <h4 className="font-bold text-lg text-slate-800 dark:text-white mb-2 line-clamp-2">{sop.title}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 mb-4">{sop.scope}</p>
                        </div>
                        
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center mt-auto">
                            <span className="text-xs font-bold text-slate-400">{sop.stepwise_procedure?.length || 0} Steps</span>
                            <div className="flex gap-2">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleCopyLink(sop); }}
                                    className="p-2 bg-slate-50 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors"
                                    title="Share Link"
                                >
                                    <Link size={16} />
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); /* Print logic */ }}
                                    className="p-2 bg-slate-50 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors"
                                    title="Print"
                                >
                                    <Printer size={16} />
                                </button>
                            </div>
                        </div>
                     </div>
                 ))}
                 {savedSOPs.length === 0 && (
                     <div className="col-span-full text-center py-12 text-slate-400">
                         <FileText size={48} className="mx-auto mb-4 opacity-20" />
                         <p>No SOPs found. Create your first one!</p>
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
