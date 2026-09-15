import { describe, expect, it } from "vitest";
import { getQuickIngredients, suggestRecipes } from "./ideas";
import { recipes, seedPrices } from "./seed";
import { Recipe } from "./types";

const recipe = (
  id: string,
  ingredientNames: string[],
  overrides: Partial<Recipe> = {},
): Recipe => ({
  id,
  title: id,
  time: 20,
  difficulty: "Facile",
  ingredients: ingredientNames.map((name) => ({
    id: name.toLocaleLowerCase("it"),
    name,
    unit: "g",
    quantity: 100,
    category: "Dispensa",
    allergens: [],
  })),
  steps: ["Prepara."],
  nutrition: { calories: 100, protein: 5, carbs: 10, fat: 2 },
  tags: ["veloci"],
  allergens: [],
  baseServings: 2,
  course: "Primo",
  ...overrides,
});

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
    expect(quickIngredients.map((item) => item.id)).toEqual(
      expect.arrayContaining(["pasta", "riso"]),
    );
    expect(
      quickIngredients
        .filter((item) => item.id === "pasta" || item.id === "riso")
        .map((item) => item.name),
    ).toEqual(["Pasta", "Riso"]);
    expect(
      recipes
        .flatMap((item) => item.ingredients)
        .filter(
          (ingredient) => ingredient.id === "pasta" || ingredient.id === "riso",
        )
        .every((ingredient) =>
          ingredient.id === "pasta"
            ? ingredient.name === "Pasta"
            : ingredient.name === "Riso",
        ),
    ).toBe(true);
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

  it("ammette almeno un ingrediente e ordina per copertura", () => {
    const candidates = [
      recipe("uno", ["Pasta"]),
      recipe("due", ["Pasta", "Riso"]),
      recipe("nessuno", ["Uova"]),
    ];
    const matches = suggestRecipes(candidates, ["pasta", "riso"], ["Primo"]);
    expect(matches.map(({ id }) => id)).toEqual(["due", "uno"]);
  });

  it("applica portata, stile e allergie come filtri obbligatori", () => {
    const candidates = [
      recipe("valida", ["Riso"], { tags: ["vegani"] }),
      recipe("stile-errato", ["Riso"], { tags: ["veloci"] }),
      recipe("portata-errata", ["Riso"], {
        tags: ["vegani"],
        course: "Dolce",
      }),
      recipe("allergene", ["Riso"], {
        tags: ["vegani"],
        allergens: ["soia"],
      }),
    ];
    expect(
      suggestRecipes(candidates, ["riso"], ["Primo"], ["vegani"], ["soia"]).map(
        ({ id }) => id,
      ),
    ).toEqual(["valida"]);
  });

  it("normalizza accenti e maiuscole ed elimina ID duplicati", () => {
    const candidates = [recipe("riso", ["RÍSO"]), recipe("riso", ["RÍSO"])];
    expect(
      suggestRecipes(candidates, ["ríSo"], []).map(({ id }) => id),
    ).toEqual(["riso"]);
  });

  it("con selezione vuota restituisce ricette uniche compatibili", () => {
    const first = recipe("prima", ["Pasta"]);
    expect(suggestRecipes([first, first], [], []).map(({ id }) => id)).toEqual([
      "prima",
    ]);
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
