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
import { mealFamilies, mealVarietyKeys, recipeCourse } from "./food";
import {
  chooseReplacementRecipe,
  createPlan,
  isCompatible,
  recipeSimilarity,
} from "./planner";
import { recipes, seedPrices } from "./seed";
import { Preferences, PriceItem, Recipe } from "./types";
import { normalizeIngredientText } from "./ideas";
const prefs: Preferences = {
  store: "Lidl",
  budget: 100,
  people: 2,
  meals: ["cena"],
  styles: ["economici"],
  allergies: [],
};
describe("Fudit planning", () => {
  it("mantiene 228 ricette valide: 60 dolci e 50 nuove salate", () => {
    expect(recipes).toHaveLength(228);
    expect(
      recipes.filter((recipe) => recipeCourse(recipe) === "Dolce"),
    ).toHaveLength(60);
    expect(
      recipes.filter((recipe) => recipe.id.startsWith("salato-")),
    ).toHaveLength(50);
    expect(
      recipes.filter((recipe) => recipe.tags.includes("asiatici")),
    ).toHaveLength(20);
    expect(new Set(seedPrices.map((item) => item.id)).size).toBe(
      seedPrices.length,
    );
    expect(new Set(recipes.map((recipe) => recipe.id)).size).toBe(
      recipes.length,
    );
    const catalogIds = new Set(seedPrices.map((item) => item.id));
    recipes.forEach((recipe) => {
      expect(recipe.title.trim(), recipe.id).not.toBe("");
      expect(recipe.time, recipe.id).toBeGreaterThan(0);
      expect(recipe.steps.length, recipe.id).toBeGreaterThan(0);
      expect(recipe.ingredients.length, recipe.id).toBeGreaterThan(0);
      recipe.ingredients.forEach((ingredient) =>
        expect(catalogIds.has(ingredient.id), recipe.id).toBe(true),
      );
      const ingredientAllergens = new Set(
        recipe.ingredients.flatMap((ingredient) => ingredient.allergens ?? []),
      );
      if (recipe.tags.includes("senza glutine"))
        expect(ingredientAllergens.has("glutine"), recipe.id).toBe(false);
      if (recipe.tags.includes("senza lattosio"))
        expect(ingredientAllergens.has("latte"), recipe.id).toBe(false);
    });
  });
  it("usa procedimenti dettagliati che citano tutti gli ingredienti", () => {
    recipes.forEach((recipe) => {
      expect(recipe.steps.length, recipe.id).toBeGreaterThanOrEqual(5);
      const procedure = normalizeIngredientText(recipe.steps.join(" "));
      recipe.ingredients.forEach((ingredient) =>
        expect(
          procedure.includes(normalizeIngredientText(ingredient.name)),
          `${recipe.id}: ${ingredient.name}`,
        ).toBe(true),
      );
    });
  });
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
  it("crea un piano esclusivamente low FODMAP quando l'opzione è attiva", () => {
    const plan = createPlan(recipes, seedPrices, {
      ...prefs,
      budget: 55,
      meals: ["pranzo", "cena"],
      styles: ["veloci", "economici", "low FODMAP"],
    });
    expect(plan.meals).toHaveLength(14);
    expect(
      plan.meals.every((meal) =>
        recipes
          .find((recipe) => recipe.id === meal.recipeId)
          ?.tags.includes("low FODMAP"),
      ),
    ).toBe(true);
    expect(new Set(plan.meals.map((meal) => meal.recipeId)).size).toBe(14);
    const ingredientCounts = new Map<string, number>();
    plan.meals.forEach((meal) => {
      const recipe = recipes.find((item) => item.id === meal.recipeId)!;
      recipe.ingredients.forEach((ingredient) =>
        ingredientCounts.set(
          ingredient.id,
          (ingredientCounts.get(ingredient.id) ?? 0) + 1,
        ),
      );
    });
    expect(ingredientCounts.get("polenta")).toBeLessThanOrEqual(3);
    expect(
      Math.max(
        ...["riso", "patate", "polenta", "quinoa"].map(
          (id) => ingredientCounts.get(id) ?? 0,
        ),
      ),
    ).toBeLessThanOrEqual(4);
    for (let day = 0; day < 7; day += 1) {
      const dailyStaples = plan.meals
        .filter((meal) => meal.day === day)
        .map(
          (meal) =>
            recipes
              .find((recipe) => recipe.id === meal.recipeId)!
              .ingredients.find((ingredient) =>
                ["riso", "patate", "polenta", "quinoa"].includes(ingredient.id),
              )?.id,
        );
      expect(new Set(dailyStaples).size).toBe(2);
    }
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
  it("non ripete lo stesso piatto nella settimana", () => {
    const plan = createPlan(recipes, seedPrices, {
      ...prefs,
      styles: [],
      meals: ["pranzo", "cena"],
      budget: 160,
    });
    expect(new Set(plan.meals.map((meal) => meal.recipeId)).size).toBe(
      plan.meals.length,
    );
  });
  it("differenzia il piano dalla settimana precedente", () => {
    const preferences = {
      ...prefs,
      styles: [],
      meals: ["pranzo", "cena"] as Preferences["meals"],
      budget: 160,
    };
    const firstWeek = createPlan(recipes, seedPrices, preferences);
    const secondWeek = createPlan(recipes, seedPrices, preferences, firstWeek);
    const firstIds = new Set(firstWeek.meals.map((meal) => meal.recipeId));
    expect(secondWeek.meals.every((meal) => !firstIds.has(meal.recipeId))).toBe(
      true,
    );
    const byId = new Map(recipes.map((recipe) => [recipe.id, recipe]));
    const positionSimilarity = secondWeek.meals.map((meal, index) =>
      recipeSimilarity(
        byId.get(meal.recipeId)!,
        byId.get(firstWeek.meals[index].recipeId)!,
      ),
    );
    expect(
      positionSimilarity.reduce((sum, value) => sum + value, 0) /
        positionSimilarity.length,
    ).toBeLessThan(0.5);
  }, 12_000);
  it("salva tre dolci distinti nel piano e li include nel totale", () => {
    const plan = createPlan(recipes, seedPrices, {
      ...prefs,
      budget: 120,
      styles: ["economici", "dolci"],
    });
    expect(plan.desserts).toHaveLength(3);
    expect(
      new Set(plan.desserts?.map((dessert) => dessert.recipeId)).size,
    ).toBe(3);
    expect(
      plan.desserts?.every(
        (dessert) =>
          recipeCourse(
            recipes.find((recipe) => recipe.id === dessert.recipeId)!,
          ) === "Dolce",
      ),
    ).toBe(true);
    expect(plan.total).toBe(
      Math.round(
        (plan.meals.reduce((sum, meal) => sum + meal.cost, 0) +
          plan.desserts!.reduce((sum, dessert) => sum + dessert.cost, 0)) *
          100,
      ) / 100,
    );
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
      ...recipes
        .filter((recipe) => recipeCourse(recipe) !== "Dolce")
        .map((recipe) => recipeCost(recipe, seedPrices, "Lidl", 2)),
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
  it("contiene almeno 93 ricette con identificativi univoci", () => {
    expect(recipes.length).toBeGreaterThanOrEqual(93);
    expect(new Set(recipes.map((recipe) => recipe.id)).size).toBe(
      recipes.length,
    );
  });
});
