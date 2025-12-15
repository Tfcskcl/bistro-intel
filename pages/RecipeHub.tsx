import React, { useState, useEffect, useRef } from 'react';
import { User, RecipeCard, MenuItem, RecipeComment } from '../types';
import { generateRecipeCard } from '../services/geminiService';
import { storageService, storageEvents } from '../services/storageService';
import { ingredientService } from '../services/ingredientService';
import { authService } from '../services/authService';
import { CREDIT_COSTS } from '../constants';
import { 
    ChefHat, Search, Plus, Save, Trash2, ArrowLeft, Loader2, 
    DollarSign, TrendingUp, Clock, Scale, Utensils, AlertTriangle, 
    FileDown, Share2, MoreHorizontal, Sparkles, Image as ImageIcon,
    Printer, Upload, FileText, CheckCircle2, MessageSquare, Send, Users, UserPlus,
    Copy, Link, Mail, Globe, Check, Lock, Edit3, X, FileCheck, Download, Wallet, MessageCircle
} from 'lucide-react';

export const RecipeHub: React.FC<{ user: User }> = ({ user }) => {
    const [viewMode, setViewMode] = useState<'list' | 'create' | 'detail'>('list');
    const [recipes, setRecipes] = useState<RecipeCard[]>([]);
    const [selectedRecipe, setSelectedRecipe] = useState<RecipeCard | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    
    // Create Mode State
    const [dishName, setDishName] = useState('');
    const [requirements, setRequirements] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Bill Upload State
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploadingBill, setIsUploadingBill] = useState(false);
    const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);

    // Sharing & Export State
    const [showShareOptions, setShowShareOptions] = useState(false);
    const [printOptions, setPrintOptions] = useState({ includeNotes: true });
    
    const [shareTargetUser, setShareTargetUser] = useState<string>('');
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [copyLinkStatus, setCopyLinkStatus] = useState<'idle' | 'copied'>('idle');

    // Comment State
    const [newComment, setNewComment] = useState('');

    // Cost Calc
    const isFree = !storageService.shouldChargeCredits(user.id, 'recipes');
    const cost = isFree ? 0 : CREDIT_COSTS.RECIPE;

    useEffect(() => {
        loadRecipes();
        authService.getAllUsers().then(users => {
            setAllUsers(users.filter(u => u.id !== user.id)); 
        });
        
        window.addEventListener(storageEvents.DATA_UPDATED, loadRecipes);
        return () => window.removeEventListener(storageEvents.DATA_UPDATED, loadRecipes);
    }, [user.id]);

    const loadRecipes = async () => {
        const saved = await storageService.getSavedRecipesAsync(user.id);
        setRecipes(saved);
        if (selectedRecipe) {
            const updated = saved.find(r => r.sku_id === selectedRecipe.sku_id);
            if (updated) setSelectedRecipe(updated);
        }
    };

    const handleGenerate = async () => {
        if (!dishName) return;
        if (cost > 0 && user.credits < cost) {
            setError(`Insufficient credits. Need ${cost} CR.`);
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            if (cost > 0) {
                storageService.deductCredits(user.id, cost, `Recipe Gen: ${dishName}`);
            }
            // Increment usage regardless of cost
            storageService.incrementUsage(user.id, 'recipes');
            
            const item: MenuItem = {
                sku_id: `sku_${Date.now()}`,
                name: dishName,
                category: 'main', // Default
                prep_time_min: 15,
                current_price: 0,
                ingredients: []
            };

            const recipe = await generateRecipeCard(user.id, item, requirements);
            
            // Auto-save generated recipe to prevent data loss
            await storageService.saveRecipeAsync(user.id, recipe);
            await loadRecipes(); // Refresh the list immediately

            setSelectedRecipe(recipe);
            setViewMode('detail');
            setIsEditing(true); // Enable edit mode for refinement
        } catch (e: any) {
            setError(e.message || "Failed to generate recipe.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async () => {
        if (selectedRecipe) {
            await storageService.saveRecipeAsync(user.id, selectedRecipe);
            await loadRecipes();
            setIsEditing(false);
            alert("Recipe saved to library!");
        }
    };

    const handleDelete = async (sku_id: string) => {
        if (confirm("Are you sure?")) {
            await storageService.deleteRecipeAsync(user.id, sku_id);
            // Local state update is handled by the event listener on DATA_UPDATED, 
            // but we can optimize optimistic update
            const updated = recipes.filter(r => r.sku_id !== sku_id);
            setRecipes(updated);
            if (selectedRecipe?.sku_id === sku_id) {
                setSelectedRecipe(null);
                setViewMode('list');
            }
        }
    };

    const executePrint = () => {
        const printContent = document.getElementById('print-area');
        if (!printContent || !selectedRecipe) return;

        // Clone and prepare content
        const clone = printContent.cloneNode(true) as HTMLElement;
        
        // Cleanup UI elements for print
        const buttons = clone.querySelectorAll('button');
        buttons.forEach(b => b.remove());
        const noPrints = clone.querySelectorAll('.no-print');
        noPrints.forEach(el => el.remove());
        
        // Transform inputs to text for print
        const inputs = clone.querySelectorAll('input');
        inputs.forEach((input) => {
            const span = document.createElement('span');
            span.textContent = (input as HTMLInputElement).value;
            span.className = "font-mono font-bold text-slate-900";
            if (input.parentElement) { input.parentElement.replaceChild(span, input); }
        });
        const textareas = clone.querySelectorAll('textarea');
        textareas.forEach((ta) => {
            const p = document.createElement('p');
            p.textContent = (ta as HTMLTextAreaElement).value;
            p.className = "text-sm text-slate-800 leading-relaxed";
            if (ta.parentElement) { ta.parentElement.replaceChild(p, ta); }
        });

        const win = window.open('', '', 'width=900,height=650');
        if (win) {
            win.document.write(`
                <html>
                    <head>
                        <title>${selectedRecipe.name} - Recipe Card</title>
                        <script src="https://cdn.tailwindcss.com"></script>
                        <style>
                            @page { size: A4; margin: 15mm; }
                            body { 
                                margin: 0;
                                padding: 20px;
                                -webkit-print-color-adjust: exact; 
                                print-color-adjust: exact; 
                                font-family: 'Inter', sans-serif; 
                                background: white; 
                                color: #0f172a;
                            }
                            img { 
                                max-width: 100%; 
                                height: auto; 
                                display: block; 
                                page-break-inside: avoid;
                                border-radius: 0.75rem;
                            }
                            .break-inside-avoid { page-break-inside: avoid; }
                            ::-webkit-scrollbar { display: none; }
                        </style>
                        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;900&display=swap" rel="stylesheet">
                    </head>
                    <body>
                        <div class="max-w-4xl mx-auto">
                            ${clone.innerHTML}
                            
                            <div class="mt-12 pt-6 border-t border-slate-200 text-center text-xs text-slate-400 flex justify-between items-center">
                                <span>Powered by BistroConnect AI</span>
                                <span>Page 1 of 1</span>
                            </div>
                        </div>
                        <script>
                            window.onload = () => {
                                setTimeout(() => { 
                                    window.print(); 
                                    window.close(); 
                                }, 800); 
                            };
                        </script>
                    </body>
                </html>
            `);
            win.document.close();
        }
    };

    const handleExportCSV = () => {
        if (!selectedRecipe) return;
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += `Recipe Name,${selectedRecipe.name}\nYield,${selectedRecipe.yield} portions\nFood Cost Per Serving,${selectedRecipe.food_cost_per_serving}\nSuggested Selling Price,${selectedRecipe.suggested_selling_price}\n\nIngredient,Qty,Unit,Cost Per Unit,Waste %,Cost Per Serving\n`;
        selectedRecipe.ingredients.forEach(ing => {
            csvContent += [ing.name, ing.qty, ing.unit, ing.cost_per_unit || 0, ing.waste_pct || 0, ing.cost_per_serving || 0].join(",") + "\n";
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${selectedRecipe.name.replace(/\s+/g, '_')}_costing.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExternalShare = (platform: 'whatsapp' | 'email' | 'copy' | 'pdf') => {
        if (!selectedRecipe) return;

        const shareUrl = `https://bistroconnect.in/shared/recipe/${selectedRecipe.sku_id}`;
        const text = `Check out this recipe for ${selectedRecipe.name} on BistroConnect! \n\nFood Cost: ₹${selectedRecipe.food_cost_per_serving}\nSelling Price: ₹${selectedRecipe.suggested_selling_price}\n\nView details: ${shareUrl}`;

        if (platform === 'whatsapp') {
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        } else if (platform === 'email') {
            window.open(`mailto:?subject=${encodeURIComponent(selectedRecipe.name)}&body=${encodeURIComponent(text)}`, '_self');
        } else if (platform === 'copy') {
            navigator.clipboard.writeText(text);
            setCopyLinkStatus('copied');
            setTimeout(() => setCopyLinkStatus('idle'), 2000);
        }
    };

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col gap-6 relative">
            <div className="flex justify-between items-center">
                <div className="flex gap-2">
                    <button onClick={() => setViewMode('list')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'list' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>My Recipes</button>
                    <button onClick={() => setViewMode('create')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'create' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>Recipe Developer</button>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 rounded-full text-xs font-bold"><Wallet size={12}/> Credits: {user.credits}</div>
            </div>

            {viewMode === 'list' && (
                <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                    {recipes.map(recipe => (
                        <div key={recipe.sku_id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all group cursor-pointer" onClick={() => { setSelectedRecipe(recipe); setViewMode('detail'); }}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
                                    <ChefHat size={24} />
                                </div>
                                {recipe.confidence && <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-500">{recipe.confidence} Confidence</span>}
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1 truncate">{recipe.name}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{recipe.category} • {recipe.ingredients?.length || 0} Ingred.</p>
                            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase font-bold">Food Cost</p>
                                    <p className="font-bold text-slate-800 dark:text-white">₹{recipe.food_cost_per_serving}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase font-bold">Margin</p>
                                    <p className="font-bold text-emerald-600">
                                        {recipe.suggested_selling_price ? ((1 - (recipe.food_cost_per_serving / recipe.suggested_selling_price)) * 100).toFixed(0) : 0}%
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                    {recipes.length === 0 && (
                        <div className="col-span-full text-center py-20 text-slate-400">
                            <ChefHat size={48} className="mx-auto mb-4 opacity-50"/>
                            <p>No recipes yet. Create one with AI!</p>
                        </div>
                    )}
                </div>
            )}

            {viewMode === 'create' && (
                <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
                    <div className="bg-white dark:bg-slate-900 w-full p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                            <Sparkles className="text-purple-500" /> BistroChef Recipe Developer
                        </h2>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Dish Name</label>
                                <input 
                                    value={dishName}
                                    onChange={(e) => setDishName(e.target.value)}
                                    placeholder="e.g. Truffle Mushroom Risotto"
                                    className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Requirements & Twist (Optional)</label>
                                <textarea 
                                    value={requirements}
                                    onChange={(e) => setRequirements(e.target.value)}
                                    rows={4}
                                    placeholder="e.g. Make it vegan, gluten-free, and use locally sourced ingredients. Aim for 25% food cost."
                                    className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                                />
                            </div>
                            
                            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

                            <div className="flex gap-4">
                                <button onClick={() => setViewMode('list')} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-lg">Cancel</button>
                                <button 
                                    onClick={handleGenerate}
                                    disabled={isGenerating || !dishName}
                                    className="flex-[2] py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
                                    Generate Recipe
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {viewMode === 'detail' && selectedRecipe && (
                <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                        <button onClick={() => setViewMode('list')} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white flex items-center gap-1 font-bold text-sm">
                            <ArrowLeft size={16} /> Back
                        </button>
                        <div className="flex gap-2">
                            <button onClick={handleSave} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-emerald-600" title="Save"><Save size={18}/></button>
                            <button onClick={executePrint} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-blue-600" title="Print"><Printer size={18}/></button>
                            <button onClick={handleExportCSV} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-purple-600" title="Export CSV"><FileDown size={18}/></button>
                            <button onClick={() => setShowShareOptions(!showShareOptions)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-600" title="Share"><Share2 size={18}/></button>
                        </div>
                    </div>

                    <div id="print-area" className="flex-1 overflow-y-auto p-8">
                        <div className="flex flex-col md:flex-row gap-8">
                            <div className="flex-1">
                                <div className="flex items-center gap-4 mb-2">
                                    <h1 className="text-3xl font-black text-slate-900 dark:text-white">{selectedRecipe.name}</h1>
                                    {selectedRecipe.category && <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-bold uppercase tracking-wide text-slate-500">{selectedRecipe.category}</span>}
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 mb-6 text-lg">{selectedRecipe.human_summary}</p>
                                
                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                        <p className="text-xs text-slate-400 uppercase font-bold mb-1">Prep Time</p>
                                        <p className="text-xl font-bold text-slate-800 dark:text-white">{selectedRecipe.prep_time_min} mins</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                        <p className="text-xs text-slate-400 uppercase font-bold mb-1">Yield</p>
                                        <p className="text-xl font-bold text-slate-800 dark:text-white">{selectedRecipe.yield} Servings</p>
                                    </div>
                                </div>

                                <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><Utensils size={18}/> Ingredients</h3>
                                <table className="w-full text-sm mb-8">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 text-left">
                                            <th className="py-2">Item</th>
                                            <th className="py-2">Qty</th>
                                            <th className="py-2 text-right">Cost</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedRecipe.ingredients.map((ing, i) => (
                                            <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                                                <td className="py-2 text-slate-800 dark:text-slate-300 font-medium">{ing.name}</td>
                                                <td className="py-2 text-slate-500">{ing.qty} {ing.unit}</td>
                                                <td className="py-2 text-right text-slate-600 dark:text-slate-400">₹{ing.cost_per_serving}</td>
                                            </tr>
                                        ))}
                                        <tr className="font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/50">
                                            <td className="py-2 pl-2">Total Food Cost</td>
                                            <td></td>
                                            <td className="py-2 text-right pr-2">₹{selectedRecipe.food_cost_per_serving}</td>
                                        </tr>
                                    </tbody>
                                </table>

                                <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><FileText size={18}/> Method</h3>
                                <div className="space-y-4">
                                    {selectedRecipe.preparation_steps.map((step, i) => (
                                        <div key={i} className="flex gap-4">
                                            <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold shrink-0">{i+1}</span>
                                            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{step}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="w-full md:w-80 space-y-6">
                                {selectedRecipe.imageUrl && (
                                    <div className="rounded-xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-800">
                                        <img src={selectedRecipe.imageUrl} alt={selectedRecipe.name} className="w-full h-48 object-cover" />
                                    </div>
                                )}
                                
                                <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-xl border border-emerald-100 dark:border-emerald-800">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-sm font-bold text-emerald-800 dark:text-emerald-400">Profitability</span>
                                        <TrendingUp size={18} className="text-emerald-600" />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-emerald-700 dark:text-emerald-300">Selling Price</span>
                                            <span className="font-bold text-emerald-900 dark:text-white">₹{selectedRecipe.suggested_selling_price}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-emerald-700 dark:text-emerald-300">Food Cost</span>
                                            <span className="font-bold text-emerald-900 dark:text-white">₹{selectedRecipe.food_cost_per_serving}</span>
                                        </div>
                                        <div className="h-px bg-emerald-200 dark:bg-emerald-800 my-2"></div>
                                        <div className="flex justify-between text-lg font-black text-emerald-800 dark:text-emerald-400">
                                            <span>Margin</span>
                                            <span>{selectedRecipe.suggested_selling_price ? ((1 - (selectedRecipe.food_cost_per_serving / selectedRecipe.suggested_selling_price)) * 100).toFixed(0) : 0}%</span>
                                        </div>
                                    </div>
                                </div>

                                {selectedRecipe.nutritional_info && (
                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <h4 className="font-bold text-slate-800 dark:text-white mb-4 text-sm uppercase">Nutrition Per Serving</h4>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="text-slate-400 text-xs">Calories</p>
                                                <p className="font-bold text-slate-800 dark:text-white">{selectedRecipe.nutritional_info.calories} kcal</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 text-xs">Protein</p>
                                                <p className="font-bold text-slate-800 dark:text-white">{selectedRecipe.nutritional_info.protein}g</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 text-xs">Carbs</p>
                                                <p className="font-bold text-slate-800 dark:text-white">{selectedRecipe.nutritional_info.carbs}g</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 text-xs">Fat</p>
                                                <p className="font-bold text-slate-800 dark:text-white">{selectedRecipe.nutritional_info.fat}g</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Share Modal */}
            {showShareOptions && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-sm shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg dark:text-white">Share Recipe</h3>
                            <button onClick={() => setShowShareOptions(false)}><X size={20} className="text-slate-400"/></button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => handleExternalShare('whatsapp')} className="p-3 bg-green-50 text-green-700 rounded-lg flex flex-col items-center gap-2 hover:bg-green-100">
                                <MessageCircle size={24} /> WhatsApp
                            </button>
                            <button onClick={() => handleExternalShare('email')} className="p-3 bg-blue-50 text-blue-700 rounded-lg flex flex-col items-center gap-2 hover:bg-blue-100">
                                <Mail size={24} /> Email
                            </button>
                            <button onClick={() => handleExternalShare('copy')} className="p-3 bg-slate-50 text-slate-700 rounded-lg flex flex-col items-center gap-2 hover:bg-slate-100 col-span-2">
                                {copyLinkStatus === 'copied' ? <CheckCircle2 size={24} className="text-emerald-500"/> : <Copy size={24} />}
                                {copyLinkStatus === 'copied' ? 'Copied!' : 'Copy Link'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};