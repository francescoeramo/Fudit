import {
  aggregateShopping,
  getWeekKey,
  recipeCost,
  roundMoney,
} from "./calculations";
import { categorizeFood } from "./food";
import {
  Ingredient,
  MealPlan,
  MealSlot,
  PriceItem,
  Recipe,
  ShoppingItem,
  Store,
} from "./types";

export interface DietIngredientDraft {
  id: string;
  name: string;
  quantity: number;
  unit: Ingredient["unit"];
}

export interface DietMealDraft {
  id: string;
  day: number;
  slot: MealSlot;
  title: string;
  ingredients: DietIngredientDraft[];
  rawText: string;
}

export interface BuiltDietPlan {
  plan: MealPlan;
  recipes: Recipe[];
  newPrices: PriceItem[];
  shopping: ShoppingItem[];
  recognizedPrices: number;
  totalIngredients: number;
}

const dayPatterns = [
  /(luned[iì]|lun)(?=\s|[-:–—]|$)/i,
  /(marted[iì]|mar)(?=\s|[-:–—]|$)/i,
  /(mercoled[iì]|mer)(?=\s|[-:–—]|$)/i,
  /(gioved[iì]|gio)(?=\s|[-:–—]|$)/i,
  /(venerd[iì]|ven)(?=\s|[-:–—]|$)/i,
  /\b(sabato|sab)\b/i,
  /\b(domenica|dom)\b/i,
];

const slotPatterns: Array<[MealSlot, RegExp]> = [
  ["colazione", /\bcolazione\b/i],
  ["spuntino", /\bspuntino\b/i],
  ["pranzo", /\bpranzo\b/i],
  ["merenda", /\bmerenda\b/i],
  ["cena", /\bcena\b/i],
];

const slotOrder: Record<MealSlot, number> = {
  colazione: 0,
  spuntino: 1,
  pranzo: 2,
  merenda: 3,
  cena: 4,
};

const normalizeName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(di|del|della|dei|degli|delle|al|alla|con)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizedUnit = (value: string): Ingredient["unit"] => {
  const unit = value.toLowerCase();
  if (unit === "kg") return "g";
  if (unit === "l" || unit === "cl") return "ml";
  if (/^(pz|pez)/.test(unit)) return "pz";
  return unit === "ml" ? "ml" : "g";
};

const normalizedQuantity = (value: string, unit: string) => {
  const quantity = Number(value.replace(",", "."));
  if (unit.toLowerCase() === "kg" || unit.toLowerCase() === "l")
    return quantity * 1000;
  if (unit.toLowerCase() === "cl") return quantity * 10;
  return quantity;
};

const parseIngredientSegment = (
  segment: string,
  index: number,
): DietIngredientDraft | null => {
  const cleaned = segment.replace(/[()[\]]/g, " ").trim();
  const after = cleaned.match(
    /(\d+(?:[.,]\d+)?)\s*(kg|g|ml|cl|l|pz|pezzo|pezzi)\b\s*(?:di\s+)?(.+)/i,
  );
  const before = cleaned.match(
    /(.+?)\s+(\d+(?:[.,]\d+)?)\s*(kg|g|ml|cl|l|pz|pezzo|pezzi)\b/i,
  );
  const match = after ?? before;
  if (!match) return null;
  const quantityText = after ? match[1] : match[2];
  const unitText = after ? match[2] : match[3];
  const name = (after ? match[3] : match[1])
    .replace(/^[-:–—\s]+|[-:–—\s]+$/g, "")
    .trim();
  const quantity = normalizedQuantity(quantityText, unitText);
  if (!name || !Number.isFinite(quantity) || quantity <= 0) return null;
  return {
    id: `ingredient-${index}`,
    name: name.slice(0, 80),
    quantity,
    unit: normalizedUnit(unitText),
  };
};

export const parseDietText = (text: string): DietMealDraft[] => {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 500);
  const meals: DietMealDraft[] = [];
  let currentDay = 0;
  let explicitDay = false;
  let lastSlotOrder = -1;

  lines.forEach((line, lineIndex) => {
    const day = dayPatterns.findIndex((pattern) => pattern.test(line));
    if (day >= 0) {
      currentDay = day;
      explicitDay = true;
      lastSlotOrder = -1;
    }
    const slotEntry = slotPatterns.find(([, pattern]) => pattern.test(line));
    if (!slotEntry) return;
    const slot = slotEntry[0];
    if (!explicitDay && slotOrder[slot] <= lastSlotOrder)
      currentDay = Math.min(6, currentDay + 1);
    lastSlotOrder = slotOrder[slot];

    const withoutLabels = line
      .replace(dayPatterns[day >= 0 ? day : currentDay] ?? /$^/, " ")
      .replace(slotEntry[1], " ")
      .replace(/^[-:–—\s]+/, "")
      .trim();
    const segments = withoutLabels
      .split(/[,;•|]+/)
      .map((segment) => segment.trim())
      .filter(Boolean);
    const ingredients = segments
      .map((segment, index) => parseIngredientSegment(segment, index))
      .filter((item): item is DietIngredientDraft => item !== null);
    if (!ingredients.length) return;
    const titleCandidate = withoutLabels.split(/[:(]/)[0].trim();
    const title =
      titleCandidate && !/\d/.test(titleCandidate)
        ? titleCandidate
        : ingredients.map((item) => item.name).join(" e ");
    meals.push({
      id: `meal-${lineIndex}`,
      day: currentDay,
      slot,
      title: title.slice(0, 100) || `${slot} dieta`,
      ingredients,
      rawText: line.slice(0, 300),
    });
  });
  return meals.slice(0, 35);
};

