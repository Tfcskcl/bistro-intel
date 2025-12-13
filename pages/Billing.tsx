
import React, { useState, useEffect } from 'react';
import { PlanType, User, PlanConfig } from '../types';
import { Check, Star, Loader2, ShieldCheck, Zap, AlertCircle, X, CreditCard, Calendar, Clock, FileText, Download, Wallet, Plus, ArrowRight } from 'lucide-react';
import { paymentService } from '../services/paymentService';
import { trackingService } from '../services/trackingService';
import { storageService } from '../services/storageService';
import { authService } from '../services/authService';
import { RECHARGE_RATE, MIN_RECHARGE_CREDITS } from '../constants';

interface BillingProps {
    user: User;
}

const PLAN_HIERARCHY: Record<PlanType, number> = {
    [PlanType.FREE]: 0,
    [PlanType.BASIC]: 1,
    [PlanType.GROWTH]: 2,
    [PlanType.PRO]: 3,
    [PlanType.PRO_PLUS]: 4
};

export const Billing: React.FC<BillingProps> = ({ user }) => {
  const [processingPlan, setProcessingPlan] = useState<PlanType | null>(null);
  const [isQuarterly, setIsQuarterly] = useState(false);
  const [currentPlans, setCurrentPlans] = useState<Record<PlanType, PlanConfig> | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);

  // Recharge State
  const [rechargeAmount, setRechargeAmount] = useState<number>(MIN_RECHARGE_CREDITS);
  const [processingRecharge, setProcessingRecharge] = useState(false);

  // Downgrade Modal State
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [targetDowngradePlan, setTargetDowngradePlan] = useState<PlanType | null>(null);
  const [downgradeReason, setDowngradeReason] = useState('');

  useEffect(() => {
    setCurrentPlans(storageService.getPlans());
    setInvoices(storageService.getInvoices(user.id));
  }, [user.id]);

  useEffect(() => {
    trackingService.trackCheckoutStart(user);
  }, [user]);

  const handlePlanAction = async (targetPlan: PlanType, price: number) => {
      const currentLevel = PLAN_HIERARCHY[user.plan];
      const targetLevel = PLAN_HIERARCHY[targetPlan];
      const isUpgrade = user.isTrial || targetLevel > currentLevel;

      if (isUpgrade) {
          setProcessingPlan(targetPlan);
          await paymentService.initiatePayment(
              user,
              targetPlan,
              price,
              async (paymentId) => {
                  console.log(`Payment success: ${paymentId}`);
                  storageService.addInvoice(user.id, {
                      id: paymentId,
                      date: new Date().toISOString(),
                      amount: price,
                      plan: targetPlan,
                      status: 'Paid',
                      period: isQuarterly ? 'Quarterly' : 'Monthly'
                  });
                  
                  // Reset credits to new plan limit
                  const newPlanCredits = currentPlans ? currentPlans[targetPlan].monthlyCredits : 0;
                  storageService.saveUserCredits(user.id, newPlanCredits);

                  // Update User State
                  await authService.updateUser({ ...user, plan: targetPlan, credits: newPlanCredits });

                  setInvoices(storageService.getInvoices(user.id));
                  setProcessingPlan(null);
                  alert(`Successfully upgraded to ${currentPlans?.[targetPlan].name}!`);
              },
              (error) => {
                  if (error !== "Payment process cancelled") {
                      alert(error);
                  }
                  setProcessingPlan(null);
              }
          );
      } else {
          setTargetDowngradePlan(targetPlan);
          setDowngradeReason('');
          setShowDowngradeModal(true);
      }
  };

  const confirmDowngrade = async () => {
      if (targetDowngradePlan && currentPlans) {
          console.log(`User ${user.id} downgraded to ${targetDowngradePlan}. Reason: ${downgradeReason}`);
          const newPlanCredits = currentPlans[targetDowngradePlan].monthlyCredits;
          
          storageService.saveUserCredits(user.id, newPlanCredits);
          await authService.updateUser({ ...user, plan: targetDowngradePlan, credits: newPlanCredits });
          
          setShowDowngradeModal(false);
          setTargetDowngradePlan(null);
          alert(`Plan changed to ${currentPlans[targetDowngradePlan].name}.`);
      }
  };

  const handleRecharge = async () => {
      if (rechargeAmount < MIN_RECHARGE_CREDITS) return;
      const cost = rechargeAmount * RECHARGE_RATE;
      setProcessingRecharge(true);

      await paymentService.initiatePayment(
          user,
          user.plan, // Current plan context
          cost,
          async (paymentId) => {
              // Add credits locally
              storageService.addCredits(user.id, rechargeAmount, `Wallet Recharge: ${rechargeAmount} Credits`);
              
              // Record Invoice
              storageService.addInvoice(user.id, {
                  id: paymentId,
                  date: new Date().toISOString(),
                  amount: cost,
                  plan: 'Credit Top-up',
                  status: 'Paid',
                  period: 'One-time'
              });

              setInvoices(storageService.getInvoices(user.id));
              
              // Update User Context to reflect new balance immediately
              const newBalance = user.credits + rechargeAmount;
              await authService.updateUser({ ...user, credits: newBalance });
              
              setProcessingRecharge(false);
              alert("Credits added successfully!");
          },
          (error) => {
              if (error !== "Payment process cancelled") alert(error);
              setProcessingRecharge(false);
          }
      );
  };

  const nextBillingDate = new Date();
  nextBillingDate.setDate(nextBillingDate.getDate() + 30);

  if (!currentPlans) return <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center h-full gap-2"><Loader2 className="animate-spin" /> Loading billing...</div>;

  return (
    <div className="space-y-8 animate-fade-in relative pb-16">
        
        {showDowngradeModal && targetDowngradePlan && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-in">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full text-amber-600 dark:text-amber-400">
                                <AlertCircle size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Confirm Downgrade</h3>
                        </div>
                        <button onClick={() => setShowDowngradeModal(false)} className="text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                        You are downgrading to <strong>{currentPlans[targetDowngradePlan].name}</strong>. 
                        Your monthly credit limit will be reset to {currentPlans[targetDowngradePlan].monthlyCredits} credits.
                    </p>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2">Reason for downgrading</label>
                    <textarea 
                        value={downgradeReason}
                        onChange={(e) => setDowngradeReason(e.target.value)}
                        placeholder="Feedback helps us improve..."
                        className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none mb-6 h-24 resize-none dark:text-white"
                    />
                    <div className="flex gap-3">
                        <button onClick={() => setShowDowngradeModal(false)} className="flex-1 py-2 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
                        <button onClick={confirmDowngrade} disabled={!downgradeReason.trim()} className="flex-1 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-lg hover:opacity-90 disabled:opacity-50 transition-colors">Confirm</button>
                    </div>
                </div>
            </div>
        )}

        <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Billing & Subscription</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2">Manage your plan, top up credits, and view transaction history.</p>
            
            {/* Credit Wallet Banner */}
            <div className="mt-8 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/10 border border-emerald-200 dark:border-emerald-700/50 rounded-2xl p-6 shadow-sm inline-block w-full max-w-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Wallet size={120} className="text-emerald-900 dark:text-emerald-400" />
                </div>
                
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                        <div className="text-left">
                            <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-1">Available Balance</p>
                            <span className="text-4xl font-black text-emerald-900 dark:text-white tracking-tight">{user.credits} <span className="text-lg font-bold text-emerald-600/70">CR</span></span>
                        </div>
                        <div className="bg-white/50 dark:bg-black/20 backdrop-blur-sm p-2 rounded-lg border border-emerald-100 dark:border-emerald-800/30">
                            <Zap size={24} className="text-emerald-500" />
                        </div>
                    </div>
                    
                    <div className="bg-white dark:bg-slate-900 p-1.5 rounded-xl flex items-center shadow-sm border border-emerald-100 dark:border-slate-700">
                        <div className="flex-1 relative">
                            <input 
                                type="number" 
                                min={MIN_RECHARGE_CREDITS}
                                value={rechargeAmount}
                                onChange={(e) => setRechargeAmount(Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-full pl-4 pr-12 py-2 bg-transparent border-none focus:ring-0 outline-none text-slate-900 dark:text-white font-bold text-lg"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">CREDITS</span>
                        </div>
                        <button 
                            onClick={handleRecharge}
                            disabled={rechargeAmount < MIN_RECHARGE_CREDITS || processingRecharge}
                            className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {processingRecharge ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                            Top Up ₹{rechargeAmount * RECHARGE_RATE}
                        </button>
                    </div>
                    <p className="text-[10px] text-emerald-700/70 dark:text-emerald-400/60 mt-2 text-center font-medium">
                        Min. Recharge: {MIN_RECHARGE_CREDITS} CR • 1 Credit = ₹{RECHARGE_RATE}
                    </p>
                </div>
            </div>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4 mt-10 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-full inline-flex border border-slate-200 dark:border-slate-700">
                <button 
                    onClick={() => setIsQuarterly(false)}
                    className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${!isQuarterly ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                >
                    Monthly
                </button>
                <button 
                    onClick={() => setIsQuarterly(true)}
                    className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${isQuarterly ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                >
                    Quarterly <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 rounded dark:bg-emerald-900 dark:text-emerald-300">-10%</span>
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto mt-8">
            {(Object.entries(currentPlans) as [string, PlanConfig][]).map(([key, plan]) => {
                const planType = key as PlanType;
                // Hide Free plan from upgrade list if user is already paid, but keep logic generic
                if (planType === PlanType.FREE && user.plan !== PlanType.FREE) return null;

                const isCurrent = !user.isTrial && user.plan === planType;
                const isPopular = planType === PlanType.GROWTH;
                const displayPrice = isQuarterly ? plan.quarterlyPrice : plan.price;

                return (
                    <div key={key} className={`relative flex flex-col p-6 rounded-2xl bg-white dark:bg-slate-900 border transition-all duration-300 ${
                        isCurrent ? 'border-emerald-500 ring-2 ring-emerald-500/20 z-10' : 
                        isPopular ? 'border-yellow-400 shadow-xl scale-105 z-10' : 'border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md'
                    }`}>
                        {isPopular && (
                            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-yellow-400 text-slate-900 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 shadow-sm">
                                <Star size={10} fill="currentColor" /> Best Value
                            </div>
                        )}
                        
                        <div className="mb-6 text-center">
                            <h3 className={`text-lg font-bold ${planType === PlanType.PRO_PLUS ? 'text-purple-600 dark:text-purple-400' : 'text-slate-800 dark:text-white'}`}>{plan.name}</h3>
                            <div className="mt-4 flex items-baseline justify-center">
                                <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">₹{displayPrice.toLocaleString()}</span>
                                <span className="ml-1 text-xs font-medium text-slate-500 dark:text-slate-400">/{isQuarterly ? 'qtr' : 'mo'}</span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 min-h-[32px] leading-relaxed px-2">
                                {plan.description}
                            </p>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 mb-6">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Monthly Allowance</span>
                                <span className="text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full">{plan.monthlyCredits} CR</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, (plan.monthlyCredits / 15000) * 100)}%` }}></div>
                            </div>
                        </div>

                        <ul className="flex-1 space-y-3 mb-8 px-1">
                            {plan.features.map((feature, i) => (
                                <li key={i} className="flex items-start">
                                    <div className="p-0.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-full mr-2 shrink-0 mt-0.5">
                                        <Check className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <span className="text-xs text-slate-600 dark:text-slate-300 leading-snug">{feature}</span>
                                </li>
                            ))}
                        </ul>

                        <button
                            onClick={() => handlePlanAction(planType, displayPrice)}
                            disabled={isCurrent || processingPlan === planType}
                            className={`w-full py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm ${
                                isCurrent 
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-default border border-transparent'
                                : planType === PlanType.GROWTH 
                                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:shadow-lg hover:scale-[1.02]'
                                    : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-2 border-slate-200 dark:border-slate-700 hover:border-slate-900 dark:hover:border-slate-500'
                            }`}
                        >
                            {processingPlan === planType ? <Loader2 className="animate-spin" size={16} /> : isCurrent ? 'Current Plan' : (user.plan === PlanType.FREE ? 'Upgrade' : 'Switch')}
                        </button>
                    </div>
                );
            })}
        </div>

        {/* Billing Management */}
        <div className="max-w-6xl mx-auto mt-16 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                    <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <CreditCard size={20} className="text-emerald-500" /> Payment Methods
                    </h3>
                    <div className="flex items-center gap-3 p-3 border border-emerald-500/30 rounded-xl bg-emerald-50/20">
                        <div className="w-12 h-9 bg-slate-800 rounded flex items-center justify-center text-white text-[10px] font-bold shadow-sm">CARD</div>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Razorpay Secure</p>
                            <p className="text-xs text-slate-500">Default Gateway</p>
                        </div>
                        <ShieldCheck size={18} className="text-emerald-600" />
                    </div>
                </div>
                
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                    <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <Calendar size={20} className="text-blue-500" /> Subscription Renewal
                    </h3>
                    <div className="flex justify-between items-end mb-2">
                        <p className="text-sm text-slate-500 dark:text-slate-400">Next billing date</p>
                        <p className="font-bold text-slate-800 dark:text-white">{nextBillingDate.toLocaleDateString()}</p>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mb-3">
                        <div className="bg-blue-500 h-1.5 rounded-full w-[25%]"></div>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">Your credits will reset to your plan limit on this date. Unused credits do not roll over.</p>
                </div>
            </div>

            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Clock size={20} className="text-slate-400" /> Transaction History
                    </h3>
                    <button className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center gap-1 transition-colors">
                        <Download size={14} /> Export CSV
                    </button>
                </div>
                
                {invoices.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-slate-400 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                        <FileText size={40} className="mx-auto mb-3 opacity-20" />
                        <p className="text-sm font-medium">No transactions yet.</p>
                        <p className="text-xs opacity-70">Your payment history will appear here.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 uppercase text-[10px] font-bold tracking-wider">
                                <tr>
                                    <th className="px-4 py-3 rounded-l-lg">Date</th>
                                    <th className="px-4 py-3">Description</th>
                                    <th className="px-4 py-3">Amount</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 rounded-r-lg text-right">Invoice</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                {invoices.map((inv, i) => (
                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                        <td className="px-4 py-3.5 font-medium text-slate-800 dark:text-white whitespace-nowrap">
                                            {new Date(inv.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                                            {inv.plan} <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded ml-1 uppercase">{inv.period}</span>
                                        </td>
                                        <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white font-mono">
                                            ₹{inv.amount.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">
                                                <Check size={8} strokeWidth={4} /> {inv.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 text-right">
                                            <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                                <ArrowRight size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
        
        <div className="max-w-md mx-auto mt-12 flex items-center justify-center gap-2 text-slate-400 text-xs text-center leading-relaxed">
            <ShieldCheck size={14} className="shrink-0" />
            <span>Secure payments powered by <strong>Razorpay</strong>. <br/>256-bit SSL Encrypted Connection.</span>
        </div>
    </div>
  );
};
