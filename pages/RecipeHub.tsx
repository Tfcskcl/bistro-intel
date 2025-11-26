
import React, { useState, useRef, useEffect } from 'react';
import { PLANS } from '../constants';
import { generateRecipeCard, generateRecipeVariation } from '../services/geminiService';
import { ingredientService } from '../services/ingredientService';
import { RecipeCard, MenuItem, User, UserRole, POSChangeRequest, RecipeRequest } from '../types';
import { Loader2, ChefHat, Scale, Clock, AlertCircle, Upload, Lock, Sparkles, Check, Save, RefreshCw, Search, Plus, Store, Zap, Trash2, Building2, FileSignature, X, AlignLeft, UtensilsCrossed, Inbox, UserCheck, CheckCircle2, Clock3 } from 'lucide-react';
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
  
  // View Modes: 'generator' is now Contextual (Request Form for Owner / Generator for Admin)
  const [viewMode, setViewMode] = useState<'generator' | 'saved' | 'requests'>('generator');
  
  const [savedRecipes, setSavedRecipes] = useState<RecipeCard[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  
  // Request Management
  const [myRequests, setMyRequests] = useState<RecipeRequest[]>([]);
  const [adminQueue, setAdminQueue] = useState<RecipeRequest[]>([]);
  const [activeRequest, setActiveRequest] = useState<RecipeRequest | null>(null); // For Admin fulfilling

  const [posPushStatus, setPosPushStatus] = useState<string | null>(null);
  const [customItemName, setCustomItemName] = useState('');
  
  const [restaurants, setRestaurants] = useState<User[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('');

  // Loading states for actions
  const [isSaving, setIsSaving] = useState(false);
  const [isPushing, setIsPushing] = useState(false);

  // Requirement Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formItem, setFormItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState<{
      cuisine: string;
      dietary: string[];
      notes: string;
  }>({
      cuisine: '',
      dietary: [],
      notes: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(user.role);

  useEffect(() => {
    setSavedRecipes(storageService.getSavedRecipes(user.id));
    setMenuItems(storageService.getMenu(user.id));
    refreshRequests();
  }, [user.id, user.role]);

  const refreshRequests = () => {
    const allRequests = storageService.getAllRecipeRequests();
    if (isAdmin) {
        setAdminQueue(allRequests.filter(r => r.status === 'pending'));
    } else {
        setMyRequests(allRequests.filter(r => r.userId === user.id));
    }
  };

  useEffect(() => {
    const fetchRestaurants = async () => {
        const allUsers = await authService.getAllUsers();
        // In a real app, you'd filter by an Org ID. Here we just get all Owners to simulate outlets.
        const owners = allUsers.filter(u => u.restaurantName && u.role === UserRole.OWNER);
        setRestaurants(owners);
    };
    fetchRestaurants();
  }, []);

  // Plan Limit Logic
  const planLimit = PLANS[user.plan]?.recipeLimit || 1;
  // Limit applies to Saved Recipes for now
  const limitReached = !user.isTrial && savedRecipes.length >= planLimit;

  const checkUsage = (): boolean => {
      if (user.isTrial) {
          if ((user.queriesUsed || 0) >= (user.queryLimit || 10)) {
              setError("Free Demo limit reached (10/10 queries). Please upgrade to continue.");
              return false;
          }
      }
      
      if (limitReached && !isAdmin) {
           setError(`You have reached the ${planLimit} recipe limit for your ${PLANS[user.plan].name} plan. Please upgrade or delete recipes.`);
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

  // 1. Open Form from List
  const handleGenerateClick = (item: MenuItem) => {
      if (!isAdmin && limitReached) return; 
      if (!checkUsage()) return;
      setFormItem(item);
      // Pre-fill standard values or reset
      setFormData({ cuisine: '', dietary: [], notes: '' });
      setIsFormOpen(true);
  };

  // 2. Open Form from Custom Input
  const handleGenerateCustomClick = () => {
      if (!customItemName.trim()) return;
      if (!isAdmin && limitReached) return;
      if (!checkUsage()) return;

      const tempSku = `NEW-${Date.now().toString().slice(-4)}`;
      const tempItem: MenuItem = {
          sku_id: tempSku,
          name: customItemName,
          category: 'main',
          prep_time_min: 0,
          current_price: 0,
          ingredients: []
      };
      
      setFormItem(tempItem);
      setFormData({ cuisine: '', dietary: [], notes: '' });
      setIsFormOpen(true);
  };

  // 3. Submit Form -> Handle Request or Admin Generation
  const handleFormSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formItem) return;

      setIsFormOpen(false); // Close modal
      setError(null);

      const requirements = `
          Cuisine Style: ${formData.cuisine || 'Standard'}
          Dietary Restrictions: ${formData.dietary.length > 0 ? formData.dietary.join(', ') : 'None'}
          Preparation Notes: ${formData.notes || 'Standard preparation'}
      `;

      if (isAdmin) {
          // Admin Flow: Direct Generation
          await runAdminGeneration(formItem, requirements);
      } else {
          // Customer Flow: Create Request
          createRequest(formItem, requirements);
      }
  };

  const createRequest = (item: MenuItem, requirements: string) => {
      const newRequest: RecipeRequest = {
          id: `req_${Date.now()}`,
          userId: user.id,
          userName: user.name,
          item: item,
          requirements: requirements,
          status: 'pending',
          requestDate: new Date().toISOString()
      };
      
      storageService.saveRecipeRequest(newRequest);
      refreshRequests();
      setCustomItemName('');
      
      // Save item to menu if new
      if (!menuItems.find(m => m.sku_id === item.sku_id)) {
          const newMenu = [...menuItems, item];
          setMenuItems(newMenu);
          storageService.saveMenu(user.id, newMenu);
      }
      
      alert("Request received! Our culinary team will review and generate this recipe within 1 hour.");
      setViewMode('requests'); // Switch to request view
  };

  const runAdminGeneration = async (item: MenuItem, requirements: string) => {
      setLoading(true);
      setLoadingText(`Designing ${item.name}...`);
      setGeneratedRecipe(null);
      setSelectedSku(item.sku_id);
      setPosPushStatus(null);
      setSelectedRestaurantId('');

      try {
          // If fulfilling a request, use the requester's ID for ingredient context
          const contextUserId = activeRequest ? activeRequest.userId : user.id;
          const card = await generateRecipeCard(contextUserId, item, requirements);
          setGeneratedRecipe(card);
      } catch (e) {
          setError("Failed to generate recipe card. Please check your inputs.");
      } finally {
          setLoading(false);
      }
  };

  // Admin: Select a request to fulfill
  const handleFulfillRequest = (req: RecipeRequest) => {
      setActiveRequest(req);
      setViewMode('generator');
      // Trigger generation immediately
      runAdminGeneration(req.item, req.requirements);
  };

  const handleVariation = async (type: string) => {
    if (!generatedRecipe) return;
    if (!isAdmin && !checkUsage()) return; 

    setLoading(true);
    setLoadingText(`Creating ${type} variation...`);
    setError(null);
    setPosPushStatus(null);

    try {
      const variant = await generateRecipeVariation(user.id, generatedRecipe, type);
      setGeneratedRecipe(variant);
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
      setIsSaving(true);
      
      setTimeout(() => {
        if (isAdmin && activeRequest) {
            // Admin fulfilling request
            const recipeToSave = { ...generatedRecipe };
            // Save to REQUESTER'S library
            storageService.saveRecipe(activeRequest.userId, recipeToSave);
            
            // Mark Request Complete
            const completedReq: RecipeRequest = { 
                ...activeRequest, 
                status: 'completed', 
                completedDate: new Date().toISOString() 
            };
            storageService.updateRecipeRequest(completedReq);
            
            refreshRequests();
            setActiveRequest(null);
            setImportStatus(`Sent to ${activeRequest.userName}!`);
            setViewMode('requests');
            setGeneratedRecipe(null);
        } else {
            // Regular Save
            const restaurant = restaurants.find(r => r.id === selectedRestaurantId);
            const recipeToSave = {
                ...generatedRecipe,
                assignedRestaurantId: selectedRestaurantId,
                assignedRestaurantName: restaurant?.restaurantName
            };
            storageService.saveRecipe(user.id, recipeToSave);
            setSavedRecipes(storageService.getSavedRecipes(user.id));
            setImportStatus(restaurant ? `Sent to ${restaurant.restaurantName} DB!` : "Recipe saved to library!");
        }
        
        setIsSaving(false);
        setTimeout(() => setImportStatus(null), 2000);
      }, 600);
    }
  };

  const handleDiscard = () => {
      setGeneratedRecipe(null);
      setSelectedSku(null);
      setPosPushStatus(null);
      setError(null);
      setSelectedRestaurantId('');
      if (isAdmin && activeRequest) {
          setViewMode('requests');
          setActiveRequest(null);
      }
  };

  const handlePushToPOS = () => {
      if (!generatedRecipe) return;
      setIsPushing(true);
      const restaurant = restaurants.find(r => r.id === selectedRestaurantId);

      setTimeout(() => {
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
          setPosPushStatus(restaurant ? `Syncing with ${restaurant.restaurantName} POS` : "Sent to Integrations");
          setIsPushing(false);
      }, 1000);
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col gap-4 relative">
      {/* Requirement Form Modal */}
      {isFormOpen && formItem && (
          <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-in overflow-hidden">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                      <div>
                          <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                              <FileSignature className="text-emerald-600" size={20} /> 
                              {isAdmin ? 'Generate Recipe' : 'Request Recipe'}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                             {isAdmin ? 'Immediate AI Generation' : 'Send to admin for review & generation'}
                          </p>
                      </div>
                      <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500">
                          <X size={20} />
                      </button>
                  </div>
                  
                  <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Cuisine Style</label>
                          <div className="relative">
                              <UtensilsCrossed size={16} className="absolute left-3 top-3 text-slate-400" />
                              <input 
                                  type="text" 
                                  required
                                  placeholder="e.g. Italian, Indian Fusion, keto-friendly..."
                                  value={formData.cuisine}
                                  onChange={e => setFormData({...formData, cuisine: e.target.value})}
                                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                              />
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {['Italian', 'Indian', 'Mexican', 'Asian', 'Healthy', 'Continental'].map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setFormData({...formData, cuisine: c})}
                                    className="px-2 py-1 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded hover:bg-emerald-50 hover:text-emerald-600 border border-transparent hover:border-emerald-200 transition-colors"
                                >
                                    {c}
                                </button>
                            ))}
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Dietary Restrictions</label>
                          <div className="flex flex-wrap gap-2">
                              {['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto', 'Nut-Free', 'Halal', 'Low-Carb'].map(opt => {
                                  const isSelected = formData.dietary.includes(opt);
                                  return (
                                      <button
                                          key={opt}
                                          type="button"
                                          onClick={() => {
                                              setFormData(prev => ({
                                                  ...prev,
                                                  dietary: isSelected 
                                                      ? prev.dietary.filter(d => d !== opt)
                                                      : [...prev.dietary, opt]
                                              }));
                                          }}
                                          className={`py-1.5 px-3 text-xs font-bold rounded-lg border transition-all ${
                                              isSelected 
                                              ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500 text-emerald-700 dark:text-emerald-400' 
                                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                                          }`}
                                      >
                                          {opt}
                                      </button>
                                  );
                              })}
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Preparation Notes</label>
                          <div className="relative">
                              <AlignLeft size={16} className="absolute left-3 top-3 text-slate-400" />
                              <textarea 
                                  rows={3}
                                  placeholder="E.g. Use almond milk instead of dairy, make it spicy, target food cost < 25%..."
                                  value={formData.notes}
                                  onChange={e => setFormData({...formData, notes: e.target.value})}
                                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                              />
                          </div>
                      </div>

                      <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 mt-2">
                          <button 
                              type="button" 
                              onClick={() => setIsFormOpen(false)}
                              className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          >
                              Cancel
                          </button>
                          <button 
                              type="submit"
                              className="px-6 py-2 bg-slate-900 dark:bg-emerald-600 text-white text-sm font-bold rounded-lg hover:opacity-90 flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                          >
                              {isAdmin ? <Sparkles size={16} fill="currentColor" /> : <Inbox size={16} />} 
                              {isAdmin ? 'Generate Recipe' : 'Submit Request'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Top Bar */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
            <button 
                onClick={() => setViewMode('generator')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'generator' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
            >
                {isAdmin ? (activeRequest ? 'Fulfilling Request' : 'AI Generator') : 'Request Recipe'}
            </button>
            <button 
                onClick={() => setViewMode('saved')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'saved' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
            >
                Saved Library ({savedRecipes.length})
            </button>
            
            <button 
                onClick={() => setViewMode('requests')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${viewMode === 'requests' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
            >
                {isAdmin ? (
                    <>
                        Request Queue
                        {adminQueue.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{adminQueue.length}</span>}
                    </>
                ) : (
                    <>
                        My Requests
                        {myRequests.filter(r => r.status === 'pending').length > 0 && <span className="bg-yellow-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{myRequests.filter(r => r.status === 'pending').length}</span>}
                    </>
                )}
            </button>
        </div>
        
        {user.isTrial && (
            <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-full text-xs font-bold">
                <Zap size={12} fill="currentColor" />
                Demo: {user.queriesUsed || 0}/{user.queryLimit} Queries
            </div>
        )}
      </div>

      {viewMode === 'requests' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 overflow-y-auto flex-1 animate-fade-in">
              <h2 className="text-xl font-bold text-slate-800 mb-4">{isAdmin ? 'Customer Request Queue' : 'My Recipe Requests'}</h2>
              
              <div className="space-y-3">
                  {(isAdmin ? adminQueue : myRequests).length === 0 ? (
                      <p className="text-slate-500 text-center py-8">No pending requests found.</p>
                  ) : (
                      (isAdmin ? adminQueue : myRequests).map((req, i) => (
                          <div key={i} className="flex justify-between items-center p-4 border border-slate-100 rounded-lg hover:border-slate-300 transition-colors bg-slate-50">
                              <div className="flex items-start gap-4">
                                  <div className={`p-3 rounded-full ${req.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                      {req.status === 'completed' ? <CheckCircle2 size={20} /> : <Clock3 size={20} />}
                                  </div>
                                  <div>
                                      <h4 className="font-bold text-slate-800">{req.item.name}</h4>
                                      <p className="text-xs text-slate-500">Requested by: <span className="font-semibold">{req.userName}</span> • {new Date(req.requestDate).toLocaleString()}</p>
                                      {isAdmin && <p className="text-xs text-slate-600 mt-1 italic max-w-lg bg-white p-1 rounded border border-slate-100">{req.requirements}</p>}
                                  </div>
                              </div>
                              
                              <div>
                                  {req.status === 'completed' ? (
                                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">Completed</span>
                                  ) : (
                                      isAdmin ? (
                                          <button 
                                            onClick={() => handleFulfillRequest(req)}
                                            className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded hover:bg-emerald-600 transition-colors flex items-center gap-2"
                                          >
                                              <Sparkles size={14} fill="currentColor" /> Generate
                                          </button>
                                      ) : (
                                          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full flex items-center gap-1">
                                              <Clock size={12} /> Pending Admin Review
                                          </span>
                                      )
                                  )}
                              </div>
                          </div>
                      ))
                  )}
              </div>
          </div>
      )}

      {viewMode === 'saved' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 overflow-y-auto flex-1 animate-fade-in">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Your Saved Recipes</h2>
              {savedRecipes.length === 0 ? (
                  <p className="text-slate-500">No saved recipes yet. {isAdmin ? 'Generate' : 'Request'} one!</p>
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
      )} 
      
      {viewMode === 'generator' && (
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
                
                {limitReached && !isAdmin && (
                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs text-amber-800 flex items-center gap-2 animate-fade-in">
                        <Lock size={14} className="shrink-0" />
                        <span>
                            Plan limit reached ({savedRecipes.length}/{planLimit}).
                        </span>
                    </div>
                )}

                <div className="relative">
                    <input 
                        type="text" 
                        value={customItemName}
                        onChange={(e) => setCustomItemName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleGenerateCustomClick()}
                        placeholder={isAdmin ? "Generate for: Butter Chicken" : "Request for: Butter Chicken"}
                        disabled={limitReached && !isAdmin}
                        className="w-full pl-8 pr-8 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                    <Search className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
                    <button 
                        onClick={handleGenerateCustomClick}
                        disabled={!customItemName || loading || (limitReached && !isAdmin)}
                        className="absolute right-1.5 top-1.5 p-1 bg-slate-100 hover:bg-emerald-500 hover:text-white rounded text-slate-400 transition-colors disabled:opacity-50 disabled:hover:bg-slate-100 disabled:hover:text-slate-400"
                    >
                        {loading && customItemName ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
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
                    onClick={() => (!limitReached || isAdmin) && handleGenerateClick(item)}
                    className={`p-4 rounded-lg transition-all border ${
                        selectedSku === item.sku_id 
                        ? 'bg-yellow-50 border-yellow-200 ring-1 ring-yellow-300' 
                        : (limitReached && !isAdmin)
                            ? 'bg-slate-50 border-transparent opacity-60 cursor-not-allowed'
                            : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200 cursor-pointer'
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
                <p>Select an item or type a name to {isAdmin ? 'generate' : 'request'} a recipe card</p>
                {!user.isTrial && !isAdmin && (
                    <p className={`text-xs mt-2 ${limitReached ? 'text-red-500 font-bold' : 'text-emerald-600'}`}>
                        Plan Limit: {savedRecipes.length} / {PLANS[user.plan].recipeLimit} Recipes
                    </p>
                )}
            </div>
            ) : (
            <div className="h-full flex flex-col">
                {/* Header */}
                <div className={`p-6 border-b border-slate-200 ${isAdmin && activeRequest ? 'bg-yellow-50' : 'bg-white'}`}>
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">
                            {generatedRecipe ? generatedRecipe.name : (menuItems.find(m => m.sku_id === selectedSku)?.name || customItemName || 'New Recipe')}
                        </h2>
                        {activeRequest && (
                             <p className="text-xs text-yellow-700 font-bold flex items-center gap-1 mt-1">
                                 <UserCheck size={12} /> Fulfilling request for: {activeRequest.userName}
                             </p>
                        )}
                    </div>
                    {generatedRecipe && (
                         <div className="flex gap-2 flex-col items-end">
                             {/* Restaurant Selection Dropdown (Only for regular generation, not fulfillment) */}
                             {!activeRequest && (
                                 <div className="flex items-center gap-2 mb-1">
                                    <Building2 size={16} className="text-slate-400" />
                                    <select 
                                        value={selectedRestaurantId}
                                        onChange={(e) => setSelectedRestaurantId(e.target.value)}
                                        className="text-xs p-1.5 border border-slate-200 rounded-md bg-slate-50 text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    >
                                        <option value="">Select Restaurant / Outlet</option>
                                        {restaurants.map(r => (
                                            <option key={r.id} value={r.id}>{r.restaurantName || r.name}</option>
                                        ))}
                                    </select>
                                 </div>
                             )}

                             <div className="flex gap-2">
                                <button
                                    onClick={handleDiscard}
                                    disabled={isSaving || isPushing}
                                    className="text-sm font-bold text-red-600 hover:text-red-700 flex items-center gap-1 border border-red-200 px-3 py-1.5 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                                >
                                    <Trash2 size={16} /> Discard
                                </button>

                                {posPushStatus ? (
                                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded border border-amber-200 flex items-center gap-1">
                                        <Clock size={12} /> {posPushStatus}
                                    </span>
                                ) : (
                                    <button 
                                        onClick={handlePushToPOS}
                                        disabled={isPushing}
                                        className="text-sm font-bold text-slate-600 hover:text-blue-600 flex items-center gap-1 border border-slate-200 px-3 py-1.5 rounded hover:border-blue-200 transition-colors disabled:opacity-50"
                                    >
                                        {isPushing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                                        {isPushing ? 'Pushing...' : 'Push to POS'}
                                    </button>
                                )}
                                <button 
                                    onClick={handleSaveRecipe}
                                    disabled={isSaving}
                                    className="text-sm font-bold text-slate-600 hover:text-emerald-600 flex items-center gap-1 border border-slate-200 px-3 py-1.5 rounded hover:border-emerald-200 transition-colors disabled:opacity-50"
                                    title={activeRequest ? "Send to User" : selectedRestaurantId ? "Send to Restaurant Database" : "Save to Library"}
                                >
                                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    {isSaving ? 'Saving...' : activeRequest ? 'Send to User' : selectedRestaurantId ? 'Send to DB' : 'Save'}
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
                                <ol className="list-decimal pl-5 space-y-2 marker:font-bold marker:text-slate-400">
                                    {generatedRecipe.preparation_steps.map((step, i) => (
                                        <li key={i} className="text-slate-700 leading-relaxed">{step}</li>
                                    ))}
                                </ol>
                           </div>

                           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-100">
                                <div>
                                     <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-slate-800 rounded-full"></div> Equipment
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {generatedRecipe.equipment_needed.map((eq, i) => (
                                            <span key={i} className="px-3 py-1 bg-slate-100 text-slate-600 text-xs rounded-full border border-slate-200">
                                                {eq}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                     <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                                        <AlertCircle size={16} className="text-amber-500"/> Allergens & Info
                                    </h3>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {generatedRecipe.allergens.map((alg, i) => (
                                            <span key={i} className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-100">
                                                {alg}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                                        <Clock size={14} /> Shelf Life: {generatedRecipe.shelf_life_hours} hours
                                    </div>
                                </div>
                           </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-400">
                            Select an item to view details
                        </div>
                    )}
                </div>
            </div>
            )}
        </div>
      </div>
      )}
    </div>
  );
};
