
import { MOCK_INGREDIENT_PRICES } from '../constants';
import { Ingredient } from '../types';

const KNOWLEDGE_BASE_KEY = 'bistro_price_memory';

interface PriceMemory {
    [name: string]: {
        sum: number;
        count: number;
        avg: number;
        lastUpdated: string;
        unit: string;
    };
}

export const ingredientService = {
  // Get all ingredients for specific user
  getAll: (userId: string): any[] => {
    const key = `bistro_${userId}_ingredients`;
    try {
        const stored = localStorage.getItem(key);
        // Return empty by default for fresh users
        if (stored) {
          return JSON.parse(stored);
        }
    } catch (e) {
        console.error("Error parsing ingredients:", e);
    }
    return []; 
  },

  // Save ingredients
  save: (userId: string, ingredients: any[]) => {
    const key = `bistro_${userId}_ingredients`;
    try {
        localStorage.setItem(key, JSON.stringify(ingredients));
    } catch (e) {
        console.error("Error saving ingredients:", e);
    }
  },

  // --- "TRAINING" THE DATABASE ---
  // Learns prices from saved recipes to build a knowledge base
  learnPrices: (ingredients: Ingredient[]) => {
      try {
          const stored = localStorage.getItem(KNOWLEDGE_BASE_KEY);
          const db: PriceMemory = stored ? JSON.parse(stored) : {};

          ingredients.forEach(ing => {
              if (!ing.cost_per_unit || !ing.name) return;
              
              const key = ing.name.toLowerCase().trim();
              const current = db[key] || { sum: 0, count: 0, avg: 0, unit: ing.unit, lastUpdated: '' };
              
              // Simple moving average logic
              current.sum += ing.cost_per_unit;
              current.count += 1;
              current.avg = current.sum / current.count;
              current.lastUpdated = new Date().toISOString();
              current.unit = ing.unit || current.unit;

              db[key] = current;
          });

          localStorage.setItem(KNOWLEDGE_BASE_KEY, JSON.stringify(db));
          console.log("Database trained with new ingredient costs.");
      } catch (e) {
          console.error("Training error:", e);
      }
  },

  // Retrieve a learned price for an ingredient (Fuzzy match)
  getLearnedPrice: (name: string): number | null => {
      try {
          const stored = localStorage.getItem(KNOWLEDGE_BASE_KEY);
          if (!stored) return null;
          
          const db: PriceMemory = JSON.parse(stored);
          const key = name.toLowerCase().trim();
          
          if (db[key]) return db[key].avg;

          // Simple fuzzy fallback (partial match)
          const match = Object.keys(db).find(k => k.includes(key) || key.includes(k));
          return match ? db[match].avg : null;
      } catch (e) {
          return null;
      }
  },

  // Import CSV
  importFromCSV: (userId: string, csvText: string): { success: boolean; count: number; message: string } => {
    try {
      const lines = csvText.split(/\r\n|\n/);
      const newIngredients: any[] = [];
      
      const startIndex = lines[0].toLowerCase().includes('name') ? 1 : 0;

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(',');
        if (parts.length >= 2) {
          const name = parts[0].trim();
          const cost = parseFloat(parts[1].trim());
          const unit = parts[2]?.trim() || 'kg';

          if (name && !isNaN(cost)) {
            newIngredients.push({
              ingredient_id: `IMP_${Date.now()}_${i}`,
              name,
              cost_per_unit: cost,
              unit
            });
          }
        }
      }

      if (newIngredients.length === 0) {
        return { success: false, count: 0, message: "No valid ingredients found in CSV." };
      }

      const current = ingredientService.getAll(userId);
      // Append new ingredients
      const updated = [...current, ...newIngredients];
      
      ingredientService.save(userId, updated);
      
      // Also train on imported data
      ingredientService.learnPrices(newIngredients);

      return { 
        success: true, 
        count: newIngredients.length, 
        message: `Successfully imported ${newIngredients.length} ingredients.` 
      };

    } catch (e) {
      console.error("CSV Import Error", e);
      return { success: false, count: 0, message: "Failed to parse CSV file." };
    }
  },
  
  // Explicitly seed defaults (used by storageService.seedDemoData)
  seedDefaults: (userId: string) => {
      ingredientService.save(userId, MOCK_INGREDIENT_PRICES);
      // Train on mock data initially
      ingredientService.learnPrices(MOCK_INGREDIENT_PRICES);
  }
};
