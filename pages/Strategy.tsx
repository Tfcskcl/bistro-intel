
import React, { useState, useEffect } from 'react';
import { generateStrategy, generateImplementationPlan } from '../services/geminiService';
import { StrategyReport, UserRole, User, ImplementationGuide, PlanType } from '../types';
import { Send, Loader2, User as UserIcon, Briefcase, TrendingUp, HelpCircle, Play, LifeBuoy, X, BookOpen, UserCheck, Calendar, Sparkles, Target, AlertTriangle, ArrowUpRight, ArrowDownRight, Map, PieChart as PieChartIcon, ScatterChart as ScatterChartIcon, Wallet, TrendingDown, Users, Star, CheckCircle2, Phone, Award, Video, Building2 } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, ScatterChart, Scatter, ZAxis } from 'recharts';
import { storageService } from '../services/storageService';
import { paymentService } from '../services/paymentService';
import { CREDIT_COSTS } from '../constants';

interface StrategyProps { user: User; onUserUpdate?: (user: User) => void; }
interface ActionState { [key: number]: 'idle' | 'in_progress' | 'help_requested' | 'completed'; }
const COLORS = { High: '#ef4444', Medium: '#f59e0b', Low: '#3b82f6', add: '#10b981', remove: '#ef4444' };

const QUICK_PROMPTS = [
    { title: "Boost Customer Footfall", query: "Create a detailed marketing plan to increase customer footfall by 20% in the next 30 days. Focus on social media, local partnerships, and weekday promotions.", icon: Users, color: "text-blue-600 bg-blue-100" },
    { title: "Reduce Food Cost", query: "Analyze my menu and suggest ways to reduce food cost by 5% without lowering quality. Focus on waste reduction and ingredient substitution.", icon: TrendingDown, color: "text-emerald-600 bg-emerald-100" },
    { title: "Staff Retention", query: "Suggest an employee incentive program to reduce turnover and improve service quality.", icon: UserCheck, color: "text-purple-600 bg-purple-100" },
    { title: "Menu Engineering", query: "Identify high-margin items and suggest how to promote them using menu psychology.", icon: Star, color: "text-amber-600 bg-amber-100" }
];

