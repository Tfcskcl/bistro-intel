
import { MOCK_INGREDIENT_PRICES } from '../constants';

export const ingredientService = {
  // Get all ingredients for specific user
  getAll: (userId: string): any[] => {
    const key = `bistro_${userId}_ingredients`;
    const stored = localStorage.getItem(key);
    // Return empty by default for fresh users
    if (stored) {
      return JSON.parse(stored);
    }
    return []; 
  },

  // Save ingredients
  save: (userId: string, ingredients: any[]) => {
    const key = `bistro_${userId}_ingredients`;
    localStorage.setItem(key, JSON.stringify(ingredients));
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
  }
};
