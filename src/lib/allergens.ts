import { PriceItem, Recipe } from "./types";

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const allergenAliases: Record<string, string[]> = {
  glutine: [
    "glutine",
    "grano",
    "frumento",
    "farro",
    "orzo",
    "segale",
    "avena",
    "kamut",
  ],
  crostacei: ["crostacei", "gambero", "gamberi", "granchio", "aragosta"],
  uova: ["uovo", "uova"],
  pesce: ["pesce", "salmone", "tonno", "merluzzo", "acciuga", "acciughe"],
  arachidi: ["arachide", "arachidi", "noccioline"],
  soia: ["soia", "tofu"],
  latte: [
    "latte",
    "lattosio",
    "burro",
    "yogurt",
    "mozzarella",
    "ricotta",
    "parmigiano",
    "formaggio",
  ],
  "frutta a guscio": [
    "frutta a guscio",
    "mandorla",
    "mandorle",
    "nocciola",
    "nocciole",
    "noce",
    "noci",
    "pistacchio",
    "pistacchi",
    "anacardo",
    "anacardi",
  ],
  sedano: ["sedano"],
  senape: ["senape"],
  sesamo: ["sesamo"],
  solfiti: ["solfiti", "anidride solforosa"],
  lupini: ["lupino", "lupini"],
  molluschi: ["molluschi", "cozze", "vongole", "calamaro", "polpo"],
};

const containsTerm = (text: string, term: string) =>
  ` ${text} `.includes(` ${term} `);

const canonicalFor = (value: string) => {
  const normalized = normalize(value);
  return Object.entries(allergenAliases)
    .filter(
      ([canonical, aliases]) =>
        canonical === normalized ||
        aliases.some((alias) => containsTerm(normalized, normalize(alias))),
    )
    .map(([canonical]) => canonical);
};

export const recipeAllergens = (recipe: Recipe, catalog: PriceItem[] = []) => {
  const labels = [
    ...recipe.allergens,
    ...recipe.ingredients.flatMap((ingredient) => [
      ingredient.name,
      ...(ingredient.allergens ?? []),
    ]),
    ...recipe.ingredients.flatMap((ingredient) => {
      const item = catalog.find((candidate) => candidate.id === ingredient.id);
      return item ? [item.name, ...item.allergens] : [];
    }),
  ];
  return new Set(labels.flatMap(canonicalFor));
};

export const recipeMatchesAllergy = (
  recipe: Recipe,
  allergy: string,
  catalog: PriceItem[] = [],
) => {
  const normalizedAllergy = normalize(allergy);
  if (!normalizedAllergy) return false;

  const requestedCanonical = canonicalFor(normalizedAllergy);
  const detected = recipeAllergens(recipe, catalog);
  if (requestedCanonical.some((allergen) => detected.has(allergen)))
    return true;

  const searchable = normalize(
    [
      recipe.title,
      ...recipe.allergens,
      ...recipe.ingredients.flatMap((ingredient) => [
        ingredient.name,
        ...(ingredient.allergens ?? []),
      ]),
    ].join(" "),
  );
  return containsTerm(searchable, normalizedAllergy);
};
