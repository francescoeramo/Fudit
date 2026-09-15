import { recipeCourse } from "./food";
import { recipeMatchesAllergy } from "./allergens";
import { FoodStyle, PriceItem, Recipe, RecipeCourse } from "./types";

export const getQuickIngredients = (
  catalog: PriceItem[],
  recipes: Recipe[],
) => {
  const usedIngredientIds = new Set(
    recipes.flatMap((recipe) =>
      recipe.ingredients.map((ingredient) => ingredient.id),
    ),
  );
  const seenIngredientIds = new Set<string>();

  return catalog
    .filter((item) => {
      if (!usedIngredientIds.has(item.id) || seenIngredientIds.has(item.id)) {
        return false;
      }
      seenIngredientIds.add(item.id);
      return true;
    })
    .sort((left, right) => left.name.localeCompare(right.name, "it"));
};

export const normalizeIngredientText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("it")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const ingredientMatches = (recipe: Recipe, requested: string) => {
  const needle = normalizeIngredientText(requested);
  if (!needle) return false;
  return recipe.ingredients.some((ingredient) => {
    const name = normalizeIngredientText(ingredient.name);
    const id = normalizeIngredientText(ingredient.id);
    return (
      name === needle ||
      id === needle ||
      name.includes(needle) ||
      needle.includes(name)
    );
  });
};

export const countMatchedIngredients = (
  recipe: Recipe,
  ingredients: string[],
) =>
  new Set(ingredients.map(normalizeIngredientText).filter(Boolean)).size === 0
    ? 0
    : [
        ...new Set(ingredients.map(normalizeIngredientText).filter(Boolean)),
      ].filter((ingredient) => ingredientMatches(recipe, ingredient)).length;

export const suggestRecipes = (
  recipes: Recipe[],
  ingredients: string[],
  courses: RecipeCourse[],
  styles: FoodStyle[] = [],
  allergies: string[] = [],
  catalog: PriceItem[] = [],
) => {
  const requested = [
    ...new Set(ingredients.map(normalizeIngredientText).filter(Boolean)),
  ];
  const uniqueRecipes = [
    ...new Map(recipes.map((recipe) => [recipe.id, recipe])).values(),
  ];
  return uniqueRecipes
    .filter(
      (recipe) =>
        (!courses.length || courses.includes(recipeCourse(recipe))) &&
        (!requested.length ||
          requested.some((ingredient) =>
            ingredientMatches(recipe, ingredient),
          )) &&
        styles.every((style) => recipe.tags.includes(style)) &&
        !allergies.some((allergy) =>
          recipeMatchesAllergy(recipe, allergy, catalog),
        ),
    )
    .sort(
      (left, right) =>
        countMatchedIngredients(right, requested) -
          countMatchedIngredients(left, requested) ||
        left.ingredients.length - right.ingredients.length ||
        left.time - right.time ||
        left.title.localeCompare(right.title, "it"),
    );
};
