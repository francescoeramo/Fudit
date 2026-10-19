import { describe, expect, it } from "vitest";
import { catalogIdFor } from "./lib/catalog-matching.mjs";

describe("abbinamenti alimenti base", () => {
  it.each([
    "Pasta di salsiccia XXL",
    "Nuggets di pollo",
    "Tortellini ricotta e spinaci",
    "Crema dark senza zucchero",
    "Zucca Trolli Halloween Casa del Dolce",
    "Mais olio",
    "Ceci e vongole",
    "Patè di olive taggiasche",
    "Pesto peperoni e noci",
  ])("scarta %s", (name) => {
    expect(catalogIdFor(name)).toBeNull();
  });
  it.each([
    ["PASTA DI SEMOLA COOP", "pasta"],
    ["Latte di cocco classico", "latte-cocco"],
    ["Funghi champignon", "funghi"],
    ["RISO ARBORIO", "riso"],
  ])("riconosce %s", (name, id) => {
    expect(catalogIdFor(name)).toBe(id);
  });
});
