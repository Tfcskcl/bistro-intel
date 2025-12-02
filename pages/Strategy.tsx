
import React, { useState, useEffect } from 'react';
import { generateStrategy, generateImplementationPlan, hasValidApiKey } from '../services/geminiService';
import { StrategyReport, UserRole, User, PlanType, ImplementationGuide } from '../types';
import { Send, Loader2, User as UserIcon, Briefcase, TrendingUp, Lock, HelpCircle, ArrowRight, Play, LifeBuoy, CheckCircle2, Clock, X, BookOpen, UserCheck, Calendar, Zap, ChevronDown, Trash2, Sparkles, Activity, Target, AlertTriangle, ArrowUpRight, ArrowDownRight, Lightbulb, Map, BarChart2, PieChart as PieChartIcon, ScatterChart as ScatterChartIcon, Info, Wallet, Key } from 'lucide-react';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { storageService } from '../services/storageService';
import { CREDIT_COSTS } from '../constants';

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
        "How to reduce overall food cost?",
        "Marketing ideas for weekdays"
    ],
    [UserRole.ADMIN]: [
        "Create a weekend staff roster",
        "Kitchen opening checklist",
        "Reduce vegetable wastage",
        "Inventory ordering schedule",
        "Equipment maintenance log"
    ],
    [UserRole.SUPER_ADMIN]: [
        "Analyze global user churn",
        "System latency report",
        "Revenue forecast for Q4",
        "Compare outlet performance",
        "Feature usage statistics"
    ]
};

const COLORS = {
  High: '#ef4444', // red-500
  Medium: '#f59e0b', // amber-500
  Low: '#3b82f6', // blue-500
  add: '#10b981', // emerald-500
  remove: '#ef4444' // red-500
};

