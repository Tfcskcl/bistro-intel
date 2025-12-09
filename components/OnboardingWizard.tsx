
import React, { useState } from 'react';
import { CheckCircle2, ArrowRight } from 'lucide-react';

const PHASES = [
    { title: 'Business Profile', desc: 'Tell us about your restaurant.' },
    { title: 'Kitchen Setup', desc: 'Define floorplan and zones.' },
    { title: 'CCTV Integration', desc: 'Connect cameras for AI tracking.' },
    { title: 'Menu Import', desc: 'Upload your menu to generate recipes.' },
    { title: 'Inventory Setup', desc: 'Connect suppliers and stock.' },
    { title: 'POS Sync', desc: 'Link your billing system.' },
    { title: 'Go Live', desc: 'Review and launch.' }
];

export default function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
    const [step, setStep] = useState(0);

    const handleNext = () => {
        if (step < PHASES.length - 1) setStep(step + 1);
        else onComplete();
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white max-w-2xl w-full rounded-2xl shadow-xl p-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-900">Restaurant OS Setup</h1>
                    <p className="text-slate-500">Step {step + 1} of {PHASES.length}: {PHASES[step].title}</p>
                    <div className="w-full h-2 bg-slate-100 rounded-full mt-4">
                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${((step + 1) / PHASES.length) * 100}%` }}></div>
                    </div>
                </div>

                <div className="py-12 text-center border-y border-slate-100">
                    <h2 className="text-xl font-bold mb-2">{PHASES[step].title}</h2>
                    <p className="text-slate-500 mb-6">{PHASES[step].desc}</p>
                    {/* Placeholder for complex form inputs per phase */}
                    <div className="p-4 bg-slate-50 rounded border border-slate-200 inline-block text-sm text-slate-400">
                        Form content for {PHASES[step].title} would go here.
                    </div>
                </div>

                <div className="mt-8 flex justify-between">
                    <button disabled={step === 0} onClick={() => setStep(step - 1)} className="px-6 py-2 text-slate-500 font-bold disabled:opacity-50">Back</button>
                    <button onClick={handleNext} className="px-8 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 flex items-center gap-2">
                        {step === PHASES.length - 1 ? 'Finish Setup' : 'Next Step'} <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
