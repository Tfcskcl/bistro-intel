
import React, { useState, useEffect } from 'react';
import { generateStrategy, generateImplementationPlan } from '../services/geminiService';
import { StrategyReport, UserRole, User, PlanType, ImplementationGuide } from '../types';
import { Send, Loader2, User as UserIcon, Briefcase, TrendingUp, Lock, HelpCircle, ArrowRight, Play, LifeBuoy, CheckCircle2, Clock, X, BookOpen, UserCheck, Calendar, Zap, ChevronDown, Trash2, Sparkles } from 'lucide-react';

interface StrategyProps {
    user: User;
    onUserUpdate?: (user: User) => void;
}

interface ActionState {
    [key: number]: 'idle' | 'in_progress' | 'help_requested' | 'completed';
}

const ROLE_SPECIFIC_PROMPTS = {
    [UserRole.OWNER]: [
        "Analyze last month's profit margins",
        "Suggest a price increase strategy",
        "Expansion plan for a new outlet",
        "How to reduce overall food cost?"
    ],
    [UserRole.ADMIN]: [
        "Create a weekend staff roster",
        "Kitchen opening checklist",
        "Reduce vegetable wastage",
        "Inventory ordering schedule"
    ],
    [UserRole.SUPER_ADMIN]: [
        "Analyze global user churn",
        "System latency report",
        "Revenue forecast for Q4",
        "Compare outlet performance"
    ]
};

