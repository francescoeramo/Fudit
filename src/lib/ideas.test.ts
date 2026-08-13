import { describe, expect, it } from "vitest";
import { suggestRecipes } from "./ideas";
import { recipes } from "./seed";

describe("suggerimenti Idee", () => {
  it("ignora maiuscole, minuscole e accenti nella ricerca ingredienti", () => {
    const lower = suggestRecipes(recipes, ["uova", "farina"], ["Dolce"]);
    const upper = suggestRecipes(recipes, ["UOVA", "FARINA"], ["Dolce"]);
    const capitalized = suggestRecipes(recipes, ["Uova", "Farina"], ["Dolce"]);
    expect(lower.length).toBeGreaterThan(0);
    expect(upper.map((recipe) => recipe.id)).toEqual(lower.map((recipe) => recipe.id));
    expect(capitalized.map((recipe) => recipe.id)).toEqual(lower.map((recipe) => recipe.id));
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
