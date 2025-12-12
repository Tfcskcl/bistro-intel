
import React, { useState, useEffect, useRef } from 'react';
import { User, MenuGenerationRequest, UserRole, MenuStructure } from '../types';
import { storageService } from '../services/storageService';
import { generateMenu, cleanAndParseJSON, hasValidApiKey } from '../services/geminiService';
import { CREDIT_COSTS } from '../constants';
import { Sparkles, Loader2, Wallet, ArrowRight, BookOpen, Download, LayoutTemplate, Palette, Globe, DollarSign, CloudSun, AlertCircle, GripVertical, Upload, Image as ImageIcon } from 'lucide-react';

interface MenuGeneratorProps {
    user: User;
    onUserUpdate?: (user: User) => void;
}

const getMenuBgImage = (cuisine: string = '') => {
    const term = cuisine.toLowerCase();
    const map: Record<string, string> = {
        'italian': 'https://images.unsplash.com/photo-1498579150354-977475b7ea0b?auto=format&fit=crop&w=1200&q=60',
        'pizza': 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=60',
        'indian': 'https://images.unsplash.com/photo-1585937421612-70a008356f36?auto=format&fit=crop&w=1200&q=60',
        'asian': 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1200&q=60',
        'chinese': 'https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=1200&q=60',
        'japanese': 'https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?auto=format&fit=crop&w=1200&q=60',
        'sushi': 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1200&q=60',
        'mexican': 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=1200&q=60',
        'burger': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=60',
        'cafe': 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=60',
        'coffee': 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&w=1200&q=60',
        'bakery': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=60',
        'healthy': 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1200&q=60',
        'vegan': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=60',
        'seafood': 'https://images.unsplash.com/photo-1534080564583-6be75777b70a?auto=format&fit=crop&w=1200&q=60',
        'bar': 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1200&q=60',
        'fine dining': 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=60',
    };
    
    const key = Object.keys(map).find(k => term.includes(k));
    return map[key || ''] || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=60';
};

// Sub-component: Menu Designer Renderer
interface MenuDesignerProps {
    data: MenuStructure;
    theme: string;
    cuisine: string;
    logo?: string | null;
    onReorder: (sectionIndex: number, fromIndex: number, toIndex: number) => void;
}

