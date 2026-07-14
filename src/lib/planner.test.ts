import { describe, expect, it } from "vitest";
import {
  aggregateShopping,
  confirmedPriceCoverage,
  confirmedRecipeCost,
  recipeCost,
  scaleIngredients,
  storeUnitPrice,
} from "./calculations";
import { mealFamilies } from "./food";
import { createPlan, isCompatible } from "./planner";
import { recipes, seedPrices } from "./seed";
import { Preferences } from "./types";
const prefs: Preferences = {
  store: "Lidl",
  budget: 100,
  people: 2,
  meals: ["cena"],
  styles: ["economici"],
  allergies: [],
};
describe("Fudit planning", () => {
  it("aggrega ingredienti duplicati", () => {
    const list = aggregateShopping(
      [recipes[0], recipes[0]],
      seedPrices,
      "Lidl",
      2,
    );
    expect(list.find((x) => x.id === "pasta")?.quantity).toBe(360);
  });
  it("calcola il costo di una ricetta", () => {
    expect(recipeCost(recipes[0], seedPrices, "Lidl", 2)).toBeGreaterThan(0);
  });
  it("scala dosi a tre decimali", () => {
    expect(
      scaleIngredients([{ ...recipes[0].ingredients[0], quantity: 1 }], 3, 1)[0]
        .quantity,
    ).toBe(0.333);
  });
  it("esclude allergeni dalle etichette ingredienti e applica dieta", () => {
    expect(
      isCompatible(
        recipes[0],
        { ...prefs, allergies: ["integrale"] },
        seedPrices,
      ),
    ).toBe(false);
    expect(
      createPlan(recipes, seedPrices, {
        ...prefs,
        styles: ["vegani"],
      }).meals.every((m) =>
        recipes.find((r) => r.id === m.recipeId)?.tags.includes("vegani"),
      ),
    ).toBe(true);
  });
  it("non ripete famiglie simili nello stesso giorno o nel precedente", () => {
    const plan = createPlan(recipes, seedPrices, {
      ...prefs,
      styles: [],
      meals: ["pranzo", "cena"],
    });
    for (const meal of plan.meals) {
      const current = recipes.find((r) => r.id === meal.recipeId)!;
      const nearby = plan.meals
        .filter(
          (other) => other !== meal && Math.abs(other.day - meal.day) <= 1,
        )
        .map((other) => recipes.find((r) => r.id === other.recipeId)!);
      expect(
        nearby.some((recipe) =>
          mealFamilies(recipe).some((f) => mealFamilies(current).includes(f)),
        ),
      ).toBe(false);
    }
  });
  it("usa prezzi diversi per insegna e settimana", () => {
    const item = seedPrices[0];
    expect(storeUnitPrice(item, "Lidl", new Date("2026-07-14"))).not.toBe(
      storeUnitPrice(item, "Despar", new Date("2026-07-14")),
    );
    expect(storeUnitPrice(item, "MD", new Date("2026-07-14"))).toBeGreaterThan(
      0,
    );
    expect(storeUnitPrice(item, "Lidl", new Date("2026-07-14"))).not.toBe(
      storeUnitPrice(item, "Lidl", new Date("2026-07-21")),
    );
  });
  it("calcola il prezzo reale solo con tutti gli ingredienti confermati", () => {
    const recipe = recipes[0];
    expect(confirmedRecipeCost(recipe, seedPrices, "Lidl", 2)).toBeNull();
    const confirmedCatalog = seedPrices.map((item) =>
      recipe.ingredients.some((ingredient) => ingredient.id === item.id)
        ? {
            ...item,
            stores: { ...item.stores, Lidl: 2 },
            confirmedStores: { ...item.confirmedStores, Lidl: true },
          }
        : item,
    );
    expect(confirmedPriceCoverage(recipe, confirmedCatalog, "Lidl")).toEqual({
      confirmed: recipe.ingredients.length,
      total: recipe.ingredients.length,
      complete: true,
    });
    expect(confirmedRecipeCost(recipe, confirmedCatalog, "Lidl", 2)).toBe(
      recipeCost(recipe, confirmedCatalog, "Lidl", 2),
    );
    const first = confirmedCatalog.find(
      (item) => item.id === recipe.ingredients[0].id,
    )!;
    expect(storeUnitPrice(first, "Lidl", new Date("2026-07-14"))).toBe(2);
  });
  it("contiene almeno 73 ricette", () =>
    expect(recipes.length).toBeGreaterThanOrEqual(73));
});
