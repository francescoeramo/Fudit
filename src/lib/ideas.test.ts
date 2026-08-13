import { describe, expect, it } from "vitest";
import { getQuickIngredients, suggestRecipes } from "./ideas";
import { recipes, seedPrices } from "./seed";

describe("suggerimenti Idee", () => {
  it("propone tutti gli ingredienti del catalogo effettivamente usati", () => {
    const usedIngredientIds = new Set(
      recipes.flatMap((recipe) =>
        recipe.ingredients.map((ingredient) => ingredient.id),
      ),
    );
    const quickIngredients = getQuickIngredients(seedPrices, recipes);

    expect(quickIngredients.length).toBe(usedIngredientIds.size);
    expect(new Set(quickIngredients.map((item) => item.id)).size).toBe(
      quickIngredients.length,
    );
    expect(
      quickIngredients.every((item) => usedIngredientIds.has(item.id)),
    ).toBe(true);
    expect(quickIngredients.map((item) => item.name)).toEqual(
      quickIngredients
        .map((item) => item.name)
        .sort((left, right) => left.localeCompare(right, "it")),
    );
  });

  it("ignora maiuscole, minuscole e accenti nella ricerca ingredienti", () => {
    const lower = suggestRecipes(recipes, ["uova", "farina"], ["Dolce"]);
    const upper = suggestRecipes(recipes, ["UOVA", "FARINA"], ["Dolce"]);
    const capitalized = suggestRecipes(recipes, ["Uova", "Farina"], ["Dolce"]);
    expect(lower.length).toBeGreaterThan(0);
    expect(upper.map((recipe) => recipe.id)).toEqual(
      lower.map((recipe) => recipe.id),
    );
    expect(capitalized.map((recipe) => recipe.id)).toEqual(
      lower.map((recipe) => recipe.id),
    );
  });

  it("applica più ingredienti e più categorie insieme", () => {
    const matches = suggestRecipes(recipes, ["uova"], ["Primo", "Dolce"]);
    expect(matches.length).toBeGreaterThan(0);
    expect(
      matches.every((recipe) =>
        recipe.ingredients.some((ingredient) =>
          ingredient.name.toLocaleLowerCase("it").includes("uova"),
        ),
      ),
    ).toBe(true);
  });
});