const MenuDesigner: React.FC<MenuDesignerProps> = ({ data, theme, cuisine, logo, onReorder }) => {
    const bgImage = getMenuBgImage(cuisine);
    const [draggedItem, setDraggedItem] = useState<{ sectionIdx: number, itemIdx: number } | null>(null);

    const handleDragStart = (e: React.DragEvent, sectionIdx: number, itemIdx: number) => {
        setDraggedItem({ sectionIdx, itemIdx });
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); 
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (e: React.DragEvent, targetSectionIdx: number, targetItemIdx: number) => {
        e.preventDefault();
        if (draggedItem && draggedItem.sectionIdx === targetSectionIdx && draggedItem.itemIdx !== targetItemIdx) {
            onReorder(targetSectionIdx, draggedItem.itemIdx, targetItemIdx);
        }
        setDraggedItem(null);
    };

    const baseStyles = "w-full min-h-[800px] p-12 shadow-2xl relative overflow-hidden print:shadow-none print:w-full flex flex-col";
    
    // Theme configurations
    const themes: Record<string, any> = {
        'Modern': {
            wrapper: `${baseStyles} font-sans bg-white text-slate-900`,
            bgOverlay: "absolute inset-0 bg-white/95 z-0",
            content: "relative z-10",
            header: "text-5xl font-black mb-2 tracking-tight text-slate-900 text-center",
            tagline: "text-lg text-slate-500 mb-12 font-medium tracking-wide uppercase text-center",
            sectionTitle: "text-2xl font-bold mb-6 border-b-2 border-slate-900 pb-2 uppercase tracking-wider",
            itemWrapper: "mb-6 group border-b border-slate-100 pb-4 last:border-0 hover:bg-slate-50/50 transition-colors rounded-lg px-2 flex gap-3 cursor-move",
            itemContent: "flex-1",
            itemHeader: "flex justify-between items-baseline mb-1",
            itemName: "text-lg font-bold group-hover:text-emerald-600 transition-colors",
            itemPrice: "text-lg font-bold font-mono text-slate-800",
            itemDesc: "text-sm text-slate-500 leading-relaxed mt-1",
            tag: "text-[10px] font-bold uppercase bg-slate-900 text-white px-1.5 py-0.5 rounded ml-2 align-middle",
            grip: "text-slate-300 group-hover:text-slate-400 self-start mt-1 print:hidden"
        },
        'Classic': {
            wrapper: `${baseStyles} font-serif bg-[#fdfbf7] text-slate-800 border-double border-4 border-slate-800 m-4`,
            bgOverlay: "absolute inset-0 bg-[#fdfbf7]/90 z-0",
            content: "relative z-10",
            header: "text-6xl font-serif text-center mb-4 italic text-slate-900",
            tagline: "text-center text-sm italic text-slate-600 mb-16 border-b border-slate-300 pb-8 mx-20",
            sectionTitle: "text-3xl text-center font-serif italic mb-8 text-slate-800 decorative-border border-b border-slate-300 pb-2",
            itemWrapper: "mb-10 text-center px-8 relative group cursor-move",
            itemContent: "",
            itemHeader: "flex flex-col items-center mb-2",
            itemName: "text-xl font-bold uppercase tracking-widest mb-1",
            itemPrice: "text-lg font-bold text-emerald-700 mt-1",
            itemDesc: "text-sm text-slate-600 italic font-serif",
            tag: "hidden",
            grip: "absolute left-0 top-0 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity print:hidden"
        },
        'Rustic': {
            wrapper: `${baseStyles} font-sans bg-[#1c1917] text-[#e7e5e4]`, 
            bgOverlay: "absolute inset-0 bg-[#1c1917]/90 z-0",
            content: "relative z-10",
            header: "text-5xl font-bold text-amber-500 mb-2 uppercase tracking-widest text-center",
            tagline: "text-center text-stone-400 mb-12 font-mono text-sm",
            sectionTitle: "text-2xl font-bold text-amber-500 mb-6 border-b border-stone-600 pb-2 uppercase tracking-wide",
            itemWrapper: "mb-4 bg-white/5 p-4 rounded-lg border border-white/5 hover:border-amber-500/50 transition-colors shadow-sm flex gap-3 group cursor-move",
            itemContent: "flex-1",
            itemHeader: "flex justify-between items-baseline mb-1",
            itemName: "text-lg font-bold text-white",
            itemPrice: "text-lg font-bold text-amber-400",
            itemDesc: "text-sm text-stone-400 mt-1",
            tag: "text-[10px] font-bold uppercase border border-amber-500 text-amber-500 px-1.5 rounded ml-2",
            grip: "text-stone-600 group-hover:text-stone-400 self-center print:hidden"
        },
        'Minimalist': {
             wrapper: `${baseStyles} font-mono bg-zinc-50 text-zinc-800`,
             bgOverlay: "hidden", 
             hideBg: true, 
             content: "relative z-10 max-w-4xl mx-auto",
             header: "text-4xl font-light tracking-tight text-center mb-4 uppercase",
             tagline: "text-xs text-zinc-400 tracking-[0.2em] text-center mb-16 uppercase",
             sectionTitle: "text-xs font-bold uppercase tracking-[0.15em] text-zinc-400 mb-8 mt-4 border-b border-zinc-200 pb-2",
             itemWrapper: "mb-6 flex gap-2 group cursor-move",
             itemContent: "flex-1",
             itemHeader: "flex justify-between items-end mb-1",
             itemName: "text-sm font-medium tracking-wide uppercase",
             itemPrice: "text-sm",
             itemDesc: "text-xs text-zinc-500 mt-0.5 max-w-[90%] font-sans",
             tag: "text-[9px] border border-zinc-300 px-1 ml-2 text-zinc-400 rounded-none",
             grip: "text-zinc-300 group-hover:text-zinc-500 self-start mt-0.5 print:hidden"
        }
    };

    const styles = themes[theme] || themes['Modern'];

    return (
        <div id="menu-print-area" className={styles.wrapper}>
            {/* Background Image */}
            <div 
                className={`absolute inset-0 z-0 ${styles.hideBg ? 'hidden' : ''}`}
                style={{ 
                    backgroundImage: `url(${bgImage})`, 
                    backgroundSize: 'cover', 
                    backgroundPosition: 'center',
                    filter: 'grayscale(30%)'
                }}
            ></div>
            <div className={styles.bgOverlay}></div>

            <div className={styles.content}>
                <div className="text-center mb-8">
                    {logo && (
                        <div className="mb-6 flex justify-center">
                            <img src={logo} alt="Restaurant Logo" className="h-24 w-auto object-contain" />
                        </div>
                    )}
                    <h1 className={styles.header}>{data.title}</h1>
                    {data.tagline && <p className={styles.tagline}>{data.tagline}</p>}
                </div>

                <div className={`grid ${theme === 'Classic' || theme === 'Minimalist' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-x-12 gap-y-8`}>
                    {data.sections?.map((section, sectionIdx) => (
                        <div key={sectionIdx} className="break-inside-avoid">
                            <h2 className={styles.sectionTitle}>{section.title}</h2>
                            {section.items?.map((item, itemIdx) => (
                                <div 
                                    key={itemIdx} 
                                    className={styles.itemWrapper}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, sectionIdx, itemIdx)}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, sectionIdx, itemIdx)}
                                >
                                    <div className={styles.grip}>
                                        <GripVertical size={16} />
                                    </div>
                                    <div className={styles.itemContent || 'w-full'}>
                                        <div className={styles.itemHeader}>
                                            <h3 className={styles.itemName}>
                                                {item.name}
                                                {item.tags?.map(t => <span key={t} className={styles.tag}>{t}</span>)}
                                            </h3>
                                            <span className={styles.itemPrice}>{data.currency}{item.price}</span>
                                        </div>
                                        <p className={styles.itemDesc}>{item.description}</p>
                                        {item.pairing && theme !== 'Classic' && theme !== 'Minimalist' && (
                                            <p className="text-xs text-purple-500 dark:text-purple-400 mt-2 italic flex items-center gap-1">
                                                <span className="opacity-70">🍷 Pair with:</span> {item.pairing}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
                
                {data.footer_note && (
                    <div className="mt-auto pt-12 text-center text-xs opacity-50 font-medium tracking-wide uppercase">
                        <p>{data.footer_note}</p>
                    </div>
                )}
            </div>
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

    const [logo, setLogo] = useState<string | null>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedResult, setGeneratedResult] = useState<MenuStructure | null>(null);
    const [history, setHistory] = useState<MenuGenerationRequest[]>([]);
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        const all = storageService.getAllMenuGenerationRequests();
        setHistory(isAdmin ? all : all.filter(r => r.userId === user.id));
        setIsOffline(!hasValidApiKey());
    }, [user.id, isAdmin]);

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) setLogo(ev.target.result as string);
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleItemReorder = (sectionIdx: number, fromIdx: number, toIdx: number) => {
        if (!generatedResult) return;
        
        const newResult = { ...generatedResult };
        const section = newResult.sections[sectionIdx];
        
        // Reorder logic
        const [movedItem] = section.items.splice(fromIdx, 1);
        section.items.splice(toIdx, 0, movedItem);
        
        setGeneratedResult(newResult);
    };

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
            
            // Try to parse the response
            try {
                const parsedMenu = cleanAndParseJSON<MenuStructure>(responseText);
                setGeneratedResult(parsedMenu);
                // Check if result was mock
                if (parsedMenu.tagline === "Generated Offline Mode") {
                    setIsOffline(true);
                }
            } catch (jsonErr) {
                // If JSON fails, it might be raw mock text
                throw new Error("Failed to parse menu layout. API Key might be invalid.");
            }

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
                        
                        {isOffline && (
                            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                <span>Running in Demo Mode. Connect an API Key to generate custom menus with AI.</span>
                            </div>
                        )}

                        <form onSubmit={handleGenerate} className="space-y-5">
                            {/* Logo Upload */}
                            <div 
                                onClick={() => logoInputRef.current?.click()}
                                className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                            >
                                {logo ? (
                                    <div className="relative">
                                        <img src={logo} alt="Logo Preview" className="h-16 w-auto object-contain" />
                                        <button 
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); setLogo(null); }}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <AlertCircle size={12} />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <Upload size={20} className="text-slate-400 mb-2" />
                                        <p className="text-xs font-bold text-slate-500">Upload Brand Logo</p>
                                    </>
                                )}
                                <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                            </div>

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
                                <div className="grid grid-cols-2 gap-2">
                                    {['Modern', 'Classic', 'Rustic', 'Minimalist'].map(theme => (
                                        <button 
                                            key={theme}
                                            type="button"
                                            onClick={() => setFormData({...formData, themeStyle: theme})}
                                            className={`
                                                py-3 px-2 text-xs font-bold rounded-lg border transition-all flex flex-col items-center justify-center gap-1
                                                ${formData.themeStyle === theme 
                                                    ? 'ring-2 ring-emerald-500 ring-offset-1 border-transparent' 
                                                    : 'hover:border-slate-300 border-slate-200'
                                                }
                                                ${theme === 'Modern' ? 'bg-white text-slate-900 font-sans' : ''}
                                                ${theme === 'Classic' ? 'bg-[#fdfbf7] text-slate-800 font-serif italic' : ''}
                                                ${theme === 'Rustic' ? 'bg-[#1c1917] text-amber-500 font-sans' : ''}
                                                ${theme === 'Minimalist' ? 'bg-zinc-50 text-zinc-800 font-mono' : ''}
                                            `}
                                        >
                                            <span className="text-lg opacity-80">Ag</span>
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
                                    <MenuDesigner 
                                        data={generatedResult} 
                                        theme={formData.themeStyle} 
                                        cuisine={formData.cuisineType} 
                                        logo={logo}
                                        onReorder={handleItemReorder}
                                    />
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
