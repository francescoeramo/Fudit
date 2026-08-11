import { MealPlan, Nutrition, Recipe } from "./types";

export interface PlanNutritionSummary extends Nutrition {
  meals: number;
  averageCalories: number;
  averageProtein: number;
  averageCarbs: number;
  averageFat: number;
  proteinEnergyPercent: number;
  carbsEnergyPercent: number;
  fatEnergyPercent: number;
  balancedMacroDistribution: boolean;
}

const percent = (value: number, total: number) =>
  total > 0 ? Math.round((value / total) * 100) : 0;

/**
 * Riepiloga le porzioni individuali dichiarate nelle ricette. I riferimenti
 * EFSA usati per l'indicatore sono 45-60% dell'energia dai carboidrati e
 * 20-35% dai grassi; non stima il fabbisogno personale.
 */
export const summarizePlanNutrition = (
  plan: MealPlan | null,
  recipes: Recipe[],
): PlanNutritionSummary | null => {
  if (!plan?.meals.length) return null;
  const selected = plan.meals
    .map((meal) => recipes.find((recipe) => recipe.id === meal.recipeId))
    .filter((recipe): recipe is Recipe => recipe !== undefined);
  if (!selected.length) return null;
  const totals = selected.reduce<Nutrition>(
    (sum, recipe) => ({
      calories: sum.calories + recipe.nutrition.calories,
      protein: sum.protein + recipe.nutrition.protein,
      carbs: sum.carbs + recipe.nutrition.carbs,
      fat: sum.fat + recipe.nutrition.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  const macroEnergy = totals.protein * 4 + totals.carbs * 4 + totals.fat * 9;
  const proteinEnergyPercent = percent(totals.protein * 4, macroEnergy);
  const carbsEnergyPercent = percent(totals.carbs * 4, macroEnergy);
  const fatEnergyPercent = percent(totals.fat * 9, macroEnergy);
  return {
    ...totals,
    meals: selected.length,
    averageCalories: Math.round(totals.calories / selected.length),
    averageProtein: Math.round(totals.protein / selected.length),
    averageCarbs: Math.round(totals.carbs / selected.length),
    averageFat: Math.round(totals.fat / selected.length),
    proteinEnergyPercent,
    carbsEnergyPercent,
    fatEnergyPercent,
    balancedMacroDistribution:
      carbsEnergyPercent >= 45 &&
      carbsEnergyPercent <= 60 &&
      fatEnergyPercent >= 20 &&
      fatEnergyPercent <= 35,
  };
};
