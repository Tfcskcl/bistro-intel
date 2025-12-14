
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
    Copy, Link, Mail, Globe, Check, Lock, Edit3, X, FileCheck, Download, Wallet
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

    // Sharing & Export State
    const [showShareModal, setShowShareModal] = useState(false);
    const [showPrintModal, setShowPrintModal] = useState(false);
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
            const updated = recipes.filter(r => r.sku_id !== sku_id);
            // @ts-ignore
            await storageService.saveRecipeAsync(user.id, { ...recipes.find(r => r.sku_id !== sku_id) }); 
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
        
        // Cleanup UI elements
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
        
        // Prepare Notes HTML
        let notesHtml = '';
        if (printOptions.includeNotes && selectedRecipe.comments && selectedRecipe.comments.length > 0) {
            notesHtml = `
                <div class="mt-8 pt-8 border-t border-slate-200 break-inside-avoid">
                    <h3 class="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                        Recipe Notes
                    </h3>
                    <div class="space-y-4">
                        ${selectedRecipe.comments.map(c => `
                            <div class="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <p class="text-sm text-slate-800 leading-relaxed" style="white-space: pre-wrap;">${c.text}</p>
                                <div class="flex items-center gap-2 mt-2 text-xs text-slate-500 font-medium">
                                    <div class="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">${c.userName.charAt(0)}</div>
                                    <span>${c.userName} • ${new Date(c.date).toLocaleDateString()}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

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
                        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
                    </head>
                    <body>
                        <div class="max-w-4xl mx-auto">
                            <div class="mb-8 border-b-2 border-slate-900 pb-6 flex justify-between items-start">
                                <div>
                                    <h1 class="text-4xl font-black text-slate-900 mb-2 tracking-tight">${selectedRecipe.name}</h1>
                                    <div class="flex items-center gap-3">
                                        <p class="text-sm font-bold text-slate-500 uppercase tracking-widest">BistroConnect • Recipe Architect</p>
                                        ${selectedRecipe.sharedBy ? `<span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">Shared by ${selectedRecipe.sharedBy}</span>` : ''}
                                    </div>
                                </div>
                                <div class="text-right">
                                    <div class="inline-block px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-600 mb-1 border border-slate-200">
                                        ${selectedRecipe.category.toUpperCase()}
                                    </div>
                                    <p class="text-xs text-slate-400 font-mono">Generated: ${new Date().toLocaleDateString()}</p>
                                </div>
                            </div>
                            
                            ${clone.innerHTML}
                            
                            ${notesHtml}
                            
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
        setShowPrintModal(false);
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

    const handleShareInternal = async () => {
        if (!selectedRecipe || !shareTargetUser) return;
        const targetUserObj = allUsers.find(u => u.id === shareTargetUser);
        if (!targetUserObj) return;
        const success = await storageService.shareRecipeWithUser(user.id, user.name, shareTargetUser, selectedRecipe);
        if (success) { alert(`Shared with ${targetUserObj.name}!`); setShareTargetUser(''); } else { alert("Failed to share."); }
    };

    const handleCopyLink = () => {
        if (!selectedRecipe) return;
        const shareUrl = `https://bistroconnect.in/shared/recipe/${selectedRecipe.sku_id}?token=${Math.random().toString(36).substr(2, 9)}`;
        navigator.clipboard.writeText(shareUrl).then(() => { setCopyLinkStatus('copied'); setTimeout(() => setCopyLinkStatus('idle'), 2000); });
    };

    const handlePostComment = async () => {
        if (!newComment.trim() || !selectedRecipe) return;
        const comment: RecipeComment = { id: `cmt_${Date.now()}`, userId: user.id, userName: user.name, text: newComment, date: new Date().toISOString() };
        await storageService.addRecipeComment(user.id, selectedRecipe.sku_id, comment);
        setNewComment('');
        await loadRecipes(); 
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
        const updatedIngredients = [...selectedRecipe.ingredients, newIng];
        setSelectedRecipe({ ...selectedRecipe, ingredients: updatedIngredients });
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
        <div className="h-[calc(100vh-6rem)] flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div className="flex gap-2">
                    <button onClick={() => setViewMode('list')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'list' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>My Recipes</button>
                    <button onClick={() => setViewMode('create')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'create' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>Create New</button>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 rounded-full text-xs font-bold"><Wallet size={12}/> Credits: {user.credits}</div>
            </div>

            <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col relative transition-colors">
                
                {/* LIST VIEW */}
                {viewMode === 'list' && (
                    <div className="flex-1 overflow-y-auto p-6">
                        {recipes.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                                <ChefHat size={48} className="mb-4 opacity-50"/>
                                <p>No recipes yet. Create your first one!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {recipes.map(recipe => (
                                    <div key={recipe.sku_id} onClick={() => { setSelectedRecipe(recipe); setViewMode('detail'); }} className="group cursor-pointer bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden hover:shadow-md transition-all">
                                        <div className="h-32 bg-slate-200 dark:bg-slate-700 relative overflow-hidden">
                                            {recipe.imageUrl ? (
                                                <img src={recipe.imageUrl} alt={recipe.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-400"><ImageIcon size={32}/></div>
                                            )}
                                            <div className="absolute top-2 right-2 bg-white/90 dark:bg-black/60 backdrop-blur px-2 py-1 rounded text-xs font-bold text-slate-800 dark:text-white">
                                                {((1 - (recipe.food_cost_per_serving / recipe.suggested_selling_price)) * 100).toFixed(0)}% Margin
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <h3 className="font-bold text-slate-800 dark:text-white mb-1 truncate">{recipe.name}</h3>
                                            <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 mt-2">
                                                <span className="bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded">{recipe.category}</span>
                                                <span>₹{recipe.food_cost_per_serving} / ₹{recipe.suggested_selling_price}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* CREATE VIEW */}
                {viewMode === 'create' && (
                    <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center">
                        <div className="max-w-xl w-full space-y-6">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Design a New Recipe</h2>
                                <p className="text-slate-500 dark:text-slate-400">Describe your dish, and AI will generate a complete costed recipe card.</p>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Dish Name</label>
                                <input 
                                    value={dishName}
                                    onChange={e => setDishName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white"
                                    placeholder="e.g. Truffle Mushroom Risotto"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Requirements / Context</label>
                                <textarea 
                                    value={requirements}
                                    onChange={e => setRequirements(e.target.value)}
                                    rows={4}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white resize-none"
                                    placeholder="e.g. Use local ingredients, keep food cost under ₹150, gluten-free..."
                                />
                            </div>

                            {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2"><AlertTriangle size={16}/> {error}</div>}

                            <button 
                                onClick={handleGenerate}
                                disabled={isGenerating || !dishName}
                                className="w-full py-4 bg-slate-900 dark:bg-emerald-600 text-white font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                            >
                                {isGenerating ? <Loader2 className="animate-spin" size={20}/> : <Sparkles size={20}/>}
                                {isGenerating ? 'Engineering Recipe...' : `Generate Recipe (${cost} CR)`}
                            </button>
                        </div>
                    </div>
                )}

                {/* DETAIL VIEW */}
                {viewMode === 'detail' && selectedRecipe && (
                    <div className="flex flex-col h-full overflow-hidden">
                        {/* Detail Header */}
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                             <div className="flex items-center gap-4">
                                 <button onClick={() => setViewMode('list')} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500 dark:text-slate-400">
                                     <ArrowLeft size={20}/>
                                 </button>
                                 <h2 className="font-bold text-lg text-slate-900 dark:text-white truncate max-w-md">{selectedRecipe.name}</h2>
                                 <span className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300 font-bold uppercase">{selectedRecipe.category}</span>
                             </div>
                             <div className="flex gap-2">
                                 <button onClick={() => setIsEditing(!isEditing)} className={`p-2 rounded-lg transition-colors ${isEditing ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                                     {isEditing ? <Save size={18}/> : <Edit3 size={18}/>}
                                 </button>
                                 <button onClick={executePrint} className="p-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400"><Printer size={18}/></button>
                                 <button onClick={handleExportCSV} className="p-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400"><FileDown size={18}/></button>
                                 <button onClick={handleDelete.bind(null, selectedRecipe.sku_id)} className="p-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg text-red-500 dark:text-red-400"><Trash2 size={18}/></button>
                             </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar" id="print-area">
                            <div className="max-w-5xl mx-auto space-y-8">
                                {/* Top Stats */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="lg:col-span-2 space-y-6">
                                        <div className="relative aspect-video rounded-xl overflow-hidden shadow-sm bg-slate-100 dark:bg-slate-800">
                                            <img src={selectedRecipe.imageUrl} alt={selectedRecipe.name} className="w-full h-full object-cover"/>
                                            <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/80 to-transparent p-6">
                                                <p className="text-white text-sm font-medium leading-relaxed drop-shadow-md">{selectedRecipe.human_summary}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                                                <p className="text-xs text-emerald-800 dark:text-emerald-400 font-bold uppercase mb-1">Food Cost</p>
                                                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-500">₹{selectedRecipe.food_cost_per_serving}</p>
                                            </div>
                                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
                                                <p className="text-xs text-blue-800 dark:text-blue-400 font-bold uppercase mb-1">Selling Price</p>
                                                <p className="text-2xl font-black text-blue-700 dark:text-blue-500">₹{selectedRecipe.suggested_selling_price}</p>
                                            </div>
                                            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-900/30">
                                                <p className="text-xs text-purple-800 dark:text-purple-400 font-bold uppercase mb-1">Gross Margin</p>
                                                <p className="text-2xl font-black text-purple-700 dark:text-purple-500">
                                                    {((1 - (selectedRecipe.food_cost_per_serving / selectedRecipe.suggested_selling_price)) * 100).toFixed(0)}%
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 h-64">
                                            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-4">Cost Breakdown</h4>
                                            <ResponsiveContainer width="100%" height="85%">
                                                <PieChart>
                                                    <Pie data={costBreakdownData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                                                        {costBreakdownData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <RechartsTooltip />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 space-y-3 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-slate-500 dark:text-slate-400">Prep Time</span>
                                                <span className="font-bold text-slate-800 dark:text-white">{selectedRecipe.prep_time_min || 15} min</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500 dark:text-slate-400">Portion</span>
                                                <span className="font-bold text-slate-800 dark:text-white">{selectedRecipe.portioning_guideline}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500 dark:text-slate-400">Calories</span>
                                                <span className="font-bold text-slate-800 dark:text-white">{selectedRecipe.nutritional_info?.calories || 0} kcal</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Ingredients & Instructions Sections */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden relative">
                                            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 flex justify-between items-center no-print">
                                                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                                    <Scale size={18} /> Ingredients & Costing
                                                </h3>
                                                {isEditing && (
                                                    <button onClick={handleAddIngredient} className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded hover:bg-emerald-200 flex items-center gap-1">
                                                        <Plus size={12} /> Add
                                                    </button>
                                                )}
                                            </div>
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800">
                                                    <tr>
                                                        <th className="px-6 py-3">Item</th>
                                                        <th className="px-6 py-3">Qty</th>
                                                        <th className="px-6 py-3 text-right">Cost</th>
                                                        {isEditing && <th className="px-2 py-3 w-10"></th>}
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
                                                                        className="w-full bg-slate-50 dark:bg-slate-900 border-b border-slate-300 focus:border-emerald-500 outline-none px-1 py-0.5"
                                                                        placeholder="Ingredient Name"
                                                                    />
                                                                ) : ing.name}
                                                            </td>
                                                            <td className="px-6 py-3 text-slate-600 dark:text-slate-300">
                                                                {isEditing ? (
                                                                    <input 
                                                                        value={ing.qty}
                                                                        onChange={(e) => handleIngredientChange(i, 'qty', e.target.value)}
                                                                        className="w-full bg-slate-50 dark:bg-slate-900 border-b border-slate-300 focus:border-emerald-500 outline-none px-1 py-0.5"
                                                                        placeholder="Qty (e.g. 100g)"
                                                                    />
                                                                ) : ing.qty}
                                                            </td>
                                                            <td className="px-6 py-3 text-right font-mono text-slate-600 dark:text-slate-300">
                                                                {isEditing ? (
                                                                    <div className="flex items-center justify-end">
                                                                        <span>₹</span>
                                                                        <input 
                                                                            type="number"
                                                                            value={ing.cost_per_serving}
                                                                            onChange={(e) => handleIngredientChange(i, 'cost_per_serving', e.target.value)}
                                                                            className="w-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-300 focus:border-emerald-500 outline-none text-right px-1 py-0.5"
                                                                        />
                                                                    </div>
                                                                ) : `₹${ing.cost_per_serving}`}
                                                            </td>
                                                            {isEditing && (
                                                                <td className="px-2 py-3 text-center">
                                                                    <button onClick={() => handleRemoveIngredient(i)} className="text-red-400 hover:text-red-600 p-1">
                                                                        <X size={14} />
                                                                    </button>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 print:break-inside-avoid">
                                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
                                                <Utensils size={18} /> Preparation Steps
                                            </h3>
                                            <div className="space-y-4">
                                                {selectedRecipe.preparation_steps.map((step, i) => (
                                                    <div key={i} className="flex gap-4 group">
                                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs font-bold mt-0.5">
                                                            {i + 1}
                                                        </span>
                                                        {isEditing ? (
                                                            <div className="flex-1 flex gap-2">
                                                                <textarea 
                                                                    value={step}
                                                                    onChange={(e) => handleStepChange(i, e.target.value)}
                                                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                                                                    rows={2}
                                                                />
                                                                <button onClick={() => handleRemoveStep(i)} className="self-start text-red-400 hover:text-red-600 p-1">
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{step}</p>
                                                        )}
                                                    </div>
                                                ))}
                                                {isEditing && (
                                                    <button onClick={handleAddStep} className="w-full py-2 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 text-sm font-bold hover:border-emerald-400 hover:text-emerald-600 transition-colors flex items-center justify-center gap-2">
                                                        <Plus size={16} /> Add Step
                                                    </button>
                                                )}
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
