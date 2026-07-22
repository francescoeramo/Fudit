import {
  getWeekKey,
  priceStatusFor,
  recipeCost,
  roundMoney,
} from "./calculations";
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

interface PricedRecipe {
  recipe: Recipe;
  cost: number;
  preferenceScore: number;
}

interface CombinationState {
  score: number;
  selections: Map<string, number>;
}

const pruneDominated = (states: Map<number, CombinationState>) => {
  let bestScore = Number.NEGATIVE_INFINITY;
  return new Map(
    [...states.entries()]
      .sort(([left], [right]) => left - right)
      .filter(([, state]) => {
        if (state.score <= bestScore) return false;
        bestScore = state.score;
        return true;
      }),
  );
};

/**
 * Multiple-choice knapsack: chooses the whole weekly combination together,
 * instead of making a locally cheap decision for each meal.
 */
const bestCombinationWithinBudget = (
  candidates: PricedRecipe[],
  slots: number,
  budget: number,
) => {
  if (!candidates.length || slots <= 0) return [];
  const maxUsefulBudget = Math.min(
    Math.max(0, Math.round(budget * 100)),
    Math.max(...candidates.map(({ cost }) => Math.round(cost * 100))) * slots,
  );
  const maxUses = Math.min(
    slots,
    Math.max(3, Math.ceil(slots / candidates.length) + 2),
  );
  const maximumCost = Math.max(...candidates.map(({ cost }) => cost));
  let states = Array.from(
    { length: slots + 1 },
    () => new Map<number, CombinationState>(),
  );
  states[0].set(0, { score: 0, selections: new Map() });

  candidates.forEach((candidate) => {
    const next = states.map((level) => new Map(level));
    const cost = Math.max(0, Math.round(candidate.cost * 100));
    for (let count = 0; count <= slots; count += 1) {
      states[count].forEach((state, spent) => {
        for (
          let uses = 1;
          uses <= Math.min(maxUses, slots - count);
          uses += 1
        ) {
          const nextSpent = spent + cost * uses;
          if (nextSpent > maxUsefulBudget) break;
          const uniqueRecipeBonus = 500;
          const preferenceBonus = candidate.preferenceScore * 1_000 * uses;
          const varietyPenalty = (uses - 1) * (uses - 1) * 180;
          const budgetEfficiency = Math.round(
            (maximumCost - candidate.cost) * 10 * uses,
          );
          const score =
            state.score +
            uniqueRecipeBonus +
            preferenceBonus +
            budgetEfficiency -
            varietyPenalty;
          const target = next[count + uses].get(nextSpent);
          if (!target || score > target.score) {
            const selections = new Map(state.selections);
            selections.set(candidate.recipe.id, uses);
            next[count + uses].set(nextSpent, { score, selections });
          }
        }
      });
    }
    states = next.map(pruneDominated);
  });

  const best = [...states[slots].entries()].sort(
    ([leftCost, left], [rightCost, right]) =>
      right.score - left.score || leftCost - rightCost,
  )[0]?.[1];
  if (!best) return [];
  return [...best.selections.entries()].flatMap(([id, uses]) =>
    Array.from({ length: uses }, () => id),
  );
};

