
import React, { useState, useEffect } from 'react';
import { generateSOP } from '../services/geminiService';
import { SOP, User, UserRole, SOPRequest } from '../types';
import { FileText, Loader2, CheckSquare, AlertTriangle, PlayCircle, Lock, Save, Trash2, Zap, AlertCircle, Inbox, UserCheck, Clock3, CheckCircle2, Sparkles, Send } from 'lucide-react';
import { storageService } from '../services/storageService';

interface SOPStudioProps {
    user: User;
    onUserUpdate?: (user: User) => void;
}

export const SOPStudio: React.FC<SOPStudioProps> = ({ user, onUserUpdate }) => {
  const [topic, setTopic] = useState('');
  const [details, setDetails] = useState(''); // New field for request details
  const [sop, setSop] = useState<SOP | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // View Modes
  // For Admin: 'generator' | 'requests' | 'saved'
  // For Owner: 'request-form' | 'requests' | 'saved'
  const [viewMode, setViewMode] = useState<'generator' | 'request-form' | 'saved' | 'requests'>('generator');
  
  const [savedSOPs, setSavedSOPs] = useState<SOP[]>([]);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Request State
  const [myRequests, setMyRequests] = useState<SOPRequest[]>([]);
  const [adminQueue, setAdminQueue] = useState<SOPRequest[]>([]);
  const [activeRequest, setActiveRequest] = useState<SOPRequest | null>(null);

  const isAdmin = [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(user.role);

  useEffect(() => {
      setSavedSOPs(storageService.getSavedSOPs(user.id));
      refreshRequests();
      
      // Set initial view mode based on role
      if (!isAdmin) {
          setViewMode('request-form');
      }
  }, [user.id, user.role]);

  const refreshRequests = () => {
    const allRequests = storageService.getAllSOPRequests();
    if (isAdmin) {
        setAdminQueue(allRequests.filter(r => r.status === 'pending'));
    } else {
        setMyRequests(allRequests.filter(r => r.userId === user.id));
    }
  };

  const checkUsage = (): boolean => {
      if (user.isTrial) {
          if ((user.queriesUsed || 0) >= (user.queryLimit || 10)) {
              setError("Free Demo limit reached. Please upgrade to continue.");
              return false;
          }
      }
      return true;
  };

  const incrementUsage = () => {
      if (user.isTrial && onUserUpdate) {
          const newUsage = (user.queriesUsed || 0) + 1;
          onUserUpdate({ ...user, queriesUsed: newUsage });
      }
  };

  // 1. Submit Generation (Admin Only)
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    if (!checkUsage()) return;

    setLoading(true);
    setSop(null);
    setError(null);
    try {
      // Append details to topic for better AI context if available
      const fullPrompt = details ? `${topic}. Context: ${details}` : topic;
      const result = await generateSOP(fullPrompt);
      setSop(result);
      // Only increment usage for generation, not request creation
      incrementUsage();
    } catch (err: any) {
      setError(err.message || "Failed to generate SOP.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Submit Request (Owner Only)
  const handleRequestSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!topic.trim()) return;
      if (!checkUsage()) return; // Even requests might count towards "activity" limits or demo limits

      const newRequest: SOPRequest = {
          id: `sop_req_${Date.now()}`,
          userId: user.id,
          userName: user.name,
          topic: topic,
          details: details,
          status: 'pending',
          requestDate: new Date().toISOString()
      };

      storageService.saveSOPRequest(newRequest);
      refreshRequests();
      setTopic('');
      setDetails('');
      alert("SOP Request sent! Our team will process it shortly.");
      setViewMode('requests');
  };

  // 3. Admin Fulfill Request
  const handleFulfillRequest = (req: SOPRequest) => {
      setActiveRequest(req);
      setTopic(req.topic);
      setDetails(req.details || '');
      setViewMode('generator');
  };

  const handleSave = () => {
      if (sop) {
          if (isAdmin && activeRequest) {
              // Save to Requester's Library
              storageService.saveSOP(activeRequest.userId, sop);
              
              // Mark request complete
              const completedReq: SOPRequest = {
                  ...activeRequest,
                  status: 'completed',
                  completedDate: new Date().toISOString()
              };
              storageService.updateSOPRequest(completedReq);
              
              refreshRequests();
              setActiveRequest(null);
              setSaveStatus(`Sent to ${activeRequest.userName}`);
              setTopic('');
              setDetails('');
              setSop(null);
              setViewMode('requests');
          } else {
              // Save to My Library (Standard Save)
              storageService.saveSOP(user.id, sop);
              setSavedSOPs(storageService.getSavedSOPs(user.id));
              setSaveStatus("Saved to library");
          }
          setTimeout(() => setSaveStatus(null), 2000);
      }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
       {/* Top Bar */}
       <div className="flex justify-between items-center mb-6">
            <div className="flex gap-2 mx-auto">
                {isAdmin ? (
                    <button 
                        onClick={() => setViewMode('generator')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${viewMode === 'generator' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
                    >
                        <Sparkles size={16} /> Generator
                    </button>
                ) : (
                    <button 
                        onClick={() => setViewMode('request-form')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${viewMode === 'request-form' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
                    >
                        <Send size={16} /> Request SOP
                    </button>
                )}
                
                <button 
                    onClick={() => setViewMode('saved')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'saved' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
                >
                    Saved SOPs ({savedSOPs.length})
                </button>

                <button 
                    onClick={() => setViewMode('requests')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${viewMode === 'requests' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
                >
                    {isAdmin ? (
                        <>
                            Request Queue
                            {adminQueue.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{adminQueue.length}</span>}
                        </>
                    ) : (
                        <>
                            My Requests
                            {myRequests.filter(r => r.status === 'pending').length > 0 && <span className="bg-yellow-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{myRequests.filter(r => r.status === 'pending').length}</span>}
                        </>
                    )}
                </button>
            </div>
            
            {user.isTrial && (
                <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-full text-xs font-bold absolute right-8">
                    <Zap size={12} fill="currentColor" />
                    Demo: {user.queriesUsed || 0}/{user.queryLimit}
                </div>
            )}
      </div>

      {viewMode === 'requests' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 overflow-y-auto flex-1 animate-fade-in">
              <h2 className="text-xl font-bold text-slate-800 mb-4">{isAdmin ? 'Customer SOP Requests' : 'My SOP Requests'}</h2>
              
              <div className="space-y-3">
                  {(isAdmin ? adminQueue : myRequests).length === 0 ? (
                      <p className="text-slate-500 text-center py-8">No pending requests found.</p>
                  ) : (
                      (isAdmin ? adminQueue : myRequests).map((req, i) => (
                          <div key={i} className="flex justify-between items-center p-4 border border-slate-100 rounded-lg hover:border-slate-300 transition-colors bg-slate-50">
                              <div className="flex items-start gap-4">
                                  <div className={`p-3 rounded-full ${req.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                      {req.status === 'completed' ? <CheckCircle2 size={20} /> : <Clock3 size={20} />}
                                  </div>
                                  <div>
                                      <h4 className="font-bold text-slate-800">{req.topic}</h4>
                                      <p className="text-xs text-slate-500">Requested by: <span className="font-semibold">{req.userName}</span> • {new Date(req.requestDate).toLocaleString()}</p>
                                      {req.details && <p className="text-xs text-slate-600 mt-1 italic max-w-lg bg-white p-2 rounded border border-slate-100">{req.details}</p>}
                                  </div>
                              </div>
                              
                              <div>
                                  {req.status === 'completed' ? (
                                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">Completed</span>
                                  ) : (
                                      isAdmin ? (
                                          <button 
                                            onClick={() => handleFulfillRequest(req)}
                                            className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded hover:bg-emerald-600 transition-colors flex items-center gap-2"
                                          >
                                              <Sparkles size={14} fill="currentColor" /> Generate
                                          </button>
                                      ) : (
                                          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full flex items-center gap-1">
                                              <Clock3 size={12} /> Pending Admin
                                          </span>
                                      )
                                  )}
                              </div>
                          </div>
                      ))
                  )}
              </div>
          </div>
      )}

      {viewMode === 'saved' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
              {savedSOPs.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200">
                      <FileText size={48} className="mx-auto mb-4 opacity-50" />
                      <p>No SOPs saved yet. {isAdmin ? 'Create' : 'Request'} one to standardise your ops!</p>
                  </div>
              ) : (
                  savedSOPs.map((s, idx) => (
                      <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 hover:border-emerald-300 transition-all shadow-sm group">
                          <div className="flex justify-between items-start mb-4">
                              <h3 className="font-bold text-slate-800 text-lg">{s.title}</h3>
                              <div className="bg-slate-100 p-2 rounded-lg text-slate-400 group-hover:text-emerald-600 transition-colors">
                                  <FileText size={20} />
                              </div>
                          </div>
                          <p className="text-sm text-slate-500 line-clamp-2 mb-4">{s.scope}</p>
                          <div className="flex items-center gap-4 text-xs text-slate-400">
                              <span>{s.stepwise_procedure.length} Steps</span>
                              <span>•</span>
                              <span>{s.critical_control_points.length} CCPs</span>
                          </div>
                          <button 
                             onClick={() => {
                                 setSop(s);
                                 setViewMode('generator'); // Or a 'viewer' mode if we want to be strict, but reuse generator view for now
                             }}
                             className="w-full mt-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-emerald-700 transition-colors"
                          >
                              View Full Document
                          </button>
                      </div>
                  ))
              )}
          </div>
      )}
      
      {/* Generator / Request Form View */}
      {(viewMode === 'generator' || viewMode === 'request-form') && (
        <>
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">
                    {isAdmin ? (activeRequest ? 'Fulfilling SOP Request' : 'SOP Studio Generator') : 'Request New SOP'}
                </h2>
                <p className="text-slate-500 mb-6">
                    {isAdmin ? 'Create standardized operational procedures instantly.' : 'Tell us what process you need, and our admins will generate it for you.'}
                </p>
                
                {activeRequest && (
                    <div className="mb-4 inline-block bg-yellow-50 border border-yellow-200 px-4 py-2 rounded-lg text-sm text-yellow-800 font-medium">
                        <UserCheck size={16} className="inline mr-2" /> Fulfilling request for: {activeRequest.userName}
                    </div>
                )}
                
                <form onSubmit={isAdmin ? handleGenerate : handleRequestSubmit} className="flex flex-col gap-4 max-w-2xl mx-auto">
                    <div className="flex flex-col gap-2 text-left">
                        <label className="text-xs font-bold text-slate-500 uppercase">SOP Topic / Title</label>
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g., Cold chain storage for smoothie bowls, Opening checklist..."
                            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        />
                    </div>
                    
                    <div className="flex flex-col gap-2 text-left">
                         <label className="text-xs font-bold text-slate-500 uppercase">Additional Details / Context</label>
                         <textarea
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            placeholder="e.g. Include specific temperature checks, mention 'Head Chef' as responsible role..."
                            rows={3}
                            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                         />
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={loading || !topic}
                        className="mt-2 px-6 py-3 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-lg"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : isAdmin ? <Sparkles size={20} fill="currentColor" /> : <Inbox size={20} />}
                        {loading ? 'Processing...' : isAdmin ? 'Generate SOP' : 'Submit Request'}
                    </button>
                    
                    {error && (
                        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg mt-2 text-left">
                            <AlertCircle size={16} className="shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                </form>
            </div>

            {sop && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
                <div className="bg-slate-50 px-8 py-6 border-b border-slate-200 flex justify-between items-center">
                    <div>
                    <span className="text-xs font-mono text-slate-400 block mb-1">ID: {sop.sop_id}</span>
                    <h1 className="text-2xl font-bold text-slate-800">{sop.title}</h1>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={handleSave}
                            className="flex items-center gap-2 text-emerald-600 bg-white border border-emerald-200 hover:bg-emerald-50 px-4 py-2 rounded-lg font-bold shadow-sm transition-all"
                        >
                            <Save size={18} /> {saveStatus || (activeRequest ? 'Send to User' : 'Save to Library')}
                        </button>
                    </div>
                </div>

                <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                    <section>
                        <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                        <FileText size={18} className="text-emerald-600" /> Procedure
                        </h3>
                        <div className="space-y-4">
                        {sop.stepwise_procedure.map((step, idx) => (
                            <div key={idx} className="flex gap-4 p-4 rounded-lg border border-slate-100 bg-slate-50/50">
                            <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm shrink-0">
                                {step.step_no}
                            </div>
                            <div>
                                <p className="text-slate-700 font-medium">{step.action}</p>
                                <div className="flex gap-4 mt-2 text-xs text-slate-500 uppercase tracking-wide">
                                <span>Role: {step.responsible_role}</span>
                                {step.time_limit && <span>Time: {step.time_limit}</span>}
                                </div>
                            </div>
                            </div>
                        ))}
                        </div>
                    </section>

                    <section>
                        <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                        <AlertTriangle size={18} className="text-amber-500" /> Critical Control Points (CCP)
                        </h3>
                        <ul className="list-disc pl-5 space-y-1 text-slate-700">
                        {sop.critical_control_points.map((ccp, i) => (
                            <li key={i}>{ccp}</li>
                        ))}
                        </ul>
                    </section>
                    </div>

                    <div className="space-y-8">
                    <div className="bg-emerald-50 p-6 rounded-lg border border-emerald-100">
                        <h3 className="font-bold text-emerald-900 mb-3">Materials & Equipment</h3>
                        <ul className="space-y-2">
                        {sop.materials_equipment.map((item, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-emerald-800">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                            {item}
                            </li>
                        ))}
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                        <CheckSquare size={18} className="text-blue-600" /> Monitoring Checklist
                        </h3>
                        <div className="space-y-2">
                        {sop.monitoring_checklist.map((item, i) => (
                            <label key={i} className="flex items-start gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer">
                            <input type="checkbox" className="mt-1 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                            <span className="text-sm text-slate-600">{item}</span>
                            </label>
                        ))}
                        </div>
                    </div>
                    </div>
                </div>
                </div>
            )}
        </>
      )}
    </div>
  );
};
