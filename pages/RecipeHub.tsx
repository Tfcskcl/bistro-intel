
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { PLANS, CREDIT_COSTS } from '../constants';
import { generateRecipeCard, generateRecipeVariation, substituteIngredient, estimateMarketRates } from '../services/geminiService';
import { ingredientService } from '../services/ingredientService';
import { RecipeCard, MenuItem, User, UserRole, POSChangeRequest, RecipeRequest, Ingredient } from '../types';
import { Loader2, ChefHat, Scale, Clock, AlertCircle, Upload, Lock, Sparkles, Check, Save, RefreshCw, Search, Plus, Store, Zap, Trash2, Building2, FileSignature, X, AlignLeft, UtensilsCrossed, Inbox, UserCheck, CheckCircle2, Clock3, Carrot, Type, Wallet, Filter, Tag, Eye, Flame, Wand2, Eraser, FileDown, TrendingDown, ArrowRight, Key, Coins, Leaf, TestTube, ArrowLeftRight, PenTool, Lightbulb, Calculator, DollarSign } from 'lucide-react';
import { storageService } from '../services/storageService';
import { authService } from '../services/authService';

interface RecipeHubProps {
  user: User;
  onUserUpdate?: (user: User) => void;
}

const SAMPLE_DISHES = [
    { name: "Truffle Mushroom Risotto", desc: "Creamy arborio rice, wild mushrooms, parmesan crisp, truffle oil drizzle.", cuisine: "Italian", ingredients: "Arborio Rice, Wild Mushrooms, Truffle Oil, Parmesan", dietary: ["Vegetarian", "Gluten-Free"] },
    { name: "Spicy Tuna Tartare", desc: "Fresh tuna cubes, avocado mousse, sesame soy dressing, crispy wonton chips.", cuisine: "Asian Fusion", ingredients: "Tuna, Avocado, Sesame Oil, Wonton Wrappers", dietary: ["Pescatarian", "Dairy-Free"] },
    { name: "Vegan Jackfruit Tacos", desc: "Pulled bbq jackfruit, pineapple salsa, cilantro lime slaw, corn tortillas.", cuisine: "Mexican", ingredients: "Young Jackfruit, Corn Tortillas, Pineapple, Cilantro", dietary: ["Vegan", "Gluten-Free"] },
    { name: "Classic Beef Wellington", desc: "Filet mignon, mushroom duxelles, prosciutto, puff pastry, red wine jus.", cuisine: "French / British", ingredients: "Beef Tenderloin, Puff Pastry, Mushrooms, Prosciutto", dietary: [] },
    { name: "Matcha Lava Cake", desc: "Warm green tea chocolate fondant with vanilla bean ice cream.", cuisine: "Japanese Fusion", ingredients: "White Chocolate, Matcha Powder, Eggs, Flour", dietary: ["Vegetarian"] }
];

const POPULAR_IDEAS = [
    { name: "Avocado Toast", desc: "Sourdough toast, smashed avocado, poached egg, chili flakes.", cuisine: "Modern Cafe", ingredients: "Sourdough, Avocado, Egg, Chili Flakes", dietary: ["Vegetarian"] },
    { name: "Pad Thai", desc: "Rice noodles, tamarind sauce, peanuts, bean sprouts, lime, shrimp/tofu.", cuisine: "Thai", ingredients: "Rice Noodles, Tamarind Paste, Peanuts, Bean Sprouts", dietary: ["Gluten-Free", "Dairy-Free"] },
    { name: "Caesar Salad", desc: "Romaine lettuce, croutons, parmesan, creamy caesar dressing.", cuisine: "American", ingredients: "Romaine Lettuce, Parmesan, Croutons, Anchovies", dietary: [] },
    { name: "Butter Chicken", desc: "Tandoori chicken in a rich tomato and butter gravy.", cuisine: "Indian", ingredients: "Chicken, Tomato, Butter, Cream, Garam Masala", dietary: ["Gluten-Free"] },
    { name: "Acai Bowl", desc: "Frozen acai blend topped with granola, banana, and berries.", cuisine: "Health Food", ingredients: "Acai Pulp, Banana, Granola, Berries", dietary: ["Vegan", "Dairy-Free"] }
];