const orderCombination = (
  selectedIds: string[],
  candidates: PricedRecipe[],
  slotsPerDay: number,
  budget: number,
) => {
  const remaining = new Map<string, number>();
  selectedIds.forEach((id) => remaining.set(id, (remaining.get(id) ?? 0) + 1));
  const byId = new Map(
    candidates.map((candidate) => [candidate.recipe.id, candidate]),
  );
  const strictOrder: PricedRecipe[] = [];
  const failed = new Set<string>();
  const placeWithoutAdjacentFamilies = (): boolean => {
    if (strictOrder.length === selectedIds.length) return true;
    const position = strictOrder.length;
    const day = Math.floor(position / slotsPerDay);
    const recentStart = Math.max(0, (day - 1) * slotsPerDay);
    const recent = strictOrder.slice(recentStart);
    const signature = `${[...remaining.entries()]
      .filter(([, uses]) => uses > 0)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([id, uses]) => `${id}:${uses}`)
      .join(",")}|${recent.map((item) => item.recipe.id).join(",")}`;
    if (failed.has(signature)) return false;
    const choices = [...remaining.entries()]
      .filter(([, uses]) => uses > 0)
      .map(([id, uses]) => ({ candidate: byId.get(id), uses }))
      .filter(
        (entry): entry is { candidate: PricedRecipe; uses: number } =>
          entry.candidate !== undefined,
      )
      .filter(({ candidate }) => {
        const families = new Set(mealFamilies(candidate.recipe));
        return !recent.some((other) =>
          mealFamilies(other.recipe).some((family) => families.has(family)),
        );
      })
      .sort(
        (left, right) =>
          right.uses - left.uses ||
          right.candidate.preferenceScore - left.candidate.preferenceScore,
      );
    for (const { candidate, uses } of choices) {
      strictOrder.push(candidate);
      remaining.set(candidate.recipe.id, uses - 1);
      if (placeWithoutAdjacentFamilies()) return true;
      strictOrder.pop();
      remaining.set(candidate.recipe.id, uses);
    }
    failed.add(signature);
    return false;
  };
  if (placeWithoutAdjacentFamilies()) return strictOrder;

  remaining.clear();
  selectedIds.forEach((id) => remaining.set(id, (remaining.get(id) ?? 0) + 1));
  const diversified: PricedRecipe[] = [];
  const minimumCost = Math.min(
    ...candidates.map((candidate) => candidate.cost),
  );
  let spent = 0;
  while (diversified.length < selectedIds.length) {
    const day = Math.floor(diversified.length / slotsPerDay);
    const recent = diversified.slice(Math.max(0, (day - 1) * slotsPerDay));
    const remainingSlots = selectedIds.length - diversified.length - 1;
    const affordableNow = Math.max(
      0,
      budget - spent - minimumCost * remainingSlots,
    );
    const compatible = candidates.filter((candidate) => {
      const families = new Set(mealFamilies(candidate.recipe));
      return !recent.some((other) =>
        mealFamilies(other.recipe).some((family) => families.has(family)),
      );
    });
    const affordable = compatible.filter(
      (candidate) => candidate.cost <= affordableNow + 0.001,
    );
    const pick = (affordable.length ? affordable : compatible)
      .map((candidate) => ({
        candidate,
        desired: remaining.get(candidate.recipe.id) ?? 0,
        repeated: diversified
          .slice(-6)
          .some((item) => item.recipe.id === candidate.recipe.id),
      }))
      .sort(
        (left, right) =>
          Number(right.desired > 0) - Number(left.desired > 0) ||
          Number(left.repeated) - Number(right.repeated) ||
          right.candidate.preferenceScore - left.candidate.preferenceScore ||
          left.candidate.cost - right.candidate.cost,
      )[0]?.candidate;
    if (!pick) break;
    diversified.push(pick);
    spent += pick.cost;
    remaining.set(
      pick.recipe.id,
      Math.max(0, (remaining.get(pick.recipe.id) ?? 0) - 1),
    );
  }
  if (diversified.length === selectedIds.length && spent <= budget + 0.001)
    return diversified;

  remaining.clear();
  selectedIds.forEach((id) => remaining.set(id, (remaining.get(id) ?? 0) + 1));
  const ordered: PricedRecipe[] = [];
  while (ordered.length < selectedIds.length) {
    const day = Math.floor(ordered.length / slotsPerDay);
    const sameDay = ordered.slice(day * slotsPerDay);
    const previousDay = ordered.slice(
      Math.max(0, (day - 1) * slotsPerDay),
      day * slotsPerDay,
    );
    const twoDaysBack = ordered.slice(
      Math.max(0, (day - 2) * slotsPerDay),
      Math.max(0, (day - 1) * slotsPerDay),
    );
    const pick = candidates
      .filter((candidate) => (remaining.get(candidate.recipe.id) ?? 0) > 0)
      .map((candidate) => {
        const families = new Set(mealFamilies(candidate.recipe));
        const intersects = (other: PricedRecipe) =>
          mealFamilies(other.recipe).some((family) => families.has(family));
        let penalty = 0;
        if (sameDay.some(intersects)) penalty += 10_000;
        if (previousDay.some(intersects)) penalty += 1_400;
        if (twoDaysBack.some(intersects)) penalty += 300;
        if (
          ordered
            .slice(-6)
            .some((item) => item.recipe.id === candidate.recipe.id)
        )
          penalty += 5_000;
        penalty -= candidate.preferenceScore * 50;
        return { candidate, penalty };
      })
      .sort((left, right) => left.penalty - right.penalty)[0]?.candidate;
    if (!pick) break;
    ordered.push(pick);
    remaining.set(pick.recipe.id, (remaining.get(pick.recipe.id) ?? 1) - 1);
  }
  return ordered;
};

export const createPlan = (
  recipes: Recipe[],
  catalog: PriceItem[],
  prefs: Preferences,
): MealPlan => {
  const now = new Date();
  const compatible = recipes.filter((r) => isCompatible(r, prefs, catalog));
  const completelyPriced = compatible.filter((recipe) =>
    recipe.ingredients.every(
      (ingredient) =>
        priceStatusFor(
          catalog.find((item) => item.id === ingredient.id),
          prefs.store,
        ) !== "missing",
    ),
  );
  const options = completelyPriced.length ? completelyPriced : compatible;
  const candidates = options.map((r) => ({
    recipe: r,
    cost: recipeCost(r, catalog, prefs.store, prefs.people, now),
    preferenceScore: prefs.styles.filter((s) => r.tags.includes(s)).length,
  }));
  const totalSlots = 7 * prefs.meals.length;
  const selected = bestCombinationWithinBudget(
    candidates,
    totalSlots,
    prefs.budget,
  );
  const cheapest = [...candidates].sort((a, b) => a.cost - b.cost)[0];
  const fallback = cheapest
    ? Array.from({ length: totalSlots }, () => cheapest.recipe.id)
    : [];
  const ordered = orderCombination(
    selected.length === totalSlots ? selected : fallback,
    candidates,
    prefs.meals.length,
    prefs.budget,
  );
  const meals = ordered.map((candidate, index) => ({
    day: Math.floor(index / prefs.meals.length),
    slot: prefs.meals[index % prefs.meals.length],
    recipeId: candidate.recipe.id,
    cost: candidate.cost,
  }));
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
    source: "generated",
    preferences: {
      ...prefs,
      meals: [...prefs.meals],
      styles: [...prefs.styles],
      allergies: [...prefs.allergies],
    },
  };
};