export const Strategy: React.FC<StrategyProps> = ({ user, onUserUpdate }) => {
  const [role, setRole] = useState<UserRole>(user.role);
  const [query, setQuery] = useState('');
  const [report, setReport] = useState<StrategyReport | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Track status of individual action items
  const [actionStates, setActionStates] = useState<ActionState>({});
  
  // Assistance Modal State
  const [assistanceTarget, setAssistanceTarget] = useState<{index: number, title: string} | null>(null);
  const [assistanceMsg, setAssistanceMsg] = useState('');
  const [sendingHelp, setSendingHelp] = useState(false);

  // Implementation Flow State
  const [choiceModalOpen, setChoiceModalOpen] = useState<{index: number, title: string} | null>(null);
  const [roadmapModalOpen, setRoadmapModalOpen] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<ImplementationGuide | null>(null);

  const faqs = [
      {
          question: "How do I reduce food cost?",
          prompt: "Analyze my current food cost percentage and suggest 3 specific actionable ways to reduce it by 5% without compromising quality. Look at ingredient prices and waste."
      },
      {
          question: "How do I plan a new menu?",
          prompt: "Guide me through planning a new seasonal menu. Suggest a mix of high-margin items and popular comfort foods based on current trends. Include steps for testing and pricing."
      },
      {
          question: "Plan for growing sales by 12%",
          prompt: "Create a detailed 30-day marketing and operations plan to increase total revenue by 12% next month. Include specific promotions, upsell strategies, and staff incentives."
      },
      {
          question: "Identify top wastage causes",
          prompt: "Based on typical restaurant operations and my data, what are likely the top 3 causes of waste in my kitchen and how can I fix them immediately?"
      }
  ];

  useEffect(() => {
    // When switching context as Super Admin, clear previous state
    if (user.role === UserRole.SUPER_ADMIN) {
        setReport(null);
        setQuery('');
    }
  }, [role, user.role]);

  // Usage Logic
  const checkUsage = (): boolean => {
      if (user.isTrial) {
          if ((user.queriesUsed || 0) >= (user.queryLimit || 10)) {
              alert("Free Demo limit reached. Upgrade to Pro+ for unlimited AI Strategy.");
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

  if (!user.isTrial && user.plan !== PlanType.PRO_PLUS) {
    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="bg-slate-100 p-4 rounded-full mb-4">
                <Lock size={32} className="text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Pro+ Feature Locked</h2>
            <p className="text-slate-500 mt-2 max-w-md text-center">Advanced AI Strategy & Forecasting is exclusively available on the Pro+ Operations plan.</p>
            <button className="mt-6 px-6 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800">Upgrade to Pro+</button>
        </div>
    );
  }

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || query;
    if (!textToSend) return;
    if (!checkUsage()) return;
    
    // Update input to reflect what is being sent if triggered via click
    if (textOverride) setQuery(textOverride);

    setLoading(true);
    setReport(null);
    setActionStates({}); // Reset action states
    try {
      const data = await generateStrategy(role, textToSend);
      setReport(data);
      incrementUsage();
    } catch (e) {
      alert("Failed to generate strategy.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
      setQuery('');
      setReport(null);
      setActionStates({});
  };

  // 1. User Clicks "Start Implementation"
  const handleStartImplementationClick = (index: number, title: string) => {
      setChoiceModalOpen({ index, title });
  };

  // 2a. User Chooses "Self Guided (AI)"
  const handleSelfGuided = async () => {
    if (!choiceModalOpen) return;
    const { index, title } = choiceModalOpen;
    
    if (!checkUsage()) return;

    setChoiceModalOpen(null);
    setRoadmapModalOpen(true);
    setLoadingPlan(true);
    setGeneratedPlan(null);

    try {
        const plan = await generateImplementationPlan(title);
        setGeneratedPlan(plan);
        setActionStates(prev => ({ ...prev, [index]: 'in_progress' }));
        incrementUsage();
    } catch (e) {
        alert("Failed to generate plan.");
        setRoadmapModalOpen(false);
    } finally {
        setLoadingPlan(false);
    }
  };

  // 2b. User Chooses "Expert Guided"
  const handleExpertGuided = () => {
    if (!choiceModalOpen) return;
    const { index } = choiceModalOpen;
    setChoiceModalOpen(null);
    // Simulate Request
    setActionStates(prev => ({ ...prev, [index]: 'help_requested' }));
    alert("Expert assistance requested! Our team will contact you shortly.");
  };

  const openAssistanceModal = (index: number, title: string) => {
      setAssistanceTarget({ index, title });
      setAssistanceMsg(`I need help implementing: ${title}. Please contact me to discuss details.`);
  };

  const submitAssistance = () => {
      if (!assistanceTarget) return;
      setSendingHelp(true);
      
      // Simulate API call
      setTimeout(() => {
          setActionStates(prev => ({ ...prev, [assistanceTarget.index]: 'help_requested' }));
          setSendingHelp(false);
          setAssistanceTarget(null);
          setAssistanceMsg('');
      }, 1000);
  };
  
  const updateActionStatus = (index: number, status: 'idle' | 'in_progress' | 'completed') => {
      setActionStates(prev => ({ ...prev, [index]: status }));
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative">
      
      {/* Assistance Modal */}
      {assistanceTarget && (
          <div className="absolute inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
                  <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                          <LifeBuoy className="text-blue-600" size={20}/> Need Assistance?
                      </h3>
                      <button onClick={() => setAssistanceTarget(null)} className="text-slate-400 hover:text-slate-600">
                          <X size={20} />
                      </button>
                  </div>
                  <p className="text-sm text-slate-600 mb-4">
                      Our experts will review your request regarding <span className="font-bold text-slate-800">"{assistanceTarget.title}"</span> and contact you shortly.
                  </p>
                  <textarea 
                      value={assistanceMsg}
                      onChange={(e) => setAssistanceMsg(e.target.value)}
                      className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none mb-4 h-32 resize-none"
                      placeholder="Describe what you need help with..."
                  />
                  <div className="flex justify-end gap-3">
                      <button 
                          onClick={() => setAssistanceTarget(null)}
                          className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={submitAssistance}
                          disabled={sendingHelp}
                          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2"
                      >
                          {sendingHelp ? <Loader2 className="animate-spin" size={16}/> : <Send size={16}/>}
                          Send Request
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Choice Modal (Self vs Expert) */}
      {choiceModalOpen && (
        <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 animate-scale-in">
                <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900">Choose Implementation Mode</h3>
                    <p className="text-slate-500 text-sm mt-1">For: "{choiceModalOpen.title}"</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button 
                        onClick={handleSelfGuided}
                        className="p-4 border-2 border-slate-100 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left group"
                    >
                        <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <BookOpen size={20} />
                        </div>
                        <h4 className="font-bold text-slate-800 mb-1">Self-Guided AI Roadmap</h4>
                        <p className="text-xs text-slate-500">Generate a step-by-step guide and execute it yourself.</p>
                    </button>

                    <button 
                        onClick={handleExpertGuided}
                        className="p-4 border-2 border-slate-100 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
                    >
                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <UserCheck size={20} />
                        </div>
                        <h4 className="font-bold text-slate-800 mb-1">Expert Implementation</h4>
                        <p className="text-xs text-slate-500">Assign a Bistro expert to handle this for you.</p>
                        <span className="inline-block mt-2 text-[10px] font-bold bg-blue-200 text-blue-800 px-2 py-0.5 rounded">ZERO COST ADD-ON</span>
                    </button>
                </div>

                <div className="mt-6 text-center">
                    <button onClick={() => setChoiceModalOpen(null)} className="text-sm text-slate-400 hover:text-slate-600">Cancel</button>
                </div>
            </div>
        </div>
      )}

      {/* Roadmap Modal */}
      {roadmapModalOpen && (
          <div className="absolute inset-0 z-[60] bg-white flex flex-col animate-fade-in">
              <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <BookOpen className="text-emerald-600" size={20} /> Implementation Roadmap
                  </h3>
                  <button onClick={() => setRoadmapModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                      <X size={20} className="text-slate-500" />
                  </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                  {loadingPlan ? (
                      <div className="h-full flex flex-col items-center justify-center gap-4">
                          <Loader2 className="animate-spin text-emerald-600" size={48} />
                          <p className="text-slate-500 font-medium animate-pulse">Generating step-by-step guide...</p>
                      </div>
                  ) : generatedPlan ? (
                      <div className="max-w-3xl mx-auto space-y-8">
                          <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100">
                              <h2 className="text-2xl font-bold text-emerald-900 mb-2">Objective</h2>
                              <p className="text-emerald-800 text-lg leading-relaxed">{generatedPlan.objective}</p>
                              <div className="mt-4 flex items-center gap-2 text-sm font-bold text-emerald-700">
                                  <Calendar size={16} /> Estimated Timeline: {generatedPlan.estimated_timeline}
                              </div>
                          </div>

                          <div className="space-y-6">
                              {generatedPlan.phases.map((phase, idx) => (
                                  <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative">
                                      <div className="absolute -left-3 top-6 w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-white shadow-sm">
                                          {idx + 1}
                                      </div>
                                      <h3 className="text-xl font-bold text-slate-800 mb-4 pl-4">{phase.phase_name}</h3>
                                      
                                      <div className="pl-4 space-y-4">
                                          <div>
                                              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Action Steps</h4>
                                              <ul className="space-y-2">
                                                  {phase.steps.map((step, sIdx) => (
                                                      <li key={sIdx} className="flex items-start gap-2 text-slate-700">
                                                          <div className="mt-1.5 w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0"></div>
                                                          {step}
                                                      </li>
                                                  ))}
                                              </ul>
                                          </div>
                                          
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                                              <div>
                                                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Resources Needed</h4>
                                                  <div className="flex flex-wrap gap-2">
                                                      {phase.resources_needed.map((res, rIdx) => (
                                                          <span key={rIdx} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200">{res}</span>
                                                      ))}
                                                  </div>
                                              </div>
                                              <div>
                                                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Success Metric (KPI)</h4>
                                                  <p className="text-sm font-medium text-blue-600">{phase.kpi_to_track}</p>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                          
                          <div className="flex justify-center pt-8">
                              <button 
                                onClick={() => setRoadmapModalOpen(false)}
                                className="px-8 py-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 shadow-lg"
                              >
                                  Got it, I'll start working!
                              </button>
                          </div>
                      </div>
                  ) : (
                      <p className="text-center text-red-500">Failed to load plan.</p>
                  )}
              </div>
          </div>
      )}

      {/* Header / Role Selector */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                <UserIcon size={20} />
            </div>
            
            {user.role === UserRole.SUPER_ADMIN ? (
                <select 
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2.5"
                >
                    <option value={UserRole.OWNER}>Owner Context</option>
                    <option value={UserRole.ADMIN}>Admin / Ops Context</option>
                    <option value={UserRole.SUPER_ADMIN}>Super Admin Context</option>
                </select>
            ) : (
                <div className="text-sm font-semibold text-slate-700 px-3 py-2 bg-white border border-slate-200 rounded-lg">
                    Viewing as: {user.role === UserRole.OWNER ? 'Owner' : 'Admin'}
                </div>
            )}
            </div>
            <div className="h-6 w-px bg-slate-300 mx-2"></div>
            <p className="text-sm text-slate-500 italic hidden sm:block">"Ask me about sales, costs, or seasonal strategy..."</p>
        </div>
        
        {user.isTrial && (
            <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-full text-xs font-bold">
                <Zap size={12} fill="currentColor" />
                Demo: {user.queriesUsed || 0}/{user.queryLimit}
            </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar">
        {!report && !loading && (
          <div className="h-full flex flex-col items-center justify-center p-4">
            <div className="text-slate-400 opacity-60 mb-8 flex flex-col items-center">
                <TrendingUp size={64} className="mb-4" />
                <p className="text-lg font-medium">Ready to analyze your business data</p>
            </div>
            
            <div className="w-full max-w-3xl">
                <div className="flex items-center gap-2 mb-4 justify-center">
                    <HelpCircle size={16} className="text-slate-400" />
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">Common Strategy Queries</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {faqs.map((faq, idx) => (
                        <button 
                            key={idx}
                            onClick={() => handleSend(faq.prompt)}
                            className="text-left p-4 bg-white border border-slate-200 rounded-xl hover:border-emerald-400 hover:shadow-md transition-all group"
                        >
                            <h4 className="font-bold text-slate-700 group-hover:text-emerald-700 mb-1 flex items-center justify-between">
                                {faq.question}
                                <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity text-emerald-500"/>
                            </h4>
                            <p className="text-xs text-slate-500 line-clamp-2">{faq.prompt}</p>
                        </button>
                    ))}
                </div>
            </div>
          </div>
        )}

        {loading && (
           <div className="flex justify-center items-center h-full">
             <div className="flex flex-col items-center gap-3">
               <Loader2 className="animate-spin text-emerald-600" size={32} />
               <p className="text-slate-500 animate-pulse">Analyzing sales, purchases, and employee data...</p>
             </div>
           </div>
        )}

        {report && (
          <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
            {/* Summary */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Executive Summary</h3>
              <ul className="space-y-2">
                {(report.summary || []).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-slate-700">
                    <span className="text-emerald-500 mt-1.5">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Plan */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                <Briefcase size={20} className="text-blue-600"/> 90-Day Action Plan
              </h3>
              <div className="space-y-4">
                {(report.action_plan || []).map((action, i) => (
                  <div key={i} className={`p-4 rounded-lg border transition-all ${
                        actionStates[i] === 'in_progress' ? 'bg-emerald-50/50 border-emerald-200' : 
                        actionStates[i] === 'completed' ? 'bg-slate-50 border-slate-200 opacity-75' :
                        'bg-slate-50 border-slate-100'
                  }`}>
                    <div className="flex items-start gap-4">
                         <div className={`shrink-0 w-16 text-center py-1 rounded text-xs font-bold border ${
                            actionStates[i] === 'completed' ? 'bg-slate-200 text-slate-600 border-slate-300' :
                            action.priority === 'High' ? 'bg-red-50 text-red-700 border-red-200' :
                            action.priority === 'Medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                            'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                        {actionStates[i] === 'completed' ? 'Done' : action.priority}
                        </div>
                        <div className="flex-1">
                        <h4 className={`font-semibold text-slate-800 ${actionStates[i] === 'completed' ? 'line-through text-slate-500' : ''}`}>{action.initiative}</h4>
                        <div className="flex gap-6 mt-2 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                            <span className="font-semibold text-emerald-600">Est. Impact:</span> {action.impact_estimate}
                            </span>
                            <span className="flex items-center gap-1">
                            <span className="font-semibold text-orange-600">Cost:</span> {action.cost_estimate}
                            </span>
                        </div>
                        </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200/60">
                        <div className="flex items-center gap-3">
                            {actionStates[i] === 'in_progress' ? (
                                <div className="flex items-center gap-3">
                                    <span className="flex items-center gap-2 text-sm font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-lg">
                                        <Clock size={16} /> Implementation In Progress
                                    </span>
                                    <button 
                                        onClick={() => handleStartImplementationClick(i, action.initiative)}
                                        className="text-xs text-slate-500 hover:text-emerald-600 underline"
                                    >
                                        View Roadmap
                                    </button>
                                </div>
                            ) : actionStates[i] === 'help_requested' ? (
                                <span className="flex items-center gap-2 text-sm font-bold text-blue-700 bg-blue-100 px-3 py-1.5 rounded-lg">
                                    <CheckCircle2 size={16} /> Assistance Requested
                                </span>
                            ) : actionStates[i] === 'completed' ? (
                                <span className="flex items-center gap-2 text-sm font-bold text-slate-600 bg-slate-200 px-3 py-1.5 rounded-lg">
                                    <CheckCircle2 size={16} /> Completed
                                </span>
                            ) : (
                                <>
                                    <button 
                                        onClick={() => handleStartImplementationClick(i, action.initiative)}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded hover:bg-emerald-600 transition-colors"
                                    >
                                        <Play size={14} fill="currentColor" /> Start Implementation
                                    </button>
                                    <button 
                                        onClick={() => openAssistanceModal(i, action.initiative)}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-white text-slate-600 border border-slate-300 text-xs font-bold rounded hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
                                    >
                                        <LifeBuoy size={14} /> Need Assistance
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Status Toggle Dropdown */}
                        <div className="relative group">
                            <button className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800">
                                Status: {actionStates[i] === 'completed' ? 'Completed' : actionStates[i] === 'in_progress' ? 'In Progress' : 'Idle'} <ChevronDown size={12}/>
                            </button>
                            <div className="absolute right-0 bottom-full mb-1 w-32 bg-white border border-slate-200 rounded-lg shadow-lg hidden group-hover:block z-10">
                                <button onClick={() => updateActionStatus(i, 'idle')} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700">Idle</button>
                                <button onClick={() => updateActionStatus(i, 'in_progress')} className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 text-emerald-700">In Progress</button>
                                <button onClick={() => updateActionStatus(i, 'completed')} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700">Completed</button>
                            </div>
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Seasonal */}
            {(report.seasonal_menu_suggestions || []).length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Seasonal Menu Changes</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(report.seasonal_menu_suggestions || []).map((item, i) => (
                             <div key={i} className={`p-3 rounded border ${item.type === 'add' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                                 <div className="flex items-center justify-between mb-1">
                                     <span className="font-bold text-slate-800">{item.item}</span>
                                     <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${item.type === 'add' ? 'bg-emerald-200 text-emerald-800' : 'bg-red-200 text-red-800'}`}>{item.type}</span>
                                 </div>
                                 <p className="text-xs text-slate-600">{item.reason}</p>
                             </div>
                        ))}
                    </div>
                </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto space-y-3">
            {/* Quick Chips */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {ROLE_SPECIFIC_PROMPTS[role].map((prompt, idx) => (
                    <button
                        key={idx}
                        onClick={() => setQuery(prompt)}
                        className="whitespace-nowrap px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5"
                    >
                        <Sparkles size={12} className="text-yellow-500" />
                        {prompt}
                    </button>
                ))}
            </div>

            <div className="flex gap-2">
                <input 
                    type="text" 
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Type instructions for the AI assistant..."
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
                <button 
                    onClick={handleClear}
                    title="Clear Chat"
                    className="px-3 py-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                    <Trash2 size={20} />
                </button>
                <button 
                    onClick={() => handleSend()}
                    disabled={loading || !query}
                    className="px-4 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                    <Send size={20} />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
