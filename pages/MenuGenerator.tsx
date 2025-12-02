
import React, { useState, useEffect, useRef } from 'react';
import { User, MenuGenerationRequest, UserRole, MenuStructure } from '../types';
import { storageService } from '../services/storageService';
import { generateMenu, cleanAndParseJSON } from '../services/geminiService';
import { CREDIT_COSTS } from '../constants';
import { Sparkles, Loader2, Wallet, ArrowRight, BookOpen, Download, LayoutTemplate, Palette, Globe, DollarSign, CloudSun } from 'lucide-react';

interface MenuGeneratorProps {
    user: User;
    onUserUpdate?: (user: User) => void;
}

// Sub-component: Menu Designer Renderer
const MenuDesigner: React.FC<{ data: MenuStructure, theme: string }> = ({ data, theme }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    const baseStyles = "w-full min-h-[800px] p-12 bg-white text-slate-900 shadow-2xl relative overflow-hidden print:shadow-none print:w-full";
    
    // Theme configurations
    const themes: Record<string, any> = {
        'Modern': {
            wrapper: `${baseStyles} font-sans`,
            header: "text-5xl font-black mb-2 tracking-tight text-slate-900",
            tagline: "text-lg text-slate-500 mb-12 font-medium tracking-wide uppercase",
            sectionTitle: "text-2xl font-bold mb-6 border-b-2 border-slate-900 pb-2 uppercase tracking-wider",
            itemWrapper: "mb-6 group",
            itemHeader: "flex justify-between items-baseline mb-1",
            itemName: "text-lg font-bold group-hover:text-emerald-600 transition-colors",
            itemPrice: "text-lg font-bold font-mono",
            itemDesc: "text-sm text-slate-500 leading-relaxed",
            tag: "text-[10px] font-bold uppercase bg-slate-900 text-white px-1.5 py-0.5 rounded ml-2 align-middle"
        },
        'Classic': {
            wrapper: `${baseStyles} font-serif bg-[#fdfbf7] border-double border-4 border-slate-800 m-4`,
            header: "text-6xl font-serif text-center mb-4 italic text-slate-800",
            tagline: "text-center text-sm italic text-slate-600 mb-16 border-b border-slate-300 pb-8 mx-20",
            sectionTitle: "text-3xl text-center font-serif italic mb-8 text-slate-800 decorative-border",
            itemWrapper: "mb-8 text-center px-8",
            itemHeader: "flex flex-col items-center mb-2",
            itemName: "text-xl font-bold uppercase tracking-widest mb-1",
            itemPrice: "text-lg font-bold text-emerald-700 mt-1",
            itemDesc: "text-sm text-slate-600 italic font-serif",
            tag: "hidden" // Classic menus often minimal
        },
        'Rustic': {
            wrapper: `${baseStyles} font-sans bg-[#2a2a2a] text-[#e0e0e0]`, // Dark background
            header: "text-5xl font-bold text-amber-500 mb-2 uppercase tracking-widest text-center",
            tagline: "text-center text-stone-400 mb-12 font-mono text-sm",
            sectionTitle: "text-2xl font-bold text-amber-500 mb-6 border-b border-stone-600 pb-2 uppercase",
            itemWrapper: "mb-6 border-l-2 border-stone-700 pl-4 hover:border-amber-500 transition-colors",
            itemHeader: "flex justify-between items-baseline mb-1",
            itemName: "text-lg font-bold text-white",
            itemPrice: "text-lg font-bold text-amber-400",
            itemDesc: "text-sm text-stone-400",
            tag: "text-[10px] font-bold uppercase border border-amber-500 text-amber-500 px-1.5 rounded ml-2"
        }
    };

    const styles = themes[theme] || themes['Modern'];

    return (
        <div id="menu-print-area" className={styles.wrapper}>
            <div className="text-center">
                <h1 className={styles.header}>{data.title}</h1>
                {data.tagline && <p className={styles.tagline}>{data.tagline}</p>}
            </div>

            <div className={`grid ${theme === 'Classic' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-x-12 gap-y-8`}>
                {data.sections.map((section, idx) => (
                    <div key={idx} className="break-inside-avoid">
                        <h2 className={styles.sectionTitle}>{section.title}</h2>
                        {section.items.map((item, i) => (
                            <div key={i} className={styles.itemWrapper}>
                                <div className={styles.itemHeader}>
                                    <h3 className={styles.itemName}>
                                        {item.name}
                                        {item.tags?.map(t => <span key={t} className={styles.tag}>{t}</span>)}
                                    </h3>
                                    <span className={styles.itemPrice}>{data.currency}{item.price}</span>
                                </div>
                                <p className={styles.itemDesc}>{item.description}</p>
                                {item.pairing && theme !== 'Classic' && (
                                    <p className="text-xs text-purple-500 mt-1 italic">🍷 Pair with: {item.pairing}</p>
                                )}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
            
            {data.footer_note && (
                <div className="absolute bottom-8 left-0 w-full text-center text-xs opacity-50">
                    <p>{data.footer_note}</p>
                </div>
            )}
        </div>
    );
};

export const MenuGenerator: React.FC<MenuGeneratorProps> = ({ user, onUserUpdate }) => {
    const isAdmin = [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(user.role);
    const [view, setView] = useState<'create' | 'list'>('create');
    
    // Form Data
    const [formData, setFormData] = useState({ 
        restaurantName: user.restaurantName || '', 
        cuisineType: user.cuisineType || '', 
        targetAudience: '', 
        budgetRange: '', 
        mustIncludeItems: '', 
        dietaryRestrictions: [] as string[],
        season: 'All Season',
        pricingStrategy: 'Standard',
        themeStyle: 'Modern'
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedResult, setGeneratedResult] = useState<MenuStructure | null>(null);
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
        setGeneratedResult(null);

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
            const responseText = await generateMenu(request);
            
            // Store JSON string, but parse for UI
            const parsedMenu = cleanAndParseJSON<MenuStructure>(responseText);
            setGeneratedResult(parsedMenu);

            const finalRequest = { ...request, generatedMenu: responseText };
            storageService.saveMenuGenerationRequest(finalRequest);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        const printContent = document.getElementById('menu-print-area');
        if (printContent) {
            const win = window.open('', '', 'width=900,height=650');
            if (win) {
                win.document.write(`
                    <html>
                        <head>
                            <title>Print Menu</title>
                            <script src="https://cdn.tailwindcss.com"></script>
                            <style>
                                @page { size: auto; margin: 0mm; }
                                body { margin: 0px; -webkit-print-color-adjust: exact; }
                            </style>
                        </head>
                        <body>
                            ${printContent.outerHTML}
                        </body>
                    </html>
                `);
                win.document.close();
                win.focus();
                // Allow styles to load
                setTimeout(() => {
                    win.print();
                    win.close();
                }, 1000);
            }
        }
    };

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div className="flex gap-2">
                    <button onClick={() => setView('create')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${view === 'create' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>Designer</button>
                    <button onClick={() => setView('list')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${view === 'list' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>History</button>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 rounded-full text-xs font-bold"><Wallet size={12}/> Credits: {user.credits}</div>
            </div>

            {view === 'create' && (
                <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
                    {/* Config Panel */}
                    <div className="w-full lg:w-1/3 bg-white dark:bg-slate-900 rounded-xl p-6 overflow-y-auto custom-scrollbar border border-slate-200 dark:border-slate-800">
                        <h2 className="text-xl font-bold mb-6 dark:text-white flex items-center gap-2">
                            <BookOpen className="text-purple-500"/> Menu Configuration
                        </h2>
                        <form onSubmit={handleGenerate} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Brand Identity</label>
                                <input type="text" value={formData.restaurantName} onChange={e => setFormData({...formData, restaurantName: e.target.value})} className="w-full px-4 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white mb-2" placeholder="Restaurant Name" />
                                <input type="text" value={formData.cuisineType} onChange={e => setFormData({...formData, cuisineType: e.target.value})} className="w-full px-4 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" placeholder="Cuisine Type (e.g. Modern Indian)" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><CloudSun size={10}/> Seasonality</label>
                                    <select value={formData.season} onChange={e => setFormData({...formData, season: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm">
                                        <option>All Season</option>
                                        <option>Summer</option>
                                        <option>Winter</option>
                                        <option>Monsoon</option>
                                        <option>Festive</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><DollarSign size={10}/> Pricing</label>
                                    <select value={formData.pricingStrategy} onChange={e => setFormData({...formData, pricingStrategy: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm">
                                        <option value="Standard">Standard (30% FC)</option>
                                        <option value="Premium">Premium (High Margin)</option>
                                        <option value="Budget">Budget Friendly</option>
                                        <option value="Psychological">Psychological (x.99)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Target Audience & Context</label>
                                <textarea 
                                    rows={3}
                                    value={formData.targetAudience} 
                                    onChange={e => setFormData({...formData, targetAudience: e.target.value})} 
                                    className="w-full px-4 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm" 
                                    placeholder="e.g. Health-conscious millennials, Family crowd..." 
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Must Include (Optional)</label>
                                <input type="text" value={formData.mustIncludeItems} onChange={e => setFormData({...formData, mustIncludeItems: e.target.value})} className="w-full px-4 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm" placeholder="e.g. Signature Truffle Fries" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1"><Palette size={10}/> Visual Theme</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['Modern', 'Classic', 'Rustic'].map(theme => (
                                        <button 
                                            key={theme}
                                            type="button"
                                            onClick={() => setFormData({...formData, themeStyle: theme})}
                                            className={`py-2 text-xs font-bold rounded-lg border transition-all ${formData.themeStyle === theme ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'}`}
                                        >
                                            {theme}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {error && <div className="text-red-500 text-xs bg-red-50 p-2 rounded">{error}</div>}
                            
                            <button type="submit" disabled={loading} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex justify-center gap-2 transition-colors">
                                {loading ? <Loader2 className="animate-spin" /> : <Sparkles />} Generate Designer Menu
                            </button>
                        </form>
                    </div>

                    {/* Preview Panel */}
                    <div className="flex-1 bg-slate-100 dark:bg-black rounded-xl p-4 sm:p-8 overflow-y-auto flex flex-col items-center justify-start border border-slate-200 dark:border-slate-800">
                        {generatedResult ? (
                            <>
                                <div className="w-full flex justify-end gap-2 mb-4">
                                    <button 
                                        onClick={handlePrint}
                                        className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                                    >
                                        <Download size={16} /> Download PDF
                                    </button>
                                </div>
                                <div className="w-full max-w-[800px] shadow-2xl transition-all duration-500 animate-fade-in-up">
                                    <MenuDesigner data={generatedResult} theme={formData.themeStyle} />
                                </div>
                            </>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                                <LayoutTemplate size={64} className="mb-4" />
                                <p className="text-lg font-medium">Menu Preview</p>
                                <p className="text-sm">Configure and generate to see your menu here.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {view === 'list' && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 overflow-y-auto">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Generated Menus</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {history.map(item => (
                            <div key={item.id} className="p-4 border rounded-xl hover:border-emerald-500 transition-colors cursor-pointer" onClick={() => {
                                try {
                                    const parsed = cleanAndParseJSON<MenuStructure>(item.generatedMenu);
                                    setGeneratedResult(parsed);
                                    setFormData(prev => ({...prev, restaurantName: item.restaurantName, cuisineType: item.cuisineType, themeStyle: item.themeStyle || 'Modern'}));
                                    setView('create');
                                } catch(e) {}
                            }}>
                                <h3 className="font-bold text-slate-800 dark:text-white">{item.restaurantName}</h3>
                                <p className="text-xs text-slate-500">{item.cuisineType}</p>
                                <p className="text-xs text-slate-400 mt-2">{new Date(item.requestDate).toLocaleDateString()}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
