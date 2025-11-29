
import React, { useState, useEffect } from 'react';
import { User, MenuGenerationRequest, UserRole } from '../types';
import { storageService } from '../services/storageService';
import { generateMenu } from '../services/geminiService';
import { CREDIT_COSTS } from '../constants';
import { Sparkles, Loader2, Wallet, ArrowRight, History, ChefHat, DollarSign, Users, UtensilsCrossed, AlertCircle, BookOpen } from 'lucide-react';

interface MenuGeneratorProps {
    user: User;
    onUserUpdate?: (user: User) => void;
}

export const MenuGenerator: React.FC<MenuGeneratorProps> = ({ user, onUserUpdate }) => {
    const isAdmin = [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(user.role);
    const [view, setView] = useState<'create' | 'list' | 'detail'>('create');
    
    // Form State
    const [formData, setFormData] = useState({
        restaurantName: user.restaurantName || '',
        cuisineType: user.cuisineType || '',
        targetAudience: '',
        budgetRange: '',
        mustIncludeItems: '',
        dietaryRestrictions: [] as string[]
    });
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedResult, setGeneratedResult] = useState<MenuGenerationRequest | null>(null);
    const [history, setHistory] = useState<MenuGenerationRequest[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<MenuGenerationRequest | null>(null);

    useEffect(() => {
        refreshHistory();
    }, [user.id, isAdmin]);

    const refreshHistory = () => {
        const all = storageService.getAllMenuGenerationRequests();
        // Admins see all, Owners see theirs
        if (isAdmin) {
            setHistory(all.sort((a,b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()));
        } else {
            setHistory(all.filter(r => r.userId === user.id).sort((a,b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()));
        }
    };

    const toggleDietary = (restriction: string) => {
        setFormData(prev => {
            const current = prev.dietaryRestrictions;
            if (current.includes(restriction)) {
                return { ...prev, dietaryRestrictions: current.filter(r => r !== restriction) };
            } else {
                return { ...prev, dietaryRestrictions: [...current, restriction] };
            }
        });
    };

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!formData.restaurantName || !formData.cuisineType || !formData.targetAudience || !formData.budgetRange) {
            setError("Please fill in all required fields.");
            return;
        }

        // Credit Check
        if (!isAdmin) {
            if (user.credits < CREDIT_COSTS.MENU_GEN) {
                setError(`Insufficient credits. You need ${CREDIT_COSTS.MENU_GEN} credits.`);
                return;
            }
        }

        setLoading(true);

        const request: MenuGenerationRequest = {
            id: `menu_${Date.now()}`,
            userId: user.id,
            userName: user.name,
            restaurantName: formData.restaurantName,
            cuisineType: formData.cuisineType,
            targetAudience: formData.targetAudience,
            budgetRange: formData.budgetRange,
            mustIncludeItems: formData.mustIncludeItems,
            dietaryRestrictions: formData.dietaryRestrictions,
            requestDate: new Date().toISOString()
        };

        try {
            // Deduct credits
            if (!isAdmin && onUserUpdate) {
                const success = storageService.deductCredits(user.id, CREDIT_COSTS.MENU_GEN, 'Menu Generation');
                if (success) {
                    onUserUpdate({ ...user, credits: user.credits - CREDIT_COSTS.MENU_GEN });
                } else {
                    throw new Error("Credit deduction failed.");
                }
            }

            // Generate
            const menuContent = await generateMenu(request);
            const finalRequest = { ...request, generatedMenu: menuContent };
            
            // Save
            storageService.saveMenuGenerationRequest(finalRequest);
            setGeneratedResult(finalRequest);
            refreshHistory();
            
        } catch (err: any) {
            setError(err.message || "Failed to generate menu.");
        } finally {
            setLoading(false);
        }
    };

    const openRequest = (req: MenuGenerationRequest) => {
        setSelectedRequest(req);
        setView('detail');
    };

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col gap-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="flex gap-2">
                    <button 
                        onClick={() => { setView('create'); setGeneratedResult(null); }}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${view === 'create' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                    >
                        <Sparkles size={16} /> Generator
                    </button>
                    <button 
                        onClick={() => setView('list')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${view === 'list' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                    >
                        <History size={16} /> {isAdmin ? 'Global History' : 'My History'}
                    </button>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 rounded-full text-xs font-bold">
                    <Wallet size={12} fill="currentColor" />
                    Credits: {user.credits}
                </div>
            </div>

            {/* Create View */}
            {view === 'create' && (
                <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
                    {/* Form */}
                    <div className="w-full lg:w-1/3 bg-white rounded-xl border border-slate-200 shadow-sm p-6 overflow-y-auto">
                        <h2 className="text-xl font-bold text-slate-800 mb-6">Menu Configuration</h2>
                        <form onSubmit={handleGenerate} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Restaurant Name</label>
                                <input 
                                    type="text" 
                                    value={formData.restaurantName}
                                    onChange={e => setFormData({...formData, restaurantName: e.target.value})}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Cuisine Type</label>
                                <div className="relative">
                                    <ChefHat size={16} className="absolute left-3 top-2.5 text-slate-400" />
                                    <input 
                                        type="text" 
                                        value={formData.cuisineType}
                                        onChange={e => setFormData({...formData, cuisineType: e.target.value})}
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                                        placeholder="e.g. Modern Indian, Italian Fusion"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Target Audience</label>
                                <div className="relative">
                                    <Users size={16} className="absolute left-3 top-2.5 text-slate-400" />
                                    <input 
                                        type="text" 
                                        value={formData.targetAudience}
                                        onChange={e => setFormData({...formData, targetAudience: e.target.value})}
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                                        placeholder="e.g. Gen Z, Families, Corporate"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Budget Range (Per Person)</label>
                                <div className="relative">
                                    <DollarSign size={16} className="absolute left-3 top-2.5 text-slate-400" />
                                    <input 
                                        type="text" 
                                        value={formData.budgetRange}
                                        onChange={e => setFormData({...formData, budgetRange: e.target.value})}
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                                        placeholder="e.g. ₹500 - ₹800"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Must Include Items</label>
                                <div className="relative">
                                    <UtensilsCrossed size={16} className="absolute left-3 top-2.5 text-slate-400" />
                                    <textarea 
                                        rows={3}
                                        value={formData.mustIncludeItems}
                                        onChange={e => setFormData({...formData, mustIncludeItems: e.target.value})}
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                                        placeholder="e.g. Butter Chicken, Dal Makhani"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Dietary Preferences</label>
                                <div className="flex flex-wrap gap-2">
                                    {['Veg', 'Vegan', 'Gluten-Free', 'Halal', 'Keto', 'Jain'].map(opt => (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={() => toggleDietary(opt)}
                                            className={`px-3 py-1 text-xs font-bold rounded-full border transition-colors ${
                                                formData.dietaryRestrictions.includes(opt) 
                                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                            }`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg flex items-center gap-2">
                                    <AlertCircle size={14} /> {error}
                                </div>
                            )}

                            <button 
                                type="submit" 
                                disabled={loading}
                                className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} fill="currentColor" />}
                                {loading ? 'Generating Menu...' : `Generate Menu (${CREDIT_COSTS.MENU_GEN} CR)`}
                            </button>
                        </form>
                    </div>

                    {/* Result */}
                    <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-8 overflow-y-auto">
                        {loading ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <Loader2 size={48} className="animate-spin text-emerald-500 mb-4" />
                                <p className="text-lg font-medium text-slate-600">AI is curating your menu...</p>
                                <p className="text-sm">Analyzing cuisine trends and costing models.</p>
                            </div>
                        ) : generatedResult ? (
                            <div className="prose prose-slate max-w-none">
                                <div className="mb-6 pb-6 border-b border-slate-100">
                                    <h1 className="text-3xl font-bold text-slate-900 mb-2">{generatedResult.restaurantName}</h1>
                                    <p className="text-slate-500">Proposed Menu • {new Date().toLocaleDateString()}</p>
                                </div>
                                {/* Simple Markdown Rendering */}
                                {generatedResult.generatedMenu?.split('\n').map((line, i) => {
                                    if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-bold text-slate-900 mt-6 mb-4">{line.replace('# ', '')}</h1>;
                                    if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold text-slate-800 mt-5 mb-3">{line.replace('## ', '')}</h2>;
                                    if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-bold text-emerald-700 mt-4 mb-2">{line.replace('### ', '')}</h3>;
                                    if (line.startsWith('- **')) {
                                        // Item line e.g. "- **Dish Name**: Desc..."
                                        const parts = line.split('**:');
                                        return (
                                            <div key={i} className="mb-3 pl-4 border-l-2 border-slate-200">
                                                <p className="font-bold text-slate-900">{parts[0].replace('- **', '')}</p>
                                                <p className="text-slate-600 text-sm">{parts[1]}</p>
                                            </div>
                                        );
                                    }
                                    if (line.trim() === '') return <br key={i}/>;
                                    return <p key={i} className="text-slate-700">{line}</p>;
                                })}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <BookOpen size={48} className="mb-4 opacity-50" />
                                <p className="text-lg font-medium">Ready to design</p>
                                <p className="text-sm">Fill out the details to generate a professional menu.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* List View */}
            {view === 'list' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 overflow-y-auto flex-1">
                    <h2 className="text-xl font-bold text-slate-800 mb-6">{isAdmin ? 'All Menu Generations' : 'Your Menu History'}</h2>
                    {history.length === 0 ? (
                        <p className="text-slate-500 text-center py-12">No menu generations found.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {history.map((req) => (
                                <div key={req.id} className="p-5 border border-slate-200 rounded-xl hover:border-emerald-300 transition-all bg-slate-50 group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="font-bold text-slate-800">{req.restaurantName}</h4>
                                            <p className="text-xs text-slate-500">{req.cuisineType}</p>
                                        </div>
                                        <BookOpen size={20} className="text-slate-300 group-hover:text-emerald-500" />
                                    </div>
                                    <div className="space-y-2 mb-4">
                                        <p className="text-xs text-slate-600"><span className="font-bold">Audience:</span> {req.targetAudience}</p>
                                        <p className="text-xs text-slate-600"><span className="font-bold">Budget:</span> {req.budgetRange}</p>
                                    </div>
                                    <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                                        <span className="text-[10px] text-slate-400">{new Date(req.requestDate).toLocaleDateString()}</span>
                                        <button 
                                            onClick={() => openRequest(req)}
                                            className="px-3 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold text-slate-600 hover:text-emerald-700 hover:border-emerald-300"
                                        >
                                            View Menu
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Detail View */}
            {view === 'detail' && selectedRequest && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 overflow-y-auto flex-1 relative">
                    <button 
                        onClick={() => setView('list')}
                        className="absolute top-6 left-6 flex items-center gap-1 text-slate-500 hover:text-slate-800 text-sm font-bold"
                    >
                        <ArrowRight size={16} className="rotate-180" /> Back
                    </button>
                    
                    <div className="max-w-4xl mx-auto pt-8">
                        <div className="mb-8 text-center border-b border-slate-100 pb-8">
                            <h1 className="text-4xl font-bold text-slate-900 mb-2">{selectedRequest.restaurantName}</h1>
                            <p className="text-slate-500 uppercase tracking-widest text-sm font-medium">{selectedRequest.cuisineType} Cuisine</p>
                            {isAdmin && <p className="text-xs text-slate-400 mt-4">Generated by: {selectedRequest.userName}</p>}
                        </div>

                        <div className="prose prose-slate max-w-none">
                            {selectedRequest.generatedMenu?.split('\n').map((line, i) => {
                                if (line.startsWith('# ')) return null; // Skip title as we render it above
                                if (line.startsWith('## ')) return <h2 key={i} className="text-2xl font-bold text-slate-800 mt-8 mb-4 border-b border-slate-100 pb-2">{line.replace('## ', '')}</h2>;
                                if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-bold text-emerald-700 mt-6 mb-2">{line.replace('### ', '')}</h3>;
                                if (line.startsWith('- **')) {
                                    const parts = line.split('**:');
                                    return (
                                        <div key={i} className="mb-4 pl-4 border-l-4 border-emerald-100 bg-slate-50 p-4 rounded-r-lg">
                                            <div className="flex justify-between items-baseline">
                                                <p className="font-bold text-slate-900 text-lg">{parts[0].replace('- **', '')}</p>
                                            </div>
                                            <p className="text-slate-600 mt-1">{parts[1]}</p>
                                        </div>
                                    );
                                }
                                if (line.trim() === '') return <br key={i}/>;
                                return <p key={i} className="text-slate-700">{line}</p>;
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};