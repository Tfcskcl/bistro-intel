
import React, { useState, useEffect } from 'react';
import { generateStrategy, generateImplementationPlan } from '../services/geminiService';
import { StrategyReport, UserRole, User, PlanType, ImplementationGuide } from '../types';
import { Send, Loader2, User as UserIcon, Briefcase, TrendingUp, Lock, HelpCircle, ArrowRight, Play, LifeBuoy, CheckCircle2, Clock, X, BookOpen, UserCheck, Calendar, Zap, ChevronDown, Trash2, Sparkles, Activity, Target, AlertTriangle, ArrowUpRight, ArrowDownRight, Lightbulb, Map, BarChart2, PieChart as PieChartIcon, ScatterChart as ScatterChartIcon, Info } from 'lucide-react';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, ScatterChart, Scatter, ZAxis
} from 'recharts';

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
        setError(null);
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
    setError(null);
    setActionStates({}); // Reset action states
    try {
      const data = await generateStrategy(role, textToSend);
      setReport(data);
      incrementUsage();
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
    
    if (!checkUsage()) return;

    setChoiceModalOpen(null);
    setRoadmapModalOpen(true);
    setLoadingPlan(true);
    setGeneratedPlan(null);
    setError(null);

    try {
        const plan = await generateImplementationPlan(title);
        setGeneratedPlan(plan);
        setActionStates(prev => ({ ...prev, [index]: 'in_progress' }));
        incrementUsage();
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

  // Scatter Data Helper (Effort vs Impact)
  // Mocking numeric values based on string descriptions for demo purposes
  const getImpactData = () => {
      if (!report) return [];
      return (report.action_plan || []).map((action, idx) => {
          // Heuristic: convert High/Med/Low strings to numbers for charts
          const impactScore = action.priority === 'High' ? 30 : action.priority === 'Medium' ? 20 : 10;
          // Randomize slightly to prevent overlapping dots
          const finalImpact = impactScore + Math.floor(Math.random() * 5);
          const finalCost = Math.floor(Math.random() * 30) + 5; // 5-35 range
          
          return {
              name: action.initiative,
              x: finalCost, // Cost/Effort
              y: finalImpact, // Impact
              z: 10, // Bubble Size
              priority: action.priority
          };
      });
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
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between z-20">
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
            <div className="h-6 w-px bg-slate-300 mx-2 hidden sm:block"></div>
            <p className="text-sm text-slate-500 italic hidden sm:block">"Ask me about sales, costs, or long-term strategy..."</p>
        </div>
        
        {user.isTrial && (
            <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-full text-xs font-bold">
                <Zap size={12} fill="currentColor" />
                Demo: {user.queriesUsed || 0}/{user.queryLimit}
            </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50 custom-scrollbar">
        {error && (
            <div className="max-w-4xl mx-auto mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700 animate-fade-in shadow-sm">
                <AlertTriangle size={20} className="shrink-0" />
                <p className="flex-1 font-medium text-sm">{error}</p>
                <button 
                    onClick={() => setError(null)} 
                    className="text-xs font-bold uppercase hover:underline"
                >
                    Dismiss
                </button>
            </div>
        )}

        {!report && !loading && (
          <div className="h-full flex flex-col items-center justify-center p-4">
            <div className="text-slate-400 opacity-60 mb-8 flex flex-col items-center animate-fade-in-up">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                    <TrendingUp size={40} className="text-slate-400" />
                </div>
                <p className="text-lg font-medium text-slate-500">Strategic Business Intelligence</p>
                <p className="text-sm text-slate-400 mt-2 max-w-sm text-center">BistroIntel processes your sales, menu, and inventory to suggest profitable strategies.</p>
            </div>
            
            <div className="w-full max-w-4xl animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                <div className="flex items-center gap-2 mb-4 justify-center">
                    <HelpCircle size={16} className="text-emerald-500" />
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">Common Strategy Queries</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {faqs.map((faq, idx) => (
                        <button 
                            key={idx}
                            onClick={() => handleSend(faq.prompt)}
                            className="text-left p-6 bg-white border border-slate-200 rounded-xl hover:border-emerald-400 hover:shadow-lg transition-all group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity bg-emerald-500 rounded-bl-2xl">
                                <Sparkles size={24} className="text-white" />
                            </div>
                            <h4 className="font-bold text-slate-700 group-hover:text-emerald-700 mb-2 flex items-center justify-between pr-8">
                                {faq.question}
                            </h4>
                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{faq.prompt}</p>
                        </button>
                    ))}
                </div>
            </div>
          </div>
        )}

        {loading && (
           <div className="flex justify-center items-center h-full">
             <div className="flex flex-col items-center gap-4 bg-white p-8 rounded-2xl shadow-xl border border-slate-100 animate-scale-in">
               <Loader2 className="animate-spin text-emerald-600" size={40} />
               <div>
                   <p className="text-slate-800 font-bold text-lg text-center">Analyzing Data Points...</p>
                   <p className="text-slate-500 text-sm mt-1 animate-pulse text-center">Reviewing sales, purchases, and employee logs</p>
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
                    <h2 className="text-2xl font-bold text-slate-900">Strategic Analysis Report</h2>
                    <p className="text-sm text-slate-500">Generated for: {role.replace('_', ' ')} • {new Date().toLocaleDateString()}</p>
                </div>
            </div>

            {/* Top Row: Executive Summary & Priority Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Executive Summary */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                   
                   <div className="p-6 border-b border-slate-100 flex items-center gap-2">
                       <Sparkles className="text-emerald-500" size={20} />
                       <h3 className="text-lg font-bold text-slate-800">Executive Summary</h3>
                   </div>
                   
                   <div className="p-6 flex-1">
                       <ul className="space-y-4">
                           {(report.summary || []).map((item, i) => (
                               <li key={i} className="flex gap-4">
                                   <div className="mt-1 w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold shrink-0 border border-slate-200">
                                       {i+1}
                                   </div>
                                   <p className="text-slate-700 leading-relaxed font-medium">{item}</p>
                               </li>
                           ))}
                       </ul>
                   </div>
                </div>

                {/* Priority & Impact Breakdown Charts */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wide">
                            {vizMode === 'priority' ? 'Initiative Priority' : 'Impact vs Effort'}
                        </h4>
                        
                        {/* Viz Toolbar */}
                        <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
                             <button 
                                onClick={() => setVizMode('priority')}
                                className={`p-1.5 rounded transition-colors ${vizMode === 'priority' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                title="Priority Breakdown"
                             >
                                <PieChartIcon size={14} />
                             </button>
                             <button 
                                onClick={() => setVizMode('impact')}
                                className={`p-1.5 rounded transition-colors ${vizMode === 'impact' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
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
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${chartType === 'pie' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-500 border-slate-200'}`}
                                     >
                                         Pie
                                     </button>
                                     <button 
                                        onClick={() => setChartType('bar')}
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${chartType === 'bar' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-500 border-slate-200'}`}
                                     >
                                         Bar
                                     </button>
                                </div>

                                <ResponsiveContainer width="100%" height="100%">
                                    {chartType === 'pie' ? (
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
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            />
                                            <Legend verticalAlign="bottom" height={36}/>
                                        </PieChart>
                                    ) : (
                                        <BarChart data={getPriorityData()}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                            <XAxis dataKey="name" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                                            <YAxis tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                                            <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px' }} />
                                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                                {getPriorityData().map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    )}
                                </ResponsiveContainer>
                                {chartType === 'pie' && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                                        <div className="text-center">
                                            <span className="text-3xl font-bold text-slate-800">{(report.action_plan || []).length}</span>
                                            <p className="text-xs text-slate-400 font-bold uppercase">Actions</p>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            // Impact vs Effort Scatter Chart
                            <div className="h-full w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                        <XAxis type="number" dataKey="x" name="Cost/Effort" tick={false} label={{ value: 'Cost/Effort', position: 'insideBottom', offset: -5, fontSize: 10 }} />
                                        <YAxis type="number" dataKey="y" name="Impact" tick={false} label={{ value: 'Impact', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                                        <ZAxis type="number" dataKey="z" range={[60, 200]} />
                                        <RechartsTooltip 
                                            cursor={{ strokeDasharray: '3 3' }} 
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    return (
                                                        <div className="bg-white p-2 border border-slate-200 shadow-lg rounded text-xs">
                                                            <p className="font-bold text-slate-800">{data.name}</p>
                                                            <p className="text-slate-500">Priority: {data.priority}</p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Scatter name="Initiatives" data={getImpactData()} fill="#10b981">
                                             {getImpactData().map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.priority === 'High' ? COLORS.High : entry.priority === 'Medium' ? COLORS.Medium : COLORS.Low} />
                                            ))}
                                        </Scatter>
                                    </ScatterChart>
                                </ResponsiveContainer>
                                <div className="text-center text-[10px] text-slate-400 mt-[-10px]">
                                    Top-Right: High Impact, High Cost • Top-Left: High Impact, Low Cost (Quick Wins)
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Diagnosis: Root Causes */}
            {report.causes && report.causes.length > 0 && (
                <div className="bg-amber-50 rounded-2xl border border-amber-100 p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Activity size={120} className="text-amber-500" />
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-lg font-bold text-amber-900 mb-4 flex items-center gap-2">
                           <Activity size={20} /> Diagnostic: Root Causes
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            {report.causes.map((cause, i) => (
                                <div key={i} className="bg-white/80 p-4 rounded-xl border border-amber-200/50 flex gap-3 items-start">
                                    <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                                    <p className="text-sm text-amber-900 font-medium">{cause}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Strategic Roadmap (12-Month) */}
            {report.roadmap && report.roadmap.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center gap-2 bg-gradient-to-r from-slate-50 to-white">
                        <Map size={20} className="text-indigo-600" />
                        <h3 className="text-lg font-bold text-slate-900">12-Month Strategic Roadmap</h3>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
                            {/* Connector Line (Desktop) */}
                            <div className="hidden lg:block absolute top-6 left-0 right-0 h-0.5 bg-indigo-100 z-0 mx-12"></div>
                            
                            {report.roadmap.map((phase, idx) => (
                                <div key={idx} className="relative z-10 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col h-full hover:border-indigo-300 transition-colors">
                                    <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-600 mb-4 mx-auto lg:mx-0">
                                        {idx + 1}
                                    </div>
                                    <div className="text-center lg:text-left mb-4">
                                        <h4 className="text-lg font-bold text-slate-900">{phase.phase_name}</h4>
                                        <p className="text-sm font-semibold text-indigo-600">{phase.duration}</p>
                                    </div>
                                    
                                    <div className="flex-1 space-y-2 mb-4">
                                        {phase.steps.slice(0, 3).map((step, sIdx) => (
                                            <div key={sIdx} className="flex gap-2 items-start text-xs text-slate-600">
                                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1 shrink-0"></span>
                                                {step}
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div className="pt-3 border-t border-slate-100 text-xs">
                                        <span className="font-bold text-slate-500 uppercase">Milestone:</span>
                                        <p className="text-slate-800 font-medium mt-1">{phase.milestone}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Action Plan */}
            <div>
              <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Briefcase size={22} className="text-blue-600"/> Actionable Initiatives
                  </h3>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                      {(report.action_plan || []).length} Initiatives Identified
                  </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {(report.action_plan || []).map((action, i) => (
                  <div key={i} className={`flex flex-col rounded-xl border shadow-sm transition-all hover:shadow-md bg-white ${
                        actionStates[i] === 'completed' ? 'opacity-60 grayscale' : ''
                  }`}>
                    {/* Card Header */}
                    <div className="p-5 border-b border-slate-100 flex justify-between items-start gap-3">
                        <h4 className={`font-bold text-slate-800 leading-snug ${actionStates[i] === 'completed' ? 'line-through' : ''}`}>
                            {action.initiative}
                        </h4>
                        <span className={`shrink-0 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${
                            action.priority === 'High' ? 'bg-red-50 text-red-700 border-red-200' :
                            action.priority === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                            {action.priority}
                        </span>
                    </div>

                    {/* Card Metrics */}
                    <div className="p-5 flex-1 space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Impact</p>
                                <p className="text-xs font-bold text-emerald-600 leading-tight">{action.impact_estimate}</p>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Cost</p>
                                <p className="text-xs font-bold text-slate-700 leading-tight">{action.cost_estimate}</p>
                            </div>
                        </div>
                    </div>
                    
                    {/* Card Actions */}
                    <div className="p-4 border-t border-slate-100 bg-slate-50/50 rounded-b-xl">
                        <div className="flex flex-col gap-3">
                            {/* Implementation Button */}
                            {actionStates[i] === 'in_progress' ? (
                                <button 
                                    onClick={() => handleStartImplementationClick(i, action.initiative)}
                                    className="w-full py-2 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg flex items-center justify-center gap-2 border border-emerald-200"
                                >
                                    <Clock size={14} /> View Roadmap
                                </button>
                            ) : actionStates[i] === 'help_requested' ? (
                                <div className="w-full py-2 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg flex items-center justify-center gap-2 border border-blue-200">
                                    <CheckCircle2 size={14} /> Expert Assigned
                                </div>
                            ) : actionStates[i] === 'completed' ? (
                                <div className="w-full py-2 bg-slate-200 text-slate-600 text-xs font-bold rounded-lg flex items-center justify-center gap-2">
                                    <CheckCircle2 size={14} /> Done
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleStartImplementationClick(i, action.initiative)}
                                        className="flex-1 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 transition-colors flex items-center justify-center gap-1 shadow-sm"
                                    >
                                        <Play size={12} fill="currentColor" /> Start
                                    </button>
                                    <button 
                                        onClick={() => openAssistanceModal(i, action.initiative)}
                                        className="py-2 px-3 bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 rounded-lg transition-colors"
                                        title="Ask Expert"
                                    >
                                        <LifeBuoy size={16} />
                                    </button>
                                </div>
                            )}

                            {/* Status Toggle */}
                            <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium pt-1">
                                <span>Status:</span>
                                <div className="flex gap-1">
                                    {['idle', 'in_progress', 'completed'].map((s) => (
                                        <button 
                                            key={s}
                                            onClick={() => updateActionStatus(i, s as any)}
                                            className={`w-2 h-2 rounded-full transition-all ${actionStates[i] === s ? (s === 'completed' ? 'bg-slate-400 scale-125' : s === 'in_progress' ? 'bg-emerald-500 scale-125' : 'bg-slate-300 scale-125') : 'bg-slate-200 hover:bg-slate-300'}`}
                                            title={s.replace('_', ' ')}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Seasonal Menu Suggestions */}
            {(report.seasonal_menu_suggestions || []).length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Lightbulb size={20} className="text-yellow-500" /> Seasonal Menu Strategy
                        </h3>
                        {/* Legend */}
                        <div className="flex gap-4 text-xs font-bold">
                            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Add</div>
                            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500"></div> Remove</div>
                        </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                        {/* Additions */}
                        <div className="p-6">
                            <h4 className="text-xs font-bold text-emerald-600 uppercase mb-4 flex items-center gap-2">
                                <ArrowUpRight size={16} /> Recommended Additions
                            </h4>
                            <div className="space-y-4">
                                {(report.seasonal_menu_suggestions || []).filter(s => s.type === 'add').map((item, i) => (
                                    <div key={i} className="flex gap-3 items-start">
                                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></div>
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">{item.item}</p>
                                            <p className="text-xs text-slate-500 mt-1">{item.reason}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Removals */}
                        <div className="p-6">
                             <h4 className="text-xs font-bold text-red-600 uppercase mb-4 flex items-center gap-2">
                                <ArrowDownRight size={16} /> Suggested Removals
                            </h4>
                            <div className="space-y-4">
                                {(report.seasonal_menu_suggestions || []).filter(s => s.type === 'remove').map((item, i) => (
                                    <div key={i} className="flex gap-3 items-start">
                                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></div>
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">{item.item}</p>
                                            <p className="text-xs text-slate-500 mt-1">{item.reason}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-200 z-30">
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
                    placeholder="Enter your business goal or challenge (e.g. 'Increase delivery revenue by 20%')..."
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none shadow-sm"
                />
                <button 
                    onClick={handleClear}
                    title="Clear Chat"
                    className="px-3 py-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                >
                    <Trash2 size={20} />
                </button>
                <button 
                    onClick={() => handleSend()}
                    disabled={loading || !query}
                    className="px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors font-bold shadow-lg shadow-slate-900/20"
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
