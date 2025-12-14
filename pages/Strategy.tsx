
import React, { useState, useEffect } from 'react';
import { generateStrategy, generateABTestStrategy } from '../services/geminiService';
import { StrategyReport, UserRole, User, PlanType, ABTestResult } from '../types';
import { Loader2, User as UserIcon, TrendingUp, AlertTriangle, Users, Star, CheckCircle2, Rocket, Split, Wallet, ArrowRight, Sparkles, TrendingDown, UserCheck, PlusCircle, MessageSquare, Edit3, Save, X, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { storageService } from '../services/storageService';
import { paymentService } from '../services/paymentService';
import { CREDIT_COSTS } from '../constants';

interface StrategyProps { user: User; onUserUpdate?: (user: User) => void; }

const QUICK_PROMPTS = [
    { title: "Boost Customer Footfall", query: "Create a detailed marketing plan to increase customer footfall by 20% in the next 30 days. Focus on social media, local partnerships, and weekday promotions.", icon: Users, color: "text-blue-600 bg-blue-100" },
    { title: "Reduce Food Cost", query: "Analyze my menu and suggest ways to reduce food cost by 5% without lowering quality. Focus on waste reduction and ingredient substitution.", icon: TrendingDown, color: "text-emerald-600 bg-emerald-100" },
    { title: "Staff Retention", query: "Suggest an employee incentive program to reduce turnover and improve service quality.", icon: UserCheck, color: "text-purple-600 bg-purple-100" },
    { title: "Menu Engineering", query: "Identify high-margin items and suggest how to promote them using menu psychology.", icon: Star, color: "text-amber-600 bg-amber-100" }
];

export const Strategy: React.FC<StrategyProps> = ({ user, onUserUpdate }) => {
  const [role, setRole] = useState<UserRole>(user.role);
  const [query, setQuery] = useState('');
  
  // Custom Focus for 360 Analysis
  const [customFocus, setCustomFocus] = useState('');
  
  // Standard Report State
  const [report, setReport] = useState<StrategyReport | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [refinementQuery, setRefinementQuery] = useState('');
  
  // A/B Test State
  const [abMode, setAbMode] = useState(false);
  const [abResult, setAbResult] = useState<ABTestResult | null>(null);
  const [activeVariant, setActiveVariant] = useState<'a' | 'b' | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Payment State
  const [processingService, setProcessingService] = useState<'call' | 'onsite' | null>(null);
  
  const checkCredits = (): boolean => {
      if (user.role === UserRole.SUPER_ADMIN) return true;
      if (user.credits < CREDIT_COSTS.STRATEGY) {
          setError(`Insufficient Credits.`);
          return false;
      }
      return true;
  };

  const getContextData = () => {
        const salesData = storageService.getSalesData(user.id);
        const totalRev = salesData.reduce((acc: number, curr: any) => acc + curr.revenue, 0);
        const avgRev = salesData.length ? (totalRev / salesData.length).toFixed(0) : '0';
        const totalOrders = salesData.reduce((acc: any, c: any) => acc + c.items_sold, 0);
        
        const inventory = storageService.getInventory(user.id);
        const lowStockCount = inventory.filter(i => i.currentStock < i.parLevel).length;
        
        const recipes = storageService.getSavedRecipes(user.id);
        const avgMargin = recipes.length > 0 
            ? (recipes.reduce((acc, r) => {
                const margin = r.suggested_selling_price > 0 
                    ? (r.suggested_selling_price - r.food_cost_per_serving) / r.suggested_selling_price 
                    : 0;
                return acc + margin;
            }, 0) / recipes.length * 100).toFixed(1) 
            : '0';

        return `
            Restaurant: ${user.restaurantName || 'Unknown'} (${user.cuisineType || 'General'}).
            Financials (30d): Avg Daily Revenue ₹${avgRev}, Total Orders ${totalOrders}.
            Operations: ${recipes.length} Recipes on file, Avg Margin ${avgMargin}%.
            Inventory Health: ${lowStockCount} items below par level.
        `;
  };

  const handleSend = async (textOverride?: string, isRefinement = false) => {
    // If textOverride is provided (even if empty string provided explicitly, though we guard against that in caller), use it.
    // If not, use query state.
    let textToSend = textOverride !== undefined ? textOverride : query;
    
    if (!textToSend && !isRefinement) return;
    
    if (!isRefinement && !checkCredits()) return;
    
    if (!isRefinement && user.role !== UserRole.SUPER_ADMIN && onUserUpdate) {
        storageService.deductCredits(user.id, CREDIT_COSTS.STRATEGY, 'AI Strategy');
        onUserUpdate({ ...user, credits: user.credits - CREDIT_COSTS.STRATEGY });
    }

    if (textOverride && !isRefinement) setQuery(textOverride);
    
    setLoading(true);
    if (!isRefinement) {
        setReport(null);
        setAbResult(null);
        setActiveVariant(null);
    }
    setError(null);
    
    const salesSummary = getContextData();

    try {
      if (abMode && !isRefinement) {
          const abData = await generateABTestStrategy(user, textToSend, salesSummary);
          setAbResult(abData);
          storageService.logActivity(user.id, user.name, 'STRATEGY', `Ran A/B test simulation`);
      } else {
          // If refining, include current report in prompt
          if (isRefinement && report) {
              textToSend = `
                Current Strategy Report JSON: ${JSON.stringify(report)}
                
                User Request/Feedback: "${textToSend}"
                
                Task: Update the StrategyReport JSON based on the user's feedback. 
                Keep the structure strictly compatible with the StrategyReport interface. 
                Modify action plans, summary, or roadmap as requested.
              `;
          }

          const data = await generateStrategy(user, textToSend, salesSummary);
          setReport(data);
          
          if (isRefinement) {
              setRefinementQuery('');
              setIsEditing(false); // Exit manual edit mode if active
          }
          
          storageService.logActivity(user.id, user.name, 'STRATEGY', isRefinement ? `Refined strategy` : `Generated strategy report`);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRunAnalysis = () => {
      // Use custom focus if provided, otherwise default to full audit
      const prompt = customFocus.trim() 
        ? `Perform a comprehensive 360-degree growth audit. Specific Focus: ${customFocus}. Analyze my sales, inventory health, and margins.`
        : "Perform a comprehensive 360-degree growth audit. Analyze my sales, inventory health, and margins. Suggest improvements for profitability, marketing, and operations.";
      
      handleSend(prompt);
  };

  const handleServicePayment = async (type: 'call' | 'onsite') => {
      const amount = type === 'call' ? 99 : 5000;
      setProcessingService(type);

      await paymentService.initiatePayment(
          user,
          PlanType.PRO, 
          amount,
          (paymentId) => {
              const serviceName = type === 'call' ? "Expert Consultation Call" : "On-site Implementation";
              alert(`✅ Booking Confirmed! \n\nService: ${serviceName}\nTransaction ID: ${paymentId}\n\nA Bistro Specialist will contact you at ${user.email} within 2 hours.`);
              storageService.addInvoice(user.id, {
                  id: paymentId, date: new Date().toISOString(), amount: amount, plan: serviceName, status: 'Paid', period: 'One-time'
              });
              setProcessingService(null);
          },
          (err) => {
              if (err !== "Payment process cancelled") alert(`Booking Failed: ${err}`);
              setProcessingService(null);
          }
      );
  };

  const handleAddToTasks = (initiative: string) => {
      storageService.addTask(user.id, `Strategy Action: ${initiative}`, ['Admin', 'Growth']);
      alert("Added to Task Manager!");
  };

  const getAbChartData = () => {
      if (!abResult) return [];
      const baseline = abResult.baseline_metric.value;
      const liftA = baseline * (1 + (abResult.variant_a.projected_revenue_lift_pct / 100));
      const liftB = baseline * (1 + (abResult.variant_b.projected_revenue_lift_pct / 100));
      
      return [
          { name: 'Baseline', value: baseline, fill: '#94a3b8' },
          { name: 'Strategy A', value: liftA, fill: '#3b82f6' },
          { name: 'Strategy B', value: liftB, fill: '#8b5cf6' }
      ];
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden relative transition-colors">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg"><UserIcon size={20} /></div>
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                Context: {user.restaurantName || 'My Restaurant'}
            </div>
        </div>
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <span className={`text-xs font-bold ${abMode ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>A/B Testing</span>
                <button 
                    onClick={() => { setAbMode(!abMode); setReport(null); setAbResult(null); }}
                    className={`w-10 h-5 rounded-full relative transition-colors ${abMode ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                    <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-transform ${abMode ? 'left-6' : 'left-1'}`}></div>
                </button>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-bold"><Wallet size={12}/> Credits: {user.credits}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50 dark:bg-slate-900 custom-scrollbar">
        {error && <div className="max-w-4xl mx-auto mb-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-3"><AlertTriangle size={20} />{error}</div>}

        {!report && !abResult && !loading && (
          <div className="h-full flex flex-col items-center justify-center p-4">
            <div className="text-slate-400 opacity-60 mb-8 flex flex-col items-center">
                {abMode ? <Split size={48} className="mb-4" /> : <TrendingUp size={48} className="mb-4" />}
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{abMode ? 'Strategy Comparison Engine' : 'Bistro Strategy AI'}</h2>
                <p className="text-sm text-slate-500 max-w-md text-center">
                    {abMode 
                        ? 'Compare two distinct strategic approaches side-by-side to find the best path for your growth.' 
                        : 'Your personal consultant. I analyze your location, weather, and sales data to provide actionable advice.'}
                </p>
            </div>

            <div className="max-w-4xl w-full space-y-6">
                {!abMode && (
                    <div className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl shadow-xl p-1 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                        <div className="bg-white dark:bg-slate-900/95 rounded-xl p-6 relative z-10 h-full flex flex-col md:flex-row gap-6 items-start md:items-center">
                            <div className="flex-1 space-y-3 w-full">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                                        <Rocket className="text-emerald-600" size={24}/> Run 360° Growth Analysis
                                    </h3>
                                    <p className="text-slate-500 font-medium text-sm mt-1">
                                        Auto-detects low margins, inventory leaks, and sales opportunities.
                                    </p>
                                </div>
                                <textarea
                                    value={customFocus}
                                    onChange={(e) => setCustomFocus(e.target.value)}
                                    placeholder="Optional: Add specific requirements (e.g., 'Focus on improving lunch sales', 'Reduce food waste', 'Marketing ideas for students')..."
                                    className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none h-24 shadow-inner text-slate-800 dark:text-white"
                                />
                            </div>
                            <div className="w-full md:w-auto">
                                <button 
                                    onClick={handleRunAnalysis}
                                    disabled={loading}
                                    className="w-full md:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg hover:shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 whitespace-nowrap active:scale-95"
                                >
                                    {loading ? <Loader2 className="animate-spin"/> : <Sparkles size={20} />}
                                    Generate Report
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {QUICK_PROMPTS.map((prompt, idx) => (
                        <button 
                            key={idx}
                            onClick={() => handleSend(prompt.query)}
                            className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-md transition-all text-left flex items-start gap-4 group"
                        >
                            <div className={`p-3 rounded-lg ${prompt.color} group-hover:scale-110 transition-transform`}>
                                <prompt.icon size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-white mb-1">{prompt.title}</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{prompt.query}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
          </div>
        )}

        {loading && (
            <div className="flex flex-col justify-center items-center h-full gap-4">
                <Loader2 className="animate-spin text-emerald-600" size={48} />
                <p className="text-slate-500 animate-pulse font-medium text-center">
                    {abMode ? 'Simulating parallel strategic outcomes...' : 'Analyzing business data...'} <br/>
                    <span className="text-xs opacity-75">Checking sales history, inventory levels, and margins.</span>
                </p>
            </div>
        )}

        {/* Standard Report View */}
        {report && !abMode && (
          <div className="max-w-5xl mx-auto space-y-8 pb-32 animate-fade-in">
            {/* Report Actions Header */}
            <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm sticky top-0 z-30">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Sparkles className="text-emerald-500" size={18}/> Strategic Report
                </h3>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setIsEditing(!isEditing)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${isEditing ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
                    >
                        {isEditing ? <Save size={16}/> : <Edit3 size={16}/>}
                        {isEditing ? 'Save Changes' : 'Edit Plan'}
                    </button>
                    <button 
                        onClick={() => handleSend(query)}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-600"
                    >
                        <RefreshCw size={16} /> Regen
                    </button>
                </div>
            </div>

            {/* Executive Summary */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Executive Summary</h3>
                {isEditing ? (
                    <textarea 
                        value={report.summary.join('\n')}
                        onChange={(e) => setReport({...report, summary: e.target.value.split('\n')})}
                        className="w-full h-40 p-3 bg-slate-50 dark:bg-slate-900 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white"
                    />
                ) : (
                    <ul className="space-y-3">
                        {(Array.isArray(report.summary) ? report.summary : []).map((s,i) => (
                            <li key={i} className="flex gap-3 text-slate-700 dark:text-slate-300 leading-relaxed">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 shrink-0"></span>
                                {s}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Action Plan Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Strategic Initiatives</h3>
                    <div className="space-y-4">
                        {(Array.isArray(report.action_plan) ? report.action_plan : []).map((action, i) => (
                            <div key={i} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border-l-4 border-l-emerald-500 group">
                                {isEditing ? (
                                    <div className="space-y-2">
                                        <input 
                                            value={action.initiative}
                                            onChange={(e) => {
                                                const newPlan = [...report.action_plan];
                                                newPlan[i] = { ...action, initiative: e.target.value };
                                                setReport({ ...report, action_plan: newPlan });
                                            }}
                                            className="w-full p-2 bg-white dark:bg-slate-800 border rounded text-sm font-bold"
                                        />
                                        <div className="flex gap-2">
                                            <input value={action.impact_estimate} onChange={(e) => {
                                                const newPlan = [...report.action_plan];
                                                newPlan[i] = { ...action, impact_estimate: e.target.value };
                                                setReport({ ...report, action_plan: newPlan });
                                            }} className="w-1/2 p-2 bg-white dark:bg-slate-800 border rounded text-xs" placeholder="Impact" />
                                            <input value={action.cost_estimate} onChange={(e) => {
                                                const newPlan = [...report.action_plan];
                                                newPlan[i] = { ...action, cost_estimate: e.target.value };
                                                setReport({ ...report, action_plan: newPlan });
                                            }} className="w-1/2 p-2 bg-white dark:bg-slate-800 border rounded text-xs" placeholder="Cost" />
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="font-bold text-slate-800 dark:text-white text-sm">{action.initiative}</h4>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${action.priority === 'High' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {action.priority} Priority
                                            </span>
                                        </div>
                                        <div className="flex gap-4 text-xs text-slate-500 mt-2">
                                            <span>Impact: <strong className="text-slate-700 dark:text-slate-300">{action.impact_estimate}</strong></span>
                                            <span>Cost: <strong className="text-slate-700 dark:text-slate-300">{action.cost_estimate}</strong></span>
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                                            <button 
                                                onClick={() => handleAddToTasks(action.initiative)}
                                                className="text-xs text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1 hover:underline"
                                            >
                                                <PlusCircle size={12}/> Add to Tasks
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Menu Adjustments</h3>
                    <div className="space-y-3">
                        {(Array.isArray(report.seasonal_menu_suggestions) ? report.seasonal_menu_suggestions : []).map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-3 border-b border-slate-100 dark:border-slate-700 last:border-0">
                                <div className="flex-1 mr-4">
                                    <p className="font-bold text-slate-800 dark:text-white text-sm">{item.item}</p>
                                    <p className="text-xs text-slate-500">{item.reason}</p>
                                </div>
                                <span className={`text-xs font-bold px-2 py-1 rounded shrink-0 ${item.type === 'add' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                    {item.type.toUpperCase()}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Refinement Interface */}
            <div className="fixed bottom-0 left-64 right-0 p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-xl z-40">
                <div className="max-w-4xl mx-auto flex gap-3">
                    <div className="relative flex-1">
                        <MessageSquare className="absolute left-3 top-3 text-slate-400" size={18} />
                        <input 
                            value={refinementQuery}
                            onChange={(e) => setRefinementQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend(refinementQuery, true)}
                            placeholder="Ask a follow-up or refine this plan (e.g. 'Make it more budget friendly' or 'Focus on vegan options')..."
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none text-sm dark:text-white"
                        />
                    </div>
                    <button 
                        onClick={() => handleSend(refinementQuery, true)}
                        disabled={!refinementQuery.trim() || loading}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}
                    </button>
                </div>
            </div>
          </div>
        )}

        {/* A/B Test Results View (Keep existing logic) */}
        {abResult && abMode && (
            <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-fade-in">
                {/* Comparison Header */}
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Strategy Comparison</h2>
                    <p className="text-slate-500 dark:text-slate-400">Projected outcomes for "{abResult.query}"</p>
                </div>

                {/* Impact Chart */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 h-[300px]">
                    <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 text-center">Projected Revenue Impact</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getAbChartData()} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                            <RechartsTooltip 
                                formatter={(value: number) => `₹${value.toLocaleString()}`}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={40}>
                                {getAbChartData().map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Side-by-Side Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Strategy A */}
                    <div className={`relative p-6 rounded-2xl border transition-all ${activeVariant === 'a' ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-500 ring-2 ring-blue-500/20' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-xs font-bold shadow-sm">Strategy A</div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white mt-4 text-center">{abResult.variant_a.name}</h3>
                        <p className="text-sm text-slate-500 text-center mb-6">{abResult.variant_a.description}</p>
                        
                        <div className="space-y-4 mb-8">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Revenue Lift</span>
                                <span className="font-bold text-emerald-600">+{abResult.variant_a.projected_revenue_lift_pct}%</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Difficulty</span>
                                <span className={`font-bold ${abResult.variant_a.implementation_difficulty === 'High' ? 'text-red-500' : 'text-blue-500'}`}>{abResult.variant_a.implementation_difficulty}</span>
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg mb-6">
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Key Steps</h4>
                            <ul className="space-y-2">
                                {(Array.isArray(abResult.variant_a.key_steps) ? abResult.variant_a.key_steps : []).map((step, i) => (
                                    <li key={i} className="flex gap-2 text-sm text-slate-700 dark:text-slate-300">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0"></div>
                                        {step}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <button 
                            onClick={() => setActiveVariant('a')}
                            className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors ${activeVariant === 'a' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                        >
                            {activeVariant === 'a' ? <CheckCircle2 size={18}/> : <Rocket size={18}/>}
                            {activeVariant === 'a' ? 'Strategy A Active' : 'Activate Strategy A'}
                        </button>
                    </div>

                    {/* Strategy B */}
                    <div className={`relative p-6 rounded-2xl border transition-all ${activeVariant === 'b' ? 'bg-purple-50 dark:bg-purple-900/10 border-purple-500 ring-2 ring-purple-500/20' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-purple-500 text-white px-4 py-1 rounded-full text-xs font-bold shadow-sm">Strategy B</div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white mt-4 text-center">{abResult.variant_b.name}</h3>
                        <p className="text-sm text-slate-500 text-center mb-6">{abResult.variant_b.description}</p>
                        
                        <div className="space-y-4 mb-8">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Revenue Lift</span>
                                <span className="font-bold text-emerald-600">+{abResult.variant_b.projected_revenue_lift_pct}%</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Difficulty</span>
                                <span className={`font-bold ${abResult.variant_b.implementation_difficulty === 'High' ? 'text-red-500' : 'text-blue-500'}`}>{abResult.variant_b.implementation_difficulty}</span>
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg mb-6">
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Key Steps</h4>
                            <ul className="space-y-2">
                                {(Array.isArray(abResult.variant_b.key_steps) ? abResult.variant_b.key_steps : []).map((step, i) => (
                                    <li key={i} className="flex gap-2 text-sm text-slate-700 dark:text-slate-300">
                                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0"></div>
                                        {step}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <button 
                            onClick={() => setActiveVariant('b')}
                            className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors ${activeVariant === 'b' ? 'bg-purple-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                        >
                            {activeVariant === 'b' ? <CheckCircle2 size={18}/> : <Rocket size={18}/>}
                            {activeVariant === 'b' ? 'Strategy B Active' : 'Activate Strategy B'}
                        </button>
                    </div>
                </div>

                {/* AI Recommendation */}
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800 text-center">
                    <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">🤖 AI Recommendation</p>
                    <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1">{abResult.recommendation}</p>
                </div>
            </div>
        )}

        {/* Expert Implementation Services (Available in both modes if result exists) */}
        {(report || abResult) && (
            <div className="space-y-4 max-w-5xl mx-auto mt-12 pb-12">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Star className="text-yellow-500" /> Bistro Expert Connect
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Consultation Option */}
                    <div className="bg-gradient-to-br from-indigo-900 to-indigo-800 rounded-xl p-6 text-white shadow-lg flex flex-col justify-between relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <h4 className="text-xl font-bold">Strategy Call</h4>
                                <span className="bg-white/20 text-xs font-bold px-2 py-1 rounded">₹99</span>
                            </div>
                            <p className="text-indigo-100 text-sm mb-6">30-min call with an F&B expert to refine this plan.</p>
                            <button 
                                onClick={() => handleServicePayment('call')}
                                disabled={processingService === 'call'}
                                className="w-full py-2 bg-white text-indigo-900 font-bold rounded-lg hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                            >
                                {processingService === 'call' ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                                Book Now
                            </button>
                        </div>
                    </div>

                    {/* On-site Option */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <h4 className="text-xl font-bold text-slate-900 dark:text-white">On-site Rollout</h4>
                                <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold px-2 py-1 rounded">₹5,000</span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">We send a team to implement this strategy at your location.</p>
                            <button 
                                onClick={() => handleServicePayment('onsite')}
                                disabled={processingService === 'onsite'}
                                className="w-full py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                            >
                                {processingService === 'onsite' ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                Request Team
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
