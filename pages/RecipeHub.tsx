
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

    useEffect(() => {
        loadRecipes();
        authService.getAllUsers().then(users => {
            setAllUsers(users.filter(u => u.id !== user.id)); 
        });
    }, [user.id]);

    useEffect(() => {
        // Reset edit mode when recipe changes
        setIsEditing(false);
    }, [selectedRecipe?.sku_id]);

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
        if (user.credits < CREDIT_COSTS.RECIPE) {
            setError(`Insufficient credits. Need ${CREDIT_COSTS.RECIPE} CR.`);
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            storageService.deductCredits(user.id, CREDIT_COSTS.RECIPE, `Recipe Gen: ${dishName}`);
            
            const item: MenuItem = {
                sku_id: `sku_${Date.now()}`,
                name: dishName,
                category: 'main', // Default
                prep_time_min: 15,
                current_price: 0,
                ingredients: []
            };

            const recipe = await generateRecipeCard(user.id, item, requirements);
            setSelectedRecipe(recipe);
            setViewMode('detail');
            setIsEditing(true); // Auto-enable edit mode for new generations
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

    const handlePrint = () => {
        const printContent = document.getElementById('print-area');
        if (!printContent) return;

        // Clone the content to manipulate it safely
        const clone = printContent.cloneNode(true) as HTMLElement;

        // 1. Remove all buttons from the clone
        const buttons = clone.querySelectorAll('button');
        buttons.forEach(b => b.remove());

        // 2. Remove elements explicitly marked to hide
        const noPrints = clone.querySelectorAll('.no-print');
        noPrints.forEach(el => el.remove());

        // 3. Convert Inputs to clean text spans
        const inputs = clone.querySelectorAll('input');
        inputs.forEach((input) => {
            const span = document.createElement('span');
            // Get current value from the original input if possible, else fall back to attribute
            span.textContent = (input as HTMLInputElement).value;
            span.className = "font-mono font-bold text-slate-900";
            if (input.parentElement) {
                input.parentElement.replaceChild(span, input);
            }
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
            win.document.write(`
                <html>
                    <head>
                        <title>${selectedRecipe?.name || 'Recipe'} - Print</title>
                        <script src="https://cdn.tailwindcss.com"></script>
                        <style>
                            @page { size: A4; margin: 10mm; }
                            body { margin: 20px; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: sans-serif; background: white; }
                            /* Hide scrollbars */
                            ::-webkit-scrollbar { display: none; }
                            .no-print { display: none !important; }
                        </style>
                    </head>
                    <body>
                        <div class="p-8 max-w-4xl mx-auto">
                            <div class="mb-8 border-b pb-4 flex justify-between items-end">
                                <div>
                                    <h1 class="text-3xl font-bold text-slate-900 mb-1">${selectedRecipe?.name}</h1>
                                    <p class="text-sm text-slate-500 uppercase tracking-wide">BistroConnect Recipe Card</p>
                                </div>
                                <div class="text-right">
                                    <p class="text-xs text-slate-400">Generated on ${new Date().toLocaleDateString()}</p>
                                </div>
                            </div>
                            ${clone.innerHTML}
                        </div>
                        <script>
                            // Wait for Tailwind CDN to process styles
                            setTimeout(() => {
                                window.print();
                                window.close();
                            }, 1000);
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
        
        csvContent += `Recipe Name,${selectedRecipe.name}\n`;
        csvContent += `Yield,${selectedRecipe.yield} portions\n`;
        csvContent += `Food Cost Per Serving,${selectedRecipe.food_cost_per_serving}\n`;
        csvContent += `Suggested Selling Price,${selectedRecipe.suggested_selling_price}\n\n`;
        
        csvContent += "Ingredient,Qty,Unit,Cost Per Unit,Waste %,Cost Per Serving\n";
        selectedRecipe.ingredients.forEach(ing => {
            const row = [
                ing.name,
                ing.qty,
                ing.unit,
                ing.cost_per_unit || 0,
                ing.waste_pct || 0,
                ing.cost_per_serving || 0
            ].join(",");
            csvContent += row + "\n";
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
        if (success) {
            alert(`Shared with ${targetUserObj.name}!`);
            setShareTargetUser('');
        } else {
            alert("Failed to share.");
        }
    };

    const handleCopyLink = () => {
        if (!selectedRecipe) return;
        // Mocking a public share link
        const shareUrl = `https://bistroconnect.in/shared/recipe/${selectedRecipe.sku_id}?token=${Math.random().toString(36).substr(2, 9)}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
            setCopyLinkStatus('copied');
            setTimeout(() => setCopyLinkStatus('idle'), 2000);
        });
    };

    const handlePostComment = () => {
        if (!newComment.trim() || !selectedRecipe) return;
        
        const comment: RecipeComment = {
            id: `cmt_${Date.now()}`,
            userId: user.id,
            userName: user.name,
            text: newComment,
            date: new Date().toISOString()
        };

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

        setSelectedRecipe({
            ...selectedRecipe,
            ingredients: updatedIngredients,
            food_cost_per_serving: newFoodCost,
            suggested_selling_price: newSellingPrice
        });
    };

    const handleAddIngredient = () => {
        if (!selectedRecipe) return;
        const newIng = {
            ingredient_id: `ing_${Date.now()}`,
            name: '',
            qty: '',
            cost_per_serving: 0,
            unit: 'unit'
        };
        const updatedIngredients = [...selectedRecipe.ingredients, newIng];
        setSelectedRecipe({ ...selectedRecipe, ingredients: updatedIngredients });
    };

    const handleRemoveIngredient = (index: number) => {
        if (!selectedRecipe) return;
        const updatedIngredients = selectedRecipe.ingredients.filter((_, i) => i !== index);
        const { newFoodCost, newSellingPrice } = recalculateCosts(updatedIngredients);
        
        setSelectedRecipe({
            ...selectedRecipe,
            ingredients: updatedIngredients,
            food_cost_per_serving: newFoodCost,
            suggested_selling_price: newSellingPrice
        });
    };

    // --- Edit Handlers ---
    const updateField = (field: keyof RecipeCard, value: any) => {
        if (selectedRecipe) {
            setSelectedRecipe({ ...selectedRecipe, [field]: value });
        }
    };

    const handleAddStep = () => {
        if (selectedRecipe) {
            setSelectedRecipe({
                ...selectedRecipe,
                preparation_steps: [...selectedRecipe.preparation_steps, "New step"]
            });
        }
    };

    const handleRemoveStep = (idx: number) => {
        if (selectedRecipe) {
            const newSteps = selectedRecipe.preparation_steps.filter((_, i) => i !== idx);
            setSelectedRecipe({ ...selectedRecipe, preparation_steps: newSteps });
        }
    };

    const handleStepChange = (idx: number, val: string) => {
        if (selectedRecipe) {
            const newSteps = [...selectedRecipe.preparation_steps];
            newSteps[idx] = val;
            setSelectedRecipe({ ...selectedRecipe, preparation_steps: newSteps });
        }
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
                        return {
                            ...ing,
                            cost_per_unit: parseFloat(newCost.toFixed(2)),
                            cost_per_serving: parseFloat(((ing.qty_per_serving || 0.1) * newCost * (1 + (ing.waste_pct || 0)/100)).toFixed(2))
                        };
                    }
                    return ing;
                });

                const { newFoodCost, newSellingPrice } = recalculateCosts(updatedIngredients);

                const updatedRecipe = {
                    ...selectedRecipe,
                    ingredients: updatedIngredients,
                    food_cost_per_serving: newFoodCost,
                    suggested_selling_price: newSellingPrice
                };
                
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
                        onClick={() => { setViewMode('create'); setSelectedRecipe(null); }}
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
                                    onClick={() => { setSelectedRecipe(recipe); setViewMode('detail'); }}
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
                                Generate Recipe ({CREDIT_COSTS.RECIPE} CR)
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
                                        {selectedRecipe.imageUrl && (
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="text-white text-xs font-bold px-2 py-1 bg-black/40 backdrop-blur rounded flex items-center gap-1">
                                                    <Sparkles size={10} /> AI Generated Reference
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Stats Cards */}
                                    <div className="md:col-span-2 grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800 flex flex-col justify-center">
                                            <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase mb-1">Food Cost</p>
                                            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">₹{selectedRecipe.food_cost_per_serving.toFixed(2)}</p>
                                        </div>
                                        
                                        {/* Editable Selling Price */}
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
                                                    {(selectedRecipe.prep_time_minutes || selectedRecipe.cook_time_minutes) && (
                                                        <span className="text-xs text-purple-600 dark:text-purple-400">
                                                            ({selectedRecipe.prep_time_minutes || selectedRecipe.prep_time_min} prep / {selectedRecipe.cook_time_minutes || 0} cook)
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Nutritional Info Section */}
                                        {selectedRecipe.nutritional_info && (
                                            <div className="col-span-2 grid grid-cols-4 gap-2 mt-2">
                                                <div className="bg-slate-100 dark:bg-slate-800 rounded p-2 text-center border border-slate-200 dark:border-slate-700">
                                                    <p className="text-[10px] uppercase font-bold text-slate-500">Calories</p>
                                                    <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">{selectedRecipe.nutritional_info.calories}</p>
                                                </div>
                                                <div className="bg-slate-100 dark:bg-slate-800 rounded p-2 text-center border border-slate-200 dark:border-slate-700">
                                                    <p className="text-[10px] uppercase font-bold text-slate-500">Protein</p>
                                                    <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">{selectedRecipe.nutritional_info.protein}g</p>
                                                </div>
                                                <div className="bg-slate-100 dark:bg-slate-800 rounded p-2 text-center border border-slate-200 dark:border-slate-700">
                                                    <p className="text-[10px] uppercase font-bold text-slate-500">Carbs</p>
                                                    <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">{selectedRecipe.nutritional_info.carbs}g</p>
                                                </div>
                                                <div className="bg-slate-100 dark:bg-slate-800 rounded p-2 text-center border border-slate-200 dark:border-slate-700">
                                                    <p className="text-[10px] uppercase font-bold text-slate-500">Fat</p>
                                                    <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">{selectedRecipe.nutritional_info.fat}g</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Main Content Grid */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        {/* Ingredients Table & Bill Upload */}
                                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden relative">
                                            {isUploadingBill && (
                                                <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 z-20 flex flex-col items-center justify-center backdrop-blur-sm">
                                                    <Loader2 className="animate-spin text-emerald-600 mb-2" size={32}/>
                                                    <p className="font-bold text-slate-800 dark:text-white">Analyzing Invoice...</p>
                                                    <p className="text-xs text-slate-500">Updating ingredient costs</p>
                                                </div>
                                            )}
                                            
                                            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 flex justify-between items-center no-print">
                                                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                                    <Scale size={18} /> Ingredients & Costing
                                                </h3>
                                                
                                                <div className="print:hidden">
                                                    <button 
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="text-[10px] flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 hover:border-emerald-500 text-slate-600 dark:text-slate-300 px-2 py-1.5 rounded transition-all"
                                                        title="Upload Bill to Update Prices"
                                                    >
                                                        <Upload size={12} /> Update Costs (Bill)
                                                    </button>
                                                    <input 
                                                        type="file" 
                                                        ref={fileInputRef} 
                                                        className="hidden" 
                                                        accept=".pdf,.csv,.jpg,.png,.jpeg"
                                                        onChange={handleBillUpload}
                                                    />
                                                </div>
                                            </div>
                                            
                                            {uploadFeedback && (
                                                <div className="bg-emerald-50 dark:bg-emerald-900/30 px-6 py-2 text-xs text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-2 animate-fade-in no-print">
                                                    <CheckCircle2 size={12} /> {uploadFeedback}
                                                </div>
                                            )}

                                            <table className="w-full text-sm text-left">
                                                <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800">
                                                    <tr>
                                                        <th className="px-6 py-3">Item</th>
                                                        <th className="px-6 py-3">Qty</th>
                                                        <th className="px-6 py-3 text-right">Cost</th>
                                                        {isEditing && <th className="px-6 py-3 w-10"></th>}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                                    {selectedRecipe.ingredients.map((ing, i) => (
                                                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 group">
                                                            <td className="px-6 py-3 font-medium text-slate-800 dark:text-white">
                                                                {isEditing ? (
                                                                    <input 
                                                                        value={ing.name}
                                                                        onChange={(e) => handleIngredientChange(i, 'name', e.target.value)}
                                                                        className="w-full bg-transparent border-b border-slate-300 dark:border-slate-600 focus:border-emerald-500 outline-none"
                                                                    />
                                                                ) : ing.name}
                                                            </td>
                                                            <td className="px-6 py-3 text-slate-600 dark:text-slate-300">
                                                                {isEditing ? (
                                                                    <input 
                                                                        value={ing.qty}
                                                                        onChange={(e) => handleIngredientChange(i, 'qty', e.target.value)}
                                                                        className="w-full bg-transparent border-b border-slate-300 dark:border-slate-600 focus:border-emerald-500 outline-none"
                                                                    />
                                                                ) : ing.qty}
                                                            </td>
                                                            <td className="px-6 py-3 text-right font-mono text-slate-600 dark:text-slate-300">
                                                                <div className="flex items-center justify-end gap-1">
                                                                    <span>₹</span>
                                                                    <input
                                                                        type="number"
                                                                        step="0.1"
                                                                        value={ing.cost_per_serving || ''}
                                                                        placeholder="0.00"
                                                                        onChange={(e) => handleIngredientChange(i, 'cost_per_serving', e.target.value)}
                                                                        className={`w-20 bg-transparent text-right outline-none transition-colors text-slate-800 dark:text-white ${isEditing ? 'border-b border-slate-300 dark:border-slate-600 focus:border-emerald-500' : 'border-transparent'}`}
                                                                        readOnly={!isEditing}
                                                                    />
                                                                </div>
                                                            </td>
                                                            {isEditing && (
                                                                <td className="px-6 py-3 text-center">
                                                                    <button onClick={() => handleRemoveIngredient(i)} className="text-red-400 hover:text-red-600">
                                                                        <X size={16} />
                                                                    </button>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {isEditing && (
                                                <div className="p-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                                                    <button 
                                                        onClick={handleAddIngredient}
                                                        className="w-full py-2 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-500 hover:text-emerald-600 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all text-xs font-bold flex items-center justify-center gap-2"
                                                    >
                                                        <Plus size={14} /> Add Ingredient
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Cost Breakdown Visual */}
                                        <div className="mt-8 flex flex-col md:flex-row gap-8 items-center bg-white/40 dark:bg-slate-800/40 p-6 rounded-xl border border-slate-200 dark:border-slate-700 print:break-inside-avoid">
                                            <div className="w-full md:w-1/3 h-[220px]">
                                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 text-center">Cost Distribution</h4>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={costBreakdownData}
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={45}
                                                            outerRadius={75}
                                                            paddingAngle={4}
                                                            dataKey="value"
                                                            stroke="none"
                                                        >
                                                            {costBreakdownData.map((entry, index) => (
                                                                <Cell 
                                                                    key={`cell-${index}`} 
                                                                    fill={CHART_COLORS[index % CHART_COLORS.length]} 
                                                                    stroke={index === 0 ? 'rgba(255,255,255,0.8)' : 'none'}
                                                                    strokeWidth={index === 0 ? 3 : 0}
                                                                />
                                                            ))}
                                                        </Pie>
                                                        <RechartsTooltip 
                                                            content={({ active, payload }) => {
                                                                if (active && payload && payload.length) {
                                                                    const data = payload[0].payload;
                                                                    return (
                                                                        <div className="bg-slate-900 text-white p-2.5 rounded-lg shadow-xl text-xs border border-slate-700">
                                                                            <p className="font-bold mb-1">{data.name}</p>
                                                                            <div className="flex items-center justify-between gap-4">
                                                                                <span className="text-slate-400">Cost:</span>
                                                                                <span className="text-emerald-400 font-mono font-bold">₹{data.value.toFixed(2)}</span>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                }
                                                                return null;
                                                            }}
                                                        />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className="flex-1 grid grid-cols-2 gap-4">
                                                {costBreakdownData.map((entry, idx) => (
                                                    <div key={idx} className="flex items-start gap-2">
                                                        <div className="w-3 h-3 rounded-full shrink-0 mt-1" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}></div>
                                                        <div className="text-xs flex-1">
                                                            <div className="flex justify-between items-baseline">
                                                                <span className={`font-bold ${idx === 0 ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                                                                    {entry.name}
                                                                </span>
                                                                <span className="text-slate-500 font-mono ml-2">₹{entry.value.toFixed(1)}</span>
                                                            </div>
                                                            {idx === 0 && (
                                                                <div className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold text-red-500 uppercase tracking-wider bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded">
                                                                    <TrendingUp size={8} /> Top Cost Driver
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        {/* Preparation & Presentation Details */}
                                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                                            <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                                <ChefHat size={18} /> Prep & Presentation
                                            </h3>
                                            <div className="space-y-4">
                                                <div>
                                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Equipment Needed</p>
                                                    {isEditing ? (
                                                        <input 
                                                            value={selectedRecipe.equipment_needed.join(', ')}
                                                            onChange={(e) => updateField('equipment_needed', e.target.value.split(',').map(s => s.trim()))}
                                                            className="w-full border border-emerald-300 dark:border-emerald-600 bg-emerald-50/50 dark:bg-slate-800 rounded p-2 text-sm"
                                                            placeholder="Comma separated equipment..."
                                                        />
                                                    ) : (
                                                        <div className="flex flex-wrap gap-2">
                                                            {selectedRecipe.equipment_needed.map((item, i) => (
                                                                <span key={i} className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded border border-slate-200 dark:border-slate-600 font-medium">
                                                                    {item}
                                                                </span>
                                                            ))}
                                                            {(!selectedRecipe.equipment_needed || selectedRecipe.equipment_needed.length === 0) && (
                                                                <span className="text-sm text-slate-400 italic">Standard kitchen equipment</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                <div>
                                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Gourmet Plating & Presentation</p>
                                                    {isEditing ? (
                                                        <textarea 
                                                            value={selectedRecipe.portioning_guideline || ''}
                                                            onChange={(e) => updateField('portioning_guideline', e.target.value)}
                                                            className="w-full border border-emerald-300 dark:border-emerald-600 bg-emerald-50/50 dark:bg-slate-800 rounded p-2 text-sm min-h-[80px]"
                                                        />
                                                    ) : (
                                                        <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                                                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                                                                {selectedRecipe.portioning_guideline || "No specific presentation guidelines."}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Instructions */}
                                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 print:break-inside-avoid">
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                                    <Utensils size={18} /> Preparation Steps
                                                </h3>
                                                {isEditing && (
                                                    <button onClick={handleAddStep} className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded hover:bg-emerald-200 transition-colors flex items-center gap-1">
                                                        <Plus size={12} /> Add Step
                                                    </button>
                                                )}
                                            </div>
                                            <div className="space-y-4">
                                                {selectedRecipe.preparation_steps.map((step, i) => (
                                                    <div key={i} className="flex gap-4">
                                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs font-bold mt-0.5">
                                                            {i + 1}
                                                        </span>
                                                        {isEditing ? (
                                                            <div className="flex-1 flex gap-2">
                                                                <textarea 
                                                                    value={step} 
                                                                    onChange={(e) => handleStepChange(i, e.target.value)}
                                                                    className="flex-1 border border-emerald-300 dark:border-emerald-600 bg-emerald-50/50 dark:bg-slate-800 rounded p-2 text-sm"
                                                                    rows={2}
                                                                />
                                                                <button onClick={() => handleRemoveStep(i)} className="text-red-400 hover:text-red-600 self-center">
                                                                    <X size={16} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{step}</p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* AI Insights */}
                                        <div className={`rounded-xl border p-6 print:break-inside-avoid ${isEditing ? 'bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-600' : 'bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/10 dark:to-purple-900/10 border-indigo-100 dark:border-indigo-800'}`}>
                                            <h3 className="font-bold text-indigo-900 dark:text-indigo-300 mb-2 text-sm uppercase flex items-center gap-2">
                                                <Sparkles size={14} /> Chef's Notes
                                            </h3>
                                            
                                            {isEditing ? (
                                                <textarea 
                                                    value={selectedRecipe.human_summary || ''}
                                                    onChange={(e) => updateField('human_summary', e.target.value)}
                                                    className="w-full border border-emerald-300 dark:border-emerald-600 bg-emerald-50/50 dark:bg-slate-800 rounded p-2 text-sm min-h-[100px]"
                                                />
                                            ) : (
                                                <p className="text-sm text-indigo-800 dark:text-indigo-200 leading-relaxed italic">
                                                    "{selectedRecipe.human_summary}"
                                                </p>
                                            )}
                                            
                                            {selectedRecipe.allergens && selectedRecipe.allergens.length > 0 && (
                                                <div className="mt-4 pt-4 border-t border-indigo-200/50">
                                                    <p className="text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase mb-2">Allergens</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {selectedRecipe.allergens.map((alg, i) => (
                                                            <span key={i} className="px-2 py-1 bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 text-xs rounded border border-indigo-100 dark:border-indigo-800 font-medium">
                                                                {alg}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Team Comments Section */}
                                        {!isEditing && (
                                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 print:hidden">
                                                <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                                    <MessageSquare size={18} /> Team Feedback & Notes
                                                </h3>
                                                
                                                <div className="space-y-4 mb-4 max-h-60 overflow-y-auto custom-scrollbar">
                                                    {(!selectedRecipe.comments || selectedRecipe.comments.length === 0) ? (
                                                        <p className="text-sm text-slate-400 italic text-center py-4">No comments yet. Start the discussion!</p>
                                                    ) : (
                                                        selectedRecipe.comments.map((comment) => (
                                                            <div key={comment.id} className="flex gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
                                                                    {comment.userName.charAt(0)}
                                                                </div>
                                                                <div className="flex-1 bg-slate-50 dark:bg-slate-900 rounded-lg p-3 border border-slate-100 dark:border-slate-700">
                                                                    <div className="flex justify-between items-baseline mb-1">
                                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{comment.userName}</span>
                                                                        <span className="text-[10px] text-slate-400">{new Date(comment.date).toLocaleDateString()}</span>
                                                                    </div>
                                                                    <p className="text-sm text-slate-600 dark:text-slate-400">{comment.text}</p>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>

                                                <div className="flex gap-2">
                                                    <input 
                                                        type="text" 
                                                        value={newComment}
                                                        onChange={(e) => setNewComment(e.target.value)}
                                                        placeholder="Add a note for the kitchen team..."
                                                        className="flex-1 px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                                        onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                                                    />
                                                    <button 
                                                        onClick={handlePostComment}
                                                        disabled={!newComment.trim()}
                                                        className="p-2 bg-slate-900 dark:bg-emerald-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-colors"
                                                    >
                                                        <Send size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
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
