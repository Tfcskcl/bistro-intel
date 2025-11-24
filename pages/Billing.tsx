
import React, { useState } from 'react';
import { PLANS } from '../constants';
import { PlanType, User } from '../types';
import { Check, Star, Loader2, ShieldCheck } from 'lucide-react';
import { paymentService } from '../services/paymentService';

interface BillingProps {
    user: User;
    onUpgrade: (plan: PlanType) => void;
}

export const Billing: React.FC<BillingProps> = ({ user, onUpgrade }) => {
  const [processingPlan, setProcessingPlan] = useState<PlanType | null>(null);

  const handleUpgradeClick = async (planType: PlanType, price: number) => {
      setProcessingPlan(planType);

      await paymentService.initiatePayment(
          user,
          planType,
          price,
          (paymentId) => {
              // Success Callback
              console.log(`Payment success: ${paymentId}`);
              onUpgrade(planType);
              setProcessingPlan(null);
          },
          (error) => {
              // Failure Callback
              alert(error);
              setProcessingPlan(null);
          }
      );
  };

  return (
    <div className="space-y-8 animate-fade-in">
        <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-900">Choose your Intelligence Plan</h2>
            <p className="text-slate-500 mt-2">Scale your operations with AI-powered insights. Secure payment via Razorpay.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {Object.entries(PLANS).map(([key, plan]) => {
                const planType = key as PlanType;
                const isCurrent = user.plan === planType;
                const isPopular = planType === PlanType.PRO;
                const isProcessing = processingPlan === planType;

                return (
                    <div key={key} className={`relative flex flex-col p-8 rounded-2xl bg-white border ${
                        isCurrent ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 
                        isPopular ? 'border-yellow-400 shadow-xl' : 'border-slate-200 shadow-sm'
                    }`}>
                        {isPopular && (
                            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-yellow-400 text-slate-900 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                                <Star size={12} fill="currentColor" /> Most Popular
                            </div>
                        )}
                        
                        <div className="mb-6">
                            <h3 className={`text-lg font-bold ${planType === PlanType.PRO_PLUS ? 'text-purple-600' : 'text-slate-800'}`}>{plan.name}</h3>
                            <div className="mt-4 flex items-baseline">
                                <span className="text-4xl font-bold tracking-tight text-slate-900">₹{plan.price}</span>
                                <span className="ml-1 text-sm font-medium text-slate-500">/mo</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">+ Taxes applicable</p>
                        </div>

                        <ul className="flex-1 space-y-4 mb-8">
                            {plan.features.map((feature, i) => (
                                <li key={i} className="flex items-start">
                                    <Check className="h-5 w-5 text-emerald-500 shrink-0 mr-3" />
                                    <span className="text-sm text-slate-600">{feature}</span>
                                </li>
                            ))}
                        </ul>

                        <button
                            onClick={() => handleUpgradeClick(planType, plan.price)}
                            disabled={isCurrent || isProcessing}
                            className={`w-full py-3 px-4 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
                                isCurrent 
                                ? 'bg-slate-100 text-slate-400 cursor-default'
                                : planType === PlanType.PRO 
                                    ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg hover:shadow-xl'
                                    : 'bg-white text-slate-900 border-2 border-slate-200 hover:border-slate-900'
                            }`}
                        >
                            {isProcessing ? (
                                <><Loader2 className="animate-spin" size={18} /> Processing...</>
                            ) : isCurrent ? (
                                'Current Plan'
                            ) : (
                                'Upgrade Now'
                            )}
                        </button>
                    </div>
                );
            })}
        </div>
        
        <div className="max-w-md mx-auto mt-8 flex items-center justify-center gap-2 text-slate-400 text-xs">
            <ShieldCheck size={14} />
            <span>Secure payments powered by Razorpay. 256-bit SSL Encrypted.</span>
        </div>
    </div>
  );
};