export const Strategy: React.FC<StrategyProps> = ({ user, onUserUpdate }) => {
  const [role, setRole] = useState<UserRole>(user.role);
  const [query, setQuery] = useState('');
  const [report, setReport] = useState<StrategyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionStates, setActionStates] = useState<ActionState>({});
  
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

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || query;
    if (!textToSend || !checkCredits()) return;
    
    if (user.role !== UserRole.SUPER_ADMIN && onUserUpdate) {
        storageService.deductCredits(user.id, CREDIT_COSTS.STRATEGY, 'AI Strategy');
        onUserUpdate({ ...user, credits: user.credits - CREDIT_COSTS.STRATEGY });
    }

    if (textOverride) setQuery(textOverride);
    setLoading(true);
    setReport(null);
    setError(null);
    
    // Gather Context
    const salesData = storageService.getSalesData(user.id);
    const totalRev = salesData.reduce((acc: number, curr: any) => acc + curr.revenue, 0);
    const avgRev = salesData.length ? (totalRev / salesData.length).toFixed(0) : '0';
    const salesSummary = `Average Daily Revenue: ₹${avgRev}. Total Orders (last 30 days): ${salesData.reduce((acc: any, c: any) => acc + c.items_sold, 0)}.`;

    try {
      // Pass full user object and sales context for deep analysis
      const data = await generateStrategy(user, textToSend, salesSummary);
      setReport(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleServicePayment = async (type: 'call' | 'onsite') => {
      const amount = type === 'call' ? 99 : 5000;
      setProcessingService(type);

      await paymentService.initiatePayment(
          user,
          PlanType.PRO, // Using PlanType generic for service payment
          amount,
          (paymentId) => {
              const serviceName = type === 'call' ? "Expert Consultation Call" : "On-site Implementation";
              alert(`✅ Booking Confirmed! \n\nService: ${serviceName}\nTransaction ID: ${paymentId}\n\nA Bistro Specialist will contact you at ${user.email} within 2 hours.`);
              
              // Record transaction
              storageService.addInvoice(user.id, {
                  id: paymentId,
                  date: new Date().toISOString(),
                  amount: amount,
                  plan: serviceName,
                  status: 'Paid',
                  period: 'One-time'
              });
              
              setProcessingService(null);
          },
          (err) => {
              if (err !== "Payment process cancelled") alert(`Booking Failed: ${err}`);
              setProcessingService(null);
          }
      );
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden relative transition-colors">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg"><UserIcon size={20} /></div>
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">Viewing as: {user.role.replace('_', ' ')}</div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-bold"><Wallet size={12}/> Credits: {user.credits}</div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50 dark:bg-slate-900 custom-scrollbar">
        {error && <div className="max-w-4xl mx-auto mb-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-3"><AlertTriangle size={20} />{error}</div>}

        {!report && !loading && (
          <div className="h-full flex flex-col items-center justify-center p-4">
            <div className="text-slate-400 opacity-60 mb-8 flex flex-col items-center">
                <TrendingUp size={48} className="mb-4" />
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Bistro Strategy AI</h2>
                <p className="text-sm text-slate-500 max-w-md text-center">Your personal consultant. I analyze your location, weather patterns, competition, and data to provide actionable advice.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl w-full">
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
        )}

        {loading && (
            <div className="flex flex-col justify-center items-center h-full gap-4">
                <Loader2 className="animate-spin text-emerald-600" size={48} />
                <p className="text-slate-500 animate-pulse font-medium text-center">
                    Analyzing market conditions in {user.location || 'your area'}...<br/>
                    <span className="text-xs opacity-75">Checking weather, competition, and sales trends.</span>
                </p>
            </div>
        )}

        {report && (
          <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-fade-in">
            {/* Executive Summary */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <Sparkles className="text-emerald-500" size={20}/> Executive Analysis
                </h3>
                <ul className="space-y-3">
                    {report.summary.map((s,i) => (
                        <li key={i} className="flex gap-3 text-slate-700 dark:text-slate-300 leading-relaxed">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 shrink-0"></span>
                            {s}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Action Plan Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Strategic Initiatives</h3>
                    <div className="space-y-4">
                        {report.action_plan.map((action, i) => (
                            <div key={i} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border-l-4 border-l-emerald-500">
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
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Seasonal Menu Engineering</h3>
                    <div className="space-y-3">
                        {report.seasonal_menu_suggestions.map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-3 border-b border-slate-100 dark:border-slate-700 last:border-0">
                                <div>
                                    <p className="font-bold text-slate-800 dark:text-white text-sm">{item.item}</p>
                                    <p className="text-xs text-slate-500">{item.reason}</p>
                                </div>
                                <span className={`text-xs font-bold px-2 py-1 rounded ${item.type === 'add' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                    {item.type.toUpperCase()}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Roadmap */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Implementation Roadmap</h3>
                <div className="relative border-l-2 border-slate-200 dark:border-slate-700 ml-4 space-y-8">
                    {report.roadmap.map((phase, i) => (
                        <div key={i} className="relative pl-8">
                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white dark:border-slate-800"></div>
                            <h4 className="font-bold text-slate-800 dark:text-white">{phase.phase_name} <span className="text-xs font-normal text-slate-500 ml-2">({phase.duration})</span></h4>
                            <ul className="mt-2 space-y-1">
                                {phase.steps.map((step, j) => (
                                    <li key={j} className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
                                        <CheckCircle2 size={12} className="text-emerald-500"/> {step}
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-3 inline-block bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs px-2 py-1 rounded border border-blue-100 dark:border-blue-800">
                                🎯 Milestone: {phase.milestone}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Expert Implementation Services */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Award className="text-yellow-500" /> Bistro Expert Connect
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Consultation Option */}
                    <div className="bg-gradient-to-br from-indigo-900 to-indigo-800 rounded-xl p-6 text-white shadow-lg flex flex-col justify-between relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                                    <Video size={24} className="text-indigo-300" />
                                </div>
                                <span className="bg-indigo-500/30 border border-indigo-400/30 text-xs font-bold px-2 py-1 rounded-full text-indigo-100">Most Popular</span>
                            </div>
                            <h4 className="text-xl font-bold mb-2">Speak to an Expert</h4>
                            <p className="text-indigo-200 text-sm mb-6 leading-relaxed">
                                Get a 15-minute strategy call with a verified F&B consultant to refine this plan.
                            </p>
                            <div className="flex items-center gap-3 text-sm text-indigo-100 mb-6">
                                <span className="flex items-center gap-1"><CheckCircle2 size={14}/> Instant Review</span>
                                <span className="flex items-center gap-1"><CheckCircle2 size={14}/> Q&A Session</span>
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-auto relative z-10 border-t border-white/10 pt-4">
                            <div>
                                <p className="text-xs text-indigo-300 font-bold uppercase">One-time Fee</p>
                                <p className="text-2xl font-bold text-white">₹99</p>
                            </div>
                            <button 
                                onClick={() => handleServicePayment('call')}
                                disabled={processingService === 'call'}
                                className="px-6 py-2.5 bg-white text-indigo-900 font-bold rounded-lg hover:bg-indigo-50 transition-colors flex items-center gap-2 disabled:opacity-70"
                            >
                                {processingService === 'call' ? <Loader2 size={16} className="animate-spin" /> : <Phone size={16} />}
                                Book Call
                            </button>
                        </div>
                        {/* Decorative Blob */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    </div>

                    {/* On-Site Option */}
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 text-white shadow-lg flex flex-col justify-between relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                                    <Building2 size={24} className="text-emerald-400" />
                                </div>
                                <span className="bg-emerald-500/30 border border-emerald-400/30 text-xs font-bold px-2 py-1 rounded-full text-emerald-100">Premium</span>
                            </div>
                            <h4 className="text-xl font-bold mb-2">On-site Implementation</h4>
                            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                                Our specialists will visit your location to execute this strategy, train staff, and setup campaigns.
                            </p>
                            <div className="flex items-center gap-3 text-sm text-slate-300 mb-6">
                                <span className="flex items-center gap-1"><CheckCircle2 size={14}/> Full Execution</span>
                                <span className="flex items-center gap-1"><CheckCircle2 size={14}/> Weekly Reports</span>
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-auto relative z-10 border-t border-white/10 pt-4">
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase">Starting At</p>
                                <p className="text-2xl font-bold text-white">₹5,000</p>
                            </div>
                            <button 
                                onClick={() => handleServicePayment('onsite')}
                                disabled={processingService === 'onsite'}
                                className="px-6 py-2.5 bg-emerald-500 text-white font-bold rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2 disabled:opacity-70"
                            >
                                {processingService === 'onsite' ? <Loader2 size={16} className="animate-spin" /> : <Briefcase size={16} />}
                                Book Visit
                            </button>
                        </div>
                    </div>
                </div>
            </div>

          </div>
        )}
      </div>
      
      {/* Input Area */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="max-w-4xl mx-auto relative">
              <input 
                type="text" 
                value={query} 
                onChange={(e) => setQuery(e.target.value)} 
                placeholder="Ask a custom strategic question about your business..."
                className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white placeholder-slate-400"
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <button onClick={() => handleSend()} className="absolute right-2 top-2 p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                  <Send size={18} />
              </button>
          </div>
      </div>
    </div>
  );
};
