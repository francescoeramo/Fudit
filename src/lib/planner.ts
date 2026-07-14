import { getWeekKey, recipeCost, roundMoney } from "./calculations";
import { mealFamilies } from "./food";
import { MealPlan, Preferences, PriceItem, Recipe } from "./types";
export const isCompatible = (
  recipe: Recipe,
  prefs: Preferences,
  catalog: PriceItem[] = [],
) => {
  const avoid = prefs.allergies
    .map((x) => x.toLowerCase().trim())
    .filter(Boolean);
  const labels = [
    ...recipe.allergens,
    ...recipe.ingredients.flatMap((i) => [i.name, ...(i.allergens ?? [])]),
    ...recipe.ingredients.flatMap((i) => {
      const p = catalog.find((x) => x.id === i.id);
      return p ? [p.name, ...p.allergens] : [];
    }),
  ]
    .join(" ")
    .toLowerCase();
  if (avoid.some((word) => labels.includes(word))) return false;
  const strict = prefs.styles.filter((s) =>
    ["vegetariani", "vegani", "senza glutine", "senza lattosio"].includes(s),
  );
  return strict.every((s) => recipe.tags.includes(s));
};
export const createPlan = (
  recipes: Recipe[],
  catalog: PriceItem[],
  prefs: Preferences,
): MealPlan => {
  const now = new Date();
  const options = recipes.filter((r) => isCompatible(r, prefs, catalog));
  const scored = options
    .map((r) => ({
      r,
      c: recipeCost(r, catalog, prefs.store, prefs.people, now),
      score:
        prefs.styles.filter((s) => r.tags.includes(s)).length * 12 -
        recipeCost(r, catalog, prefs.store, prefs.people, now),
    }))
    .sort((a, b) => b.score - a.score);
  const chosen: { day: number; recipe: Recipe }[] = [];
  const meals = Array.from({ length: 7 }, (_, day) =>
    prefs.meals.flatMap((slot) => {
      const ranked = scored
        .map((candidate, rank) => {
          const families = new Set(mealFamilies(candidate.r));
          const sameDay = chosen.filter((x) => x.day === day);
          const previous = chosen.filter((x) => x.day === day - 1);
          const twoDaysBack = chosen.filter((x) => x.day === day - 2);
          const intersects = (recipe: Recipe) =>
            mealFamilies(recipe).some((family) => families.has(family));
          let penalty = rank;
          if (sameDay.some((x) => intersects(x.recipe))) penalty += 1000;
          if (previous.some((x) => intersects(x.recipe))) penalty += 140;
          if (twoDaysBack.some((x) => intersects(x.recipe))) penalty += 30;
          if (chosen.slice(-6).some((x) => x.recipe.id === candidate.r.id))
            penalty += 500;
          return { ...candidate, penalty };
        })
        .sort((a, b) => a.penalty - b.penalty);
      const pick = ranked[0];
      if (!pick) return [];
      chosen.push({ day, recipe: pick.r });
      return [{ day, slot, recipeId: pick.r.id, cost: pick.c }];
    }),
  ).flat();
  const total = roundMoney(meals.reduce((s, m) => s + m.cost, 0));
  return {
    id: crypto.randomUUID(),
    createdAt: now.toISOString(),
    meals,
    total,
    overBudget: total > prefs.budget,
    store: prefs.store,
    people: prefs.people,
    budget: prefs.budget,
    weekKey: getWeekKey(now),
  };
};
