import { MOCK_INGREDIENT_PRICES } from '../constants';
import { Ingredient } from '../types';

const INGREDIENTS_KEY = 'bistro_ingredients';

export const ingredientService = {
  // Get all ingredients (from local storage or default mocks)
  getAll: (): any[] => {
    const stored = localStorage.getItem(INGREDIENTS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return MOCK_INGREDIENT_PRICES;
  },

  // Save ingredients to local storage
  save: (ingredients: any[]) => {
    localStorage.setItem(INGREDIENTS_KEY, JSON.stringify(ingredients));
  },

  // Parse CSV text and merge with existing ingredients
  importFromCSV: (csvText: string): { success: boolean; count: number; message: string } => {
    try {
      const lines = csvText.split(/\r\n|\n/);
      const newIngredients: any[] = [];
      
      // Expected format: Name, Cost, Unit
      // Skip header if present (heuristic: check if first col is "Name" or "Ingredient")
      const startIndex = lines[0].toLowerCase().includes('name') ? 1 : 0;

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(',');
        if (parts.length >= 2) {
          const name = parts[0].trim();
          const cost = parseFloat(parts[1].trim());
          const unit = parts[2]?.trim() || 'kg'; // Default to kg if missing

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

      // Merge strategy: Overwrite mock data with imported data
      // For a real app, we might want to append or update specific IDs. 
      // Here we will append to the existing list to expand the knowledge base.
      const current = ingredientService.getAll();
      const updated = [...current, ...newIngredients];
      
      ingredientService.save(updated);

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

  resetToDefaults: () => {
    localStorage.removeItem(INGREDIENTS_KEY);
  }
};