import { describe, expect, it } from "vitest";
import {
  aggregateShopping,
  confirmedPriceCoverage,
  confirmedRecipeCost,
  priceStatusFor,
  recipeCost,
  referencePriceFor,
  scaleIngredients,
  storeUnitPrice,
} from "./calculations";
import { mealFamilies, mealVarietyKeys } from "./food";
import { chooseReplacementRecipe, createPlan, isCompatible } from "./planner";
import { recipes, seedPrices } from "./seed";
import { Preferences, PriceItem, Recipe } from "./types";
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
  it("riconosce anche sinonimi e allergeni impliciti nel nome", () => {
    const walnutRecipe: Recipe = {
      ...recipes[0],
      id: "pesto-noci",
      title: "Pasta al pesto di noci",
      allergens: [],
      ingredients: [
        {
          id: "pesto-noci",
          name: "Pesto alle noci",
          unit: "g",
          quantity: 80,
          category: "Dispensa",
        },
      ],
    };
    expect(
      isCompatible(
        walnutRecipe,
        { ...prefs, allergies: ["frutta a guscio"] },
        seedPrices,
      ),
    ).toBe(false);
    expect(
      isCompatible(
        recipes.find((recipe) => recipe.id === "pasta-mozzarella")!,
        { ...prefs, allergies: ["lattosio"] },
        seedPrices,
      ),
    ).toBe(false);
  });
  it("non ripropone le stesse due ricette durante rigenerazioni consecutive", () => {
    let plan = createPlan(recipes, seedPrices, { ...prefs, styles: [] });
    const target = plan.meals[0];
    const proposed: string[] = [];
    for (let index = 0; index < 5; index += 1) {
      const replacement = chooseReplacementRecipe({
        recipes,
        catalog: seedPrices,
        preferences: plan.preferences!,
        plan,
        day: target.day,
        slot: target.slot,
      });
      expect(replacement).not.toBeNull();
      proposed.push(replacement!.recipe.id);
      plan = {
        ...plan,
        meals: plan.meals.map((meal) =>
          meal.day === target.day && meal.slot === target.slot
            ? {
                ...meal,
                recipeId: replacement!.recipe.id,
                cost: replacement!.cost,
                regenerationHistory: replacement!.history,
              }
            : meal,
        ),
      };
    }
    expect(new Set(proposed).size).toBe(proposed.length);
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
  it("limita la ricorrenza degli ingredienti principali nella settimana", () => {
    const plan = createPlan(recipes, seedPrices, {
      ...prefs,
      styles: [],
      meals: ["pranzo", "cena"],
      budget: 140,
    });
    const counts = new Map<string, number>();
    plan.meals.forEach((meal) => {
      const recipe = recipes.find(
        (candidate) => candidate.id === meal.recipeId,
      )!;
      mealVarietyKeys(recipe).forEach((key) =>
        counts.set(key, (counts.get(key) ?? 0) + 1),
      );
    });
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(4);
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
  it("costruisce una combinazione entro budget quando è matematicamente possibile", () => {
    const cheapest = Math.min(
      ...recipes.map((recipe) => recipeCost(recipe, seedPrices, "Lidl", 2)),
    );
    const budget = Number((cheapest * 7 + 0.01).toFixed(2));
    const plan = createPlan(recipes, seedPrices, { ...prefs, budget });
    expect(plan.total).toBeLessThanOrEqual(budget);
    expect(plan.overBudget).toBe(false);
    expect(plan.preferences).toEqual({ ...prefs, budget });
  });
  it("ottimizza globalmente le preferenze senza riempire ogni slot col pasto più economico", () => {
    const makeRecipe = (
      id: string,
      title: string,
      ingredient: string,
      tags: Recipe["tags"],
    ): Recipe => ({
      id,
      title,
      time: 15,
      difficulty: "Facile",
      ingredients: [
        {
          id: ingredient,
          name: ingredient,
          unit: "g",
          quantity: 100,
          category: "Dispensa",
        },
      ],
      steps: ["Prepara"],
      nutrition: { calories: 100, protein: 10, carbs: 10, fat: 2 },
      tags,
      allergens: [],
      baseServings: 1,
    });
    const customRecipes = [
      makeRecipe("cheap", "Pasta economica", "pasta-test", []),
      makeRecipe("preferred", "Pollo proteico", "pollo-test", ["high protein"]),
    ];
    const customCatalog: PriceItem[] = [
      {
        id: "pasta-test",
        name: "Pasta test",
        unit: "g",
        price: 1,
        per: 100,
        packageQuantity: 100,
        category: "Dispensa",
        allergens: [],
        nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        stores: { Lidl: 1 },
        confirmedStores: { Lidl: true },
      },
      {
        id: "pollo-test",
        name: "Pollo test",
        unit: "g",
        price: 3,
        per: 100,
        packageQuantity: 100,
        category: "Carne e pesce",
        allergens: [],
        nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        stores: { Lidl: 3 },
        confirmedStores: { Lidl: true },
      },
    ];
    const plan = createPlan(customRecipes, customCatalog, {
      ...prefs,
      people: 1,
      budget: 13,
      styles: ["high protein"],
    });
    expect(plan.total).toBeLessThanOrEqual(13);
    expect(
      plan.meals.filter((meal) => meal.recipeId === "preferred"),
    ).toHaveLength(3);
  });
  it("distingue prezzi confermati, stimati e mancanti e calcola €/kg", () => {
    const item = { ...seedPrices[0], packageQuantity: 500 };
    expect(priceStatusFor(item, "Lidl")).toBe("estimated");
    expect(
      priceStatusFor(
        {
          ...item,
          confirmedStores: { Lidl: true },
        },
        "Lidl",
      ),
    ).toBe("confirmed");
    expect(priceStatusFor({ ...item, price: 0, stores: {} }, "Lidl")).toBe(
      "missing",
    );
    expect(referencePriceFor(item, "Lidl")).toBeGreaterThan(0);
  });
  it("contiene almeno 73 ricette", () =>
    expect(recipes.length).toBeGreaterThanOrEqual(73));
});
