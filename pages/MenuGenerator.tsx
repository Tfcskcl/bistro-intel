
import React, { useState, useEffect } from 'react';
import { User, MenuGenerationRequest, UserRole } from '../types';
import { storageService } from '../services/storageService';
import { generateMenu } from '../services/geminiService';
import { CREDIT_COSTS } from '../constants';
import { Sparkles, Loader2, Wallet, BookOpen } from 'lucide-react';

interface MenuGeneratorProps {
    user: User;
    onUserUpdate?: (user: User) => void;
}

export const MenuGenerator: React.FC<MenuGeneratorProps> = ({ user, onUserUpdate }) => {
    const isAdmin = [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(user.role);
    const [view, setView] = useState<'create' | 'list' | 'detail'>('create');
    const [formData, setFormData] = useState({ restaurantName: user.restaurantName || '', cuisineType: user.cuisineType || '', targetAudience: '', budgetRange: '', mustIncludeItems: '', dietaryRestrictions: [] as string[] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedResult, setGeneratedResult] = useState<MenuGenerationRequest | null>(null);
    const [history, setHistory] = useState<MenuGenerationRequest[]>([]);

    useEffect(() => {
        const all = storageService.getAllMenuGenerationRequests();
        setHistory(isAdmin ? all : all.filter(r => r.userId === user.id));
    }, [user.id, isAdmin]);

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!formData.restaurantName) { setError("Name required"); return; }
        if (!isAdmin && user.credits < CREDIT_COSTS.MENU_GEN) { setError("Insufficient credits"); return; }

        setLoading(true);
        const request: MenuGenerationRequest = {
            id: `menu_${Date.now()}`,
            userId: user.id,
            userName: user.name,
            ...formData,
            requestDate: new Date().toISOString()
        };

        try {
            if (!isAdmin && onUserUpdate) {
                storageService.deductCredits(user.id, CREDIT_COSTS.MENU_GEN, 'Menu Generation');
                onUserUpdate({ ...user, credits: user.credits - CREDIT_COSTS.MENU_GEN });
            }
            const menuContent = await generateMenu(request);
            const finalRequest = { ...request, generatedMenu: menuContent };
            storageService.saveMenuGenerationRequest(finalRequest);
            setGeneratedResult(finalRequest);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <button onClick={() => setView('create')} className="px-4 py-2 bg-slate-900 text-white rounded-lg font-bold">Generator</button>
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-bold"><Wallet size={12}/> Credits: {user.credits}</div>
            </div>

            {view === 'create' && (
                <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
                    <div className="w-full lg:w-1/3 bg-white dark:bg-slate-900 rounded-xl p-6 overflow-y-auto">
                        <h2 className="text-xl font-bold mb-6 dark:text-white">Menu Configuration</h2>
                        <form onSubmit={handleGenerate} className="space-y-5">
                            <input type="text" value={formData.restaurantName} onChange={e => setFormData({...formData, restaurantName: e.target.value})} className="w-full px-4 py-2 border rounded-lg dark:bg-slate-800 dark:text-white" placeholder="Restaurant Name" />
                            <input type="text" value={formData.cuisineType} onChange={e => setFormData({...formData, cuisineType: e.target.value})} className="w-full px-4 py-2 border rounded-lg dark:bg-slate-800 dark:text-white" placeholder="Cuisine Type" />
                            {error && <div className="text-red-500 text-xs">{error}</div>}
                            <button type="submit" disabled={loading} className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl flex justify-center gap-2">
                                {loading ? <Loader2 className="animate-spin" /> : <Sparkles />} Generate Menu
                            </button>
                        </form>
                    </div>
                    <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl p-8 overflow-y-auto">
                        {generatedResult ? (
                            <div className="prose dark:prose-invert max-w-none">
                                <h1 className="text-3xl font-bold">{generatedResult.restaurantName}</h1>
                                {generatedResult.generatedMenu?.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                                <BookOpen size={48} className="mb-4" />
                                <p>Ready to design</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
