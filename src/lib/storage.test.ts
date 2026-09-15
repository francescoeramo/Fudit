// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { seedPrices } from "./seed";
import {
  AppStorageData,
  createBackup,
  loadAppStorage,
  parseBackup,
  saveAppStorage,
  STORAGE_KEY,
  STORAGE_VERSION,
} from "./storage";

const defaults = (): AppStorageData => ({
  prefs: {
    store: "Lidl",
    budget: 50,
    people: 2,
    meals: ["cena"],
    styles: ["economici"],
    allergies: [],
  },
  dark: false,
  catalog: seedPrices,
  dietRecipes: [],
  plans: [],
  activePlanId: "",
  shoppingByPlan: {},
  retention: "never",
});

beforeEach(() => localStorage.clear());

describe("storage Fudit versionato", () => {
  it("salva e ripristina un backup v3", () => {
    const data = defaults();
    data.prefs.budget = 73;
    expect(saveAppStorage(data).ok).toBe(true);
    expect(loadAppStorage(defaults()).data.prefs.budget).toBe(73);
    const parsed = parseBackup(createBackup(data), defaults());
    expect(parsed.prefs.budget).toBe(73);
  });

  it("migra un backup v1 aggiungendo confezione e preferenze al piano", () => {
    const data = defaults();
    data.plans = [
      {
        id: "piano-1",
        createdAt: "2026-07-22T10:00:00.000Z",
        meals: [],
        total: 10,
        overBudget: false,
        store: "Lidl",
        people: 2,
        budget: 50,
      },
    ];
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ app: "Fudit", version: 1, savedAt: "", data }),
    );
    const loaded = loadAppStorage(defaults());
    expect(loaded.migrated).toBe(true);
    expect(loaded.data.catalog[0].packageQuantity).toBe(
      loaded.data.catalog[0].per,
    );
    expect(loaded.data.plans[0].preferences?.store).toBe("Lidl");
    expect(STORAGE_VERSION).toBe(6);
  });

  it("rifiuta backup futuri senza toccare i dati correnti", () => {
    expect(() =>
      parseBackup(
        JSON.stringify({ app: "Fudit", version: 99, data: defaults() }),
        defaults(),
      ),
    ).toThrow(/versione più recente/);
  });

  it("normalizza Pasta e Riso nelle ricette alimentari salvate", () => {
    const data = defaults();
    data.dietRecipes = [
      {
        id: "piano-importato",
        title: "Pranzo",
        time: 20,
        difficulty: "Facile",
        ingredients: [
          {
            id: "pasta-integrale-importata",
            name: "Pasta integrale",
            quantity: 80,
            unit: "g",
            category: "Dispensa",
          },
          {
            id: "riso-basmati-importato",
            name: "Riso basmati",
            quantity: 80,
            unit: "g",
            category: "Dispensa",
          },
        ],
        steps: [],
        nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        tags: ["economici"],
        allergens: [],
        baseServings: 1,
        origin: "diet-pdf",
      },
    ];
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        app: "Fudit",
        version: STORAGE_VERSION,
        savedAt: "",
        data,
      }),
    );

    const [pasta, riso] =
      loadAppStorage(defaults()).data.dietRecipes[0].ingredients;
    expect(pasta.name).toBe("Pasta");
    expect(riso.name).toBe("Riso");
  });
});