export const matchCatalogIngredient = (
  name: string,
  catalog: PriceItem[],
): PriceItem | undefined => {
  const target = normalizeName(name);
  if (!target) return undefined;
  const targetTokens = target.split(" ").filter((token) => token.length > 2);
  return catalog
    .map((item) => {
      const candidate = normalizeName(item.name);
      const candidateTokens = candidate
        .split(" ")
        .filter((token) => token.length > 2);
      const common = targetTokens.filter((token) =>
        candidateTokens.some(
          (candidateToken) =>
            candidateToken.startsWith(token) ||
            token.startsWith(candidateToken) ||
            (token.length > 4 &&
              candidateToken.length > 4 &&
              token.slice(0, -1) === candidateToken.slice(0, -1)),
        ),
      ).length;
      const score =
        target === candidate
          ? 100
          : target.includes(candidate) || candidate.includes(target)
            ? 50
            : common;
      return { item, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)[0]?.item;
};

const slug = (value: string) =>
  normalizeName(value).replace(/\s+/g, "-").slice(0, 45) || "alimento";

export const buildDietPlan = ({
  meals,
  catalog,
  store,
  people,
  budget,
  fileName,
  now = new Date(),
  idFactory = () => crypto.randomUUID(),
}: {
  meals: DietMealDraft[];
  catalog: PriceItem[];
  store: Store;
  people: number;
  budget: number;
  fileName: string;
  now?: Date;
  idFactory?: () => string;
}): BuiltDietPlan => {
  const nextCatalog = [...catalog];
  const newPrices: PriceItem[] = [];
  let recognizedPrices = 0;
  let totalIngredients = 0;
  const customRecipes = meals.map((meal) => {
    const ingredients = meal.ingredients.map((ingredient) => {
      totalIngredients += 1;
      let price = matchCatalogIngredient(ingredient.name, nextCatalog);
      if (price) recognizedPrices += 1;
      if (!price) {
        const id = `diet-food-${slug(ingredient.name)}-${idFactory().slice(0, 8)}`;
        const fallbackPrice = ingredient.unit === "pz" ? 1 : 2;
        price = {
          id,
          name: ingredient.name,
          unit: ingredient.unit,
          price: fallbackPrice,
          per:
            ingredient.unit === "pz"
              ? 1
              : ingredient.unit === "ml"
                ? 1000
                : 500,
          category: categorizeFood(ingredient.name),
          allergens: [],
          nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 },
          stores: { [store]: fallbackPrice },
        };
        nextCatalog.push(price);
        newPrices.push(price);
      }
      return {
        id: price.id,
        name: price.name,
        unit: ingredient.unit,
        quantity: ingredient.quantity,
        category: price.category,
        allergens: price.allergens,
      } satisfies Ingredient;
    });
    return {
      id: `diet-recipe-${idFactory()}`,
      title: meal.title,
      time: 0,
      difficulty: "Facile",
      ingredients,
      steps: [
        "Segui le indicazioni e le modalità di preparazione indicate dal professionista che ha redatto la dieta.",
      ],
      nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      tags: [],
      allergens: [
        ...new Set(ingredients.flatMap((item) => item.allergens ?? [])),
      ],
      baseServings: 1,
    } satisfies Recipe;
  });
  const plannedMeals = meals.map((meal, index) => ({
    day: meal.day,
    slot: meal.slot,
    recipeId: customRecipes[index].id,
    cost: recipeCost(customRecipes[index], nextCatalog, store, people, now),
  }));
  const total = roundMoney(
    plannedMeals.reduce((sum, meal) => sum + meal.cost, 0),
  );
  const plan: MealPlan = {
    id: idFactory(),
    createdAt: now.toISOString(),
    meals: plannedMeals,
    total,
    overBudget: budget > 0 && total > budget,
    store,
    people,
    budget,
    weekKey: getWeekKey(now),
    source: "diet-pdf",
    name: fileName.replace(/\.pdf$/i, "").slice(0, 80),
  };
  return {
    plan,
    recipes: customRecipes,
    newPrices,
    shopping: aggregateShopping(customRecipes, nextCatalog, store, people),
    recognizedPrices,
    totalIngredients,
  };
};