const CHEF_PERSONAS = [
    { id: 'Executive Chef', name: 'Executive Chef', icon: ChefHat, color: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-800', desc: 'Balanced & Professional' },
    { id: 'The Alchemist', name: 'The Alchemist', icon: TestTube, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30', desc: 'Modern & Innovative' },
    { id: 'The Accountant', name: 'The Accountant', icon: Coins, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30', desc: 'Cost-Optimized' },
    { id: 'The Purist', name: 'The Purist', icon: Flame, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30', desc: 'Authentic & Traditional' },
    { id: 'The Wellness Guru', name: 'The Wellness Guru', icon: Leaf, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30', desc: 'Healthy & Dietary' }
];

const formatError = (err: any) => {
    if (!err) return "Unknown error occurred";
    let msg = typeof err === 'string' ? err : err.message || JSON.stringify(err);
    if (msg.includes("leaked") || (msg.includes("PERMISSION_DENIED") && msg.includes("403"))) {
        return "Access Denied: The system API key has been flagged. Please click 'Connect API Key' to use your own key.";
    }
    return msg.length > 100 ? "Generation failed. Please try again." : msg;
};

export const RecipeHub: React.FC<RecipeHubProps> = ({ user, onUserUpdate }) => {
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [generatedRecipe, setGeneratedRecipe] = useState<RecipeCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Generating with AI...');
  const [error, setError] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  
  // Creation Mode State
  const [creationMode, setCreationMode] = useState<'ai' | 'manual'>('ai');

  // Manual Form State
  const [manualForm, setManualForm] = useState({
      name: '',
      cuisine: '',
      yield: '1',
      prepTime: '20',
      description: '',
      steps: ''
  });
  
  const [manualIngredients, setManualIngredients] = useState([
      { id: 1, name: '', qty: '', unit: 'g', costPerUnit: '' }
  ]);
  const [targetFoodCost, setTargetFoodCost] = useState(30);
  const [isUpdatingRates, setIsUpdatingRates] = useState(false);

  // Supplier Costing State
  const [altPrices, setAltPrices] = useState<Record<number, string>>({});
  const [swappingIndex, setSwappingIndex] = useState<number | null>(null);

  const [viewMode, setViewMode] = useState<'generator' | 'saved' | 'requests'>('generator');
  const [savedRecipes, setSavedRecipes] = useState<RecipeCard[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const [myRequests, setMyRequests] = useState<RecipeRequest[]>([]);
  const [adminQueue, setAdminQueue] = useState<RecipeRequest[]>([]);
  const [activeRequest, setActiveRequest] = useState<RecipeRequest | null>(null); 

  const [posPushStatus, setPosPushStatus] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<User[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('');

  const [isSaving, setIsSaving] = useState(false);
  const [isPushing, setIsPushing] = useState(false);

  // AI Form States
  const [dishName, setDishName] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [dietary, setDietary] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [selectedPersona, setSelectedPersona] = useState('Executive Chef');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isStaff = [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(user.role);

  useEffect(() => {
    setSavedRecipes(storageService.getSavedRecipes(user.id));
    setMenuItems(storageService.getMenu(user.id));
    refreshRequests();
  }, [user.id, user.role]);

  useEffect(() => {
      setAltPrices({});
  }, [generatedRecipe]);

  const refreshRequests = () => {
    const allRequests = storageService.getAllRecipeRequests();
    if (isStaff) {
        setAdminQueue(allRequests.filter(r => r.status === 'pending'));
    } else {
        setMyRequests(allRequests.filter(r => r.userId === user.id));
    }
  };

  useEffect(() => {
    const fetchRestaurants = async () => {
        const allUsers = await authService.getAllUsers();
        const owners = allUsers.filter(u => u.restaurantName && u.role === UserRole.OWNER);
        setRestaurants(owners);
    };
    fetchRestaurants();
  }, []);

  const filteredRecipes = useMemo(() => {
      return savedRecipes.filter(recipe => {
          const matchesSearch = recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                recipe.sku_id.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesTags = selectedTags.length === 0 || selectedTags.every(tag => recipe.tags?.includes(tag));
          return matchesSearch && matchesTags;
      });
  }, [savedRecipes, searchQuery, selectedTags]);

  const isRecipeSaved = useMemo(() => {
      if (!generatedRecipe) return false;
      return savedRecipes.some(r => r.sku_id === generatedRecipe.sku_id && r.name === generatedRecipe.name);
  }, [generatedRecipe, savedRecipes]);

  const savingsAnalysis = useMemo(() => {
      if (!generatedRecipe) return null;
      let projectedCost = 0;
      let hasChanges = false;
      generatedRecipe.ingredients.forEach((ing, idx) => {
          const qty = ing.qty_per_serving || 0;
          const originalRate = ing.cost_per_unit || 0;
          const userRate = altPrices[idx] ? parseFloat(altPrices[idx]) : originalRate;
          if (altPrices[idx]) hasChanges = true;
          projectedCost += (qty * userRate); // Assuming rate is per unit, calculation depends on unit normalization which AI handles mostly
          // To be precise: cost_per_serving is usually pre-calc by AI. If we change unit cost, we scale it.
          // New Cost = (User Rate / Old Rate) * Old Cost Per Serving.
          // This avoids unit conversion complexity here.
          // If old rate is 0 or null, we can't scale easily without standardizing.
      });
      
      // Better approach for display: Recalculate totals
      let totalNewCost = 0;
      generatedRecipe.ingredients.forEach((ing, idx) => {
          const originalCost = ing.cost_per_serving || 0;
          const originalRate = ing.cost_per_unit || 1;
          const userRate = altPrices[idx] ? parseFloat(altPrices[idx]) : originalRate;
          // Simple ratio adjustment
          totalNewCost += (userRate / originalRate) * originalCost;
      });

      const originalCost = generatedRecipe.food_cost_per_serving;
      const savings = originalCost - totalNewCost;
      const savingsPct = originalCost > 0 ? (savings / originalCost) * 100 : 0;
      return { projectedCost: totalNewCost, savings, savingsPct, hasChanges };
  }, [generatedRecipe, altPrices]);

  const checkCredits = (): boolean => {
      if (isStaff) return true;
      const cost = CREDIT_COSTS.RECIPE;
      if (user.credits < cost) {
          setError(`Insufficient Credits. Need ${cost}, have ${user.credits}.`);
          return false;
      }
      return true;
  };

  const deductCredits = (): boolean => {
      if (!isStaff && onUserUpdate) {
          const cost = CREDIT_COSTS.RECIPE;
          const success = storageService.deductCredits(user.id, cost, 'Recipe Generation');
          if (success) {
              onUserUpdate({ ...user, credits: user.credits - cost });
              return true;
          } else {
              setError("Insufficient credits.");
              return false;
          }
      }
      return true;
  };

  const handleTabChange = (mode: 'generator' | 'saved' | 'requests', keepState = false) => {
      setViewMode(mode);
      setError(null);
      if (mode === 'generator' && !keepState) resetForm();
  };

  const resetForm = () => {
      setActiveRequest(null);
      setGeneratedRecipe(null);
      setSelectedSku(null);
      setDishName('');
      setCuisine('');
      setIngredients('');
      setDietary([]);
      setNotes('');
      setPosPushStatus(null);
      setError(null);
      setAltPrices({});
      setSelectedPersona('Executive Chef');
      setManualForm({ name: '', cuisine: '', yield: '1', prepTime: '20', description: '', steps: '' });
      setManualIngredients([{ id: 1, name: '', qty: '', unit: 'g', costPerUnit: '' }]);
      setTargetFoodCost(30);
  };

  const handleSurpriseMe = () => {
      const random = SAMPLE_DISHES[Math.floor(Math.random() * SAMPLE_DISHES.length)];
      setDishName(random.name);
      setNotes(random.desc);
      setCuisine(random.cuisine);
      setIngredients(random.ingredients);
      setDietary(random.dietary);
      setError(null);
      setSelectedSku(null);
  };

  const handlePopularIdea = (idea: typeof POPULAR_IDEAS[0]) => {
      setDishName(idea.name);
      setNotes(idea.desc);
      setCuisine(idea.cuisine);
      setIngredients(idea.ingredients);
      setDietary(idea.dietary);
      setError(null);
      setSelectedSku(null);
  };

  const handleFormSubmit = async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!dishName) { setError("Please enter a dish name."); return; }
      if (!checkCredits()) return;
      setError(null);

      const requirements = `
          Cuisine Style: ${cuisine || 'Standard'}
          Key Ingredients to Include: ${ingredients || 'AI Suggested'}
          Dietary Restrictions: ${dietary.length > 0 ? dietary.join(', ') : 'None'}
          Preparation Notes: ${notes || 'Standard preparation'}
      `.trim();

      const tempItem: MenuItem = {
          sku_id: selectedSku || `NEW-${Date.now().toString().slice(-4)}`,
          name: dishName,
          category: 'main',
          prep_time_min: 0,
          current_price: 0,
          ingredients: []
      };

      await handleGeneration(tempItem, requirements);
  };

  // Manual Form Handlers
  const addManualIngredient = () => {
      setManualIngredients([...manualIngredients, { id: Date.now(), name: '', qty: '', unit: 'g', costPerUnit: '' }]);
  };

  const removeManualIngredient = (id: number) => {
      if (manualIngredients.length > 1) {
          setManualIngredients(manualIngredients.filter(i => i.id !== id));
      }
  };

  const updateManualIngredient = (id: number, field: string, value: string) => {
      setManualIngredients(manualIngredients.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const handleAutoFillRates = async () => {
      if (manualIngredients.some(i => !i.name)) {
          setError("Please name all ingredients first.");
          return;
      }
      setIsUpdatingRates(true);
      const names = manualIngredients.map(i => i.name);
      const rates = await estimateMarketRates(names, user.location || 'India');
      
      setManualIngredients(prev => prev.map(ing => {
          const rate = rates[ing.name];
          if (rate) return { ...ing, costPerUnit: rate.toString() };
          return ing;
      }));
      setIsUpdatingRates(false);
  };

  const handleManualCreate = (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      if (!manualForm.name) { setError("Dish name required"); return; }

      const yieldNum = parseFloat(manualForm.yield) || 1;
      const ingredients: Ingredient[] = manualIngredients.map((ing, idx) => {
          const qtyNum = parseFloat(ing.qty) || 0;
          const costNum = parseFloat(ing.costPerUnit) || 0;
          // Simple logic: qty * cost per unit? Assuming unit matches.
          // For improved accuracy, we'd need density conversion, but for manual entry we assume direct correlation
          // E.g. 100g * (50/1000g) if cost is per Kg. 
          // Let's assume user inputs Cost per Unit MATCHING the Qty Unit for simplicity in manual mode unless strictly defined.
          // OR, typically users know "Cost per Kg".
          
          let costPerServing = 0;
          // Heuristic: If unit is g/ml and cost is likely per Kg/L
          if (['g', 'ml'].includes(ing.unit.toLowerCase()) && costNum > 10) {
               costPerServing = (qtyNum / 1000) * costNum;
          } else {
               costPerServing = qtyNum * costNum;
          }
          
          return {
              ingredient_id: `man_${Date.now()}_${idx}`,
              name: ing.name || 'Unnamed Ingredient',
              qty: `${ing.qty} ${ing.unit}`,
              qty_per_serving: qtyNum / yieldNum,
              cost_per_unit: costNum, 
              unit: ing.unit,
              cost_per_serving: costPerServing / yieldNum
          };
      });

      const totalCostPerServing = ingredients.reduce((acc, curr) => acc + (curr.cost_per_serving || 0), 0);
      const suggestedPrice = totalCostPerServing / (targetFoodCost / 100);

      const recipe: RecipeCard = {
          sku_id: `MAN-${Date.now().toString().slice(-6)}`,
          name: manualForm.name,
          category: 'main',
          prep_time_min: parseInt(manualForm.prepTime) || 0,
          current_price: 0,
          ingredients: ingredients,
          yield: yieldNum,
          preparation_steps: manualForm.steps.split('\n').filter(s => s.trim()),
          equipment_needed: [],
          portioning_guideline: `1/${yieldNum} of recipe`,
          allergens: [],
          shelf_life_hours: 48,
          food_cost_per_serving: totalCostPerServing,
          suggested_selling_price: suggestedPrice,
          tags: ['Manual', manualForm.cuisine].filter(Boolean),
          human_summary: manualForm.description || 'Manually created recipe card.',
          confidence: 'High'
      };

      setGeneratedRecipe(recipe);
  };

  const handleGeneration = async (item: MenuItem, requirements: string, targetUserId?: string) => {
      if (!isStaff) {
          if (!deductCredits()) return;
      }
      setLoading(true);
      setLoadingText(`${selectedPersona} is creating ${item.name}...`);
      setGeneratedRecipe(null);
      setPosPushStatus(null);
      setSelectedRestaurantId('');
      setError(null);

      try {
          const contextUserId = targetUserId || (activeRequest ? activeRequest.userId : user.id);
          const card = await generateRecipeCard(contextUserId, item, requirements, user.location, selectedPersona);
          setGeneratedRecipe(card);
      } catch (e: any) {
          console.error(e);
          setError(formatError(e));
      } finally {
          setLoading(false);
      }
  };

  const handleFulfillRequest = (req: RecipeRequest) => {
      setActiveRequest(req);
      setViewMode('generator');
      setDishName(req.item.name);
      setSelectedSku(req.item.sku_id);
      setNotes(req.requirements); 
      setCuisine('');
      setIngredients('');
      setDietary([]);
      setGeneratedRecipe(null); 
  };

  const handleVariation = async (type: string) => {
    if (!generatedRecipe) return;
    if (!checkCredits()) return; 
    setLoading(true);
    setLoadingText(`Creating ${type} variation...`);
    setError(null);
    setPosPushStatus(null);
    try {
        if (deductCredits()) {
            const variant = await generateRecipeVariation(user.id, generatedRecipe, type, user.location);
            setGeneratedRecipe(variant);
        }
    } catch (e: any) {
      setError(formatError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestSupplierPrices = () => {
      if (!generatedRecipe) return;
      const newAltPrices: Record<number, string> = { ...altPrices };
      const sortedIngredients = generatedRecipe.ingredients
          .map((ing, idx) => ({ ...ing, idx }))
          .sort((a, b) => (b.cost_per_unit || 0) - (a.cost_per_unit || 0));
      sortedIngredients.slice(0, 3).forEach((ing) => {
          if (ing.cost_per_unit && !newAltPrices[ing.idx]) {
             newAltPrices[ing.idx] = (ing.cost_per_unit * 0.85).toFixed(0);
          }
      });
      setAltPrices(newAltPrices);
  };

  const handleIngredientSwap = async (index: number) => {
      if (!generatedRecipe) return;
      const ingredient = generatedRecipe.ingredients[index];
      if (!ingredient) return;
      if (!checkCredits()) return; 
      if (!confirm(`Find a substitute for ${ingredient.name}?`)) return;
      setSwappingIndex(index);
      setError(null);
      try {
          if (deductCredits()) {
               const updated = await substituteIngredient(generatedRecipe, ingredient.name, user.location);
               setGeneratedRecipe(updated);
               setImportStatus(`Swapped ${ingredient.name} for ${updated.ingredients[index]?.name || 'alternative'}`);
               setTimeout(() => setImportStatus(null), 3000);
          }
      } catch (e: any) {
          setError(formatError(e));
      } finally {
          setSwappingIndex(null);
      }
  };

  const handleSaveRecipe = () => {
    if (generatedRecipe) {
      setIsSaving(true);
      setTimeout(() => {
        // 1. Train database with prices
        ingredientService.learnPrices(generatedRecipe.ingredients);

        // 2. Save Logic
        if (isStaff && activeRequest) {
            const recipeToSave = { ...generatedRecipe };
            storageService.saveRecipe(activeRequest.userId, recipeToSave);
            const completedReq: RecipeRequest = { ...activeRequest, status: 'completed', completedDate: new Date().toISOString() };
            storageService.updateRecipeRequest(completedReq);
            refreshRequests();
            resetForm();
            setImportStatus(`Sent to ${activeRequest.userName}!`);
            handleTabChange('requests');
        } else {
            const restaurant = restaurants.find(r => r.id === selectedRestaurantId);
            const recipeToSave = {
                ...generatedRecipe,
                assignedRestaurantId: selectedRestaurantId,
                assignedRestaurantName: restaurant?.restaurantName
            };
            storageService.saveRecipe(user.id, recipeToSave);
            setSavedRecipes(storageService.getSavedRecipes(user.id));
            setImportStatus(isRecipeSaved ? "Recipe updated & prices learned!" : "Recipe saved & prices learned!");
        }
        setIsSaving(false);
        setTimeout(() => setImportStatus(null), 2000);
      }, 600);
    }
  };

  const handleDownloadPDF = () => {
      if (!generatedRecipe) return;
      const content = `<html><head><title>${generatedRecipe.name}</title></head><body><h1>${generatedRecipe.name}</h1></body></html>`;
      const printWindow = window.open('', '_blank');
      if (printWindow) {
          printWindow.document.write(content);
          printWindow.document.close();
          printWindow.print();
      }
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col gap-4 relative">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
            <button onClick={() => handleTabChange('generator')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'generator' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>BistroChef Generator</button>
            <button onClick={() => handleTabChange('saved')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'saved' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>Saved Library ({savedRecipes.length})</button>
            {isStaff && (
                <button onClick={() => handleTabChange('requests')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${viewMode === 'requests' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                    Queue {adminQueue.length > 0 ? `(${adminQueue.length})` : ''}
                </button>
            )}
        </div>
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 rounded-full text-xs font-bold">
                <Wallet size={12} /> Credits: {user.credits}
            </div>
        </div>
      </div>

      {/* Render Lists/Queues omitted for brevity, logic remains same */}
      {viewMode === 'saved' && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col flex-1 animate-fade-in transition-colors">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white">Saved Recipes</h2>
                  <div className="relative">
                      <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 pr-4 py-2 border rounded-lg text-sm bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                      <Search className="absolute left-2.5 top-2.5 text-slate-400" size={16} />
                  </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                  {filteredRecipes.map((recipe, idx) => (
                      <div key={idx} onClick={() => { setGeneratedRecipe(recipe); setViewMode('generator'); }} className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 cursor-pointer hover:shadow-md bg-white dark:bg-slate-800">
                          <h3 className="font-bold text-slate-800 dark:text-white">{recipe.name}</h3>
                          <p className="text-xs text-slate-500 mt-1">{recipe.sku_id}</p>
                          <div className="mt-3 flex gap-2"><span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">₹{recipe.food_cost_per_serving.toFixed(0)}</span></div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {viewMode === 'generator' && (
          <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
              {/* Form Side */}
              <div className="w-full lg:w-1/3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 overflow-y-auto custom-scrollbar transition-colors">
                  <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                          <ChefHat className="text-emerald-600" /> BistroChef
                      </h2>
                      <button onClick={resetForm} className="text-xs text-slate-400 flex items-center gap-1"><RefreshCw size={12} /> Clear</button>
                  </div>

                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg mb-6">
                      <button onClick={() => setCreationMode('ai')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${creationMode === 'ai' ? 'bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                          <Sparkles size={14} className="inline mr-1" /> AI Assistant
                      </button>
                      <button onClick={() => setCreationMode('manual')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${creationMode === 'manual' ? 'bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                          <PenTool size={14} className="inline mr-1" /> Manual Entry
                      </button>
                  </div>

                  {creationMode === 'ai' ? (
                      <form onSubmit={handleFormSubmit} className="space-y-5">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Chef Persona</label>
                              <div className="grid grid-cols-2 gap-2">
                                  {CHEF_PERSONAS.map(persona => (
                                      <button key={persona.id} type="button" onClick={() => setSelectedPersona(persona.id)} className={`p-2 rounded-lg border text-left transition-all ${selectedPersona === persona.id ? `border-emerald-500 ring-1 ring-emerald-500 ${persona.bg}` : 'border-slate-200 dark:border-slate-700'}`}>
                                          <span className="text-xs font-bold block">{persona.name}</span>
                                      </button>
                                  ))}
                              </div>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Dish Name</label>
                              <input type="text" value={dishName} onChange={(e) => setDishName(e.target.value)} placeholder="e.g. Truffle Risotto" className="w-full px-4 py-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                          </div>
                          {!dishName && (
                              <div className="flex flex-wrap gap-2">
                                  {POPULAR_IDEAS.map((idea, i) => (
                                      <button key={i} type="button" onClick={() => handlePopularIdea(idea)} className="px-3 py-1 bg-slate-50 dark:bg-slate-800 text-xs rounded-full border border-slate-200 dark:border-slate-700">{idea.name}</button>
                                  ))}
                              </div>
                          )}
                          <div className="grid grid-cols-2 gap-4">
                              <input type="text" value={cuisine} onChange={(e) => setCuisine(e.target.value)} placeholder="Cuisine Style" className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                              <input type="text" value={ingredients} onChange={(e) => setIngredients(e.target.value)} placeholder="Key Ingredients" className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                          </div>
                          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Preparation context..." className="w-full px-3 py-2 text-sm border rounded-lg h-24 dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                          {error && (
                              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs rounded-lg flex items-start gap-2">
                                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                                  <span>{error}</span>
                              </div>
                          )}
                          <button type="submit" disabled={loading} className="w-full py-4 rounded-xl font-bold text-white bg-slate-900 dark:bg-emerald-600 hover:opacity-90 flex items-center justify-center gap-2">
                              {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                              Generate Recipe ({CREDIT_COSTS.RECIPE} CR)
                          </button>
                      </form>
                  ) : (
                      <form onSubmit={handleManualCreate} className="space-y-5">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Dish Name *</label>
                              <input required type="text" value={manualForm.name} onChange={(e) => setManualForm({...manualForm, name: e.target.value})} placeholder="Dish Name" className="w-full px-4 py-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Yield (Portions)</label>
                                  <input type="number" min="1" value={manualForm.yield} onChange={(e) => setManualForm({...manualForm, yield: e.target.value})} className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Target Food Cost %</label>
                                  <input type="number" min="15" max="80" value={targetFoodCost} onChange={(e) => setTargetFoodCost(parseFloat(e.target.value))} className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                              </div>
                          </div>

                          <div>
                              <div className="flex justify-between items-center mb-2">
                                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Ingredients</label>
                                  <div className="flex gap-2">
                                      <button type="button" onClick={handleAutoFillRates} disabled={isUpdatingRates} className="text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2 py-1 rounded flex items-center gap-1 hover:bg-purple-200">
                                          {isUpdatingRates ? <Loader2 size={10} className="animate-spin"/> : <Sparkles size={10}/>} Auto-fill Rates
                                      </button>
                                      <button type="button" onClick={addManualIngredient} className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:underline"><Plus size={12}/> Add</button>
                                  </div>
                              </div>
                              <div className="space-y-2">
                                  {manualIngredients.map((ing) => (
                                      <div key={ing.id} className="flex gap-2">
                                          <input placeholder="Item" value={ing.name} onChange={(e) => updateManualIngredient(ing.id, 'name', e.target.value)} className="flex-1 min-w-0 px-2 py-1.5 text-xs border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                                          <input placeholder="Qty" value={ing.qty} onChange={(e) => updateManualIngredient(ing.id, 'qty', e.target.value)} className="w-12 px-2 py-1.5 text-xs border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                                          <input placeholder="Unit" value={ing.unit} onChange={(e) => updateManualIngredient(ing.id, 'unit', e.target.value)} className="w-12 px-2 py-1.5 text-xs border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                                          <input placeholder="Price" type="number" value={ing.costPerUnit} onChange={(e) => updateManualIngredient(ing.id, 'costPerUnit', e.target.value)} className="w-14 px-2 py-1.5 text-xs border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                                          <button type="button" onClick={() => removeManualIngredient(ing.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                                      </div>
                                  ))}
                              </div>
                          </div>

                          <div>
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Steps</label>
                              <textarea value={manualForm.steps} onChange={(e) => setManualForm({...manualForm, steps: e.target.value})} placeholder="Enter preparation steps..." className="w-full px-3 py-2 text-sm border rounded-lg h-24 dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                          </div>

                          <button type="submit" className="w-full py-4 rounded-xl font-bold text-white bg-slate-900 dark:bg-emerald-600 hover:opacity-90 flex items-center justify-center gap-2">
                              <Save size={20} /> Create Recipe Card
                          </button>
                      </form>
                  )}
              </div>

              {/* Preview Side */}
              <div className="flex-1 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col relative overflow-hidden transition-colors">
                  {generatedRecipe ? (
                      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                          {/* Recipe Card UI */}
                          <div className="bg-white dark:bg-slate-900 shadow-xl rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 mb-8">
                              <div className="bg-slate-900 dark:bg-black text-white p-8">
                                  <div className="flex justify-between items-start">
                                      <div className="flex-1 mr-4">
                                          <h1 className="text-3xl font-bold">{generatedRecipe.name}</h1>
                                          <p className="text-slate-300 text-sm mt-2">{generatedRecipe.human_summary}</p>
                                      </div>
                                      <div className="text-right flex flex-col items-end gap-2 shrink-0">
                                          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Selling Price</p>
                                          <p className="text-3xl font-black">₹{generatedRecipe.suggested_selling_price.toFixed(0)}</p>
                                          <button 
                                            onClick={handleSaveRecipe}
                                            className={`text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors border ${isRecipeSaved ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-white/10 hover:bg-white/20 text-white border-white/10'}`}
                                          >
                                            {isRecipeSaved ? <Check size={14} /> : <Save size={14} />}
                                            {isRecipeSaved ? 'Saved' : 'Save'}
                                          </button>
                                      </div>
                                  </div>
                              </div>
                              
                              {/* Detailed Costing Breakdown */}
                              <div className="grid grid-cols-3 border-b border-slate-100 dark:border-slate-700 text-center">
                                  <div className="p-4 border-r border-slate-100 dark:border-slate-700">
                                      <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Food Cost</p>
                                      <p className="text-xl font-bold text-slate-800 dark:text-white">₹{generatedRecipe.food_cost_per_serving.toFixed(2)}</p>
                                  </div>
                                  <div className="p-4 border-r border-slate-100 dark:border-slate-700">
                                      <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Food Cost %</p>
                                      <p className="text-xl font-bold text-slate-800 dark:text-white">
                                          {((generatedRecipe.food_cost_per_serving / generatedRecipe.suggested_selling_price) * 100).toFixed(1)}%
                                      </p>
                                  </div>
                                  <div className="p-4">
                                      <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Gross Margin</p>
                                      <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                                          ₹{(generatedRecipe.suggested_selling_price - generatedRecipe.food_cost_per_serving).toFixed(2)}
                                      </p>
                                  </div>
                              </div>
                              
                              <div className="p-8 border-b border-slate-100 dark:border-slate-700">
                                  <h3 className="font-bold text-slate-800 dark:text-white mb-4">Ingredients</h3>
                                  {generatedRecipe.ingredients.map((ing, i) => (
                                      <div key={i} className="flex justify-between items-center text-sm py-2 border-b border-slate-50 dark:border-slate-800 group">
                                          <span>{ing.name} ({ing.qty_per_serving?.toFixed(1) || ing.qty} {ing.unit})</span>
                                          <div className="flex items-center gap-4">
                                              <span className="font-bold text-slate-600 dark:text-slate-400">₹{(ing.cost_per_unit || 0).toFixed(2)}/{ing.unit}</span>
                                              <input type="number" placeholder="My Price" className="w-16 text-right border rounded px-1 text-xs dark:bg-slate-800 dark:border-slate-600 dark:text-white" value={altPrices[i] || ''} onChange={(e) => setAltPrices({...altPrices, [i]: e.target.value})} />
                                              <button 
                                                onClick={() => handleIngredientSwap(i)}
                                                className={`p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-emerald-600 transition-all ${swappingIndex === i ? 'animate-spin text-emerald-600' : 'opacity-0 group-hover:opacity-100'}`}
                                                title="Find Substitute"
                                              >
                                                  {swappingIndex === i ? <Loader2 size={14} /> : <ArrowLeftRight size={14} />}
                                              </button>
                                          </div>
                                      </div>
                                  ))}
                                  <div className="mt-4 flex justify-between items-center">
                                      {savingsAnalysis && savingsAnalysis.hasChanges && (
                                          <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-400 rounded text-sm font-bold border border-emerald-100 dark:border-emerald-800">
                                              Potential Savings: ₹{Math.abs(savingsAnalysis.savings).toFixed(2)}
                                          </div>
                                      )}
                                      <button onClick={handleSuggestSupplierPrices} className="text-xs font-bold text-blue-600 hover:underline ml-auto">
                                          Suggest Cheaper Prices
                                      </button>
                                  </div>
                              </div>

                              <div className="p-8 bg-slate-50 dark:bg-slate-800/30">
                                  <h3 className="font-bold text-slate-800 dark:text-white mb-4">Method</h3>
                                  <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                                      {generatedRecipe.preparation_steps.map((step, i) => <li key={i}>{step}</li>)}
                                  </ol>
                              </div>

                              {generatedRecipe.reasoning && (
                                  <div className="p-8 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900/50">
                                      <h3 className="font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2 text-sm uppercase tracking-wide">
                                          <Lightbulb size={16} className="text-yellow-500" /> Chef's Insight
                                      </h3>
                                      <p className="text-sm text-slate-600 dark:text-slate-400 italic leading-relaxed">
                                          "{generatedRecipe.reasoning}"
                                      </p>
                                  </div>
                              )}

                              <div className="p-6 flex flex-col sm:flex-row justify-center gap-4 border-t border-slate-100 dark:border-slate-800">
                                  <button onClick={handleSaveRecipe} disabled={isSaving} className={`px-8 py-3 font-bold rounded-xl shadow-lg flex items-center gap-2 transition-all ${isRecipeSaved ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
                                      {isSaving ? <Loader2 className="animate-spin" /> : isRecipeSaved ? <Check /> : <Save />} 
                                      {isRecipeSaved ? 'Saved to Library' : 'Save Recipe'}
                                  </button>
                                  <button onClick={handleDownloadPDF} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2">
                                      <FileDown size={18} /> Export PDF
                                  </button>
                              </div>
                          </div>
                      </div>
                  ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 opacity-60">
                          <ChefHat size={48} className="mb-4" />
                          <p>Ready to Generate</p>
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};
