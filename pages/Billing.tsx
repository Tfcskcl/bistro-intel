
import React, { useState, useEffect } from 'react';
import { PlanType, User, PlanConfig } from '../types';
import { Check, Star, Loader2, ShieldCheck, Zap, ArrowDown, ArrowUp, AlertCircle, X, CreditCard, Calendar, Clock, FileText, Download, Smartphone, CheckCircle2 } from 'lucide-react';
import { paymentService } from '../services/paymentService';
import { trackingService } from '../services/trackingService';
import { storageService } from '../services/storageService';

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

  // Downgrade Modal State
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [targetDowngradePlan, setTargetDowngradePlan] = useState<PlanType | null>(null);
  const [downgradeReason, setDowngradeReason] = useState('');

  useEffect(() => {
    // Load dynamic plans & invoices
    setCurrentPlans(storageService.getPlans());
    setInvoices(storageService.getInvoices(user.id));
  }, [user.id]);

  // Track that user started checkout process (entered billing page)
  useEffect(() => {
    trackingService.trackCheckoutStart(user);
  }, [user]);

  const handlePlanAction = async (targetPlan: PlanType, price: number) => {
      const currentLevel = PLAN_HIERARCHY[user.plan];
      const targetLevel = PLAN_HIERARCHY[targetPlan];

      // If User is on Trial, any paid plan is an upgrade
      const isUpgrade = user.isTrial || targetLevel > currentLevel;

      if (isUpgrade) {
          // --- UPGRADE FLOW ---
          setProcessingPlan(targetPlan);
          await paymentService.initiatePayment(
              user,
              targetPlan,
              price,
              (paymentId) => {
                  console.log(`Payment success: ${paymentId}`);
                  // Create Invoice Record
                  storageService.addInvoice(user.id, {
                      id: paymentId,
                      date: new Date().toISOString(),
                      amount: price,
                      plan: targetPlan,
                      status: 'Paid',
                      period: isQuarterly ? 'Quarterly' : 'Monthly'
                  });
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
          // --- DOWNGRADE FLOW ---
          setTargetDowngradePlan(targetPlan);
          setDowngradeReason('');
          setShowDowngradeModal(true);
      }
  };

  const confirmDowngrade = () => {
      if (targetDowngradePlan) {
          // Log reason (in a real app, send to backend)
          console.log(`User ${user.id} downgraded to ${targetDowngradePlan}. Reason: ${downgradeReason}`);
          
          // Process the change
          onUpgrade(targetDowngradePlan);
          
          // Reset UI
          setShowDowngradeModal(false);
          setTargetDowngradePlan(null);
      }
  };

  // Mock Date for Next Billing
  const nextBillingDate = new Date();
  nextBillingDate.setDate(nextBillingDate.getDate() + 30);

  if (!currentPlans) return <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-2"><Loader2 className="animate-spin" /> Loading billing...</div>;

  return (
    <div className="space-y-8 animate-fade-in relative pb-16">
        
        {/* Downgrade Reason Modal */}
        {showDowngradeModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-in">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full text-amber-600 dark:text-amber-400">
                                <AlertCircle size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">We're sorry to see you go</h3>
                        </div>
                        <button onClick={() => setShowDowngradeModal(false)} className="text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>
                    </div>
                    
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                        You are downgrading to the <strong>{currentPlans[targetDowngradePlan!].name}</strong> plan. 
                        You will lose access to premium features immediately.
                    </p>

                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2">
                        Could you tell us why you are downgrading?
                    </label>
                    <textarea 
                        value={downgradeReason}
                        onChange={(e) => setDowngradeReason(e.target.value)}
                        placeholder="Too expensive, missing features, not using enough..."
                        className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none mb-6 h-24 resize-none"
                    />

                    <div className="flex gap-3">
                        <button 
                            onClick={() => setShowDowngradeModal(false)}
                            className="flex-1 py-2 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={confirmDowngrade}
                            disabled={!downgradeReason.trim()}
                            className="flex-1 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Confirm Downgrade
                        </button>
                    </div>
                </div>
            </div>
        )}

        <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Choose your Intelligence Plan</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2">Scale your operations with AI-powered insights. Secure payment via Razorpay.</p>
            
            {/* Trial Status Banner */}
            {user.isTrial && (
                <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 inline-block">
                    <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-400 font-bold">
                        <Zap size={18} fill="currentColor" />
                        Free Demo Active
                    </div>
                    <p className="text-sm text-yellow-700 dark:text-yellow-500 mt-1">
                        {user.queriesUsed || 0} / {user.queryLimit || 10} AI Queries Used
                    </p>
                </div>
            )}

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
                const isProcessing = processingPlan === planType;
                
                // Rank Logic
                const currentLevel = PLAN_HIERARCHY[user.plan];
                const thisLevel = PLAN_HIERARCHY[planType];
                const isUpgrade = user.isTrial || thisLevel > currentLevel;
                const isDowngrade = !user.isTrial && thisLevel < currentLevel;

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
                            <p className="text-xs text-slate-400 mt-1">+ Taxes applicable</p>
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
                            disabled={isCurrent || isProcessing}
                            className={`w-full py-3 px-4 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
                                isCurrent 
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-default'
                                : isDowngrade
                                    ? 'bg-white dark:bg-slate-900 text-slate-500 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-400 hover:text-slate-700'
                                    : planType === PlanType.PRO 
                                        ? 'bg-slate-900 dark:bg-emerald-600 text-white hover:bg-slate-800 dark:hover:bg-emerald-700 shadow-lg hover:shadow-xl'
                                        : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-2 border-slate-200 dark:border-slate-700 hover:border-slate-900 dark:hover:border-slate-500'
                            }`}
                        >
                            {isProcessing ? (
                                <><Loader2 className="animate-spin" size={18} /> Processing...</>
                            ) : isCurrent ? (
                                'Current Plan'
                            ) : isDowngrade ? (
                                <><ArrowDown size={16} /> Downgrade Now</>
                            ) : (
                                <><ArrowUp size={16} /> Upgrade Now</>
                            )}
                        </button>
                    </div>
                );
            })}
        </div>

        {/* Billing Management Section */}
        <div className="max-w-6xl mx-auto mt-16 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Payment Methods & Next Billing */}
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                    <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <CreditCard size={20} className="text-emerald-500" /> Payment Methods
                    </h3>
                    
                    <div className="space-y-3">
                        {/* Credit Card Option */}
                        <div className="flex items-center gap-3 p-3 border border-emerald-500/50 rounded-lg bg-emerald-50/10 relative">
                            <div className="w-10 h-8 bg-slate-800 rounded flex items-center justify-center text-white text-[10px] font-bold shadow-sm">
                                CARD
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Credit / Debit Card</p>
                                <p className="text-xs text-slate-500">Expires 12/28</p>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-white dark:bg-slate-800 px-2 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 shadow-sm">
                                <CheckCircle2 size={10} /> Active
                            </div>
                        </div>

                        {/* UPI Option */}
                        <div className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-emerald-300 transition-colors cursor-pointer bg-white dark:bg-slate-900 group">
                            <div className="w-10 h-8 bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 transition-colors">
                                <Smartphone size={16} />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">UPI</p>
                                <p className="text-xs text-slate-500">Google Pay, PhonePe, Paytm</p>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={() => alert("You can manage payment methods during checkout.")}
                        className="w-full mt-4 text-xs font-bold text-slate-500 hover:text-slate-700 border border-slate-200 dark:border-slate-700 rounded py-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        Manage Payment Methods
                    </button>
                </div>
                
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                    <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <Calendar size={20} className="text-blue-500" /> Renewal
                    </h3>
                    {user.plan === PlanType.FREE ? (
                         <div className="text-center py-4">
                             <p className="text-sm font-bold text-slate-700 dark:text-white">Free Forever</p>
                             <p className="text-xs text-slate-500 mt-1">Upgrade anytime to unlock features.</p>
                         </div>
                    ) : (
                        <>
                            <div className="flex justify-between items-end mb-2">
                                <p className="text-sm text-slate-500">Next billing date</p>
                                <p className="font-bold text-slate-800 dark:text-white">{nextBillingDate.toLocaleDateString()}</p>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mb-4">
                                <div className="bg-blue-500 h-2 rounded-full w-[25%]"></div>
                            </div>
                            <p className="text-xs text-slate-400">
                                Your payment method will be charged automatically.
                            </p>
                        </>
                    )}
                </div>
            </div>

            {/* Billing History */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Clock size={20} className="text-slate-400" /> Billing History
                    </h3>
                    <button className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                        <Download size={12} /> Download All
                    </button>
                </div>
                
                {invoices.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                        <FileText size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No invoices found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 uppercase text-xs font-bold">
                                <tr>
                                    <th className="px-4 py-3 rounded-l-lg">Date</th>
                                    <th className="px-4 py-3">Plan</th>
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
                                            {inv.plan.replace('_', ' ')} <span className="text-xs text-slate-400">({inv.period || 'Monthly'})</span>
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
