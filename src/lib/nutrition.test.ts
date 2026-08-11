import { describe, expect, it } from "vitest";
import { summarizePlanNutrition } from "./nutrition";
import { recipes } from "./seed";
import { MealPlan } from "./types";

describe("riepilogo nutrizionale", () => {
  it("calcola medie per persona e quote energetiche dei macro", () => {
    const recipe = recipes.find(
      (item) => item.id === "fodmap-pollo-riso-carote",
    )!;
    const plan: MealPlan = {
      id: "piano",
      createdAt: "2026-08-11T00:00:00.000Z",
      meals: Array.from({ length: 7 }, (_, day) => ({
        day,
        slot: "cena" as const,
        recipeId: recipe.id,
        cost: 1,
      })),
      total: 7,
      overBudget: false,
    };
    const summary = summarizePlanNutrition(plan, recipes)!;
    expect(summary.meals).toBe(7);
    expect(summary.averageCalories).toBe(recipe.nutrition.calories);
    expect(
      summary.proteinEnergyPercent +
        summary.carbsEnergyPercent +
        summary.fatEnergyPercent,
    ).toBeGreaterThanOrEqual(99);
    expect(summary.balancedMacroDistribution).toBe(true);
  });
});
