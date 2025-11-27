


import React, { useState, useEffect } from 'react';
import { PlanType, User, PlanConfig } from '../types';
import { Check, Star, Loader2, ShieldCheck, Zap, ArrowDown, ArrowUp, AlertCircle, X, CreditCard, Calendar, Clock, FileText, Download, Smartphone, CheckCircle2, Wallet, Plus } from 'lucide-react';
import { paymentService } from '../services/paymentService';
import { trackingService } from '../services/trackingService';
import { storageService } from '../services/storageService';
import { RECHARGE_RATE, MIN_RECHARGE_CREDITS } from '../constants';

interface BillingProps {
    user: User;
    onUpgrade: (plan: PlanType) => void;
}

const PLAN_HIERARCHY: Record<PlanType, number> = {
    [PlanType.FREE]: 0,
    [PlanType.PRO]: 1,
    [PlanType.PRO_PLUS]: 2
};

export const Billing: React.FC<BillingProps> = ({ user, onUpgrade }) => {
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
              (paymentId) => {
                  console.log(`Payment success: ${paymentId}`);
                  storageService.addInvoice(user.id, {
                      id: paymentId,
                      date: new Date().toISOString(),
                      amount: price,
                      plan: targetPlan,
                      status: 'Paid',
                      period: isQuarterly ? 'Quarterly' : 'Monthly'
                  });
                  
                  // When upgrading, also refresh credits based on new plan (optional, or just handle in onUpgrade prop logic upstream)
                  // For now, assume backend/service handles credit reset on plan change
                  const newPlanCredits = currentPlans ? currentPlans[targetPlan].monthlyCredits : 0;
                  storageService.saveUserCredits(user.id, newPlanCredits);

                  setInvoices(storageService.getInvoices(user.id));
                  onUpgrade(targetPlan);
                  setProcessingPlan(null);
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

  const confirmDowngrade = () => {
      if (targetDowngradePlan) {
          console.log(`User ${user.id} downgraded to ${targetDowngradePlan}. Reason: ${downgradeReason}`);
          const newPlanCredits = currentPlans ? currentPlans[targetDowngradePlan].monthlyCredits : 25;
          storageService.saveUserCredits(user.id, newPlanCredits); // Reset to lower tier limit
          onUpgrade(targetDowngradePlan);
          setShowDowngradeModal(false);
          setTargetDowngradePlan(null);
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
          (paymentId) => {
              storageService.addCredits(user.id, rechargeAmount, `Wallet Recharge: ${rechargeAmount} Credits`);
              storageService.addInvoice(user.id, {
                  id: paymentId,
                  date: new Date().toISOString(),
                  amount: cost,
                  plan: 'Credit Top-up',
                  status: 'Paid',
                  period: 'One-time'
              });
              setInvoices(storageService.getInvoices(user.id));
              // Force update local user state if possible via prop or reload, but dashboard will reflect
              window.location.reload(); // Simple reload to refresh credits everywhere
          },
          (error) => {
              if (error !== "Payment process cancelled") alert(error);
              setProcessingRecharge(false);
          }
      );
  };

  const nextBillingDate = new Date();
  nextBillingDate.setDate(nextBillingDate.getDate() + 30);

  if (!currentPlans) return <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-2"><Loader2 className="animate-spin" /> Loading billing...</div>;

  return (
    <div className="space-y-8 animate-fade-in relative pb-16">
        
        {showDowngradeModal && (
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
                        You are downgrading to <strong>{currentPlans[targetDowngradePlan!].name}</strong>. 
                        Your credit limit will be reset to {currentPlans[targetDowngradePlan!].monthlyCredits} credits.
                    </p>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2">Reason for downgrading</label>
                    <textarea 
                        value={downgradeReason}
                        onChange={(e) => setDowngradeReason(e.target.value)}
                        placeholder="Feedback helps us improve..."
                        className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none mb-6 h-24 resize-none"
                    />
                    <div className="flex gap-3">
                        <button onClick={() => setShowDowngradeModal(false)} className="flex-1 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg">Cancel</button>
                        <button onClick={confirmDowngrade} disabled={!downgradeReason.trim()} className="flex-1 py-2 bg-slate-900 text-white font-bold rounded-lg hover:opacity-90 disabled:opacity-50">Confirm</button>
                    </div>
                </div>
            </div>
        )}

        <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Plans & Credits</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2">Flexible plans with credit-based usage. Top up anytime.</p>
            
            {/* Credit Wallet Banner */}
            <div className="mt-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-6 inline-block w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 font-bold">
                        <Wallet size={20} /> Your Wallet
                    </div>
                    <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{user.credits} CR</span>
                </div>
                
                <div className="flex items-end gap-2">
                    <div className="flex-1 text-left">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Add Credits (Min {MIN_RECHARGE_CREDITS})</label>
                        <div className="relative">
                            <input 
                                type="number" 
                                min={MIN_RECHARGE_CREDITS}
                                value={rechargeAmount}
                                onChange={(e) => setRechargeAmount(Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-full pl-3 pr-12 py-2 rounded-lg border border-emerald-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                            />
                            <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">CR</span>
                        </div>
                    </div>
                    <button 
                        onClick={handleRecharge}
                        disabled={rechargeAmount < MIN_RECHARGE_CREDITS || processingRecharge}
                        className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors h-[42px] flex items-center gap-2"
                    >
                        {processingRecharge ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                        Pay ₹{rechargeAmount * RECHARGE_RATE}
                    </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 text-left">1 Credit = ₹{RECHARGE_RATE}. Used for Recipes, SOPs, and Strategy.</p>
            </div>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-3 mt-8">
                <span className={`text-sm font-bold ${!isQuarterly ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>Monthly</span>
                <button 
                    onClick={() => setIsQuarterly(!isQuarterly)}
                    className="w-12 h-6 bg-emerald-600 rounded-full relative transition-colors focus:outline-none"
                >
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-200 ${isQuarterly ? 'left-7' : 'left-1'}`}></div>
                </button>
                <span className={`text-sm font-bold ${isQuarterly ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>Quarterly</span>
                <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">Save ~10%</span>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {(Object.entries(currentPlans) as [string, PlanConfig][]).map(([key, plan]) => {
                const planType = key as PlanType;
                const isCurrent = !user.isTrial && user.plan === planType;
                const isPopular = planType === PlanType.PRO;
                const displayPrice = isQuarterly ? plan.quarterlyPrice : plan.price;

                return (
                    <div key={key} className={`relative flex flex-col p-8 rounded-2xl bg-white dark:bg-slate-900 border transition-colors ${
                        isCurrent ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 
                        isPopular ? 'border-yellow-400 shadow-xl' : 'border-slate-200 dark:border-slate-800 shadow-sm'
                    }`}>
                        {isPopular && (
                            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-yellow-400 text-slate-900 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                                <Star size={12} fill="currentColor" /> Most Popular
                            </div>
                        )}
                        
                        <div className="mb-6">
                            <h3 className={`text-lg font-bold ${planType === PlanType.PRO_PLUS ? 'text-purple-600 dark:text-purple-400' : 'text-slate-800 dark:text-slate-200'}`}>{plan.name}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 min-h-[40px] leading-relaxed">
                                {plan.description}
                            </p>
                            <div className="mt-4 flex items-baseline">
                                <span className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">₹{displayPrice.toLocaleString()}</span>
                                <span className="ml-1 text-sm font-medium text-slate-500 dark:text-slate-400">/{isQuarterly ? 'qtr' : 'mo'}</span>
                            </div>
                            <div className="mt-2 bg-slate-100 dark:bg-slate-800 rounded-lg py-1 px-3 inline-block">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{plan.monthlyCredits} Credits / Month</span>
                            </div>
                        </div>

                        <ul className="flex-1 space-y-4 mb-8">
                            {plan.features.map((feature, i) => (
                                <li key={i} className="flex items-start">
                                    <Check className="h-5 w-5 text-emerald-500 shrink-0 mr-3" />
                                    <span className="text-sm text-slate-600 dark:text-slate-300">{feature}</span>
                                </li>
                            ))}
                        </ul>

                        <button
                            onClick={() => handlePlanAction(planType, displayPrice)}
                            disabled={isCurrent || processingPlan === planType}
                            className={`w-full py-3 px-4 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
                                isCurrent 
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-default'
                                : planType === PlanType.PRO 
                                    ? 'bg-slate-900 dark:bg-emerald-600 text-white hover:bg-slate-800 shadow-lg'
                                    : 'bg-white dark:bg-slate-900 text-slate-900 border-2 border-slate-200 hover:border-slate-900'
                            }`}
                        >
                            {processingPlan === planType ? <Loader2 className="animate-spin" size={18} /> : isCurrent ? 'Current Plan' : 'Switch Plan'}
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
                    <div className="flex items-center gap-3 p-3 border border-emerald-500/50 rounded-lg bg-emerald-50/10">
                        <div className="w-10 h-8 bg-slate-800 rounded flex items-center justify-center text-white text-[10px] font-bold shadow-sm">CARD</div>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Default Method</p>
                            <p className="text-xs text-slate-500">Via Razorpay</p>
                        </div>
                        <CheckCircle2 size={16} className="text-emerald-600" />
                    </div>
                </div>
                
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                    <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <Calendar size={20} className="text-blue-500" /> Renewal
                    </h3>
                    <div className="flex justify-between items-end mb-2">
                        <p className="text-sm text-slate-500">Next billing date</p>
                        <p className="font-bold text-slate-800 dark:text-white">{nextBillingDate.toLocaleDateString()}</p>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mb-4">
                        <div className="bg-blue-500 h-2 rounded-full w-[25%]"></div>
                    </div>
                    <p className="text-xs text-slate-400">Credits reset on renewal.</p>
                </div>
            </div>

            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Clock size={20} className="text-slate-400" /> Transaction History
                    </h3>
                    <button className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                        <Download size={12} /> Download All
                    </button>
                </div>
                
                {invoices.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                        <FileText size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No transactions yet.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 uppercase text-xs font-bold">
                                <tr>
                                    <th className="px-4 py-3 rounded-l-lg">Date</th>
                                    <th className="px-4 py-3">Description</th>
                                    <th className="px-4 py-3">Amount</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 rounded-r-lg text-right">Invoice</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {invoices.map((inv, i) => (
                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">
                                            {new Date(inv.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                                            {inv.plan} <span className="text-xs text-slate-400">({inv.period})</span>
                                        </td>
                                        <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">
                                            ₹{inv.amount.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                                                <Check size={10} /> {inv.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors">
                                                <Download size={14} />
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
        
        <div className="max-w-md mx-auto mt-8 flex items-center justify-center gap-2 text-slate-400 text-xs">
            <ShieldCheck size={14} />
            <span>Secure payments powered by Razorpay. 256-bit SSL Encrypted.</span>
        </div>
    </div>
  );
};