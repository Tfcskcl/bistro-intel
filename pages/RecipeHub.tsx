

import React, { useState, useEffect, useRef } from 'react';
import { User, RecipeCard, MenuItem, RecipeComment } from '../types';
import { generateRecipeCard } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { ingredientService } from '../services/ingredientService';
import { authService } from '../services/authService';
import { CREDIT_COSTS } from '../constants';
import { 
    ChefHat, Search, Plus, Save, Trash2, ArrowLeft, Loader2, 
    DollarSign, TrendingUp, Clock, Scale, Utensils, AlertTriangle, 
    FileDown, Share2, MoreHorizontal, Sparkles, Image as ImageIcon,
    Printer, Upload, FileText, CheckCircle2, MessageSquare, Send, Users, UserPlus,
    Copy, Link, Mail, Globe, Check, Lock, Edit3, X
} from 'lucide-react';
import { 
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend 
} from 'recharts';

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// Helper icon for editable field
const Edit2Icon = ({size, className}: {size: number, className?: string}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
);

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

    // Sharing State
    const [showShareModal, setShowShareModal] = useState(false);
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
    }, [user.id]);

    const loadRecipes = () => {
        const saved = storageService.getSavedRecipes(user.id);
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
            storageService.saveRecipe(user.id, recipe);
            loadRecipes(); // Refresh the list immediately

            setSelectedRecipe(recipe);
            setViewMode('detail');
            setIsEditing(true); // Enable edit mode for refinement
        } catch (e: any) {
            setError(e.message || "Failed to generate recipe.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = () => {
        if (selectedRecipe) {
            storageService.saveRecipe(user.id, selectedRecipe);
            loadRecipes();
            setIsEditing(false);
            alert("Recipe saved to library!");
        }
    };

    const handleDelete = (sku_id: string) => {
        if (confirm("Are you sure?")) {
            const updated = recipes.filter(r => r.sku_id !== sku_id);
            localStorage.setItem(`bistro_${user.id}_saved_recipes`, JSON.stringify(updated));
            loadRecipes();
            if (selectedRecipe?.sku_id === sku_id) {
                setSelectedRecipe(null);
                setViewMode('list');
            }
        }
    };

    // ... (Keep handlePrint, handleExportCSV, handleShareInternal, handleCopyLink, handlePostComment, recalculateCosts, handleIngredientChange, handleAddIngredient, handleRemoveIngredient, updateField, handleAddStep, handleRemoveStep, handleStepChange, handleBillUpload, costBreakdownData as they are)
    const handlePrint = () => {
        const printContent = document.getElementById('print-area');
        if (!printContent) return;
        const clone = printContent.cloneNode(true) as HTMLElement;
        const buttons = clone.querySelectorAll('button');
        buttons.forEach(b => b.remove());
        const noPrints = clone.querySelectorAll('.no-print');
        noPrints.forEach(el => el.remove());
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
            p.className = "whitespace-pre-wrap text-slate-900";
            if(ta.parentElement) ta.parentElement.replaceChild(p, ta);
        });
        const win = window.open('', '', 'width=900,height=650');
        if (win) {
            win.document.write(`<html><head><title>${selectedRecipe?.name || 'Recipe'} - Print</title><script src="https://cdn.tailwindcss.com"></script><style>@page { size: A4; margin: 10mm; } body { margin: 20px; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: sans-serif; background: white; } ::-webkit-scrollbar { display: none; } .no-print { display: none !important; }</style></head><body><div class="p-8 max-w-4xl mx-auto"><div class="mb-8 border-b pb-4 flex justify-between items-end"><div><h1 class="text-3xl font-bold text-slate-900 mb-1">${selectedRecipe?.name}</h1><p class="text-sm text-slate-500 uppercase tracking-wide">BistroConnect Recipe Card</p></div><div class="text-right"><p class="text-xs text-slate-400">Generated on ${new Date().toLocaleDateString()}</p></div></div>${clone.innerHTML}</div><script>setTimeout(() => { window.print(); window.close(); }, 1000);</script></body></html>`);
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

    const handleShareInternal = () => {
        if (!selectedRecipe || !shareTargetUser) return;
        const targetUserObj = allUsers.find(u => u.id === shareTargetUser);
        if (!targetUserObj) return;
        const success = storageService.shareRecipeWithUser(user.id, user.name, shareTargetUser, selectedRecipe);
        if (success) { alert(`Shared with ${targetUserObj.name}!`); setShareTargetUser(''); } else { alert("Failed to share."); }
    };

    const handleCopyLink = () => {
        if (!selectedRecipe) return;
        const shareUrl = `https://bistroconnect.in/shared/recipe/${selectedRecipe.sku_id}?token=${Math.random().toString(36).substr(2, 9)}`;
        navigator.clipboard.writeText(shareUrl).then(() => { setCopyLinkStatus('copied'); setTimeout(() => setCopyLinkStatus('idle'), 2000); });
    };

    const handlePostComment = () => {
        if (!newComment.trim() || !selectedRecipe) return;
        const comment: RecipeComment = { id: `cmt_${Date.now()}`, userId: user.id, userName: user.name, text: newComment, date: new Date().toISOString() };
        storageService.addRecipeComment(user.id, selectedRecipe.sku_id, comment);
        setNewComment('');
        loadRecipes(); 
    };

    const recalculateCosts = (ingredients: any[]) => {
        const newFoodCost = ingredients.reduce((acc, curr) => acc + (curr.cost_per_serving || 0), 0);
        const newSellingPrice = Math.ceil(newFoodCost / 0.30);
        return { newFoodCost: parseFloat(newFoodCost.toFixed(2)), newSellingPrice };
    };

    const handleIngredientChange = (index: number, field: string, value: any) => {
        if (!selectedRecipe) return;
        const updatedIngredients = [...selectedRecipe.ingredients];
        if (field === 'cost_per_serving') {
             const cost = isNaN(parseFloat(value)) ? 0 : parseFloat(value);
             updatedIngredients[index] = { ...updatedIngredients[index], cost_per_serving: cost };
        } else {
             updatedIngredients[index] = { ...updatedIngredients[index], [field]: value };
        }
        const { newFoodCost, newSellingPrice } = recalculateCosts(updatedIngredients);
        setSelectedRecipe({ ...selectedRecipe, ingredients: updatedIngredients, food_cost_per_serving: newFoodCost, suggested_selling_price: newSellingPrice });
    };

    const handleAddIngredient = () => {
        if (!selectedRecipe) return;
        const newIng = { ingredient_id: `ing_${Date.now()}`, name: '', qty: '', cost_per_serving: 0, unit: 'unit' };
        setSelectedRecipe({ ...selectedRecipe, ingredients: [...selectedRecipe.ingredients, newIng] });
    };

    const handleRemoveIngredient = (index: number) => {
        if (!selectedRecipe) return;
        const updatedIngredients = selectedRecipe.ingredients.filter((_, i) => i !== index);
        const { newFoodCost, newSellingPrice } = recalculateCosts(updatedIngredients);
        setSelectedRecipe({ ...selectedRecipe, ingredients: updatedIngredients, food_cost_per_serving: newFoodCost, suggested_selling_price: newSellingPrice });
    };

    const updateField = (field: keyof RecipeCard, value: any) => {
        if (selectedRecipe) { setSelectedRecipe({ ...selectedRecipe, [field]: value }); }
    };

    const handleAddStep = () => {
        if (selectedRecipe) { setSelectedRecipe({ ...selectedRecipe, preparation_steps: [...selectedRecipe.preparation_steps, "New step"] }); }
    };

    const handleRemoveStep = (idx: number) => {
        if (selectedRecipe) { const newSteps = selectedRecipe.preparation_steps.filter((_, i) => i !== idx); setSelectedRecipe({ ...selectedRecipe, preparation_steps: newSteps }); }
    };

    const handleStepChange = (idx: number, val: string) => {
        if (selectedRecipe) { const newSteps = [...selectedRecipe.preparation_steps]; newSteps[idx] = val; setSelectedRecipe({ ...selectedRecipe, preparation_steps: newSteps }); }
    };

    const handleBillUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && selectedRecipe) {
            setIsUploadingBill(true);
            setUploadFeedback(null);
            setTimeout(() => {
                const updatedIngredients = selectedRecipe.ingredients.map(ing => {
                    const shouldUpdate = Math.random() > 0.6; 
                    if (shouldUpdate && ing.cost_per_unit) {
                        const variance = 1 + (Math.random() * 0.2 - 0.1); 
                        const newCost = ing.cost_per_unit * variance;
                        return { ...ing, cost_per_unit: parseFloat(newCost.toFixed(2)), cost_per_serving: parseFloat(((ing.qty_per_serving || 0.1) * newCost * (1 + (ing.waste_pct || 0)/100)).toFixed(2)) };
                    }
                    return ing;
                });
                const { newFoodCost, newSellingPrice } = recalculateCosts(updatedIngredients);
                const updatedRecipe = { ...selectedRecipe, ingredients: updatedIngredients, food_cost_per_serving: newFoodCost, suggested_selling_price: newSellingPrice };
                setSelectedRecipe(updatedRecipe);
                ingredientService.learnPrices(updatedIngredients);
                setIsUploadingBill(false);
                setUploadFeedback("Costs updated & prices recalculated!");
                if (fileInputRef.current) fileInputRef.current.value = '';
                setTimeout(() => setUploadFeedback(null), 3000);
            }, 2000);
        }
    };

    const costBreakdownData = selectedRecipe?.ingredients?.map((ing) => ({
        name: ing.name || 'Unknown',
        value: ing.cost_per_serving || 0
    })).sort((a, b) => b.value - a.value).slice(0, 6) || [];

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col gap-6 relative">
            {/* Header */}
            <div className="flex justify-between items-center print:hidden">
                <div className="flex gap-2">
                    <button 
                        onClick={() => setViewMode('list')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'list' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                    >
                        Recipe Library
                    </button>
                    <button 
                        onClick={() => { setViewMode('create'); setSelectedRecipe(null); setIsEditing(false); }}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${viewMode === 'create' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                    >
                        <Plus size={16} /> New Recipe
                    </button>
                </div>
            </div>

            {/* Share & Export Modal */}
            {showShareModal && selectedRecipe && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Share2 size={20} className="text-blue-500" /> Share Recipe
                            </h3>
                            <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                <span className="sr-only">Close</span>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            
                            {/* Option 1: Public Link */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 flex items-center gap-2">
                                    <Globe size={14} /> Public Link
                                </label>
                                <div className="flex gap-2">
                                    <div className="flex-1 relative">
                                        <input 
                                            readOnly 
                                            value={`https://bistroconnect.in/shared/recipe/${selectedRecipe.sku_id}`}
                                            className="w-full pl-4 pr-10 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 focus:outline-none"
                                        />
                                        <div className="absolute right-3 top-2.5 text-emerald-500 pointer-events-none">
                                            <Lock size={14} />
                                        </div>
                                    </div>
                                    <button 
                                        onClick={handleCopyLink}
                                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 min-w-[100px] justify-center ${
                                            copyLinkStatus === 'copied' 
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                            : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90'
                                        }`}
                                    >
                                        {copyLinkStatus === 'copied' ? <Check size={16} /> : <Copy size={16} />}
                                        {copyLinkStatus === 'copied' ? 'Copied' : 'Copy'}
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">Anyone with the link can view this recipe.</p>
                            </div>

                            <div className="border-t border-slate-100 dark:border-slate-800"></div>

                            {/* Option 2: Internal Team */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 flex items-center gap-2">
                                    <Users size={14} /> Collaborate with Team
                                </label>
                                <div className="flex gap-2">
                                    <select 
                                        value={shareTargetUser} 
                                        onChange={(e) => setShareTargetUser(e.target.value)}
                                        className="flex-1 p-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="">Select team member...</option>
                                        {allUsers.map(u => (
                                            <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                        ))}
                                    </select>
                                    <button 
                                        onClick={handleShareInternal}
                                        disabled={!shareTargetUser}
                                        className="px-4 py-2 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-bold text-sm rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 disabled:opacity-50 transition-colors"
                                    >
                                        Invite
                                    </button>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 dark:border-slate-800"></div>

                            {/* Option 3: Export/Email */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 flex items-center gap-2">
                                    <FileDown size={14} /> Export Options
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        onClick={handlePrint}
                                        className="flex items-center justify-center gap-2 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm transition-colors"
                                    >
                                        <Printer size={16} /> Save as PDF
                                    </button>
                                    <button 
                                        onClick={() => { alert(`Sent PDF of "${selectedRecipe.name}" to ${user.email}`); setShowShareModal(false); }}
                                        className="flex items-center justify-center gap-2 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm transition-colors"
                                    >
                                        <Mail size={16} /> Email PDF
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
                
                {/* LIST VIEW */}
                {viewMode === 'list' && (
                    <div className="p-6 h-full overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {recipes.map(recipe => (
                                <div 
                                    key={recipe.sku_id} 
                                    onClick={() => { setSelectedRecipe(recipe); setViewMode('detail'); setIsEditing(false); }}
                                    className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-emerald-500 dark:hover:border-emerald-500 cursor-pointer transition-all group relative"
                                >
                                    {recipe.sharedBy && (
                                        <div className="absolute top-2 right-2 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <Users size={10} /> Shared by {recipe.sharedBy.split(' ')[0]}
                                        </div>
                                    )}
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="p-2 bg-white dark:bg-slate-700 rounded-lg shadow-sm">
                                            <ChefHat size={20} className="text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <span className="text-xs font-bold bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 px-2 py-1 rounded">
                                            {recipe.category}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-slate-900 dark:text-white mb-1 truncate">{recipe.name}</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">{recipe.human_summary}</p>
                                    
                                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700 pt-3">
                                        <span className="flex items-center gap-1"><Clock size={12}/> {recipe.prep_time_min + (recipe.cook_time_minutes || 0)}m</span>
                                        <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                                            <DollarSign size={12}/> ₹{recipe.food_cost_per_serving.toFixed(0)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {recipes.length === 0 && (
                                <div className="col-span-full text-center py-20 text-slate-400">
                                    <ChefHat size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>No recipes found. Create your first one!</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* CREATE VIEW */}
                {viewMode === 'create' && (
                    <div className="p-8 h-full overflow-y-auto flex flex-col items-center justify-center max-w-2xl mx-auto">
                        <div className="w-full space-y-6">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Bistro Recipe Architect</h2>
                                <p className="text-slate-500 dark:text-slate-400">Describe your dish, and we'll engineer the perfect recipe with costing and plating.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Dish Name</label>
                                <input 
                                    value={dishName}
                                    onChange={(e) => setDishName(e.target.value)}
                                    placeholder="e.g. Truffle Mushroom Risotto"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Requirements / Twist</label>
                                <textarea 
                                    value={requirements}
                                    onChange={(e) => setRequirements(e.target.value)}
                                    placeholder="e.g. Make it vegan, use locally sourced ingredients, keep food cost under ₹150..."
                                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none h-32 resize-none"
                                />
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm flex items-center gap-2">
                                    <AlertTriangle size={16} /> {error}
                                </div>
                            )}

                            <button 
                                onClick={handleGenerate}
                                disabled={isGenerating || !dishName}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                            >
                                {isGenerating ? <Loader2 className="animate-spin" /> : <ChefHat />} 
                                {isFree ? 'Generate Recipe (Free Quota)' : `Generate Recipe (${cost} CR)`}
                            </button>
                        </div>
                    </div>
                )}

                {/* DETAIL VIEW */}
                {viewMode === 'detail' && selectedRecipe && (
                    <div className="h-full flex flex-col">
                        {/* Detail Header */}
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center print:hidden">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setViewMode('list')} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                                    <ArrowLeft size={20} className="text-slate-600 dark:text-slate-300" />
                                </button>
                                
                                {isEditing ? (
                                    <div className="flex flex-col gap-2">
                                        <input 
                                            value={selectedRecipe.name}
                                            onChange={(e) => updateField('name', e.target.value)}
                                            className="text-xl font-bold bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-600 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                        <div className="flex gap-2">
                                            <select 
                                                value={selectedRecipe.category}
                                                onChange={(e) => updateField('category', e.target.value)}
                                                className="text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-2 py-1"
                                            >
                                                <option value="main">Main</option>
                                                <option value="snack">Snack</option>
                                                <option value="beverage">Beverage</option>
                                                <option value="dessert">Dessert</option>
                                            </select>
                                            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-2 py-1">
                                                <span className="text-xs text-slate-500">Yield:</span>
                                                <input 
                                                    type="number"
                                                    value={selectedRecipe.yield}
                                                    onChange={(e) => updateField('yield', parseInt(e.target.value) || 1)}
                                                    className="w-12 text-xs font-bold outline-none bg-transparent"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            {selectedRecipe.name}
                                            {selectedRecipe.sharedBy && (
                                                <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded-full font-normal">
                                                    Shared by {selectedRecipe.sharedBy}
                                                </span>
                                            )}
                                        </h2>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                            <span className="uppercase">{selectedRecipe.category}</span> • Yield: {selectedRecipe.yield} Servings
                                        </p>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setIsEditing(!isEditing)}
                                    className={`px-3 py-2 rounded-lg flex items-center gap-2 font-bold transition-colors ${
                                        isEditing 
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    {isEditing ? <Check size={18} /> : <Edit3 size={18} />}
                                    {isEditing ? 'Done' : 'Edit'}
                                </button>
                                
                                {!isEditing && (
                                    <>
                                        <button onClick={() => setShowShareModal(true)} className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 font-bold rounded-lg flex items-center gap-2 transition-colors">
                                            <Share2 size={18} /> Share
                                        </button>
                                        <button onClick={handleExportCSV} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg" title="Export to Excel">
                                            <FileDown size={20} />
                                        </button>
                                        <button onClick={handlePrint} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg" title="Download PDF / Print">
                                            <Printer size={20} />
                                        </button>
                                    </>
                                )}
                                
                                <button onClick={handleSave} className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2">
                                    <Save size={16} /> Save
                                </button>
                                <button onClick={() => handleDelete(selectedRecipe.sku_id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>

                        {/* ... (Rest of Detail View content, same as previous file content) ... */}
                        <div className="flex-1 overflow-y-auto p-6 lg:p-8" id="print-area">
                            <div className="max-w-5xl mx-auto space-y-8">
                                {/* Image & Summary Section */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Image Card */}
                                    <div className="md:col-span-1 h-64 md:h-auto bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm relative group border border-slate-200 dark:border-slate-700">
                                        {selectedRecipe.imageUrl ? (
                                            <img 
                                                src={selectedRecipe.imageUrl} 
                                                alt={selectedRecipe.name} 
                                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-400 flex-col gap-2">
                                                <ImageIcon size={48} />
                                                <span className="text-xs">No Image Available</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Stats Cards */}
                                    <div className="md:col-span-2 grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800 flex flex-col justify-center">
                                            <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase mb-1">Food Cost</p>
                                            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">₹{selectedRecipe.food_cost_per_serving.toFixed(2)}</p>
                                        </div>
                                        
                                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 flex flex-col justify-center relative group">
                                            <p className="text-xs font-bold text-blue-800 dark:text-blue-400 uppercase mb-1 flex items-center gap-1">
                                                Selling Price <Edit2Icon size={10} className="opacity-50"/>
                                            </p>
                                            <div className="flex items-center">
                                                <span className="text-2xl font-black text-blue-700 dark:text-blue-300 mr-1">₹</span>
                                                <input 
                                                    type="number" 
                                                    value={selectedRecipe.suggested_selling_price}
                                                    onChange={(e) => {
                                                        const newPrice = Math.max(0, parseFloat(e.target.value) || 0);
                                                        setSelectedRecipe(prev => prev ? { ...prev, suggested_selling_price: newPrice } : null);
                                                    }}
                                                    className="text-2xl font-black text-blue-700 dark:text-blue-300 bg-transparent border-b border-blue-300 focus:border-blue-500 outline-none w-full max-w-[120px] p-0"
                                                />
                                            </div>
                                        </div>

                                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800 flex flex-col justify-center">
                                            <p className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase mb-1">Margin</p>
                                            <p className="text-2xl font-black text-amber-700 dark:text-amber-300">
                                                {selectedRecipe.suggested_selling_price > 0 
                                                    ? ((1 - (selectedRecipe.food_cost_per_serving / selectedRecipe.suggested_selling_price)) * 100).toFixed(1)
                                                    : '0.0'}%
                                            </p>
                                        </div>
                                        <div className={`p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border flex flex-col justify-center ${isEditing ? 'border-purple-300 dark:border-purple-600' : 'border-purple-100 dark:border-purple-800'}`}>
                                            <p className="text-xs font-bold text-purple-800 dark:text-purple-400 uppercase mb-1">Time</p>
                                            {isEditing ? (
                                                <div className="flex gap-2">
                                                    <div>
                                                        <span className="text-[10px] text-slate-500">Prep</span>
                                                        <input 
                                                            type="number" 
                                                            value={selectedRecipe.prep_time_min}
                                                            onChange={e => updateField('prep_time_min', parseInt(e.target.value) || 0)}
                                                            className="w-12 bg-white dark:bg-slate-800 border rounded text-xs p-1"
                                                        />
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] text-slate-500">Cook</span>
                                                        <input 
                                                            type="number" 
                                                            value={selectedRecipe.cook_time_minutes || 0}
                                                            onChange={e => updateField('cook_time_minutes', parseInt(e.target.value) || 0)}
                                                            className="w-12 bg-white dark:bg-slate-800 border rounded text-xs p-1"
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-baseline gap-1">
                                                    <p className="text-2xl font-black text-purple-700 dark:text-purple-300">
                                                        {selectedRecipe.total_time_minutes || (selectedRecipe.prep_time_min + (selectedRecipe.cook_time_minutes || 0))}m
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Ingredients & Instructions Sections Omitted for Brevity - Keeping Existing Structure */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Keep existing Ingredients Table logic here */}
                                    <div className="space-y-6">
                                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden relative">
                                            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 flex justify-between items-center no-print">
                                                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                                    <Scale size={18} /> Ingredients & Costing
                                                </h3>
                                            </div>
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800">
                                                    <tr>
                                                        <th className="px-6 py-3">Item</th>
                                                        <th className="px-6 py-3">Qty</th>
                                                        <th className="px-6 py-3 text-right">Cost</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                                    {selectedRecipe.ingredients.map((ing, i) => (
                                                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 group">
                                                            <td className="px-6 py-3 font-medium text-slate-800 dark:text-white">{ing.name}</td>
                                                            <td className="px-6 py-3 text-slate-600 dark:text-slate-300">{ing.qty}</td>
                                                            <td className="px-6 py-3 text-right font-mono text-slate-600 dark:text-slate-300">₹{ing.cost_per_serving}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Keep existing Prep logic here */}
                                    <div className="space-y-6">
                                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 print:break-inside-avoid">
                                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
                                                <Utensils size={18} /> Preparation Steps
                                            </h3>
                                            <div className="space-y-4">
                                                {selectedRecipe.preparation_steps.map((step, i) => (
                                                    <div key={i} className="flex gap-4">
                                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs font-bold mt-0.5">
                                                            {i + 1}
                                                        </span>
                                                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{step}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
