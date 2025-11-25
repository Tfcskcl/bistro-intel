
import React, { useState, useRef, useEffect } from 'react';
import { PLANS } from '../constants';
import { generateRecipeCard, generateRecipeVariation } from '../services/geminiService';
import { ingredientService } from '../services/ingredientService';
import { RecipeCard, MenuItem, User, UserRole, POSChangeRequest } from '../types';
import { Loader2, ChefHat, Scale, Clock, AlertCircle, Upload, Lock, Sparkles, Check, Save, RefreshCw, Search, Plus, Store, Zap } from 'lucide-react';
import { storageService } from '../services/storageService';
import { authService } from '../services/authService';

interface RecipeHubProps {
  user: User;
  onUserUpdate?: (user: User) => void;
}

export const RecipeHub: React.FC<RecipeHubProps> = ({ user, onUserUpdate }) => {
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [generatedRecipe, setGeneratedRecipe] = useState<RecipeCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Generating with AI...');
  const [error, setError] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'generator' | 'saved'>('generator');
  
  const [savedRecipes, setSavedRecipes] = useState<RecipeCard[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  const [posPushStatus, setPosPushStatus] = useState<string | null>(null);
  const [customItemName, setCustomItemName] = useState('');
  
  const [restaurants, setRestaurants] = useState<User[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSavedRecipes(storageService.getSavedRecipes(user.id));
    setMenuItems(storageService.getMenu(user.id));
  }, [user.id]);

  useEffect(() => {
    const allUsers = authService.getAllUsers();
    const owners = allUsers.filter(u => u.restaurantName && u.role === UserRole.OWNER);
    setRestaurants(owners);
  }, []);

  const checkUsage = (): boolean => {
      if (user.isTrial) {
          if ((user.queriesUsed || 0) >= (user.queryLimit || 10)) {
              setError("Free Demo limit reached (10/10 queries). Please upgrade to continue.");
              return false;
          }
      }
      const planLimit = PLANS[user.plan]?.recipeLimit || 1;
      if (!user.isTrial && savedRecipes.length >= planLimit) {
          setError(`You have reached the ${planLimit} recipe limit for your ${PLANS[user.plan].name} plan.`);
          return false;
      }
      return true;
  };

  const incrementUsage = () => {
      if (user.isTrial && onUserUpdate) {
          const newUsage = (user.queriesUsed || 0) + 1;
          onUserUpdate({ ...user, queriesUsed: newUsage });
      }
  };

  const handleGenerateRecipe = async (item: MenuItem) => {
    if (!checkUsage()) return;

    setLoading(true);
    setLoadingText('Generating with AI...');
    setError(null);
    setGeneratedRecipe(null);
    setSelectedSku(item.sku_id);
    setPosPushStatus(null);
    setSelectedRestaurantId('');
    
    try {
      const card = await generateRecipeCard(user.id, item);
      setGeneratedRecipe(card);
      incrementUsage();
    } catch (e) {
      setError("Failed to generate recipe card. Please check your API Key.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCustom = async () => {
      if (!customItemName.trim()) return;
      if (!checkUsage()) return;
      
      setLoading(true);
      setLoadingText(`Designing ${customItemName}...`);
      setError(null);
      setGeneratedRecipe(null);
      setPosPushStatus(null);
      setSelectedRestaurantId('');
      
      const tempSku = `NEW-${Date.now().toString().slice(-4)}`;
      setSelectedSku(tempSku);

      // Create a temporary item object
      const tempItem: MenuItem = {
          sku_id: tempSku,
          name: customItemName,
          category: 'main',
          prep_time_min: 0,
          current_price: 0,
          ingredients: []
      };

      try {
          const card = await generateRecipeCard(user.id, tempItem);
          setGeneratedRecipe(card);
          incrementUsage();
          setCustomItemName('');
          
          // Add to menu locally if successful
          const newMenu = [...menuItems, tempItem];
          setMenuItems(newMenu);
          storageService.saveMenu(user.id, newMenu);
      } catch (e) {
          setError("Failed to generate custom recipe.");
      } finally {
          setLoading(false);
      }
  };

  const handleVariation = async (type: string) => {
    if (!generatedRecipe) return;
    if (!checkUsage()) return;

    setLoading(true);
    setLoadingText(`Creating ${type} variation...`);
    setError(null);
    setPosPushStatus(null);

    try {
      const variant = await generateRecipeVariation(user.id, generatedRecipe, type);
      setGeneratedRecipe(variant);
      incrementUsage();
    } catch (e) {
      setError(`Failed to create ${type} variation.`);
    } finally {
      setLoading(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        // Use ingredient import for now as proxy for data
        const result = ingredientService.importFromCSV(user.id, text);
        if (result.success) {
          setImportStatus(result.message);
          setTimeout(() => setImportStatus(null), 3000);
        } else {
          setError(result.message);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSaveRecipe = () => {
    if (generatedRecipe) {
      const restaurant = restaurants.find(r => r.id === selectedRestaurantId);
      const recipeToSave = {
          ...generatedRecipe,
          assignedRestaurantId: selectedRestaurantId,
          assignedRestaurantName: restaurant?.restaurantName
      };

      storageService.saveRecipe(user.id, recipeToSave);
      setSavedRecipes(storageService.getSavedRecipes(user.id));
      setImportStatus(restaurant ? `Saved for ${restaurant.restaurantName}!` : "Recipe saved to library!");
      setTimeout(() => setImportStatus(null), 2000);
    }
  };

  const handlePushToPOS = () => {
      if (!generatedRecipe) return;
      const restaurant = restaurants.find(r => r.id === selectedRestaurantId);
      const request: POSChangeRequest = {
          id: `req_${Date.now()}`,
          sku_id: generatedRecipe.sku_id || 'VAR-001',
          item_name: generatedRecipe.name,
          old_price: generatedRecipe.current_price,
          new_price: generatedRecipe.suggested_selling_price,
          status: 'pending',
          requested_by: user.name,
          requested_date: new Date().toISOString(),
          targetRestaurantId: selectedRestaurantId,
          targetRestaurantName: restaurant?.restaurantName
      };
      storageService.addPOSChangeRequest(user.id, request);
      setPosPushStatus(restaurant ? `Sent to ${restaurant.restaurantName}` : "Sent to Integrations");
  };

  if (![UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.OWNER].includes(user.role)) {
    return (
      <div className="h-[calc(100vh-6rem)] flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200 shadow-sm">
        <Lock size={32} className="text-slate-400 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800">Restricted Access</h2>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col gap-4">
      {/* Top Bar */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
            <button 
                onClick={() => setViewMode('generator')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'generator' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
            >
                AI Generator
            </button>
            <button 
                onClick={() => setViewMode('saved')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'saved' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
            >
                Saved Library ({savedRecipes.length})
            </button>
        </div>
        
        {user.isTrial && (
            <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-full text-xs font-bold">
                <Zap size={12} fill="currentColor" />
                Demo: {user.queriesUsed || 0}/{user.queryLimit} Queries
            </div>
        )}
      </div>

      {viewMode === 'saved' ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 overflow-y-auto flex-1 animate-fade-in">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Your Saved Recipes</h2>
              {savedRecipes.length === 0 ? (
                  <p className="text-slate-500">No saved recipes yet. Generate one and click Save!</p>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {savedRecipes.map((recipe, idx) => (
                          <div key={idx} className="border border-slate-200 rounded-lg p-4 hover:border-emerald-300 transition-all shadow-sm">
                              <h3 className="font-bold text-slate-800">{recipe.name}</h3>
                              <p className="text-xs text-slate-500 mb-2">{recipe.sku_id}</p>
                              {recipe.assignedRestaurantName && (
                                  <div className="flex items-center gap-1 text-[10px] text-blue-600 bg-blue-50 px-2 py-1 rounded w-fit mb-2">
                                      <Store size={10} /> {recipe.assignedRestaurantName}
                                  </div>
                              )}
                              <div className="flex justify-between items-center mt-4">
                                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded text-sm">₹{recipe.food_cost_per_serving}</span>
                                  <span className="text-xs text-slate-400">{new Date().toLocaleDateString()}</span>
                              </div>
                              <button 
                                onClick={() => {
                                    setGeneratedRecipe(recipe);
                                    setViewMode('generator');
                                    setSelectedSku(recipe.sku_id);
                                }}
                                className="w-full mt-3 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded hover:bg-slate-50"
                              >
                                View Details
                              </button>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      ) : (
      <div className="flex gap-6 h-full overflow-hidden">
        {/* List */}
        <div className="w-1/3 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-slate-700">Menu Items</h3>
                    <button 
                        onClick={handleImportClick}
                        className="text-xs flex items-center gap-1 text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 transition-colors"
                    >
                        <Upload size={12} /> Import
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept=".csv"
                        onChange={handleFileChange}
                    />
                </div>
                
                <div className="relative">
                    <input 
                        type="text" 
                        value={customItemName}
                        onChange={(e) => setCustomItemName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleGenerateCustom()}
                        placeholder="Create new: e.g. Butter Chicken"
                        className="w-full pl-8 pr-8 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    />
                    <Search className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
                    <button 
                        onClick={handleGenerateCustom}
                        disabled={!customItemName}
                        className="absolute right-1.5 top-1.5 p-1 bg-slate-100 hover:bg-emerald-500 hover:text-white rounded text-slate-400 transition-colors"
                    >
                        <Plus size={14} />
                    </button>
                </div>

                {importStatus && (
                    <div className="text-[10px] text-emerald-600 bg-emerald-50 p-1.5 rounded flex items-center gap-1 animate-fade-in">
                        <Check size={10} /> {importStatus}
                    </div>
                )}
            </div>
            
            <div className="overflow-y-auto flex-1 p-2 space-y-2">
            {menuItems.length === 0 ? (
                <div className="text-center p-8 text-slate-400">
                    <ChefHat className="mx-auto mb-2 opacity-50" size={32} />
                    <p className="text-sm">No items found.</p>
                    <p className="text-xs mt-1">Add a custom item above or import your menu.</p>
                </div>
            ) : (
                menuItems.map((item) => (
                    <div 
                    key={item.sku_id}
                    onClick={() => handleGenerateRecipe(item)}
                    className={`p-4 rounded-lg cursor-pointer transition-all border ${
                        selectedSku === item.sku_id 
                        ? 'bg-yellow-50 border-yellow-200 ring-1 ring-yellow-300' 
                        : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
                    }`}
                    >
                    <div className="flex justify-between items-start">
                        <h4 className="font-semibold text-slate-800">{item.name}</h4>
                        <span className="text-xs font-mono text-slate-400">{item.sku_id}</span>
                    </div>
                    </div>
                ))
            )}
            </div>
        </div>

        {/* Detail View */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col animate-fade-in">
            {!selectedSku ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                <ChefHat size={48} className="mb-4 opacity-50" />
                <p>Select an item or type a name to generate a recipe card</p>
                {!user.isTrial && (
                    <p className="text-xs mt-2 text-emerald-600">Plan Limit: {savedRecipes.length} / {PLANS[user.plan].recipeLimit} Recipes</p>
                )}
            </div>
            ) : (
            <div className="h-full flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 bg-white">
                <div className="flex justify-between items-start">
                    <h2 className="text-2xl font-bold text-slate-800">
                        {generatedRecipe ? generatedRecipe.name : (menuItems.find(m => m.sku_id === selectedSku)?.name || customItemName || 'New Recipe')}
                    </h2>
                    {generatedRecipe && (
                         <div className="flex gap-2 flex-col items-end">
                             <div className="flex gap-2">
                                {posPushStatus ? (
                                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded border border-amber-200 flex items-center gap-1">
                                        <Clock size={12} /> {posPushStatus}
                                    </span>
                                ) : (
                                    <button 
                                        onClick={handlePushToPOS}
                                        className="text-sm font-bold text-slate-600 hover:text-blue-600 flex items-center gap-1 border border-slate-200 px-3 py-1.5 rounded hover:border-blue-200 transition-colors"
                                    >
                                        <RefreshCw size={16} /> Push to POS
                                    </button>
                                )}
                                <button 
                                    onClick={handleSaveRecipe}
                                    className="text-sm font-bold text-slate-600 hover:text-emerald-600 flex items-center gap-1 border border-slate-200 px-3 py-1.5 rounded hover:border-emerald-200 transition-colors"
                                >
                                    <Save size={16} /> Save
                                </button>
                             </div>
                         </div>
                    )}
                </div>
                <div className="flex flex-col gap-2 mt-2">
                    <div className="flex gap-4">
                        {loading && <span className="flex items-center text-sm text-emerald-600"><Loader2 className="animate-spin mr-2" size={16}/> {loadingText}</span>}
                        {generatedRecipe && !loading && (
                        <span className="flex items-center text-sm text-slate-500">
                            <Clock size={16} className="mr-1"/> {generatedRecipe.prep_time_min} mins
                        </span>
                        )}
                    </div>

                    {generatedRecipe && !loading && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide py-1.5 flex items-center gap-1">
                                <Sparkles size={12} /> Variations:
                            </span>
                            {['Vegan', 'Gluten-Free', 'Keto', 'Low Calorie'].map((variant) => (
                                <button
                                key={variant}
                                onClick={() => handleVariation(variant)}
                                disabled={loading}
                                className="px-3 py-1 text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200 rounded-full hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-colors disabled:opacity-50"
                                >
                                    {variant}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                </div>

                {/* Content Area - Generator Output */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 animate-pulse">
                            <Loader2 size={48} className="mb-4 animate-spin text-emerald-600" />
                            <p className="text-lg font-medium">{loadingText}</p>
                        </div>
                    ) : generatedRecipe ? (
                        <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200 space-y-8 animate-fade-in">
                           {/* Food Cost & Pricing High Level */}
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                                        <Scale size={18} className="text-emerald-600"/> Ingredients ({generatedRecipe.yield} servings)
                                    </h3>
                                    <ul className="space-y-2 text-sm text-slate-700">
                                        {generatedRecipe.ingredients.map((ing, i) => (
                                            <li key={i} className="flex justify-between border-b border-slate-50 pb-1 last:border-0">
                                                <span>{ing.qty_per_serving} {ing.unit} {ing.name}</span>
                                                <span className="text-slate-400">₹{ing.cost_per_serving?.toFixed(2) || '0.00'}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between font-bold text-slate-800">
                                        <span>Total Food Cost (Per Serving)</span>
                                        <span>₹{generatedRecipe.food_cost_per_serving}</span>
                                    </div>
                                </div>
                                <div>
                                     <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                                        <Zap size={18} className="text-yellow-500"/> Smart Costing
                                    </h3>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Suggested Sell Price</span>
                                            <span className="font-bold text-slate-900 text-lg">₹{generatedRecipe.suggested_selling_price}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Est. Margin</span>
                                            <span className="font-bold text-emerald-600">
                                                {generatedRecipe.suggested_selling_price > 0 
                                                    ? ((1 - (generatedRecipe.food_cost_per_serving / generatedRecipe.suggested_selling_price)) * 100).toFixed(1)
                                                    : '0.0'}%
                                            </span>
                                        </div>
                                         <div className="pt-2 mt-2 border-t border-slate-200 text-xs text-slate-500 italic">
                                            "{generatedRecipe.human_summary}"
                                        </div>
                                    </div>
                                    {generatedRecipe.reasoning && (
                                        <div className="mt-4 p-3 bg-blue-50 text-blue-800 text-xs rounded-lg border border-blue-100">
                                            <strong>AI Logic:</strong> {generatedRecipe.reasoning}
                                        </div>
                                    )}
                                </div>
                           </div>

                           {/* Instructions */}
                           <div>
                                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                                    <ChefHat size={18} className="text-slate-600"/> Preparation
                                </h3>
                                <ol className="list-decimal pl-5 space-y-3 text-sm text-slate-700">
                                    {generatedRecipe.preparation_steps.map((step, i) => (
                                        <li key={i} className="pl-2 leading-relaxed">{step}</li>
                                    ))}
                                </ol>
                           </div>

                           <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                               <div>
                                    <span className="text-xs font-bold text-slate-400 uppercase block mb-2">Allergens</span>
                                    <div className="flex flex-wrap gap-2">
                                        {generatedRecipe.allergens && generatedRecipe.allergens.length > 0 ? generatedRecipe.allergens.map(a => (
                                            <span key={a} className="px-2 py-1 bg-red-50 text-red-600 rounded-md text-xs font-medium border border-red-100">{a}</span>
                                        )) : <span className="text-xs text-slate-400">None detected</span>}
                                    </div>
                               </div>
                               <div>
                                   <span className="text-xs font-bold text-slate-400 uppercase block mb-2">Equipment Needed</span>
                                   <div className="flex flex-wrap gap-2">
                                        {generatedRecipe.equipment_needed && generatedRecipe.equipment_needed.length > 0 ? generatedRecipe.equipment_needed.map(e => (
                                            <span key={e} className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium border border-slate-200">{e}</span>
                                        )) : <span className="text-xs text-slate-400">Standard Kitchen Kit</span>}
                                    </div>
                               </div>
                           </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                             <ChefHat size={64} className="mb-4 text-slate-300" />
                             <p>Select an item from the menu to generate a recipe card</p>
                        </div>
                    )}
                </div>
            </div>
            )}
        </div>
      </div>
    </div>
  );
};
