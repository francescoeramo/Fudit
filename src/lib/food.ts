import { Category, Recipe } from "./types";

const categoryRules: Array<[Category, RegExp]> = [
  [
    "Frutta e verdura",
    /(mela|pera|banana|aranci|limon|pomodor|zucchin|spinac|broccol|patat|melanzan|peperon|cipoll|carot|insalat|verdura|frutta|pisell|fungh|zucca)/i,
  ],
  [
    "Carne e pesce",
    /(pollo|tacchin|manzo|vitello|maiale|salsicc|prosciutt|salmone|tonno|merluzz|pesce|uova?)/i,
  ],
  [
    "Latticini",
    /(latte|yogurt|mozzarell|parmigian|grana|ricotta|formaggi|burro)/i,
  ],
  ["Surgelati", /(surgelat|congelat)/i],
  [
    "Dispensa",
    /(pasta|riso|ceci|lenticch|fagiol|farina|pane|avena|passata|olio|sale|zucchero|mais|polenta)/i,
  ],
];

export const categorizeFood = (
  name: string,
  fallback: Category = "Altro",
): Category =>
  categoryRules.find(([, rule]) => rule.test(name))?.[0] ?? fallback;

export const mealFamilies = (recipe: Recipe): string[] => {
  const ids = new Set(recipe.ingredients.map((item) => item.id));
  const families: string[] = [];
  if (ids.has("pasta")) families.push("pasta");
  if (ids.has("riso")) families.push("riso");
  if (ids.has("pane")) families.push("pane");
  if (ids.has("patate")) families.push("patate");
  if (["ceci", "lenticchie", "fagioli", "piselli"].some((id) => ids.has(id)))
    families.push("legumi");
  if (["pollo", "tacchino"].some((id) => ids.has(id)))
    families.push("carni-bianche");
  if (["manzo", "maiale"].some((id) => ids.has(id)))
    families.push("carni-rosse");
  if (["salmone", "tonno", "merluzzo"].some((id) => ids.has(id)))
    families.push("pesce");
  if (ids.has("uova")) families.push("uova");
  if (ids.has("tofu")) families.push("soia");
  return families;
};

const pantryStaples = new Set(["cipolle", "olive"]);

/** Ingredienti che devono ruotare nella settimana; esclude solo i condimenti. */
export const mealVarietyKeys = (recipe: Recipe): string[] =>
  [...new Set(recipe.ingredients.map((item) => item.id))].filter(
    (id) => !pantryStaples.has(id),
  );
