
import React, { useState, useEffect, useRef } from 'react';
import { User, SOP, SOPRequest, UserRole } from '../types';
import { generateSOP, suggestSOPsFromImage } from '../services/geminiService';
import { storageService, storageEvents } from '../services/storageService';
import { CREDIT_COSTS } from '../constants';
import { FileText, Loader2, Sparkles, Save, Search, AlertCircle, CheckCircle2, Clock, Wallet, BookOpen, Printer, Share2, User as UserIcon, X, Copy, Mail, Key, Link, Upload, Camera, CheckSquare, Square, ArrowRight } from 'lucide-react';

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

  // Check quota status
  const isFree = !storageService.shouldChargeCredits(user.id, 'sops');
  const unitCost = isFree ? 0 : CREDIT_COSTS.SOP;

  useEffect(() => {
    loadSavedSOPs();
    if (isAdmin) loadRequests();
    
    window.addEventListener(storageEvents.DATA_UPDATED, loadSavedSOPs);
    return () => window.removeEventListener(storageEvents.DATA_UPDATED, loadSavedSOPs);
  }, [user.id, isAdmin]);

  const loadSavedSOPs = async () => {
      const sops = await storageService.getSavedSOPsAsync(user.id);
      setSavedSOPs(sops);
  };
  
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

    // Calc total cost based on how many are remaining in quota vs paid
    let estimatedCost = 0;
    
    if (!isAdmin && unitCost > 0) {
        estimatedCost = topicsToProcess.length * unitCost;
        if (user.credits < estimatedCost) {
            setError(`Insufficient credits. Need ${estimatedCost} CR for ${topicsToProcess.length} SOP(s).`);
            return;
        }
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
                  const charge = storageService.shouldChargeCredits(user.id, 'sops') ? CREDIT_COSTS.SOP : 0;
                  if (charge > 0) {
                      storageService.deductCredits(user.id, charge, `SOP Gen: ${currentTopic}`);
                  }
                  storageService.incrementUsage(user.id, 'sops');
              }

              const sop = await generateSOP(currentTopic);
              
              // CRITICAL: Ensure unique ID for every generated SOP to prevent overwrites
              sop.sop_id = `sop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              
              if (isBulk) {
                  // Auto-save generated SOPs in bulk mode
                  await storageService.saveSOPAsync(user.id, sop);
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

      await loadSavedSOPs();

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

  const handleSave = async () => {
    if (generatedSOP) {
      await storageService.saveSOPAsync(user.id, generatedSOP);
      await loadSavedSOPs();
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
  // Estimate cost for display (not perfect for bulk if quota runs out midway, but sufficient)
  const displayCost = isBulkMode ? selectedTopics.length * unitCost : unitCost;

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
                                            ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200' 
                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-blue-300 text-slate-700 dark:text-slate-300'
                                        }`}
                                     >
                                        {isSelected ? <CheckSquare size={16} className="text-blue-600 dark:text-blue-400 shrink-0"/> : <Square size={16} className="text-slate-400 shrink-0"/>}
                                        <span className="truncate">{suggestion}</span>
                                     </button>
                                 );
                             })}
                         </div>
                     </div>
                 )}
               </div>
            </div>

            {/* Right Panel: Generator & Preview */}
            <div className="flex-1 p-6 lg:p-8 overflow-y-auto flex flex-col">
                {generatedSOP ? (
                    <div className="flex-1 max-w-3xl mx-auto w-full animate-fade-in">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{generatedSOP.title}</h2>
                            <div className="flex gap-2">
                                <button onClick={() => setGeneratedSOP(null)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Back</button>
                                <button onClick={handleSave} className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 flex items-center gap-2">
                                    <Save size={18}/> Save to Library
                                </button>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-8">
                            <div>
                                <h3 className="text-sm font-bold text-slate-400 uppercase mb-2">Scope</h3>
                                <p className="text-slate-700 dark:text-slate-300">{generatedSOP.scope}</p>
                            </div>
                            
                            <div>
                                <h3 className="text-sm font-bold text-slate-400 uppercase mb-3">Step-by-Step Procedure</h3>
                                <div className="space-y-4">
                                    {generatedSOP.stepwise_procedure.map((step, i) => (
                                        <div key={i} className="flex gap-4">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                                                {step.step_no}
                                            </div>
                                            <div>
                                                <p className="text-slate-800 dark:text-white font-medium">{step.action}</p>
                                                <p className="text-xs text-slate-500 mt-1">Role: {step.responsible_role} {step.time_limit ? `• ${step.time_limit}` : ''}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-100 dark:border-red-900/30">
                                    <h4 className="text-xs font-bold text-red-700 dark:text-red-400 uppercase mb-2 flex items-center gap-2">
                                        <AlertCircle size={14}/> Critical Control Points
                                    </h4>
                                    <ul className="list-disc pl-4 space-y-1 text-sm text-red-800 dark:text-red-200">
                                        {generatedSOP.critical_control_points.map((pt, i) => <li key={i}>{pt}</li>)}
                                    </ul>
                                </div>
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                                    <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase mb-2 flex items-center gap-2">
                                        <CheckCircle2 size={14}/> Checklist
                                    </h4>
                                    <ul className="space-y-1 text-sm text-emerald-800 dark:text-emerald-200">
                                        {generatedSOP.monitoring_checklist.map((pt, i) => (
                                            <li key={i} className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full border border-emerald-400"></div> {pt}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full text-center">
                        <div className="mb-8">
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Build Your Operations Manual</h2>
                            <p className="text-slate-500 dark:text-slate-400">Generate professional SOPs, checklists, and training guides instantly.</p>
                        </div>

                        <div className="w-full relative mb-6">
                            <input 
                                value={topic}
                                onChange={(e) => { setTopic(e.target.value); setSelectedTopics([]); }}
                                disabled={isGenerating || isBulkMode}
                                placeholder={isBulkMode ? `${selectedTopics.length} topics selected for generation` : "e.g. Closing Checklist for Bar, Food Safety Protocol..."}
                                className="w-full px-6 py-4 text-lg rounded-full border border-slate-300 dark:border-slate-700 shadow-sm focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:text-slate-500"
                            />
                            {isBulkMode && (
                                <div className="absolute right-2 top-2 bottom-2 flex items-center">
                                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold mr-2">
                                        Bulk Mode
                                    </span>
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm flex items-center gap-2">
                                <AlertCircle size={16} /> {error}
                            </div>
                        )}

                        <button 
                            onClick={handleGenerate}
                            disabled={isGenerating || (!topic && !isBulkMode)}
                            className="w-full md:w-auto px-10 py-4 bg-slate-900 dark:bg-emerald-600 text-white font-bold rounded-full hover:bg-slate-800 dark:hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-900/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    {generationProgress || 'Generating...'}
                                </>
                            ) : (
                                <>
                                    <Sparkles size={20} />
                                    {isBulkMode 
                                        ? `Generate ${selectedTopics.length} SOPs (${displayCost} CR)`
                                        : `Generate SOP (${displayCost} CR)`
                                    }
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
          </div>
        )}

        {viewMode === 'saved' && (
            <div className="flex-1 p-6 overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">SOP Library</h2>
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                        <input 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search procedures..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                    {savedSOPs
                        .filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((sop) => (
                        <div key={sop.sop_id} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all shadow-sm hover:shadow-md group flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                                    <BookOpen size={24} />
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => handleCopyLink(sop)}
                                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500"
                                        title="Copy Link"
                                    >
                                        <Link size={16} />
                                    </button>
                                    <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500" title="Print">
                                        <Printer size={16} />
                                    </button>
                                </div>
                            </div>
                            <h3 className="font-bold text-slate-800 dark:text-white mb-2 line-clamp-1">{sop.title}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 mb-4 flex-1">{sop.scope}</p>
                            
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-xs">
                                <span className="text-slate-400">{sop.stepwise_procedure.length} Steps</span>
                                <button 
                                    onClick={() => { setGeneratedSOP(sop); setViewMode('create'); }}
                                    className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                >
                                    View Details <ArrowRight size={12}/>
                                </button>
                            </div>
                        </div>
                    ))}
                    {savedSOPs.length === 0 && (
                        <div className="col-span-full text-center py-20 text-slate-400">
                            <FileText size={48} className="mx-auto mb-4 opacity-50"/>
                            <p>No saved SOPs yet.</p>
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>

      {/* Copy Toast */}
      {copyStatus && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white px-4 py-2 rounded-full shadow-lg text-sm font-bold animate-fade-in-up flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400" /> {copyStatus}
          </div>
      )}
    </div>
  );
};
