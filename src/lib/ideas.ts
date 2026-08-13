import { recipeCourse } from "./food";
import { PriceItem, Recipe, RecipeCourse } from "./types";

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

export const suggestRecipes = (
  recipes: Recipe[],
  ingredients: string[],
  courses: RecipeCourse[],
) => {
  const requested = [
    ...new Set(ingredients.map(normalizeIngredientText).filter(Boolean)),
  ];
  return recipes
    .filter(
      (recipe) =>
        (!courses.length || courses.includes(recipeCourse(recipe))) &&
        requested.every((ingredient) => ingredientMatches(recipe, ingredient)),
    )
    .sort(
      (left, right) =>
        left.ingredients.length - right.ingredients.length ||
        left.time - right.time ||
        left.title.localeCompare(right.title, "it"),
    );
};
