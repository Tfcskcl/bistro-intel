
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { PLANS, CREDIT_COSTS } from '../constants';
import { generateRecipeCard, generateRecipeVariation, hasValidApiKey, setStoredApiKey, substituteIngredient } from '../services/geminiService';
import { ingredientService } from '../services/ingredientService';
import { RecipeCard, MenuItem, User, UserRole, POSChangeRequest, RecipeRequest } from '../types';
import { Loader2, ChefHat, Scale, Clock, AlertCircle, Upload, Lock, Sparkles, Check, Save, RefreshCw, Search, Plus, Store, Zap, Trash2, Building2, FileSignature, X, AlignLeft, UtensilsCrossed, Inbox, UserCheck, CheckCircle2, Clock3, Carrot, Type, Wallet, Filter, Tag, Eye, Flame, Wand2, Eraser, FileDown, TrendingDown, ArrowRight, Key, Coins, Leaf, TestTube, ArrowLeftRight } from 'lucide-react';
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

// Helper to format error messages nicely
const formatError = (err: any) => {
    if (!err) return "Unknown error occurred";
    let msg = typeof err === 'string' ? err : err.message || JSON.stringify(err);
    
    // Attempt to parse JSON error strings
    try {
        // Handle "Error: { ... }" strings that sometimes leak from libraries
        if (msg.startsWith('Error: ')) msg = msg.substring(7);
        
        if (msg.trim().startsWith('{')) {
            const parsed = JSON.parse(msg);
            if (parsed.error) {
                if (parsed.error.message) return parsed.error.message;
                // Handle nested Google error format
                if (parsed.error.code === 403 || parsed.error.status === 'PERMISSION_DENIED') {
                    return "Access Denied: The API Key is invalid, expired, or blocked.";
                }
            }
        }
    } catch (e) {}
    
    // Friendly overrides for common API errors
    if (msg.includes('PERMISSION_DENIED') || msg.includes('403')) return "Access Denied: Please update your API Key.";
    if (msg.includes('leaked') || msg.includes('compromised')) return "Your API Key was blocked for security reasons. Please generate a new one.";
    if (msg.includes('API Key Required')) return "API Key is missing. Please connect one.";
    
    return msg;
};

