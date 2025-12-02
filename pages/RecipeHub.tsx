
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { PLANS, CREDIT_COSTS } from '../constants';
import { generateRecipeCard, generateRecipeVariation, hasValidApiKey } from '../services/geminiService';
import { ingredientService } from '../services/ingredientService';
import { RecipeCard, MenuItem, User, UserRole, POSChangeRequest, RecipeRequest } from '../types';
import { Loader2, ChefHat, Scale, Clock, AlertCircle, Upload, Lock, Sparkles, Check, Save, RefreshCw, Search, Plus, Store, Zap, Trash2, Building2, FileSignature, X, AlignLeft, UtensilsCrossed, Inbox, UserCheck, CheckCircle2, Clock3, Carrot, Type, Wallet, Filter, Tag, Eye, Flame, Wand2, Eraser, FileDown, TrendingDown, ArrowRight, Key } from 'lucide-react';
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

export const RecipeHub: React.FC<RecipeHubProps> = ({ user, onUserUpdate }) => {
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [generatedRecipe, setGeneratedRecipe] = useState<RecipeCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Generating with AI...');
  const [error, setError] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  
  // API Key State
  const [hasApiKey, setHasApiKey] = useState(false);

  // Supplier Costing State
  const [altPrices, setAltPrices] = useState<Record<number, string>>({});

  // View Modes
  const [viewMode, setViewMode] = useState<'generator' | 'saved' | 'requests'>('generator');
  
  const [savedRecipes, setSavedRecipes] = useState<RecipeCard[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Request Management
  const [myRequests, setMyRequests] = useState<RecipeRequest[]>([]);
  const [adminQueue, setAdminQueue] = useState<RecipeRequest[]>([]);
  const [activeRequest, setActiveRequest] = useState<RecipeRequest | null>(null); 
  const [previewRequest, setPreviewRequest] = useState<RecipeRequest | null>(null); 

  const [posPushStatus, setPosPushStatus] = useState<string | null>(null);
  
  const [restaurants, setRestaurants] = useState<User[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('');

  // Loading states
  const [isSaving, setIsSaving] = useState(false);
  const [isPushing, setIsPushing] = useState(false);

  // Unified Form State
  const [dishName, setDishName] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [dietary, setDietary] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  // Helper for sidebar input
  const [customItemName, setCustomItemName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(user.role);

  useEffect(() => {
    setSavedRecipes(storageService.getSavedRecipes(user.id));
    setMenuItems(storageService.getMenu(user.id));
    refreshRequests();
    // Initial check
    if (hasValidApiKey()) setHasApiKey(true);
  }, [user.id, user.role]);

  // Poll for API Key Status
  useEffect(() => {
    const checkKey = async () => {
        // 1. Check local manual key
        if (hasValidApiKey()) {
            setHasApiKey(true);
            if (error && (error.includes('API Key') || error.includes('missing'))) {
                setError(null);
            }
            return;
        }

        // 2. Check AI Studio Bridge
        if ((window as any).aistudio) {
            try {
                const has = await (window as any).aistudio.hasSelectedApiKey();
                setHasApiKey(has);
                if (has && error && (error.includes('API Key') || error.includes('missing'))) {
                    setError(null);
                }
            } catch (e) {
                console.error("Error checking API key", e);
            }
        }
    };
    checkKey();
    const interval = setInterval(checkKey, 2000);
    return () => clearInterval(interval);
  }, [error]);

  // Reset alt prices when recipe changes
  useEffect(() => {
      setAltPrices({});
  }, [generatedRecipe]);

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
        const owners = allUsers.filter(u => u.restaurantName && u.role === UserRole.OWNER);
        setRestaurants(owners);
    };
    fetchRestaurants();
  }, []);

  // Filter Logic
  const filteredRecipes = useMemo(() => {
      return savedRecipes.filter(recipe => {
          const matchesSearch = recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                recipe.sku_id.toLowerCase().includes(searchQuery.toLowerCase());
          
          const matchesTags = selectedTags.length === 0 || 
                              selectedTags.every(tag => recipe.tags?.includes(tag));
          
          return matchesSearch && matchesTags;
      });
  }, [savedRecipes, searchQuery, selectedTags]);

  const uniqueTags = useMemo(() => {
      const tags = new Set<string>();
      savedRecipes.forEach(r => r.tags?.forEach(t => tags.add(t)));
      return Array.from(tags).sort();
  }, [savedRecipes]);

  const toggleTag = (tag: string) => {
      setSelectedTags(prev => 
          prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
      );
  };

  const toggleDietary = (tag: string) => {
    setDietary(prev => 
        prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // Savings Calculation
  const savingsAnalysis = useMemo(() => {
      if (!generatedRecipe) return null;
      let projectedCost = 0;
      let hasChanges = false;

      generatedRecipe.ingredients.forEach((ing, idx) => {
          const qty = ing.qty_per_serving || 0;
          const originalRate = ing.cost_per_unit || 0;
          const userRate = altPrices[idx] ? parseFloat(altPrices[idx]) : originalRate;
          
          if (altPrices[idx]) hasChanges = true;
          projectedCost += (qty * userRate);
      });

      const originalCost = generatedRecipe.food_cost_per_serving;
      const savings = originalCost - projectedCost;
      const savingsPct = originalCost > 0 ? (savings / originalCost) * 100 : 0;

      return {
          projectedCost,
          savings,
          savingsPct,
          hasChanges
      };
  }, [generatedRecipe, altPrices]);

  const checkCredits = (): boolean => {
      if (isAdmin) return true;
      
      const cost = CREDIT_COSTS.RECIPE;
      if (user.credits < cost) {
          setError(`Insufficient Credits. This action requires ${cost} credits, but you have ${user.credits}. Please recharge.`);
          return false;
      }
      return true;
  };

  const deductCredits = (): boolean => {
      if (!isAdmin && onUserUpdate) {
          const cost = CREDIT_COSTS.RECIPE;
          const success = storageService.deductCredits(user.id, cost, 'Recipe Generation');
          if (success) {
              onUserUpdate({ ...user, credits: user.credits - cost });
              return true;
          } else {
              setError("Transaction failed. Insufficient credits.");
              return false;
          }
      }
      return true;
  };

  const handleTabChange = (mode: 'generator' | 'saved' | 'requests', keepState = false) => {
      setViewMode(mode);
      setError(null);
      
      if (mode === 'generator' && !keepState) {
          resetForm();
      }
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
      setCustomItemName('');
      setAltPrices({});
  };

  const loadItemIntoForm = (item: MenuItem) => {
      setDishName(item.name);
      setSelectedSku(item.sku_id);
      // Try to populate ingredients from existing item data
      if (item.ingredients && item.ingredients.length > 0) {
          setIngredients(item.ingredients.map(i => i.name).join(', '));
      } else {
          setIngredients('');
      }
      setCuisine(''); // Reset context fields
      setDietary([]);
      setNotes('');
      setGeneratedRecipe(null);
      setError(null);
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

  // Populate form from sidebar input
  const handleGenerateCustomClick = () => {
      if (!customItemName.trim()) return;
      setDishName(customItemName);
      setCuisine('');
      setIngredients('');
      setDietary([]);
      setNotes('');
      setSelectedSku(null);
      setError(null);
      // Clear the sidebar input to show it moved to main form
      setCustomItemName(''); 
  };

  const handleFormSubmit = async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!dishName) {
          setError("Please enter a dish name.");
          return;
      }

      if (!checkCredits()) return;

      setError(null);

      // Construct rich requirements
      const requirements = `
          Cuisine Style: ${cuisine || 'Standard'}
          Key Ingredients to Include: ${ingredients || 'AI Suggested'}
          Dietary Restrictions: ${dietary.length > 0 ? dietary.join(', ') : 'None'}
          Preparation Notes: ${notes || 'Standard preparation'}
      `.trim();

      // Create temp item for generation
      const tempItem: MenuItem = {
          sku_id: selectedSku || `NEW-${Date.now().toString().slice(-4)}`,
          name: dishName,
          category: 'main',
          prep_time_min: 0,
          current_price: 0,
          ingredients: []
      };

      if (isAdmin) {
          await runAdminGeneration(tempItem, requirements);
      } else {
          createRequest(tempItem, requirements);
      }
  };

  const createRequest = (item: MenuItem, requirements: string) => {
      if (!deductCredits()) return;

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
      resetForm();
      
      // Save item to menu if new
      if (!menuItems.find(m => m.sku_id === item.sku_id)) {
          const newMenu = [...menuItems, item];
          setMenuItems(newMenu);
          storageService.saveMenu(user.id, newMenu);
      }
      
      alert(`Request received! ${CREDIT_COSTS.RECIPE} credits deducted. Our culinary team will review and generate this recipe within 1 hour.`);
      handleTabChange('requests');
  };

  const runAdminGeneration = async (item: MenuItem, requirements: string, targetUserId?: string) => {
      setLoading(true);
      setLoadingText(`Designing ${item.name}...`);
      setGeneratedRecipe(null);
      setPosPushStatus(null);
      setSelectedRestaurantId('');
      setError(null);

      try {
          // Use target user ID to fetch correct ingredients
          const contextUserId = targetUserId || (activeRequest ? activeRequest.userId : user.id);
          const card = await generateRecipeCard(contextUserId, item, requirements);
          setGeneratedRecipe(card);
      } catch (e: any) {
          console.error(e);
          setError(e.message || "Failed to generate recipe card. Please check your inputs or API key.");
      } finally {
          setLoading(false);
      }
  };

  // Admin: Open form pre-populated with request details
  const handleFulfillRequest = (req: RecipeRequest) => {
      setActiveRequest(req);
      setViewMode('generator');
      
      // Pre-populate form
      setDishName(req.item.name);
      setSelectedSku(req.item.sku_id);
      setNotes(req.requirements); // Dump raw requirements into notes for Admin to refine
      // Reset structured fields as they might be in the string
      setCuisine('');
      setIngredients('');
      setDietary([]);
      
      setGeneratedRecipe(null); // Clear previous result to show form
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
            const variant = await generateRecipeVariation(user.id, generatedRecipe, type);
            setGeneratedRecipe(variant);
        }
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
        const result = storageService.importMenuFromCSV(user.id, text);
        if (result.success) {
          setImportStatus(result.message);
          setMenuItems(storageService.getMenu(user.id));
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
            const recipeToSave = { ...generatedRecipe };
            // Save to REQUESTER'S library
            storageService.saveRecipe(activeRequest.userId, recipeToSave);
            
            const completedReq: RecipeRequest = { 
                ...activeRequest, 
                status: 'completed', 
                completedDate: new Date().toISOString() 
            };
            storageService.updateRecipeRequest(completedReq);
            
            refreshRequests();
            resetForm();
            setImportStatus(`Sent to ${activeRequest.userName}!`);
            handleTabChange('requests');
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
          handleTabChange('requests');
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

  const handleConnectKey = async () => {
      if ((window as any).aistudio) {
          try {
              await (window as any).aistudio.openSelectKey();
              setError(null);
              setHasApiKey(true);
          } catch (e) {
              console.error(e);
          }
      } else {
          // Manual Fallback for Live Site
          const key = window.prompt("Enter your Google Gemini API Key (from https://aistudio.google.com):");
          if (key && key.trim()) {
              localStorage.setItem('gemini_api_key', key.trim());
              setHasApiKey(true);
              setError(null);
              alert("API Key saved locally!");
          }
      }
  };

  // --- DOWNLOAD PDF LOGIC ---
  const handleDownloadPDF = () => {
      if (!generatedRecipe) return;

      const content = `
        <html>
          <head>
            <title>${generatedRecipe.name} - Recipe Card</title>
            <style>
              body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; padding: 40px; }
              .header { border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; }
              .header h1 { margin: 0; font-size: 28px; color: #111; }
              .meta { display: flex; gap: 20px; color: #666; margin-top: 10px; font-size: 14px; }
              .meta-item { background: #f3f4f6; padding: 4px 10px; border-radius: 4px; font-weight: bold; }
              
              .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
              .box { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; }
              .box h3 { margin-top: 0; color: #10b981; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; }
              
              table { width: 100%; border-collapse: collapse; font-size: 14px; }
              th { text-align: left; border-bottom: 2px solid #eee; padding: 8px 0; color: #888; font-weight: 600; }
              td { border-bottom: 1px solid #eee; padding: 8px 0; }
              .text-right { text-align: right; }
              
              .steps ol { padding-left: 20px; margin: 0; }
              .steps li { margin-bottom: 12px; line-height: 1.5; color: #444; }
              
              .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #aaa; border-top: 1px solid #eee; padding-top: 20px; }
              .cost { font-size: 18px; font-weight: bold; color: #111; }
              
              @media print {
                 body { padding: 0; }
                 .box { border: 1px solid #ccc; }
              }
            </style>
          </head>
          <body>
            <div class="header">
               <h1>${generatedRecipe.name}</h1>
               <div class="meta">
                  <span class="meta-item">SKU: ${generatedRecipe.sku_id}</span>
                  <span class="meta-item">Yield: ${generatedRecipe.yield}</span>
                  <span class="meta-item">Prep: ${generatedRecipe.prep_time_min} mins</span>
                  <span class="meta-item">${generatedRecipe.category.toUpperCase()}</span>
               </div>
            </div>
            
            <div class="grid">
               <div class="box">
                  <h3>Costing</h3>
                  <table>
                    <tr>
                       <td>Food Cost</td>
                       <td class="text-right cost">₹${generatedRecipe.food_cost_per_serving.toFixed(2)}</td>
                    </tr>
                    <tr>
                       <td>Suggested Price</td>
                       <td class="text-right cost">₹${generatedRecipe.suggested_selling_price}</td>
                    </tr>
                    <tr>
                       <td>Margin</td>
                       <td class="text-right" style="color: #10b981; font-weight: bold;">
                         ${((generatedRecipe.suggested_selling_price - generatedRecipe.food_cost_per_serving) / generatedRecipe.suggested_selling_price * 100).toFixed(1)}%
                       </td>
                    </tr>
                  </table>
               </div>
               
               <div class="box">
                  <h3>Ingredients</h3>
                  <table>
                    <thead>
                       <tr>
                         <th>Item</th>
                         <th class="text-right">Qty</th>
                         <th class="text-right">Unit Cost</th>
                         <th class="text-right">Total</th>
                       </tr>
                    </thead>
                    <tbody>
                       ${generatedRecipe.ingredients.map(ing => `
                          <tr>
                             <td>${ing.name}</td>
                             <td class="text-right">${ing.qty_per_serving} ${ing.unit}</td>
                             <td class="text-right">₹${ing.cost_per_unit?.toFixed(2)}</td>
                             <td class="text-right font-bold">₹${ing.cost_per_serving?.toFixed(2)}</td>
                          </tr>
                       `).join('')}
                    </tbody>
                  </table>
               </div>
            </div>
            
            <div class="box steps">
               <h3>Preparation</h3>
               <ol>
                  ${generatedRecipe.preparation_steps.map(step => `<li>${step}</li>`).join('')}
               </ol>
            </div>
            
            <div class="footer">
               Generated by BistroIntelligence AI • ${new Date().toLocaleDateString()}
            </div>
            
            <script>
               window.onload = function() { window.print(); }
            </script>
          </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
          printWindow.document.write(content);
          printWindow.document.close();
      }
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col gap-4 relative">
      {/* Request Preview Modal (Admin Only) */}
      {previewRequest && (
          <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-in">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                          <Eye className="text-emerald-600" size={20} /> Request Preview
                      </h3>
                      <button onClick={() => setPreviewRequest(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400">
                          <X size={20} />
                      </button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div>
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Item Name</p>
                          <p className="text-lg font-bold text-slate-900 dark:text-white">{previewRequest.item.name}</p>
                      </div>
                      <div>
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Requested By</p>
                          <p className="text-sm text-slate-800 dark:text-slate-200">{previewRequest.userName}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Specific Requirements</p>
                          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{previewRequest.requirements}</p>
                      </div>
                      <div className="pt-4 flex justify-end gap-2">
                          <button onClick={() => setPreviewRequest(null)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Close</button>
                          <button 
                              onClick={() => {
                                  setPreviewRequest(null);
                                  handleFulfillRequest(previewRequest);
                              }}
                              className="px-4 py-2 bg-slate-900 dark:bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-600 dark:hover:bg-emerald-700 transition-colors flex items-center gap-2"
                          >
                              <Sparkles size={14} fill="currentColor" /> Fulfill Now
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Top Bar */}
      <div className="flex justify-between items-center">
        {/* ... (Same as original) */}
        <div className="flex gap-2">
            <button 
                onClick={() => handleTabChange('generator')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'generator' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            >
                {isAdmin ? (activeRequest ? 'Fulfilling Request' : 'AI Generator') : 'Request Recipe'}
            </button>
            <button 
                onClick={() => handleTabChange('saved')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'saved' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            >
                Saved Library ({savedRecipes.length})
            </button>
            
            <button 
                onClick={() => handleTabChange('requests')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${viewMode === 'requests' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
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
        
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 rounded-full text-xs font-bold">
            <Wallet size={12} />
            Credits: {user.credits}
        </div>
      </div>

      {viewMode === 'requests' && (
          // ... (Same as original)
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 overflow-y-auto flex-1 animate-fade-in transition-colors">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">{isAdmin ? 'Customer Request Queue' : 'My Recipe Requests'}</h2>
              
              <div className="space-y-3">
                  {(isAdmin ? adminQueue : myRequests).length === 0 ? (
                      <p className="text-slate-500 dark:text-slate-400 text-center py-8">No pending requests found.</p>
                  ) : (
                      (isAdmin ? adminQueue : myRequests).map((req, i) => (
                          <div key={i} className="flex justify-between items-center p-4 border border-slate-100 dark:border-slate-800 rounded-lg hover:border-slate-300 dark:hover:border-slate-700 transition-colors bg-slate-50 dark:bg-slate-800/50">
                              <div className="flex items-start gap-4">
                                  <div className={`p-3 rounded-full ${req.status === 'completed' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400' : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/50 dark:text-yellow-400'}`}>
                                      {req.status === 'completed' ? <CheckCircle2 size={20} /> : <Clock3 size={20} />}
                                  </div>
                                  <div>
                                      <h4 className="font-bold text-slate-800 dark:text-white">{req.item.name}</h4>
                                      <p className="text-xs text-slate-500 dark:text-slate-400">Requested by: <span className="font-semibold">{req.userName}</span> • {new Date(req.requestDate).toLocaleString()}</p>
                                      {isAdmin && <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 italic max-w-lg bg-white dark:bg-slate-800 p-1 rounded border border-slate-100 dark:border-slate-700 truncate">{req.requirements}</p>}
                                  </div>
                              </div>
                              
                              <div>
                                  {req.status === 'completed' ? (
                                      <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-full">Completed</span>
                                  ) : (
                                      isAdmin ? (
                                          <div className="flex gap-2">
                                              <button 
                                                  onClick={() => setPreviewRequest(req)}
                                                  className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-700 rounded-lg transition-colors"
                                                  title="Quick Preview"
                                              >
                                                  <Eye size={16} />
                                              </button>
                                              <button 
                                                onClick={() => handleFulfillRequest(req)}
                                                className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded hover:bg-emerald-600 dark:hover:bg-slate-200 transition-colors flex items-center gap-2"
                                              >
                                                  <Sparkles size={14} fill="currentColor" /> Fulfill
                                              </button>
                                          </div>
                                      ) : (
                                          <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-bold rounded-full flex items-center gap-1">
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
          // ... (Same as original)
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col flex-1 animate-fade-in transition-colors">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white">Your Saved Recipes</h2>
                  
                  {/* Search and Filter */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="relative flex-1 sm:w-64">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input 
                              type="text" 
                              placeholder="Search recipes..." 
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
                          />
                      </div>
                      
                      <div className="relative">
                          <button 
                              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                              className={`p-2 rounded-lg border transition-colors flex items-center gap-2 ${showFilterDropdown || selectedTags.length > 0 ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                          >
                              <Filter size={16} />
                              <span className="text-xs font-bold hidden sm:inline">Filters</span>
                              {selectedTags.length > 0 && (
                                  <span className="bg-emerald-500 text-white text-[10px] px-1.5 rounded-full">{selectedTags.length}</span>
                              )}
                          </button>

                          {showFilterDropdown && (
                              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 p-4 animate-scale-in">
                                  <div className="flex justify-between items-center mb-3">
                                      <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Filter by Tags</h4>
                                      {selectedTags.length > 0 && (
                                          <button onClick={() => setSelectedTags([])} className="text-[10px] text-red-500 hover:underline">Clear</button>
                                      )}
                                  </div>
                                  <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1">
                                      {uniqueTags.length === 0 ? (
                                          <p className="text-xs text-slate-400 text-center py-2">No tags available</p>
                                      ) : (
                                          uniqueTags.map(tag => (
                                              <label key={tag} className="flex items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded cursor-pointer">
                                                  <input 
                                                      type="checkbox" 
                                                      checked={selectedTags.includes(tag)}
                                                      onChange={() => toggleTag(tag)}
                                                      className="rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                                                  />
                                                  <span className="text-sm text-slate-700 dark:text-slate-300">{tag}</span>
                                              </label>
                                          ))
                                      )}
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
              </div>

              {/* Active Filters Display */}
              {selectedTags.length > 0 && (
                  <div className="px-6 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
                      {selectedTags.map(tag => (
                          <div key={tag} className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
                              {tag}
                              <button onClick={() => toggleTag(tag)} className="hover:text-red-500"><X size={12} /></button>
                          </div>
                      ))}
                  </div>
              )}

              <div className="flex-1 overflow-y-auto p-6">
                  {savedRecipes.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                          <ChefHat size={48} className="mb-4 opacity-50" />
                          <p className="text-sm">No saved recipes yet.</p>
                          <p className="text-xs mt-1">{isAdmin ? 'Generate' : 'Request'} one to populate your library!</p>
                      </div>
                  ) : filteredRecipes.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                          <Search size={48} className="mb-4 opacity-50" />
                          <p className="text-sm">No recipes match your filters.</p>
                          <button onClick={() => { setSearchQuery(''); setSelectedTags([]); }} className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline mt-2">Clear all filters</button>
                      </div>
                  ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {filteredRecipes.map((recipe, idx) => (
                              <div key={idx} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all shadow-sm bg-white dark:bg-slate-900 flex flex-col">
                                  <div className="flex justify-between items-start mb-2">
                                      <h3 className="font-bold text-slate-800 dark:text-white line-clamp-1" title={recipe.name}>{recipe.name}</h3>
                                      <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">{recipe.sku_id}</span>
                                  </div>
                                  
                                  {/* Tags Preview */}
                                  <div className="flex flex-wrap gap-1 mb-3 h-6 overflow-hidden">
                                      {recipe.tags?.slice(0, 3).map((tag, tIdx) => (
                                          <span key={tIdx} className="text-[10px] bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-700">
                                              {tag}
                                          </span>
                                      ))}
                                      {(recipe.tags?.length || 0) > 3 && (
                                          <span className="text-[10px] text-slate-400 dark:text-slate-500 px-1">+{ (recipe.tags?.length || 0) - 3}</span>
                                      )}
                                  </div>

                                  {recipe.assignedRestaurantName && (
                                      <div className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded w-fit mb-2">
                                          <Store size={10} /> {recipe.assignedRestaurantName}
                                      </div>
                                  )}
                                  
                                  <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                      <div>
                                          <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">Cost</p>
                                          <p className="text-emerald-700 dark:text-emerald-400 font-bold">₹{recipe.food_cost_per_serving.toFixed(0)}</p>
                                      </div>
                                      <button 
                                        onClick={() => {
                                            handleTabChange('generator', true);
                                            setGeneratedRecipe(recipe);
                                            setSelectedSku(recipe.sku_id);
                                        }}
                                        className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                      >
                                        View
                                      </button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          </div>
      )} 
      
      {viewMode === 'generator' && (
      <div className="flex gap-6 h-full overflow-hidden">
        {/* List */}
        <div className="w-1/3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden animate-fade-in transition-colors">
            {/* ... List Content (Search, Chips etc) ... */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 dark:text-white">Menu Items</h3>
                    <div className="flex gap-2 items-center">
                         <button 
                            onClick={handleSurpriseMe}
                            className="text-xs flex items-center gap-1 text-purple-600 dark:text-purple-400 hover:text-purple-700 bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded border border-purple-100 dark:border-purple-800 transition-colors"
                            title="Auto-fill with a creative dish idea"
                        >
                            <Sparkles size={12} /> Surprise
                        </button>
                        <div className="group relative">
                            <button 
                                onClick={handleImportClick}
                                className="text-xs flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded border border-emerald-100 dark:border-emerald-800 transition-colors"
                            >
                                <Upload size={12} /> Import
                            </button>
                            <div className="absolute right-0 top-full mt-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                Format: SKU, Name, Category, Price, PrepTime (CSV)
                            </div>
                        </div>
                    </div>
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
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search existing items..."
                        className="w-full pl-8 pr-2 py-2 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    />
                    <Search className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
                </div>

                {importStatus && (
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 p-1.5 rounded flex items-center gap-1 animate-fade-in">
                        <Check size={10} /> {importStatus}
                    </div>
                )}
                
                {/* Popular Ideas Chips */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 mt-1">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-2">Quick Start Ideas</p>
                    <div className="flex flex-wrap gap-2">
                        {POPULAR_IDEAS.map((idea, idx) => (
                            <button
                                key={idx}
                                onClick={() => handlePopularIdea(idea)}
                                className="text-[10px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-200 dark:hover:border-emerald-800 px-2 py-1 rounded-full transition-colors flex items-center gap-1"
                            >
                                <Flame size={10} className="text-orange-400" />
                                {idea.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            
            <div className="overflow-y-auto flex-1 p-2 space-y-2">
            {menuItems.length === 0 ? (
                <div className="text-center p-8 text-slate-400 dark:text-slate-500">
                    <ChefHat className="mx-auto mb-2 opacity-50" size={32} />
                    <p className="text-sm">No items found.</p>
                    <p className="text-xs mt-1">Import your menu or create a new dish.</p>
                </div>
            ) : (
                menuItems
                    .filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((item) => (
                    <div 
                    key={item.sku_id}
                    onClick={() => loadItemIntoForm(item)}
                    className={`p-4 rounded-lg transition-all border ${
                        selectedSku === item.sku_id 
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-900/50 ring-1 ring-yellow-300 dark:ring-yellow-700' 
                        : 'bg-white dark:bg-slate-800 border-transparent hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-200 dark:hover:border-slate-600 cursor-pointer'
                    }`}
                    >
                    <div className="flex justify-between items-start">
                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{item.name}</h4>
                        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900 px-1 rounded">{item.sku_id}</span>
                    </div>
                    </div>
                ))
            )}
            </div>
        </div>

        {/* Detail / Generator View */}
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col animate-fade-in transition-colors">
            {generatedRecipe ? (
                 // ... (Generated Recipe View - Same as original)
                 <div className="flex flex-col h-full animate-fade-in">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-start">
                            <div>
                                {activeRequest && isAdmin && (
                                    <div className="mb-2 inline-flex items-center gap-1 text-[10px] font-bold text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded">
                                        <UserCheck size={10} /> Fulfilling Request for: {activeRequest.userName}
                                    </div>
                                )}
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-white leading-tight">{generatedRecipe.name}</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                                    <span className="font-mono bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-xs">{generatedRecipe.sku_id}</span>
                                    <span>•</span>
                                    <span>Yield: {generatedRecipe.yield} servings</span>
                                    <span>•</span>
                                    <span>Prep: {generatedRecipe.prep_time_min} mins</span>
                                </p>
                            </div>
                            
                            <div className="flex gap-2">
                                <button 
                                    onClick={handleDownloadPDF}
                                    className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors"
                                    title="Download PDF"
                                >
                                    <FileDown size={20} />
                                </button>
                                <button 
                                    onClick={() => setGeneratedRecipe(null)}
                                    className="p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                    title="Close"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Content Scroll */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                            
                            {/* Summary & Confidence */}
                            {generatedRecipe.human_summary && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 p-4 rounded-lg flex gap-3">
                                    <Sparkles className="text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" size={18} />
                                    <div>
                                        <p className="text-sm text-blue-900 dark:text-blue-200 leading-relaxed">{generatedRecipe.human_summary}</p>
                                    </div>
                                </div>
                            )}

                            {/* Costing Section */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {/* ... Costing cards ... */}
                                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-sm">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Original Food Cost</p>
                                    <p className="text-2xl font-bold text-slate-800 dark:text-white">₹{generatedRecipe.food_cost_per_serving?.toFixed(2)}</p>
                                </div>
                                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-sm">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Projected Food Cost</p>
                                    <p className={`text-2xl font-bold ${savingsAnalysis?.hasChanges ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-white'}`}>
                                        ₹{savingsAnalysis?.projectedCost.toFixed(2)}
                                    </p>
                                    {savingsAnalysis?.hasChanges && <span className="text-[10px] text-slate-400">Based on inputs</span>}
                                </div>
                                
                                {savingsAnalysis?.savings && savingsAnalysis.savings > 0 ? (
                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 p-4 rounded-xl shadow-sm">
                                        <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                                            Savings Potential <TrendingDown size={14}/>
                                        </p>
                                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">₹{savingsAnalysis.savings.toFixed(2)}</p>
                                        <p className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold mt-1">
                                            {savingsAnalysis.savingsPct.toFixed(1)}% reduction
                                        </p>
                                    </div>
                                ) : (
                                    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-sm opacity-60">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Savings Potential</p>
                                        <p className="text-2xl font-bold text-slate-300 dark:text-slate-500">₹0.00</p>
                                    </div>
                                )}

                                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-sm">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Suggested Price</p>
                                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">₹{generatedRecipe.suggested_selling_price}</p>
                                    <p className="text-[10px] text-slate-400 mt-1">
                                        ~{generatedRecipe.suggested_selling_price > 0 ? ((savingsAnalysis?.projectedCost || generatedRecipe.food_cost_per_serving) / generatedRecipe.suggested_selling_price * 100).toFixed(1) : 0}% Cost
                                    </p>
                                </div>
                            </div>

                            {/* Ingredients Table */}
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                                    <Scale size={18} className="text-slate-400"/> Ingredients & Suppliers
                                </h3>
                                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                                            <tr>
                                                <th className="px-4 py-2">Item</th>
                                                <th className="px-4 py-2 text-right">Qty</th>
                                                <th className="px-4 py-2 text-right">Market Rate</th>
                                                <th className="px-4 py-2 text-right w-32">Supplier Rate</th>
                                                <th className="px-4 py-2 text-right">Variance</th>
                                                <th className="px-4 py-2 text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {generatedRecipe.ingredients?.map((ing, i) => {
                                                const originalRate = ing.cost_per_unit || 0;
                                                const userRate = altPrices[i] ? parseFloat(altPrices[i]) : originalRate;
                                                const diff = originalRate - userRate;
                                                const isCheaper = diff > 0.01;
                                                const isCostlier = diff < -0.01;

                                                return (
                                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                        <td className="px-4 py-2 font-medium text-slate-700 dark:text-slate-200">{ing.name}</td>
                                                        <td className="px-4 py-2 text-right text-slate-500 dark:text-slate-400">{ing.qty_per_serving} {ing.unit}</td>
                                                        <td className="px-4 py-2 text-right text-slate-500 dark:text-slate-400 text-xs">
                                                            {ing.cost_per_unit ? `₹${ing.cost_per_unit}` : '-'}
                                                        </td>
                                                        <td className="px-4 py-2 text-right">
                                                            <div className="flex items-center justify-end">
                                                                <span className="text-slate-400 mr-1 text-xs">₹</span>
                                                                <input 
                                                                    type="number" 
                                                                    min="0" 
                                                                    step="0.01"
                                                                    className="w-20 px-2 py-1 text-right text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none"
                                                                    placeholder={ing.cost_per_unit?.toString()}
                                                                    value={altPrices[i] || ''}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        setAltPrices(prev => ({...prev, [i]: val}));
                                                                    }}
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2 text-right text-xs">
                                                            {isCheaper && <span className="text-emerald-600 font-bold flex items-center justify-end gap-1"><ArrowRight className="rotate-90" size={10}/> -₹{diff.toFixed(2)}</span>}
                                                            {isCostlier && <span className="text-red-500 font-bold flex items-center justify-end gap-1"><ArrowRight className="-rotate-90" size={10}/> +₹{Math.abs(diff).toFixed(2)}</span>}
                                                            {!isCheaper && !isCostlier && <span className="text-slate-300">-</span>}
                                                        </td>
                                                        <td className="px-4 py-2 text-right text-slate-600 dark:text-slate-300 font-bold">
                                                            ₹{((ing.qty_per_serving || 0) * userRate).toFixed(2)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Preparation Steps */}
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                                    <ChefHat size={18} className="text-slate-400"/> Preparation
                                </h3>
                                <div className="space-y-3">
                                    {generatedRecipe.preparation_steps?.map((step, i) => (
                                        <div key={i} className="flex gap-3 text-sm text-slate-700 dark:text-slate-300">
                                            <span className="font-bold text-slate-300 dark:text-slate-600 select-none">{i + 1}.</span>
                                            <p>{step}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-wrap gap-3">
                            {/* Admin Context Selector for Outlets */}
                            {isAdmin && !activeRequest && (
                                <div className="w-full mb-2 flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
                                    <Building2 size={16} className="text-slate-400" />
                                    <select 
                                        value={selectedRestaurantId}
                                        onChange={(e) => setSelectedRestaurantId(e.target.value)}
                                        className="text-xs w-full outline-none text-slate-700 dark:text-slate-200 font-medium bg-transparent"
                                    >
                                        <option value="">-- Assign to Restaurant (Optional) --</option>
                                        {restaurants.map(r => (
                                            <option key={r.id} value={r.id}>{r.restaurantName} ({r.location})</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <button 
                                onClick={handleSaveRecipe}
                                disabled={isSaving}
                                className="flex-1 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-all shadow-sm flex items-center justify-center gap-2"
                            >
                                {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                {activeRequest && isAdmin ? `Send to ${activeRequest.userName}` : "Save Recipe"}
                            </button>

                            <button 
                                onClick={handleDownloadPDF}
                                className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-xs flex items-center gap-2"
                            >
                                <FileDown size={14} /> Download PDF
                            </button>
                            
                            <button 
                                onClick={() => handleVariation('Vegan')}
                                className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-xs"
                            >
                                Make Vegan
                            </button>
                            <button 
                                onClick={() => handleVariation('Premium')}
                                className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-xs"
                            >
                                Premium Ver.
                            </button>
                            
                            <button 
                                onClick={handlePushToPOS}
                                disabled={isPushing}
                                className={`px-4 py-2 border font-bold rounded-lg transition-colors text-xs flex items-center gap-2 ${
                                    posPushStatus 
                                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' 
                                    : 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                                }`}
                            >
                                {isPushing ? <RefreshCw className="animate-spin" size={14} /> : <Store size={14} />}
                                {posPushStatus || 'Push to POS'}
                            </button>
                        </div>
                 </div>
            ) : (
                // AI Generator Form (DEDICATED SECTION)
                loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4">
                        <Loader2 size={48} className="animate-spin text-emerald-500" />
                        <p className="text-slate-600 dark:text-slate-400 font-bold animate-pulse">{loadingText}</p>
                    </div>
                ) : (
                    <div className="flex flex-col h-full">
                        {/* Form Header */}
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                             <div>
                                 <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                     <Wand2 size={20} className="text-purple-600 dark:text-purple-400" /> AI Recipe Generator
                                 </h2>
                                 <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                     {isAdmin && activeRequest 
                                        ? `Fulfilling request for ${activeRequest.userName}` 
                                        : `Create a cost-optimized recipe. Cost: ${CREDIT_COSTS.RECIPE} CR`}
                                 </p>
                             </div>
                             <button 
                                onClick={resetForm}
                                className="text-xs flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-red-500 transition-colors"
                                title="Clear all fields"
                             >
                                 <Eraser size={12} /> Clear Form
                             </button>
                        </div>

                        {/* Form Body */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <div className="max-w-2xl mx-auto space-y-6">
                                
                                {!hasApiKey && (
                                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 rounded-lg">
                                                <Key size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800 dark:text-white text-sm">API Key Required</h4>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Connect your Google Cloud API key to generate recipes.</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={handleConnectKey}
                                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition-colors shadow-sm"
                                        >
                                            Connect Key
                                        </button>
                                    </div>
                                )}

                                {/* Dish Name */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Dish Name</label>
                                    <div className="relative">
                                        <Type size={16} className="absolute left-3 top-3 text-slate-400" />
                                        <input 
                                            type="text" 
                                            value={dishName}
                                            onChange={(e) => setDishName(e.target.value)}
                                            placeholder="e.g. Truffle Mushroom Risotto"
                                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-medium"
                                        />
                                    </div>
                                </div>

                                {/* Two Column Layout */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Cuisine Style</label>
                                        <div className="relative">
                                            <UtensilsCrossed size={16} className="absolute left-3 top-3 text-slate-400" />
                                            <input 
                                                type="text" 
                                                value={cuisine}
                                                onChange={(e) => setCuisine(e.target.value)}
                                                placeholder="e.g. Modern Italian"
                                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Key Ingredients</label>
                                        <div className="relative">
                                            <Carrot size={16} className="absolute left-3 top-3 text-slate-400" />
                                            <input 
                                                type="text" 
                                                value={ingredients}
                                                onChange={(e) => setIngredients(e.target.value)}
                                                placeholder="e.g. Arborio Rice, Truffle Oil"
                                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Dietary Chips */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Dietary Tags</label>
                                    <div className="flex flex-wrap gap-2">
                                        {['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto', 'Nut-Free', 'Halal', 'Paleo', 'Low-Sodium', 'Sugar-Free'].map(tag => (
                                            <button
                                                key={tag}
                                                onClick={() => toggleDietary(tag)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                                    dietary.includes(tag)
                                                    ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500 dark:border-emerald-600 text-emerald-700 dark:text-emerald-400'
                                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                                                }`}
                                            >
                                                {tag}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Preparation Notes / Context</label>
                                    <div className="relative">
                                        <AlignLeft size={16} className="absolute left-3 top-3 text-slate-400" />
                                        <textarea 
                                            rows={4}
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Describe presentation style, specific equipment, or any other requirements..."
                                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                                        />
                                    </div>
                                </div>
                                
                                {error && (
                                    <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <AlertCircle size={16} /> {error}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {(error.includes('API Key') || error.includes('configure') || error.includes('unauthenticated')) && (
                                                <button 
                                                    onClick={handleConnectKey}
                                                    className="px-3 py-1 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 text-xs font-bold rounded hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
                                                >
                                                    Connect Key
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => setError(null)}
                                                className="text-xs underline hover:text-red-800 dark:hover:text-red-300"
                                            >
                                                Dismiss
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4">
                                    {hasApiKey ? (
                                        <button 
                                            onClick={(e) => handleFormSubmit(e)}
                                            disabled={loading || !dishName}
                                            className="w-full py-3.5 bg-slate-900 dark:bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-600 dark:hover:bg-emerald-700 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            <Sparkles size={18} fill="currentColor" />
                                            {isAdmin ? 'Generate Recipe Card' : `Request Generation (${CREDIT_COSTS.RECIPE} CR)`}
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={handleConnectKey}
                                            className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                                        >
                                            <Key size={18} fill="currentColor" />
                                            Connect API Key to Generate
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            )}
        </div>
      </div>
      )}
    </div>
  );
};
