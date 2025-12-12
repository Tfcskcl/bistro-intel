import React, { useState, useRef } from 'react';
import { CheckCircle2, ArrowRight, ArrowLeft, Store, ChefHat, Camera, Upload, Server, ShoppingBag, MapPin, Users, UtensilsCrossed, Loader2 } from 'lucide-react';
import { User } from '../types';
import { authService } from '../services/authService';

const PHASES = [
    { title: 'Business Profile', desc: 'Tell us about your restaurant identity.', icon: Store },
    { title: 'Kitchen Ops', desc: 'Define your operational setup.', icon: ChefHat },
    { title: 'Tech Stack', desc: 'Connect your POS and devices.', icon: Server },
    { title: 'Menu & Stock', desc: 'Import your core data.', icon: UtensilsCrossed },
    { title: 'Review', desc: 'Confirm and launch.', icon: CheckCircle2 }
];

interface OnboardingWizardProps {
    user: User;
    onComplete: () => void;
}

export default function OnboardingWizard({ user, onComplete }: OnboardingWizardProps) {
    const [step, setStep] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    
    // Form State
    const [formData, setFormData] = useState({
        restaurantName: user.restaurantName || '',
        cuisineType: user.cuisineType || '',
        location: user.location || '',
        kitchenType: 'Commercial Kitchen', // Commercial, Cloud, Cafe, etc.
        staffCount: '5-10',
        posSystem: '',
        hasCCTV: false,
        primarySupplier: '',
        menuFile: null as File | null
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleNext = async () => {
        if (step < PHASES.length - 1) {
            setStep(step + 1);
        } else {
            // Final Step - Save and Finish
            setIsSaving(true);
            try {
                // Update user profile with collected data
                const updatedUser = {
                    ...user,
                    restaurantName: formData.restaurantName,
                    cuisineType: formData.cuisineType,
                    location: formData.location,
                    // Additional fields could be stored in a 'metadata' field if the User type supported it, 
                    // or we rely on the backend to handle extras. For now, we update the main fields.
                    setupComplete: true
                };
                
                await authService.updateUser(updatedUser);
                
                // Simulate a short delay for UX
                setTimeout(() => {
                    onComplete();
                }, 800);
            } catch (e) {
                console.error("Onboarding Save Failed", e);
                setIsSaving(false);
            }
        }
    };

    const renderStepContent = () => {
        switch (step) {
            case 0: // Business Profile
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Restaurant Name</label>
                            <div className="relative">
                                <Store className="absolute left-3 top-3 text-slate-400" size={18} />
                                <input 
                                    type="text" 
                                    value={formData.restaurantName}
                                    onChange={(e) => handleChange('restaurantName', e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                    placeholder="e.g. The Golden Spoon"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Cuisine Type</label>
                            <div className="relative">
                                <UtensilsCrossed className="absolute left-3 top-3 text-slate-400" size={18} />
                                <input 
                                    type="text" 
                                    value={formData.cuisineType}
                                    onChange={(e) => handleChange('cuisineType', e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                    placeholder="e.g. Modern Indian, Italian, Cafe"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Location</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 text-slate-400" size={18} />
                                <input 
                                    type="text" 
                                    value={formData.location}
                                    onChange={(e) => handleChange('location', e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                    placeholder="e.g. Mumbai, Indiranagar, Soho"
                                />
                            </div>
                        </div>
                    </div>
                );
            case 1: // Kitchen Ops
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Kitchen Type</label>
                            <div className="grid grid-cols-2 gap-3">
                                {['Commercial Kitchen', 'Cloud Kitchen', 'Cafe / Bistro', 'Fine Dining'].map(type => (
                                    <button
                                        key={type}
                                        onClick={() => handleChange('kitchenType', type)}
                                        className={`p-3 rounded-xl border text-sm font-bold transition-all ${
                                            formData.kitchenType === type 
                                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700' 
                                            : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300'
                                        }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Staff Size</label>
                            <div className="relative">
                                <Users className="absolute left-3 top-3 text-slate-400" size={18} />
                                <select 
                                    value={formData.staffCount}
                                    onChange={(e) => handleChange('staffCount', e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none appearance-none"
                                >
                                    <option>1-5</option>
                                    <option>5-10</option>
                                    <option>10-25</option>
                                    <option>25+</option>
                                </select>
                            </div>
                        </div>
                    </div>
                );
            case 2: // Tech Stack
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">POS System</label>
                            <div className="relative">
                                <Server className="absolute left-3 top-3 text-slate-400" size={18} />
                                <select 
                                    value={formData.posSystem}
                                    onChange={(e) => handleChange('posSystem', e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none appearance-none"
                                >
                                    <option value="">Select your POS...</option>
                                    <option value="petpooja">Petpooja</option>
                                    <option value="posist">Posist</option>
                                    <option value="urbanpiper">UrbanPiper</option>
                                    <option value="other">Other / Manual</option>
                                </select>
                            </div>
                            <p className="text-xs text-slate-500 mt-2 ml-1">We'll help you connect this in the Integrations tab later.</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-lg border border-slate-100">
                                    <Camera className="text-blue-500" size={20} />
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-slate-800">CCTV Integration</p>
                                    <p className="text-xs text-slate-500">Enable AI vision analysis</p>
                                </div>
                            </div>
                            <div 
                                onClick={() => handleChange('hasCCTV', !formData.hasCCTV)}
                                className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${formData.hasCCTV ? 'bg-emerald-500' : 'bg-slate-300'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${formData.hasCCTV ? 'left-7' : 'left-1'}`}></div>
                            </div>
                        </div>
                    </div>
                );
            case 3: // Menu & Stock
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Upload Menu</label>
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors"
                            >
                                <Upload className="text-slate-400 mb-2" size={24} />
                                <p className="text-sm font-bold text-slate-600">
                                    {formData.menuFile ? formData.menuFile.name : "Click to upload PDF or Image"}
                                </p>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept=".pdf,image/*" 
                                    onChange={(e) => e.target.files && handleChange('menuFile', e.target.files[0])}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Primary Supplier</label>
                            <div className="relative">
                                <ShoppingBag className="absolute left-3 top-3 text-slate-400" size={18} />
                                <input 
                                    type="text" 
                                    value={formData.primarySupplier}
                                    onChange={(e) => handleChange('primarySupplier', e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                    placeholder="e.g. Metro Cash & Carry"
                                />
                            </div>
                        </div>
                    </div>
                );
            case 4: // Review
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
                            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                                <span className="text-sm text-slate-500">Restaurant</span>
                                <span className="font-bold text-slate-800">{formData.restaurantName}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                                <span className="text-sm text-slate-500">Type</span>
                                <span className="font-bold text-slate-800">{formData.cuisineType} ({formData.kitchenType})</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                                <span className="text-sm text-slate-500">Location</span>
                                <span className="font-bold text-slate-800">{formData.location}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">Tech</span>
                                <span className="font-bold text-slate-800">{formData.posSystem || 'None'} • {formData.hasCCTV ? 'CCTV Enabled' : 'No CCTV'}</span>
                            </div>
                        </div>
                        <div className="text-center">
                            <p className="text-sm text-slate-500">Ready to transform your operations?</p>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    const CurrentIcon = PHASES[step].icon;

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
            <div className="bg-white max-w-2xl w-full rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[500px]">
                
                {/* Sidebar (Progress) */}
                <div className="w-full md:w-1/3 bg-slate-900 p-8 text-white flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-emerald-500/10 z-0"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-8">
                            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center font-bold">B</div>
                            <span className="font-bold text-lg tracking-tight">BistroConnect</span>
                        </div>
                        <div className="space-y-6">
                            {PHASES.map((phase, idx) => (
                                <div key={idx} className={`flex items-center gap-3 transition-colors ${idx === step ? 'text-white' : idx < step ? 'text-emerald-400' : 'text-slate-600'}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 text-xs font-bold ${
                                        idx === step ? 'border-white bg-white text-slate-900' : 
                                        idx < step ? 'border-emerald-500 bg-emerald-500 text-white' : 
                                        'border-slate-700 bg-slate-800 text-slate-500'
                                    }`}>
                                        {idx < step ? <CheckCircle2 size={16} /> : idx + 1}
                                    </div>
                                    <div className="hidden md:block">
                                        <p className="text-sm font-bold leading-none">{phase.title}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="relative z-10 text-xs text-slate-400 mt-8 md:mt-0">
                        Step {step + 1} of {PHASES.length}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 p-8 flex flex-col">
                    <div className="flex-1">
                        <div className="mb-8">
                            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-4">
                                <CurrentIcon size={24} />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">{PHASES[step].title}</h2>
                            <p className="text-slate-500">{PHASES[step].desc}</p>
                        </div>

                        {renderStepContent()}
                    </div>

                    <div className="mt-8 flex justify-between items-center pt-6 border-t border-slate-100">
                        <button 
                            disabled={step === 0} 
                            onClick={() => setStep(step - 1)} 
                            className="px-4 py-2 text-slate-500 font-bold hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <ArrowLeft size={16} /> Back
                        </button>
                        <button 
                            onClick={handleNext}
                            disabled={step === 0 && !formData.restaurantName} // Basic validation
                            className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 flex items-center gap-2 shadow-lg shadow-slate-900/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSaving ? <Loader2 className="animate-spin" size={20}/> : (
                                step === PHASES.length - 1 ? 'Launch Dashboard' : 'Next Step'
                            )} 
                            {!isSaving && <ArrowRight size={16} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}