export const RecipeHub: React.FC<RecipeHubProps> = ({ user, onUserUpdate }) => {
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [generatedRecipe, setGeneratedRecipe] = useState<RecipeCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Generating with AI...');
  const [error, setError] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  
  // API Key State
  const [hasApiKey, setHasApiKey] = useState(() => hasValidApiKey());

  // Supplier Costing State
  const [altPrices, setAltPrices] = useState<Record<number, string>>({});
  
  // Ingredient Swapping State
  const [swappingIndex, setSwappingIndex] = useState<number | null>(null);

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
  const [selectedPersona, setSelectedPersona] = useState('Executive Chef');

  // Helper for sidebar input
  const [customItemName, setCustomItemName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Role Logic
  const isStaff = [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(user.role);
  const canGenerate = [UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(user.role);

  useEffect(() => {
    setSavedRecipes(storageService.getSavedRecipes(user.id));
    setMenuItems(storageService.getMenu(user.id));
    refreshRequests();
  }, [user.id, user.role]);

  // Poll for API Key Status & Auto-recover if key is added
  useEffect(() => {
    const checkKey = async () => {
        // 1. Check local key (includes blacklist check in service)
        if (hasValidApiKey()) {
            setHasApiKey(true);
            // Auto-clear API errors if key is now present
            if (error && (error.includes('API Key') || error.includes('missing') || error.includes('Access Denied'))) {
                setError(null);
            }
            return;
        } else {
            // Ensure state reflects invalid key
            setHasApiKey(false);
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
    
    // Initial immediate check
    checkKey();
    
    const interval = setInterval(checkKey, 2000);
    return () => clearInterval(interval);
  }, [error]);

  // Handle Leaked Key / Permission Errors - Force Reset
  useEffect(() => {
      if (error && (error.includes('leaked') || error.includes('Access Denied') || error.includes('403'))) {
          setHasApiKey(false); // Force UI to show "Connect Key"
          localStorage.removeItem('gemini_api_key'); // Ensure bad key is gone
      }
  }, [error]);

  // Reset alt prices when recipe changes
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
      if (isStaff) return true; // Internal staff bypass
      
      const cost = CREDIT_COSTS.RECIPE;
      if (user.credits < cost) {
          setError(`Insufficient Credits. This action requires ${cost} credits, but you have ${user.credits}. Please recharge.`);
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
      setSelectedPersona('Executive Chef');
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

      if (canGenerate) {
          await handleGeneration(tempItem, requirements);
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

  const handleGeneration = async (item: MenuItem, requirements: string, targetUserId?: string) => {
      // If user is Owner (not staff), deduct credits before generating
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
          // Use target user ID to fetch correct ingredients
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
      
      // Find top 3 most expensive ingredients per unit to target for savings
      const sortedIngredients = generatedRecipe.ingredients
          .map((ing, idx) => ({ ...ing, idx }))
          .sort((a, b) => (b.cost_per_unit || 0) - (a.cost_per_unit || 0));

      let changed = 0;
      sortedIngredients.slice(0, 3).forEach((ing) => {
          // Only suggest if not already overridden and cost exists
          if (ing.cost_per_unit && !newAltPrices[ing.idx]) {
             // Suggest a 15% cheaper price as a target
             newAltPrices[ing.idx] = (ing.cost_per_unit * 0.85).toFixed(0);
             changed++;
          }
      });
      
      setAltPrices(newAltPrices);
  };

  const handleIngredientSwap = async (index: number) => {
      if (!generatedRecipe) return;
      const ingredient = generatedRecipe.ingredients[index];
      if (!ingredient) return;

      if (!checkCredits()) return; 

      if (!confirm(`Find a substitute for ${ingredient.name}? This will regenerate the recipe costings.`)) return;

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
        if (isStaff && activeRequest) {
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
      // 1. Try AI Studio
      if ((window as any).aistudio) {
          try {
              await (window as any).aistudio.openSelectKey();
              setError(null);
              setHasApiKey(true);
              return;
          } catch (e) {
              console.error(e);
          }
      }
      
      // 2. Fallback to manual entry
      const key = prompt("Please enter your Google Gemini API Key:", "");
      if (key) {
          setStoredApiKey(key);
          setHasApiKey(true);
          setError(null);
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
      {/* ... [Request Preview Modal] ... */}
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
        <div className="flex gap-2">
            <button 
                onClick={() => handleTabChange('generator')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'generator' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            >
                {isStaff ? (activeRequest ? 'Fulfilling Request' : 'BistroChef') : 'BistroChef Generator'}
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
                {isStaff ? (
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
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 overflow-y-auto flex-1 animate-fade-in transition-colors">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">{isStaff ? 'Customer Request Queue' : 'My Recipe Requests'}</h2>
              
              <div className="space-y-3">
                  {(isStaff ? adminQueue : myRequests).length === 0 ? (
                      <p className="text-slate-500 dark:text-slate-400 text-center py-8">No pending requests found.</p>
                  ) : (
                      (isStaff ? adminQueue : myRequests).map((req, i) => (
                          <div key={i} className="flex justify-between items-center p-4 border border-slate-100 dark:border-slate-800 rounded-lg hover:border-slate-300 dark:hover:border-slate-700 transition-colors bg-slate-50 dark:bg-slate-800/50">
                              <div className="flex items-start gap-4">
                                  <div className={`p-3 rounded-full ${req.status === 'completed' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400' : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/50 dark:text-yellow-400'}`}>
                                      {req.status === 'completed' ? <CheckCircle2 size={20} /> : <Clock3 size={20} />}
                                  </div>
                                  <div>
                                      <h4 className="font-bold text-slate-800 dark:text-white">{req.item.name}</h4>
                                      <p className="text-xs text-slate-500 dark:text-slate-400">Requested by: <span className="font-semibold">{req.userName}</span> • {new Date(req.requestDate).toLocaleString()}</p>
                                      {isStaff && <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 italic max-w-lg bg-white dark:bg-slate-800 p-1 rounded border border-slate-100 dark:border-slate-700 truncate">{req.requirements}</p>}
                                  </div>
                              </div>
                              
                              <div>
                                  {req.status === 'completed' ? (
                                      <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-full">Completed</span>
                                  ) : (
                                      isStaff ? (
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

      {/* [Saved View Render Code Omitted for brevity - same as before] */}
      {viewMode === 'saved' && (
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
                                  <span className="bg-emerald-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full -ml-1">
                                      {selectedTags.length}
                                  </span>
                              )}
                          </button>
                          
                          {showFilterDropdown && (
                              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 p-2 animate-scale-in">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2 px-2">Filter by Tag</p>
                                  {uniqueTags.length === 0 ? (
                                      <p className="text-xs text-slate-500 px-2 py-1">No tags found.</p>
                                  ) : (
                                      uniqueTags.map(tag => (
                                          <button
                                              key={tag}
                                              onClick={() => toggleTag(tag)}
                                              className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between ${
                                                  selectedTags.includes(tag) 
                                                  ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold' 
                                                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                              }`}
                                          >
                                              {tag}
                                              {selectedTags.includes(tag) && <Check size={12} />}
                                          </button>
                                      ))
                                  )}
                              </div>
                          )}
                      </div>
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                  {filteredRecipes.length === 0 ? (
                      <div className="text-center py-12 text-slate-400">
                          <ChefHat size={48} className="mx-auto mb-4 opacity-50" />
                          <p>No recipes found matching your search.</p>
                      </div>
                  ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {filteredRecipes.map((recipe, idx) => (
                              <div key={idx} onClick={() => { setGeneratedRecipe(recipe); setViewMode('generator'); }} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group">
                                  <div className="flex justify-between items-start mb-3">
                                      <div>
                                          <h3 className="font-bold text-slate-800 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{recipe.name}</h3>
                                          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">{recipe.sku_id}</p>
                                      </div>
                                      <div className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold px-2 py-1 rounded">
                                          ₹{recipe.food_cost_per_serving.toFixed(0)}
                                      </div>
                                  </div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 h-8">{recipe.human_summary || "No description available."}</p>
                                  
                                  <div className="flex gap-2 flex-wrap mb-4">
                                      {recipe.tags?.slice(0, 3).map((tag, t) => (
                                          <span key={t} className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600">{tag}</span>
                                      ))}
                                  </div>

                                  <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                                      <span className="flex items-center gap-1"><Clock size={12} /> {recipe.prep_time_min}m</span>
                                      <span className="flex items-center gap-1"><Scale size={12} /> {((recipe.suggested_selling_price - recipe.food_cost_per_serving) / recipe.suggested_selling_price * 100).toFixed(0)}% Margin</span>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          </div>
      )}

      {viewMode === 'generator' && (
          <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
              
              {/* Form Side */}
              <div className="w-full lg:w-1/3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 overflow-y-auto custom-scrollbar transition-colors">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                          {isStaff && activeRequest ? <Sparkles className="text-purple-500" /> : <ChefHat className="text-emerald-600" />}
                          {isStaff && activeRequest ? 'Fulfilling Request' : 'BistroChef'}
                      </h2>
                      <button onClick={resetForm} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1">
                          <RefreshCw size={12} /> Clear Form
                      </button>
                  </div>

                  {isStaff && activeRequest && (
                      <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-lg animate-fade-in">
                          <div className="flex justify-between items-start mb-2">
                              <span className="text-[10px] font-bold uppercase text-purple-600 dark:text-purple-300 tracking-wide">Request Context</span>
                              <button onClick={() => { setActiveRequest(null); setViewMode('requests'); }} className="text-purple-400 hover:text-purple-600"><X size={14}/></button>
                          </div>
                          <p className="text-sm font-bold text-purple-900 dark:text-purple-100">{activeRequest.item.name}</p>
                          <p className="text-xs text-purple-700 dark:text-purple-300 mt-1 italic">"{activeRequest.requirements}"</p>
                          <p className="text-[10px] text-purple-500 dark:text-purple-400 mt-2 text-right">Requested by {activeRequest.userName}</p>
                      </div>
                  )}

                  <form onSubmit={handleFormSubmit} className="space-y-5">
                      
                      {/* Chef Persona Selector */}
                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Chef Persona (AI Model)</label>
                          <div className="grid grid-cols-2 gap-2">
                              {CHEF_PERSONAS.map(persona => (
                                  <button
                                      key={persona.id}
                                      type="button"
                                      onClick={() => setSelectedPersona(persona.id)}
                                      className={`p-2 rounded-lg border text-left transition-all ${
                                          selectedPersona === persona.id 
                                          ? `border-emerald-500 ring-1 ring-emerald-500 ${persona.bg}` 
                                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                                      }`}
                                  >
                                      <div className="flex items-center gap-2 mb-1">
                                          <persona.icon size={14} className={selectedPersona === persona.id ? persona.color : 'text-slate-400'} />
                                          <span className={`text-xs font-bold ${selectedPersona === persona.id ? 'text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'}`}>
                                              {persona.name}
                                          </span>
                                      </div>
                                      <p className="text-[10px] text-slate-500 dark:text-slate-500">{persona.desc}</p>
                                  </button>
                              ))}
                          </div>
                      </div>

                      {/* Dish Name */}
                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Dish Name</label>
                          <div className="flex gap-2">
                              <div className="relative flex-1">
                                  <Type className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                  <input 
                                      type="text" 
                                      value={dishName}
                                      onChange={(e) => setDishName(e.target.value)}
                                      placeholder="e.g. Truffle Mushroom Risotto"
                                      className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
                                  />
                              </div>
                          </div>
                      </div>

                      {/* Quick Ideas */}
                      {!dishName && (
                          <div className="flex flex-wrap gap-2 animate-fade-in">
                              {POPULAR_IDEAS.map((idea, i) => (
                                  <button 
                                      key={i}
                                      type="button" 
                                      onClick={() => handlePopularIdea(idea)}
                                      className="px-3 py-1 bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 text-xs rounded-full border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1"
                                  >
                                      <Flame size={10} /> {idea.name}
                                  </button>
                              ))}
                              <button 
                                  type="button"
                                  onClick={handleSurpriseMe}
                                  className="px-3 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full border border-purple-200 dark:border-purple-800 flex items-center gap-1 hover:bg-purple-100 dark:hover:bg-purple-900/50"
                              >
                                  <Wand2 size={10} /> Surprise Me
                              </button>
                          </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Cuisine Style</label>
                              <div className="relative">
                                  <UtensilsCrossed className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                  <input 
                                      type="text" 
                                      value={cuisine}
                                      onChange={(e) => setCuisine(e.target.value)}
                                      placeholder="e.g. Modern Italian"
                                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                  />
                              </div>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Key Ingredients</label>
                              <div className="relative">
                                  <Carrot className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                  <input 
                                      type="text" 
                                      value={ingredients}
                                      onChange={(e) => setIngredients(e.target.value)}
                                      placeholder="e.g. Truffle Oil"
                                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                  />
                              </div>
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Dietary Tags</label>
                          <div className="flex flex-wrap gap-2">
                              {['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto', 'Nut-Free', 'Halal', 'Paleo', 'Low-Sodium', 'Sugar-Free'].map(tag => (
                                  <button
                                      key={tag}
                                      type="button"
                                      onClick={() => toggleDietary(tag)}
                                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                                          dietary.includes(tag) 
                                          ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm' 
                                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                      }`}
                                  >
                                      {tag}
                                  </button>
                              ))}
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Preparation Notes / Context</label>
                          <div className="relative">
                              <AlignLeft className="absolute left-3 top-3 text-slate-400" size={16} />
                              <textarea 
                                  value={notes}
                                  onChange={(e) => setNotes(e.target.value)}
                                  placeholder="e.g. Use sous-vide technique for beef. Keep it under 400 calories."
                                  className="w-full pl-10 pr-4 py-3 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none h-24 resize-none"
                              />
                          </div>
                      </div>

                      {/* Error State */}
                      {error && (
                          <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex flex-col gap-2 border border-red-100 dark:border-red-900/50 animate-fade-in">
                              <div className="flex items-center gap-2">
                                  <AlertCircle size={16} /> <span className="font-bold">Error:</span> {error}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                  {/* Prompt for key if API Key issue or 403 Permission Denied */}
                                  {(!hasApiKey || error.includes('API Key') || error.includes('Access Denied')) && (
                                      <button 
                                          type="button"
                                          onClick={handleConnectKey}
                                          className="px-3 py-1 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 text-xs font-bold rounded hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
                                      >
                                          Update API Key
                                      </button>
                                  )}
                                  <button onClick={() => setError(null)} className="text-xs hover:underline ml-auto">Dismiss</button>
                              </div>
                          </div>
                      )}

                      {/* Import Status Toast */}
                      {importStatus && (
                          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm rounded-lg flex items-center gap-2 animate-fade-in">
                              <CheckCircle2 size={16} /> {importStatus}
                          </div>
                      )}

                      {/* Primary Action */}
                      {hasApiKey ? (
                          <button 
                              type="submit" 
                              disabled={loading}
                              className={`w-full py-4 rounded-xl font-bold text-white shadow-lg shadow-slate-900/20 dark:shadow-black/40 flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                                  isStaff 
                                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700' 
                                  : 'bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-700'
                              } ${loading ? 'opacity-80 cursor-not-allowed' : ''}`}
                          >
                              {loading ? (
                                  <>
                                      <Loader2 className="animate-spin" size={20} />
                                      {loadingText}
                                  </>
                              ) : (
                                  <>
                                      {canGenerate ? <Sparkles size={20} fill="currentColor" /> : <ChefHat size={20} />}
                                      {canGenerate ? (activeRequest ? 'Generate & Fulfill' : `Generate Recipe Card (${CREDIT_COSTS.RECIPE} CR)`) : `Request Recipe (${CREDIT_COSTS.RECIPE} CR)`}
                                  </>
                              )}
                          </button>
                      ) : (
                          <button 
                              type="button"
                              onClick={handleConnectKey}
                              className="w-full py-4 rounded-xl font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                          >
                              <Key size={20} fill="currentColor" /> Connect API Key to Generate
                          </button>
                      )}

                      {/* Admin Import Tools */}
                      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs text-slate-400 dark:text-slate-500">
                          <span>Advanced Tools</span>
                          <div className="flex gap-2">
                              <button 
                                  type="button" 
                                  onClick={handleImportClick}
                                  className="hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1"
                              >
                                  <Upload size={12} /> Import CSV
                              </button>
                              <input 
                                  type="file" 
                                  ref={fileInputRef} 
                                  className="hidden" 
                                  accept=".csv"
                                  onChange={handleFileChange} 
                              />
                          </div>
                      </div>
                  </form>
              </div>

              {/* Preview Side */}
              <div className="flex-1 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col relative overflow-hidden transition-colors">
                  {generatedRecipe ? (
                      <>
                          {/* Top Toolbar */}
                          <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 flex justify-between items-center z-10 shadow-sm">
                              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                  <span className="font-bold text-slate-900 dark:text-white">{generatedRecipe.name}</span>
                                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs">{generatedRecipe.sku_id}</span>
                              </div>
                              <div className="flex gap-2">
                                  <button onClick={() => handleVariation('Vegan')} className="hidden sm:flex px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-200 dark:hover:border-emerald-800 items-center gap-1 transition-all">
                                      <Carrot size={14} /> Make Vegan
                                  </button>
                                  <button onClick={() => handleVariation('Budget')} className="hidden sm:flex px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 items-center gap-1 transition-all">
                                      <TrendingDown size={14} /> Reduce Cost
                                  </button>
                                  <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                                  <button onClick={handleDownloadPDF} className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:shadow-sm">
                                      <FileDown size={16} />
                                  </button>
                                  <button onClick={handleSaveRecipe} disabled={isSaving} className="px-4 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-lg hover:bg-black dark:hover:bg-slate-200 flex items-center gap-2">
                                      {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} 
                                      {isStaff && activeRequest ? 'Save & Send' : 'Save'}
                                  </button>
                              </div>
                          </div>

                          {/* Recipe Content */}
                          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                              <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 shadow-xl rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 mb-8">
                                  {/* Card Header */}
                                  <div className="bg-slate-900 dark:bg-black text-white p-8 relative overflow-hidden">
                                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 rounded-full blur-[60px] opacity-20"></div>
                                      <div className="relative z-10">
                                          <div className="flex justify-between items-start mb-4">
                                              <span className="px-3 py-1 bg-white/10 backdrop-blur rounded-full text-xs font-bold tracking-widest uppercase">{generatedRecipe.category}</span>
                                              <div className="text-right">
                                                  <p className="text-3xl font-black">₹{generatedRecipe.suggested_selling_price}</p>
                                                  <p className="text-xs text-slate-400 uppercase tracking-wide font-bold">Recommended Price</p>
                                              </div>
                                          </div>
                                          <h1 className="text-3xl font-bold mb-2">{generatedRecipe.name}</h1>
                                          <p className="text-slate-300 text-sm leading-relaxed max-w-lg">{generatedRecipe.human_summary}</p>
                                      </div>
                                  </div>

                                  {/* Stats Row */}
                                  <div className="grid grid-cols-4 border-b border-slate-100 dark:border-slate-800 divide-x divide-slate-100 dark:divide-slate-800 bg-slate-50 dark:bg-slate-800/50">
                                      <div className="p-4 text-center">
                                          <p className="text-xs text-slate-400 uppercase font-bold mb-1">Prep Time</p>
                                          <p className="font-bold text-slate-800 dark:text-white">{generatedRecipe.prep_time_min}m</p>
                                      </div>
                                      <div className="p-4 text-center">
                                          <p className="text-xs text-slate-400 uppercase font-bold mb-1">Yield</p>
                                          <p className="font-bold text-slate-800 dark:text-white">{generatedRecipe.yield} srv</p>
                                      </div>
                                      <div className="p-4 text-center">
                                          <p className="text-xs text-slate-400 uppercase font-bold mb-1">Food Cost</p>
                                          <p className="font-bold text-slate-800 dark:text-white">₹{generatedRecipe.food_cost_per_serving.toFixed(2)}</p>
                                      </div>
                                      <div className="p-4 text-center bg-emerald-50/50 dark:bg-emerald-900/10">
                                          <p className="text-xs text-emerald-600 dark:text-emerald-400 uppercase font-bold mb-1">Margin</p>
                                          <p className="font-bold text-emerald-700 dark:text-emerald-300">
                                              {((generatedRecipe.suggested_selling_price - generatedRecipe.food_cost_per_serving) / generatedRecipe.suggested_selling_price * 100).toFixed(1)}%
                                          </p>
                                      </div>
                                  </div>

                                  <div className="grid md:grid-cols-2">
                                      {/* Ingredients Column */}
                                      <div className="p-8 border-r border-slate-100 dark:border-slate-700">
                                          <div className="flex justify-between items-center mb-6">
                                              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                                  <Scale size={18} className="text-emerald-500" /> Ingredients
                                              </h3>
                                              <button 
                                                  onClick={handleSuggestSupplierPrices}
                                                  className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 flex items-center gap-1.5 transition-colors border border-blue-100 dark:border-blue-800"
                                              >
                                                  <Sparkles size={14} /> Suggest Cheaper Prices
                                              </button>
                                          </div>
                                          <div className="space-y-3">
                                              {/* Header for Supplier Input */}
                                              <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase mb-2 px-2">
                                                  <span>Item</span>
                                                  <div className="flex gap-4">
                                                      <span>Est. Cost</span>
                                                      <span>My Price</span>
                                                  </div>
                                              </div>

                                              {generatedRecipe.ingredients.map((ing, i) => (
                                                  <div key={i} className="flex justify-between items-center text-sm p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors group">
                                                      <div className="flex items-center gap-3">
                                                          {/* New Swap Button */}
                                                          <button
                                                              onClick={() => handleIngredientSwap(i)}
                                                              disabled={swappingIndex !== null}
                                                              className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                                                              title="Find Substitute"
                                                          >
                                                              {swappingIndex === i ? <Loader2 size={14} className="animate-spin" /> : <ArrowLeftRight size={14} />}
                                                          </button>
                                                          <div>
                                                              <p className="font-medium text-slate-700 dark:text-slate-200">{ing.name}</p>
                                                              <p className="text-xs text-slate-400">{ing.qty_per_serving} {ing.unit}</p>
                                                          </div>
                                                      </div>
                                                      <div className="flex items-center gap-3">
                                                          <div className="text-right">
                                                              <p className="font-bold text-slate-600 dark:text-slate-400">₹{(ing.cost_per_unit || 0).toFixed(0)}</p>
                                                          </div>
                                                          {/* Supplier Price Override Input */}
                                                          <div className="w-16">
                                                              <input 
                                                                  type="number"
                                                                  placeholder="Rate"
                                                                  className="w-full px-1 py-0.5 text-right text-xs border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 rounded focus:ring-1 focus:ring-emerald-500 outline-none"
                                                                  value={altPrices[i] || ''}
                                                                  onChange={(e) => setAltPrices({...altPrices, [i]: e.target.value})}
                                                              />
                                                          </div>
                                                      </div>
                                                  </div>
                                              ))}
                                          </div>

                                          {/* Savings Analysis Card */}
                                          {savingsAnalysis && savingsAnalysis.hasChanges && (
                                              <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl animate-fade-in">
                                                  <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase mb-2 flex items-center gap-1">
                                                      <Sparkles size={12} /> Supplier Savings
                                                  </h4>
                                                  <div className="flex justify-between items-end mb-1">
                                                      <span className="text-sm text-emerald-700 dark:text-emerald-300">New Food Cost</span>
                                                      <span className="text-lg font-bold text-emerald-900 dark:text-white">₹{savingsAnalysis.projectedCost.toFixed(2)}</span>
                                                  </div>
                                                  <div className="flex justify-between items-center text-xs">
                                                      <span className="text-emerald-600 dark:text-emerald-400">Savings per plate</span>
                                                      <span className="font-bold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-emerald-900/50 px-2 py-0.5 rounded">
                                                          -₹{Math.abs(savingsAnalysis.savings).toFixed(2)} ({savingsAnalysis.savings > 0 ? 'Cost Up' : 'Saved'})
                                                      </span>
                                                  </div>
                                              </div>
                                          )}
                                      </div>

                                      {/* Instructions Column */}
                                      <div className="p-8 bg-slate-50/50 dark:bg-slate-800/30">
                                          <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                                              <ChefHat size={18} className="text-blue-500" /> Method
                                          </h3>
                                          <div className="space-y-6">
                                              {generatedRecipe.preparation_steps.map((step, i) => (
                                                  <div key={i} className="flex gap-4">
                                                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs font-bold mt-0.5">
                                                          {i + 1}
                                                      </div>
                                                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{step}</p>
                                                  </div>
                                              ))}
                                          </div>

                                          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                                              <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Chef's Notes</h4>
                                              <div className="flex gap-2 flex-wrap">
                                                  {generatedRecipe.tags?.map((tag, t) => (
                                                      <span key={t} className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs rounded-md">
                                                          #{tag}
                                                      </span>
                                                  ))}
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              </div>

                              {/* Admin Action Bar: Push to POS */}
                              <div className="max-w-3xl mx-auto flex justify-between items-center p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
                                  <div>
                                      <p className="font-bold text-slate-800 dark:text-white text-sm">Ready to launch?</p>
                                      <p className="text-xs text-slate-500 dark:text-slate-400">Push this item directly to your Point of Sale system.</p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                      {isStaff && (
                                          <select 
                                              value={selectedRestaurantId} 
                                              onChange={(e) => setSelectedRestaurantId(e.target.value)}
                                              className="text-xs border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                                          >
                                              <option value="">Select Restaurant...</option>
                                              {restaurants.map(r => <option key={r.id} value={r.id}>{r.restaurantName}</option>)}
                                          </select>
                                      )}
                                      <button 
                                          onClick={handlePushToPOS}
                                          disabled={isPushing || (isStaff && !selectedRestaurantId)}
                                          className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                                      >
                                          {isPushing ? <Loader2 size={16} className="animate-spin" /> : <Store size={16} />}
                                          {posPushStatus || "Push to POS"}
                                      </button>
                                  </div>
                              </div>
                          </div>
                      </>
                  ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 opacity-60">
                          <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                              <ChefHat size={48} />
                          </div>
                          <p className="text-lg font-medium">BistroChef is Ready</p>
                          <p className="text-sm text-center max-w-xs mt-2">Select a persona and fill out the details to generate professional recipe cards instantly.</p>
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};