export const Strategy: React.FC<StrategyProps> = ({ user, onUserUpdate }) => {
  const [role, setRole] = useState<UserRole>(user.role);
  const [query, setQuery] = useState('');
  const [report, setReport] = useState<StrategyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  
  // Track status of individual action items
  const [actionStates, setActionStates] = useState<ActionState>({});
  
  // Chart Visualisation State
  const [vizMode, setVizMode] = useState<'priority' | 'impact'>('priority');
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');

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
          question: "Boost Customer Footfall 🚀",
          prompt: "Create a comprehensive marketing strategy to increase customer footfall. Include: 1. Social Media Campaigns (viral concepts). 2. Local Partnerships (gyms, offices). 3. Weekday Event Themes. 4. Smart Discounting ideas that protect margins."
      },
      {
          question: "How do I reduce food cost?",
          prompt: "Analyze my current food cost percentage and suggest 3 specific actionable ways to reduce it by 5% without compromising quality. Look at ingredient prices and waste."
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
        setError(null);
    }
    if (hasValidApiKey()) setHasApiKey(true);
  }, [role, user.role]);

  // Poll for API Key Status
  useEffect(() => {
    const checkKey = async () => {
        if (hasValidApiKey()) {
            setHasApiKey(true);
            if (error && error.includes('API Key')) setError(null);
            return;
        }

        if ((window as any).aistudio) {
            try {
                const has = await (window as any).aistudio.hasSelectedApiKey();
                setHasApiKey(has);
                if (has && error && error.includes('API Key')) setError(null);
            } catch (e) {
                console.error("Error checking API key", e);
            }
        }
    };
    checkKey();
    const interval = setInterval(checkKey, 2000);
    return () => clearInterval(interval);
  }, [error]);

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

  // Usage Logic
  const checkCredits = (): boolean => {
      if (user.role === UserRole.SUPER_ADMIN) return true;
      const cost = CREDIT_COSTS.STRATEGY;
      if (user.credits < cost) {
          setError(`Insufficient Credits for Strategy AI. Cost: ${cost} CR. Balance: ${user.credits} CR.`);
          return false;
      }
      return true;
  };

  const deductCredits = (amount: number = CREDIT_COSTS.STRATEGY, reason: string = 'AI Strategy Analysis') => {
      if (user.role !== UserRole.SUPER_ADMIN && onUserUpdate) {
          const success = storageService.deductCredits(user.id, amount, reason);
          if (success) {
              onUserUpdate({ ...user, credits: user.credits - amount });
              return true;
          }
          return false;
      }
      return true; // Super Admin bypass
  };

  const handleSend = async (textOverride?: string) => {
    if (!hasApiKey) {
        handleConnectKey();
        return;
    }

    const textToSend = textOverride || query;
    if (!textToSend) return;
    if (!checkCredits()) return;
    
    deductCredits();

    if (textOverride) setQuery(textOverride);

    setLoading(true);
    setReport(null);
    setError(null);
    setActionStates({}); // Reset action states
    try {
      const data = await generateStrategy(role, textToSend);
      setReport(data);
    } catch (e: any) {
      setError(e.message || "Failed to generate strategy.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
      setQuery('');
      setReport(null);
      setError(null);
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
    
    // We treat roadmap generation as part of the initial strategy cost usually, or small extra?
    // Let's assume free follow-up for now to keep it simple, or check small credit
    
    setChoiceModalOpen(null);
    setRoadmapModalOpen(true);
    setLoadingPlan(true);
    setGeneratedPlan(null);
    setError(null);

    try {
        const plan = await generateImplementationPlan(title);
        setGeneratedPlan(plan);
        setActionStates(prev => ({ ...prev, [index]: 'in_progress' }));
    } catch (e: any) {
        setError(e.message || "Failed to generate implementation plan.");
        setRoadmapModalOpen(false);
    } finally {
        setLoadingPlan(false);
    }
  };

  // 2b. User Chooses "Expert Guided"
  const handleExpertGuided = () => {
    if (!choiceModalOpen) return;
    const { index, title } = choiceModalOpen;
    
    // Credit Check for Expert Connect
    const cost = CREDIT_COSTS.EXPERT_CONNECT;
    if (user.role !== UserRole.SUPER_ADMIN && user.credits < cost) {
        alert(`Insufficient credits. Expert connection requires ${cost} credits. Current balance: ${user.credits} CR.`);
        return;
    }

    // Deduct and Proceed
    if (deductCredits(cost, `Expert Connect: ${title}`)) {
        setChoiceModalOpen(null);
        setActionStates(prev => ({ ...prev, [index]: 'help_requested' }));
        alert(`Expert assistance requested! ${cost} credits deducted. Our team will contact you shortly.`);
    }
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

  // Chart Data Helpers
  const getPriorityData = () => {
      if (!report) return [];
      const counts = (report.action_plan || []).reduce((acc, item) => {
          acc[item.priority] = (acc[item.priority] || 0) + 1;
          return acc;
      }, {} as Record<string, number>);

      return [
          { name: 'High', value: counts['High'] || 0, color: COLORS.High },
          { name: 'Medium', value: counts['Medium'] || 0, color: COLORS.Medium },
          { name: 'Low', value: counts['Low'] || 0, color: COLORS.Low }
      ].filter(d => d.value > 0);
  };

  // Scatter Data Helper
  const getImpactData = () => {
      if (!report) return [];
      return (report.action_plan || []).map((action, idx) => {
          const impactScore = action.priority === 'High' ? 30 : action.priority === 'Medium' ? 20 : 10;
          const finalImpact = impactScore + Math.floor(Math.random() * 5);
          const finalCost = Math.floor(Math.random() * 30) + 5; 
          
          return {
              name: action.initiative,
              x: finalCost, 
              y: finalImpact, 
              z: 10, 
              priority: action.priority
          };
      });
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden relative transition-colors">
      
      {/* Assistance Modal */}
      {assistanceTarget && (
          <div className="absolute inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up border border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                      <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                          <LifeBuoy className="text-blue-600 dark:text-blue-400" size={20}/> Need Assistance?
                      </h3>
                      <button onClick={() => setAssistanceTarget(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                          <X size={20} />
                      </button>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                      Our experts will review your request regarding <span className="font-bold text-slate-800 dark:text-white">"{assistanceTarget.title}"</span> and contact you shortly.
                  </p>
                  <textarea 
                      value={assistanceMsg}
                      onChange={(e) => setAssistanceMsg(e.target.value)}
                      className="w-full p-3 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none mb-4 h-32 resize-none"
                      placeholder="Describe what you need help with..."
                  />
                  <div className="flex justify-end gap-3">
                      <button 
                          onClick={() => setAssistanceTarget(null)}
                          className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium"
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
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg p-6 animate-scale-in border border-slate-200 dark:border-slate-700">
                <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Choose Implementation Mode</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">For: "{choiceModalOpen.title}"</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button 
                        onClick={handleSelfGuided}
                        className="p-4 border-2 border-slate-100 dark:border-slate-700 rounded-xl hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all text-left group"
                    >
                        <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <BookOpen size={20} />
                        </div>
                        <h4 className="font-bold text-slate-800 dark:text-white mb-1">Self-Guided AI Roadmap</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Generate a step-by-step guide and execute it yourself.</p>
                    </button>

                    <button 
                        onClick={handleExpertGuided}
                        className="p-4 border-2 border-slate-100 dark:border-slate-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left group"
                    >
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <UserCheck size={20} />
                        </div>
                        <h4 className="font-bold text-slate-800 dark:text-white mb-1">Expert Implementation</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Assign a Bistro expert to handle this for you.</p>
                        <span className="inline-block mt-2 text-[10px] font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                            {CREDIT_COSTS.EXPERT_CONNECT} CREDITS
                        </span>
                    </button>
                </div>

                <div className="mt-6 text-center">
                    <button onClick={() => setChoiceModalOpen(null)} className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">Cancel</button>
                </div>
            </div>
        </div>
      )}

      {/* Roadmap Modal */}
      {roadmapModalOpen && (
          <div className="absolute inset-0 z-[60] bg-white dark:bg-slate-900 flex flex-col animate-fade-in">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                  <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <BookOpen className="text-emerald-600 dark:text-emerald-400" size={20} /> Implementation Roadmap
                  </h3>
                  <button onClick={() => setRoadmapModalOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                      <X size={20} className="text-slate-500 dark:text-slate-400" />
                  </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white dark:bg-slate-900">
                  {loadingPlan ? (
                      <div className="h-full flex flex-col items-center justify-center gap-4">
                          <Loader2 className="animate-spin text-emerald-600 dark:text-emerald-400" size={48} />
                          <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">Generating step-by-step guide...</p>
                      </div>
                  ) : generatedPlan ? (
                      <div className="max-w-3xl mx-auto space-y-8">
                          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-xl border border-emerald-100 dark:border-emerald-800">
                              <h2 className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 mb-2">Objective</h2>
                              <p className="text-emerald-800 dark:text-emerald-200 text-lg leading-relaxed">{generatedPlan.objective}</p>
                              <div className="mt-4 flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                                  <Calendar size={16} /> Estimated Timeline: {generatedPlan.estimated_timeline}
                              </div>
                          </div>

                          <div className="space-y-6">
                              {generatedPlan.phases.map((phase, idx) => (
                                  <div key={idx} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative">
                                      <div className="absolute -left-3 top-6 w-6 h-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white dark:border-slate-900 shadow-sm">
                                          {idx + 1}
                                      </div>
                                      <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4 pl-4">{phase.phase_name}</h3>
                                      
                                      <div className="pl-4 space-y-4">
                                          <div>
                                              <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">Action Steps</h4>
                                              <ul className="space-y-2">
                                                  {phase.steps.map((step, sIdx) => (
                                                      <li key={sIdx} className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                                                          <div className="mt-1.5 w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0"></div>
                                                          {step}
                                                      </li>
                                                  ))}
                                              </ul>
                                          </div>
                                          
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                              <div>
                                                  <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">Resources Needed</h4>
                                                  <div className="flex flex-wrap gap-2">
                                                      {phase.resources_needed.map((res, rIdx) => (
                                                          <span key={rIdx} className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded border border-slate-200 dark:border-slate-600">{res}</span>
                                                      ))}
                                                  </div>
                                              </div>
                                              <div>
                                                  <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">Success Metric (KPI)</h4>
                                                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">{phase.kpi_to_track}</p>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                          
                          <div className="flex justify-center pt-8">
                              <button 
                                onClick={() => setRoadmapModalOpen(false)}
                                className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-lg hover:bg-slate-800 dark:hover:bg-slate-200 shadow-lg"
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
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg">
                <UserIcon size={20} />
            </div>
            
            {user.role === UserRole.SUPER_ADMIN ? (
                <select 
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2.5 outline-none"
                >
                    <option value={UserRole.OWNER}>Owner Context</option>
                    <option value={UserRole.ADMIN}>Admin / Ops Context</option>
                    <option value={UserRole.SUPER_ADMIN}>Super Admin Context</option>
                </select>
            ) : (
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                    Viewing as: {user.role === UserRole.OWNER ? 'Owner' : 'Admin'}
                </div>
            )}
            </div>
            <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-2 hidden sm:block"></div>
            <p className="text-sm text-slate-500 dark:text-slate-400 italic hidden sm:block">"Ask me about sales, costs, or long-term strategy..."</p>
        </div>
        
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 rounded-full text-xs font-bold">
            <Wallet size={12} fill="currentColor" />
            Credits: {user.credits}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50 dark:bg-slate-900 custom-scrollbar">
        {error && (
            <div className="max-w-4xl mx-auto mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-400 animate-fade-in shadow-sm justify-between">
                <div className="flex items-center gap-3">
                    <AlertTriangle size={20} className="shrink-0" />
                    <p className="font-medium text-sm">{error}</p>
                </div>
                <div className="flex items-center gap-2">
                    {(error.includes('API Key') || error.includes('configure') || error.includes('unauthenticated')) && (
                        <button 
                            onClick={handleConnectKey}
                            className="px-3 py-1 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 text-xs font-bold rounded hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
                        >
                            Connect Key
                        </button>
                    )}
                    <button 
                        onClick={() => setError(null)} 
                        className="text-xs font-bold uppercase hover:underline"
                    >
                        Dismiss
                    </button>
                </div>
            </div>
        )}

        {!report && !loading && (
          <div className="h-full flex flex-col items-center justify-center p-4">
            <div className="text-slate-400 dark:text-slate-500 opacity-60 mb-8 flex flex-col items-center animate-fade-in-up">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                    <TrendingUp size={40} className="text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-lg font-medium text-slate-500 dark:text-slate-400">Strategic Business Intelligence</p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-2 max-w-sm text-center">BistroIntel processes your sales, menu, and inventory to suggest profitable strategies.</p>
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-2 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded">Cost: {CREDIT_COSTS.STRATEGY} Credits per Query</p>
            </div>
            
            <div className="w-full max-w-4xl animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                <div className="flex items-center gap-2 mb-4 justify-center">
                    <HelpCircle size={16} className="text-emerald-500" />
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Common Strategy Queries</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {faqs.map((faq, idx) => (
                        <button 
                            key={idx}
                            onClick={() => handleSend(faq.prompt)}
                            className="text-left p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-lg transition-all group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity bg-emerald-500 rounded-bl-2xl">
                                <Sparkles size={24} className="text-white" />
                            </div>
                            <h4 className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 mb-2 flex items-center justify-between pr-8">
                                {faq.question}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{faq.prompt}</p>
                        </button>
                    ))}
                </div>
            </div>
          </div>
        )}

        {loading && (
           <div className="flex justify-center items-center h-full">
             <div className="flex flex-col items-center gap-4 bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 animate-scale-in">
               <Loader2 className="animate-spin text-emerald-600 dark:text-emerald-400" size={40} />
               <div>
                   <p className="text-slate-800 dark:text-white font-bold text-lg text-center">Analyzing Data Points...</p>
                   <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 animate-pulse text-center">Reviewing sales, purchases, and employee logs</p>
               </div>
             </div>
           </div>
        )}

        {report && (
          <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-600 text-white rounded-lg shadow-lg shadow-emerald-500/30">
                    <Target size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Strategic Analysis Report</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Generated for: {role.replace('_', ' ')} • {new Date().toLocaleDateString()}</p>
                </div>
            </div>

            {/* Top Row: Executive Summary & Priority Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Executive Summary */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden flex flex-col">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                   
                   <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                       <Sparkles className="text-emerald-500" size={20} />
                       <h3 className="text-lg font-bold text-slate-800 dark:text-white">Executive Summary</h3>
                   </div>
                   
                   <div className="p-6 flex-1">
                       <ul className="space-y-4">
                           {(report.summary || []).map((item, i) => (
                               <li key={i} className="flex gap-4">
                                   <div className="mt-1 w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center text-xs font-bold shrink-0 border border-slate-200 dark:border-slate-600">
                                       {i+1}
                                   </div>
                                   <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{item}</p>
                               </li>
                           ))}
                       </ul>
                   </div>
                </div>

                {/* Priority & Impact Breakdown Charts */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                            {vizMode === 'priority' ? 'Initiative Priority' : 'Impact vs Effort'}
                        </h4>
                        
                        {/* Viz Toolbar */}
                        <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1 gap-1">
                             <button 
                                onClick={() => setVizMode('priority')}
                                className={`p-1.5 rounded transition-colors ${vizMode === 'priority' ? 'bg-white dark:bg-slate-600 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                title="Priority Breakdown"
                             >
                                <PieChartIcon size={14} />
                             </button>
                             <button 
                                onClick={() => setVizMode('impact')}
                                className={`p-1.5 rounded transition-colors ${vizMode === 'impact' ? 'bg-white dark:bg-slate-600 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                title="Impact Matrix"
                             >
                                <ScatterChartIcon size={14} />
                             </button>
                        </div>
                    </div>

                    <div className="flex-1 min-h-[250px] relative p-4">
                        {vizMode === 'priority' ? (
                            <>
                                <div className="absolute top-2 right-4 z-10 flex gap-2">
                                     <button 
                                        onClick={() => setChartType('pie')}
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${chartType === 'pie' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600'}`}
                                     >
                                         Pie
                                     </button>
                                     <button 
                                        onClick={() => setChartType('bar')}
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${chartType === 'bar' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600'}`}
                                     >
                                         Bar
                                     </button>
                                </div>
                            </>
                        ) : (
                            <div className="absolute top-2 right-4 z-10">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Impact Analysis</span>
                            </div>
                        )}

                        <ResponsiveContainer width="100%" height="100%">
                            {vizMode === 'priority' ? (
                                chartType === 'pie' ? (
                                    <PieChart>
                                        <Pie
                                            data={getPriorityData()}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {getPriorityData().map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip 
                                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                        <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                                    </PieChart>
                                ) : (
                                    <BarChart data={getPriorityData()} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.1} />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={60} tick={{fontSize: 12}} />
                                        <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px' }} />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                                            {getPriorityData().map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                )
                            ) : (
                                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                    <XAxis type="number" dataKey="x" name="Cost" unit="k" tick={{fontSize: 10}} label={{ value: 'Est. Cost', position: 'bottom', offset: 0, fontSize: 10 }} />
                                    <YAxis type="number" dataKey="y" name="Impact" unit="pts" tick={{fontSize: 10}} label={{ value: 'Impact Score', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                                    <ZAxis type="number" dataKey="z" range={[50, 400]} />
                                    <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '8px' }} />
                                    <Scatter name="Initiatives" data={getImpactData()} fill="#10b981">
                                        {getImpactData().map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[entry.priority as keyof typeof COLORS]} />
                                        ))}
                                    </Scatter>
                                </ScatterChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Action Plan */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2">
                    <Briefcase className="text-blue-500" size={20} />
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Action Plan</h3>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(report.action_plan || []).map((action, i) => (
                        <div key={i} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-3">
                                    <span className={`px-2 py-1 text-xs font-bold rounded uppercase ${
                                        action.priority === 'High' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 
                                        action.priority === 'Medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 
                                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                    }`}>
                                        {action.priority} Priority
                                    </span>
                                    <h4 className="font-bold text-slate-800 dark:text-white">{action.initiative}</h4>
                                </div>
                                <div className="flex items-center gap-2">
                                    {actionStates[i] === 'in_progress' ? (
                                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded flex items-center gap-1">
                                            <Loader2 size={12} className="animate-spin" /> In Progress
                                        </span>
                                    ) : actionStates[i] === 'help_requested' ? (
                                        <span className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded flex items-center gap-1">
                                            <UserCheck size={12} /> Expert Requested
                                        </span>
                                    ) : (
                                        <button 
                                            onClick={() => handleStartImplementationClick(i, action.initiative)}
                                            className="text-xs font-bold text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 flex items-center gap-1 transition-colors"
                                        >
                                            <Play size={12} /> Start
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                                <div>
                                    <span className="text-slate-400 dark:text-slate-500 text-xs uppercase font-bold">Est. Impact</span>
                                    <p className="text-emerald-600 dark:text-emerald-400 font-medium">{action.impact_estimate}</p>
                                </div>
                                <div>
                                    <span className="text-slate-400 dark:text-slate-500 text-xs uppercase font-bold">Est. Cost</span>
                                    <p className="text-slate-600 dark:text-slate-300 font-medium">{action.cost_estimate}</p>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                                <button 
                                    onClick={() => openAssistanceModal(i, action.initiative)}
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                >
                                    <LifeBuoy size={12} /> Need help executing this?
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Menu Suggestions */}
            {report.seasonal_menu_suggestions && report.seasonal_menu_suggestions.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2">
                        <Sparkles className="text-purple-500" size={20} />
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Seasonal Menu Engineering</h3>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {report.seasonal_menu_suggestions.map((item, i) => (
                            <div key={i} className={`p-4 rounded-xl border ${item.type === 'add' ? 'border-emerald-100 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-900/10' : 'border-red-100 bg-red-50 dark:border-red-900/50 dark:bg-red-900/10'}`}>
                                <div className="flex items-start gap-3">
                                    <div className={`p-2 rounded-full ${item.type === 'add' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400'}`}>
                                        {item.type === 'add' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 dark:text-white text-sm">{item.item}</h4>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{item.reason}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Roadmap */}
            {report.roadmap && report.roadmap.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2">
                        <Map className="text-slate-500" size={20} />
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Execution Roadmap</h3>
                    </div>
                    <div className="p-6 relative">
                        <div className="absolute left-9 top-6 bottom-6 w-0.5 bg-slate-200 dark:bg-slate-700"></div>
                        <div className="space-y-8">
                            {report.roadmap.map((phase, i) => (
                                <div key={i} className="relative flex gap-6">
                                    <div className="z-10 w-6 h-6 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center text-xs font-bold shrink-0 mt-1 border-4 border-white dark:border-slate-800">
                                        {i + 1}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline mb-2">
                                            <h4 className="font-bold text-slate-800 dark:text-white">{phase.phase_name}</h4>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{phase.duration}</span>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-100 dark:border-slate-700">
                                            <ul className="space-y-2 mb-3">
                                                {phase.steps.map((step, s) => (
                                                    <li key={s} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                                                        <div className="mt-1.5 w-1 h-1 bg-slate-400 rounded-full shrink-0"></div>
                                                        {step}
                                                    </li>
                                                ))}
                                            </ul>
                                            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded w-fit">
                                                <Target size={12} /> Milestone: {phase.milestone}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
