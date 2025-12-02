
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { PLANS, CREDIT_COSTS } from '../constants';
import { generateRecipeCard, generateRecipeVariation, substituteIngredient, estimateMarketRates } from '../services/geminiService';
import { ingredientService } from '../services/ingredientService';
import { RecipeCard, MenuItem, User, UserRole, POSChangeRequest, RecipeRequest, Ingredient } from '../types';
import { Loader2, ChefHat, Scale, Clock, AlertCircle, Upload, Lock, Sparkles, Check, Save, RefreshCw, Search, Plus, Store, Zap, Trash2, Building2, FileSignature, X, AlignLeft, UtensilsCrossed, Inbox, UserCheck, CheckCircle2, Clock3, Carrot, Type, Wallet, Filter, Tag, Eye, Flame, Wand2, Eraser, FileDown, TrendingDown, ArrowRight, Key, Coins, Leaf, TestTube, ArrowLeftRight, PenTool, Lightbulb, Calculator, DollarSign, Edit2, Globe, Droplets, Wheat } from 'lucide-react';
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

// Helper for Background Images
const getBgImage = (cuisine: string = '', dishName: string = '') => {
    const term = (cuisine + ' ' + dishName).toLowerCase();
    const map: Record<string, string> = {
        'italian': 'https://images.unsplash.com/photo-1498579150354-977475b7ea0b?auto=format&fit=crop&w=1200&q=60',
        'pizza': 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=60',
        'pasta': 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=1200&q=60',
        'burger': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=60',
        'indian': 'https://images.unsplash.com/photo-1585937421612-70a008356f36?auto=format&fit=crop&w=1200&q=60',
        'curry': 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=1200&q=60',
        'mexican': 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=1200&q=60',
        'taco': 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=1200&q=60',
        'asian': 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1200&q=60',
        'thai': 'https://images.unsplash.com/photo-1559314809-0d155014e29e?auto=format&fit=crop&w=1200&q=60',
        'american': 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=60',
        'dessert': 'https://images.unsplash.com/photo-1563729768640-d31d582845c4?auto=format&fit=crop&w=1200&q=60',
        'cake': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=60',
        'healthy': 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1200&q=60',
        'salad': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=60',
        'japanese': 'https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?auto=format&fit=crop&w=1200&q=60',
        'sushi': 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1200&q=60',
        'chinese': 'https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=1200&q=60',
        'noodles': 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1200&q=60',
        'soup': 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1200&q=60',
        'sandwich': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=1200&q=60',
        'breakfast': 'https://images.unsplash.com/photo-1533089862017-90f545430939?auto=format&fit=crop&w=1200&q=60',
        'coffee': 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&w=1200&q=60',
        'chocolate': 'https://images.unsplash.com/photo-1511381939415-e44015466834?auto=format&fit=crop&w=1200&q=60',
        'steak': 'https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=1200&q=60',
        'seafood': 'https://images.unsplash.com/photo-1534080564583-6be75777b70a?auto=format&fit=crop&w=1200&q=60',
        'vegan': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=60'
    };
    
    const key = Object.keys(map).find(k => term.includes(k));
    return map[key || ''] || 'https://images.unsplash.com/photo-1546549010-b277db638708?auto=format&fit=crop&w=1200&q=60';
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
  const [isFetchingRates, setIsFetchingRates] = useState(false);

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
  }, [generatedRecipe?.sku_id]); // Reset alt prices only on new recipe

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
      
      let totalOriginalCost = generatedRecipe.food_cost_per_serving;
      let totalNewCost = 0;
      let hasChanges = false;

      generatedRecipe.ingredients.forEach((ing, idx) => {
          const originalCostServing = ing.cost_per_serving || 0;
          const originalRate = ing.cost_per_unit || 0;
          
          let userRate = originalRate;
          if (altPrices[idx] && !isNaN(parseFloat(altPrices[idx]))) {
              userRate = parseFloat(altPrices[idx]);
              hasChanges = true;
          }

          if (originalRate > 0) {
              totalNewCost += (userRate / originalRate) * originalCostServing;
          } else {
              totalNewCost += originalCostServing; 
          }
      });

      const savings = totalOriginalCost - totalNewCost;
      const savingsPct = totalOriginalCost > 0 ? (savings / totalOriginalCost) * 100 : 0;
      
      return { 
          originalCost: totalOriginalCost,
          projectedCost: totalNewCost, 
          savings, 
          savingsPct, 
          hasChanges 
      };
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

  // --- RECALCULATION HANDLERS ---

  const handleYieldUpdate = (newYieldStr: string) => {
      if (!generatedRecipe) return;
      const newYield = parseFloat(newYieldStr);
      if (isNaN(newYield) || newYield <= 0) return;

      const oldYield = generatedRecipe.yield || 1;
      const factor = oldYield / newYield; // If yield doubles (2), cost per serving halves (0.5)

      // Recalculate costs
      const newFoodCost = generatedRecipe.food_cost_per_serving * factor;
      const newSellingPrice = generatedRecipe.suggested_selling_price * factor;

      // Update Ingredients Qty Display (Qty Per Serving)
      const updatedIngredients = generatedRecipe.ingredients.map(ing => ({
          ...ing,
          qty_per_serving: (ing.qty_per_serving || 0) * factor,
          cost_per_serving: (ing.cost_per_serving || 0) * factor
      }));

      setGeneratedRecipe({
          ...generatedRecipe,
          yield: newYield,
          food_cost_per_serving: newFoodCost,
          suggested_selling_price: newSellingPrice,
          ingredients: updatedIngredients
      });
  };

  const handleManualCostUpdate = (newCostStr: string) => {
      if (!generatedRecipe) return;
      const newCost = newCostStr === '' ? 0 : parseFloat(newCostStr);
      
      setGeneratedRecipe({
          ...generatedRecipe,
          food_cost_per_serving: newCost
      });
  };

  const handleManualPriceUpdate = (newPriceStr: string) => {
      if (!generatedRecipe) return;
      const newPrice = newPriceStr === '' ? 0 : parseFloat(newPriceStr);

      setGeneratedRecipe({
          ...generatedRecipe,
          suggested_selling_price: newPrice
      });
  };

  const handleManualPercentUpdate = (newPctStr: string) => {
      if (!generatedRecipe) return;
      const newPct = parseFloat(newPctStr);
      if (isNaN(newPct) || newPct <= 0) return;

      const newSellingPrice = generatedRecipe.food_cost_per_serving / (newPct / 100);
      
      setGeneratedRecipe({
          ...generatedRecipe,
          suggested_selling_price: newSellingPrice
      });
  };

  const resetSellingPrice = () => {
      if (!generatedRecipe) return;
      // Reset to standard 30% food cost
      const recommended = generatedRecipe.food_cost_per_serving / 0.30;
      setGeneratedRecipe({
          ...generatedRecipe,
          suggested_selling_price: recommended
      });
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
      
      const namesToFetch: string[] = [];
      const updatedIngredients = [...manualIngredients];

      // 1. Check local knowledge base first
      updatedIngredients.forEach((ing) => {
          const learnedPrice = ingredientService.getLearnedPrice(ing.name);
          if (learnedPrice) {
              ing.costPerUnit = learnedPrice.toString();
          } else {
              namesToFetch.push(ing.name);
          }
      });

      // 2. Fetch missing from AI
      if (namesToFetch.length > 0) {
          const rates = await estimateMarketRates(namesToFetch, user.location || 'India');
          updatedIngredients.forEach(ing => {
              if (namesToFetch.includes(ing.name)) {
                  const rate = rates[ing.name];
                  if (rate) ing.costPerUnit = rate.toString();
              }
          });
      }
      
      setManualIngredients(updatedIngredients);
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
          
          let costPerServing = 0;
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

  const handleFetchMarketRates = async () => {
      if (!generatedRecipe) return;
      setIsFetchingRates(true);
      try {
          const names = generatedRecipe.ingredients.map(i => i.name);
          const location = user.location || "General Market";
          
          const newAltPrices: Record<number, string> = { ...altPrices };
          const namesToFetch: string[] = [];

          // 1. Check knowledge base
          generatedRecipe.ingredients.forEach((ing, idx) => {
              const learnedPrice = ingredientService.getLearnedPrice(ing.name);
              if (learnedPrice) {
                  newAltPrices[idx] = learnedPrice.toString();
              } else {
                  namesToFetch.push(ing.name);
              }
          });

          // 2. Fetch rest from AI
          if (namesToFetch.length > 0) {
              const rates = await estimateMarketRates(namesToFetch, location);
              generatedRecipe.ingredients.forEach((ing, idx) => {
                  if (namesToFetch.includes(ing.name)) {
                      const rate = rates[ing.name];
                      if (rate) newAltPrices[idx] = rate.toString();
                  }
              });
          }
          
          setAltPrices(newAltPrices);
          setImportStatus(`Market rates for ${location} fetched!`);
          setTimeout(() => setImportStatus(null), 3000);
      } catch (e) {
          console.error(e);
          setError("Failed to fetch market rates.");
      } finally {
          setIsFetchingRates(false);
      }
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
                          <div 
                            className="bg-white dark:bg-slate-900 shadow-xl rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 mb-8 relative group"
                            style={{ 
                                backgroundImage: `url(${getBgImage(generatedRecipe.tags?.[0], generatedRecipe.name)})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                            }}
                          >
                              {/* Background Overlay for readability */}
                              <div className="absolute inset-0 bg-white/92 dark:bg-slate-950/92 backdrop-blur-[1px] z-0 transition-opacity duration-500"></div>
                              
                              <div className="relative z-10">
                                <div className="bg-slate-900/90 dark:bg-black/80 text-white p-8 backdrop-blur-sm">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 mr-4">
                                            <h1 className="text-3xl font-bold">{generatedRecipe.name}</h1>
                                            <p className="text-slate-300 text-sm mt-2">{generatedRecipe.human_summary}</p>
                                            
                                            <div className="flex gap-4 mt-4">
                                                {/* Editable Yield */}
                                                <div className="flex items-center gap-2 bg-white/10 w-fit px-3 py-1.5 rounded-lg border border-white/10">
                                                    <Scale size={16} className="text-emerald-400" />
                                                    <span className="text-xs font-bold uppercase tracking-wide text-slate-300">Yield:</span>
                                                    <input 
                                                        type="number"
                                                        value={generatedRecipe.yield || 1}
                                                        onChange={(e) => handleYieldUpdate(e.target.value)}
                                                        className="w-12 bg-transparent text-white font-bold text-sm text-center border-b border-white/30 focus:border-emerald-400 outline-none"
                                                    />
                                                    <span className="text-xs text-slate-400">Servings</span>
                                                </div>

                                                {/* Time Display */}
                                                <div className="flex items-center gap-3 text-slate-300 text-xs font-medium">
                                                    <div className="flex items-center gap-1"><Carrot size={14} className="text-orange-400"/> Prep: {generatedRecipe.prep_time_minutes || 20}m</div>
                                                    <div className="flex items-center gap-1"><Flame size={14} className="text-red-400"/> Cook: {generatedRecipe.cook_time_minutes || 15}m</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col items-end gap-2 shrink-0">
                                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                                Selling Price <Edit2 size={10} />
                                            </p>
                                            <div className="flex items-center justify-end gap-1">
                                                <span className="text-2xl font-black text-white/50">₹</span>
                                                <input 
                                                    type="number"
                                                    value={generatedRecipe.suggested_selling_price}
                                                    onChange={(e) => handleManualPriceUpdate(e.target.value)}
                                                    className="w-28 bg-transparent text-3xl font-black text-right text-white border-b-2 border-white/20 focus:border-emerald-500 outline-none"
                                                />
                                                <button onClick={resetSellingPrice} title="Reset to 30% Cost" className="ml-2 p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
                                                    <RefreshCw size={14} />
                                                </button>
                                            </div>
                                            
                                            <button 
                                              onClick={handleSaveRecipe}
                                              className={`mt-2 text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors border ${isRecipeSaved ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-white/10 hover:bg-white/20 text-white border-white/10'}`}
                                            >
                                              {isRecipeSaved ? <Check size={14} /> : <Save size={14} />}
                                              {isRecipeSaved ? 'Saved' : 'Save'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Detailed Costing Breakdown */}
                                <div className="grid grid-cols-3 border-b border-slate-100 dark:border-slate-700 text-center bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
                                    <div className="p-4 border-r border-slate-100 dark:border-slate-700 flex flex-col items-center">
                                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold mb-1 flex items-center gap-1">Food Cost <Edit2 size={10}/></p>
                                        <div className="flex items-center justify-center">
                                            <span className="text-lg font-bold text-slate-500 mr-0.5">₹</span>
                                            <input 
                                                type="number"
                                                value={generatedRecipe.food_cost_per_serving}
                                                onChange={(e) => handleManualCostUpdate(e.target.value)}
                                                className="w-20 bg-transparent text-xl font-bold text-slate-800 dark:text-white text-center border-b border-dashed border-slate-300 focus:border-emerald-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="p-4 border-r border-slate-100 dark:border-slate-700 flex flex-col items-center">
                                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold mb-1 flex items-center gap-1">Food Cost % <Edit2 size={10}/></p>
                                        <div className="flex items-center justify-center">
                                            <input 
                                                type="number"
                                                value={((generatedRecipe.food_cost_per_serving / generatedRecipe.suggested_selling_price) * 100).toFixed(1)}
                                                onChange={(e) => handleManualPercentUpdate(e.target.value)}
                                                className="w-16 bg-transparent text-xl font-bold text-slate-800 dark:text-white text-center border-b border-dashed border-slate-300 focus:border-emerald-500 outline-none"
                                            />
                                            <span className="text-lg font-bold text-slate-500 ml-0.5">%</span>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Gross Margin</p>
                                        <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                                            ₹{(generatedRecipe.suggested_selling_price - generatedRecipe.food_cost_per_serving).toFixed(2)}
                                        </p>
                                    </div>
                                </div>

                                {savingsAnalysis && savingsAnalysis.hasChanges && (
                                    <div className="mx-8 mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl flex items-center justify-between animate-fade-in backdrop-blur-sm">
                                        <div>
                                            <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wide">Projected Savings</p>
                                            <div className="flex items-baseline gap-2">
                                                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                                                    ₹{savingsAnalysis.savings.toFixed(2)}
                                                </p>
                                                <span className="text-sm font-bold text-emerald-600">
                                                    ({savingsAnalysis.savingsPct.toFixed(1)}%)
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">
                                                New Food Cost: <span className="font-bold text-slate-700 dark:text-slate-300">₹{savingsAnalysis.projectedCost.toFixed(2)}</span>
                                            </p>
                                        </div>
                                        <div className="text-right">
                                             <p className="text-xs text-slate-500">Margin Impact</p>
                                             <p className="text-lg font-bold text-emerald-600">
                                                 +₹{savingsAnalysis.savings.toFixed(2)} / plate
                                             </p>
                                        </div>
                                    </div>
                                )}
                                
                                <div className="p-8 border-b border-slate-100 dark:border-slate-700">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-slate-800 dark:text-white">Ingredients & Costing</h3>
                                        <div className="flex gap-3">
                                            <button onClick={handleFetchMarketRates} disabled={isFetchingRates} className="text-xs font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 hover:underline flex items-center gap-1 transition-colors">
                                                {isFetchingRates ? <Loader2 size={12} className="animate-spin" /> : <Globe size={12} />} 
                                                Fetch Live Rates
                                            </button>
                                            <button onClick={handleSuggestSupplierPrices} className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline flex items-center gap-1">
                                                <Zap size={12} /> Suggest Cheaper Prices
                                            </button>
                                        </div>
                                    </div>
                                    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shadow-sm">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold uppercase text-xs backdrop-blur-sm">
                                                <tr>
                                                    <th className="px-4 py-3">Ingredient</th>
                                                    <th className="px-4 py-3">Qty / Portion</th>
                                                    <th className="px-4 py-3">Market Rate</th>
                                                    <th className="px-4 py-3 bg-emerald-50/50 dark:bg-emerald-900/10">Your Rate</th>
                                                    <th className="px-4 py-3 text-right">Cost</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {generatedRecipe.ingredients.map((ing, idx) => {
                                                    const marketRate = ing.cost_per_unit || 0;
                                                    const userRateStr = altPrices[idx];
                                                    const userRate = userRateStr ? parseFloat(userRateStr) : marketRate;
                                                    const isVariance = userRate !== marketRate;
                                                    const variancePct = marketRate > 0 ? ((userRate - marketRate) / marketRate) * 100 : 0;
                                                    
                                                    // Calculate cost based on user rate or market rate
                                                    const displayCost = marketRate > 0 ? (ing.cost_per_serving || 0) * (userRate / marketRate) : (ing.cost_per_serving || 0);

                                                    return (
                                                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 group odd:bg-slate-50/30 dark:odd:bg-slate-800/20 transition-colors">
                                                            <td className="px-4 py-4 font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2 border-r border-transparent">
                                                                {ing.name}
                                                                <button 
                                                                  onClick={() => handleIngredientSwap(idx)} 
                                                                  className="text-slate-400 hover:text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                  title="Find Substitute"
                                                                >
                                                                    {swappingIndex === idx ? <Loader2 size={14} className="animate-spin"/> : <ArrowLeftRight size={14} />}
                                                                </button>
                                                            </td>
                                                            <td className="px-4 py-4 text-slate-500 dark:text-slate-400 border-l border-slate-100 dark:border-slate-800/50">
                                                                {ing.qty_per_serving ? `${ing.qty_per_serving.toFixed(2)} ${ing.unit}` : ing.qty}
                                                            </td>
                                                            <td className="px-4 py-4 text-slate-500 dark:text-slate-400 border-l border-slate-100 dark:border-slate-800/50">
                                                                ₹{marketRate.toFixed(2)} / {ing.unit}
                                                            </td>
                                                            <td className="px-4 py-4 bg-emerald-50/30 dark:bg-emerald-900/5 border-l border-slate-100 dark:border-slate-800/50">
                                                                <div className="flex items-center gap-2">
                                                                    <input 
                                                                        type="number" 
                                                                        placeholder={marketRate.toFixed(2)}
                                                                        value={altPrices[idx] || ''}
                                                                        onChange={(e) => setAltPrices({...altPrices, [idx]: e.target.value})}
                                                                        className="w-20 px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-emerald-500 outline-none bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                                                    />
                                                                    {isVariance && (
                                                                        <span className={`text-[10px] font-bold ${variancePct > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                                                            {variancePct > 0 ? '+' : ''}{variancePct.toFixed(0)}%
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-4 text-right font-bold text-slate-700 dark:text-slate-300 border-l border-slate-100 dark:border-slate-800/50">
                                                                ₹{displayCost.toFixed(2)}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="p-8 bg-slate-50/50 dark:bg-slate-950/50 backdrop-blur-sm">
                                    <h3 className="font-bold text-slate-800 dark:text-white mb-4">Preparation Steps</h3>
                                    <div className="space-y-4">
                                        {generatedRecipe.preparation_steps.map((step, i) => (
                                            <div key={i} className="flex gap-4">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-400 shrink-0 text-sm border border-slate-300 dark:border-slate-700">
                                                    {i + 1}
                                                </div>
                                                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mt-1.5">{step}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Equipment & Allergens */}
                                <div className="grid grid-cols-2 border-t border-slate-100 dark:border-slate-800">
                                    <div className="p-8 border-r border-slate-100 dark:border-slate-700 bg-white/30 dark:bg-slate-900/30 backdrop-blur-sm">
                                        <h3 className="font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                                            <UtensilsCrossed size={16} className="text-blue-500" /> Equipment Needed
                                        </h3>
                                        {generatedRecipe.equipment_needed && generatedRecipe.equipment_needed.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {generatedRecipe.equipment_needed.map((item, i) => (
                                                    <span key={i} className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium border border-blue-100 dark:border-blue-800">
                                                        {item}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : <p className="text-xs text-slate-400 italic">No equipment listed.</p>}
                                    </div>
                                    <div className="p-8 bg-white/30 dark:bg-slate-900/30 backdrop-blur-sm">
                                        <h3 className="font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                                            <AlertCircle size={16} className="text-red-500" /> Allergens
                                        </h3>
                                        {generatedRecipe.allergens && generatedRecipe.allergens.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {generatedRecipe.allergens.map((item, i) => (
                                                    <span key={i} className="px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-xs font-medium border border-red-100 dark:border-red-800">
                                                        {item}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : <p className="text-xs text-slate-400 italic">No allergens detected.</p>}
                                    </div>
                                </div>

                                {generatedRecipe.reasoning && (
                                    <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-amber-50/50 dark:bg-amber-900/10 backdrop-blur-sm">
                                        <h3 className="font-bold text-amber-800 dark:text-amber-400 mb-2 flex items-center gap-2">
                                            <Lightbulb size={18} /> Chef's Insight
                                        </h3>
                                        <p className="text-sm text-amber-900/80 dark:text-amber-200/80 italic">
                                            "{generatedRecipe.reasoning}"
                                        </p>
                                    </div>
                                )}
                              </div>
                          </div>
                      </div>
                  ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60 p-8 text-center">
                          <ChefHat size={64} className="mb-6" />
                          <h3 className="text-xl font-bold mb-2">BistroChef is Ready</h3>
                          <p className="max-w-md">Select an AI persona or switch to manual mode to create your professional recipe card.</p>
                      </div>
                  )}
                  
                  {generatedRecipe && (
                      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
                          <div className="flex gap-2 overflow-x-auto pb-1 max-w-[60%] custom-scrollbar">
                              <button onClick={() => handleVariation('Vegan')} className="whitespace-nowrap px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-300 flex items-center gap-1">
                                  <Leaf size={12} className="text-green-500" /> Vegan
                              </button>
                              <button onClick={() => handleVariation('Low-Calorie')} className="whitespace-nowrap px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-300 flex items-center gap-1">
                                  <Droplets size={12} className="text-blue-400" /> Low-Cal
                              </button>
                              <button onClick={() => handleVariation('Spicy')} className="whitespace-nowrap px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-300 flex items-center gap-1">
                                  <Flame size={12} className="text-red-500" /> Spicy
                              </button>
                              <button onClick={() => handleVariation('Budget-Friendly')} className="whitespace-nowrap px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-300 flex items-center gap-1">
                                  <Wallet size={12} className="text-emerald-500" /> Budget
                              </button>
                              <button onClick={() => handleVariation('Gluten-Free')} className="whitespace-nowrap px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-300 flex items-center gap-1">
                                  <Wheat size={12} className="text-amber-500" /> GF
                              </button>
                          </div>
                          <div className="flex gap-2">
                              <button onClick={handleDownloadPDF} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                                  <FileDown size={20} />
                              </button>
                              {isStaff && adminQueue.length > 0 && activeRequest && (
                                  <button onClick={handleSaveRecipe} className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2">
                                      <CheckCircle2 size={18} /> Complete Request
                                  </button>
                              )}
                          </div>
                      </div>
                  )}
              </div>
          </div>
      )}

      {viewMode === 'requests' && isStaff && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col flex-1 animate-fade-in transition-colors">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white">Recipe Requests Queue</h2>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                  {adminQueue.length === 0 ? (
                      <p className="text-slate-500 text-center py-12">No pending requests.</p>
                  ) : (
                      <div className="space-y-4">
                          {adminQueue.map(req => (
                              <div key={req.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-6 bg-slate-50 dark:bg-slate-800">
                                  <div className="flex justify-between items-start mb-4">
                                      <div>
                                          <h3 className="font-bold text-lg text-slate-800 dark:text-white">{req.item.name}</h3>
                                          <p className="text-sm text-slate-500 dark:text-slate-400">Requested by <span className="font-bold">{req.userName}</span></p>
                                      </div>
                                      <span className="text-xs font-bold bg-yellow-100 text-yellow-700 px-2 py-1 rounded">PENDING</span>
                                  </div>
                                  <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 mb-4">
                                      {req.requirements}
                                  </div>
                                  <div className="flex justify-end">
                                      <button onClick={() => handleFulfillRequest(req)} className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-lg hover:opacity-90">
                                          Process Request
                                      </button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          </div>
      )}

      {importStatus && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 animate-fade-in-up">
              <CheckCircle2 size={18} className="text-emerald-400" />
              <span className="font-bold text-sm">{importStatus}</span>
          </div>
      )}
    </div>
  );
};
