import { Ingredient, PriceItem, Recipe, ShoppingItem, Store } from "./types";
export const roundMoney = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;
export const roundQuantity = (value: number) =>
  Math.round((value + Number.EPSILON) * 1000) / 1000;
export const getWeekKey = (date = new Date()) => {
  const day = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day.toISOString().slice(0, 10);
};
export const weeklyPriceFactor = (
  item: PriceItem,
  store: Store,
  date = new Date(),
) => {
  const hash = [item.id, store, getWeekKey(date)]
    .join("")
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return 1 + ((hash % 9) - 4) / 100;
};
export const storeUnitPrice = (
  item: PriceItem,
  store: Store,
  date = new Date(),
) =>
  roundMoney(
    item.confirmedStores?.[store]
      ? (item.stores[store] ?? item.price)
      : (item.stores[store] ?? item.price) *
          weeklyPriceFactor(item, store, date),
  );

export const confirmedPriceCoverage = (
  recipe: Recipe,
  catalog: PriceItem[],
  store: Store,
) => {
  const ingredientIds = [...new Set(recipe.ingredients.map((item) => item.id))];
  const confirmed = ingredientIds.filter((id) => {
    const item = catalog.find((price) => price.id === id);
    return Boolean(
      item &&
      item.per > 0 &&
      item.confirmedStores?.[store] &&
      Number.isFinite(item.stores[store]) &&
      Number(item.stores[store]) > 0,
    );
  }).length;
  return {
    confirmed,
    total: ingredientIds.length,
    complete: ingredientIds.length > 0 && confirmed === ingredientIds.length,
  };
};
export const scaleIngredients = (
  ingredients: Ingredient[],
  base: number,
  people: number,
) =>
  ingredients.map((i) => ({
    ...i,
    quantity: roundQuantity((i.quantity * people) / base),
  }));
export const priceFor = (
  item: Ingredient,
  catalog: PriceItem[],
  store: Store,
  date = new Date(),
) => {
  const p = catalog.find((x) => x.id === item.id);
  if (!p || p.per <= 0) return 0;
  return roundMoney((item.quantity / p.per) * storeUnitPrice(p, store, date));
};
export const recipeCost = (
  recipe: Recipe,
  catalog: PriceItem[],
  store: Store,
  people: number,
  date = new Date(),
) =>
  roundMoney(
    scaleIngredients(recipe.ingredients, recipe.baseServings, people).reduce(
      (s, i) => s + priceFor(i, catalog, store, date),
      0,
    ),
  );

export const confirmedRecipeCost = (
  recipe: Recipe,
  catalog: PriceItem[],
  store: Store,
  people: number,
): number | null =>
  people > 0 && confirmedPriceCoverage(recipe, catalog, store).complete
    ? recipeCost(recipe, catalog, store, people)
    : null;
export const aggregateShopping = (
  recipes: Recipe[],
  catalog: PriceItem[],
  store: Store,
  people: number,
): ShoppingItem[] => {
  const all = recipes.flatMap((r) =>
    scaleIngredients(r.ingredients, r.baseServings, people),
  );
  const map = new Map<string, ShoppingItem>();
  all.forEach((i) => {
    const prior = map.get(i.id);
    map.set(i.id, {
      ...i,
      quantity: (prior?.quantity ?? 0) + i.quantity,
      estimatedCost: 0,
      checked: prior?.checked,
    });
  });
  return [...map.values()].map((i) => ({
    ...i,
    quantity: roundQuantity(i.quantity),
    estimatedCost: priceFor(i, catalog, store),
    category: i.category,
  }));
};
export const nutritionFor = (recipe: Recipe, people: number) => ({
  ...recipe.nutrition,
  calories: Math.round(recipe.nutrition.calories * people),
  protein: Math.round(recipe.nutrition.protein * people),
  carbs: Math.round(recipe.nutrition.carbs * people),
  fat: Math.round(recipe.nutrition.fat * people),
});
