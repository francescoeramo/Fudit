import { describe, expect, it } from "vitest";
import { buildDietPlan, parseDietText } from "./diet";
import { seedPrices } from "./seed";

describe("importazione dieta", () => {
  it("estrae giorni, pasti, alimenti e unità dal testo", () => {
    const meals = parseDietText(`
      Lunedì pranzo: pasta 80 g, pomodori 120 g
      Lunedì cena: 200 g pollo; zucchine 150 g
      Martedì colazione: 200 ml latte, avena 40 g
    `);
    expect(meals).toHaveLength(3);
    expect(meals[0]).toMatchObject({ day: 0, slot: "pranzo" });
    expect(meals[0].ingredients).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "pasta", quantity: 80, unit: "g" }),
        expect.objectContaining({
          name: "pomodori",
          quantity: 120,
          unit: "g",
        }),
      ]),
    );
    expect(meals[2]).toMatchObject({ day: 1, slot: "colazione" });
  });

  it("crea piano, ricette, spesa e stime per il negozio scelto", () => {
    const meals = parseDietText(`
      Lunedì pranzo: pasta 80 g, pomodori 120 g
      Lunedì cena: alimento speciale 100 g
    `);
    let id = 0;
    const built = buildDietPlan({
      meals,
      catalog: seedPrices,
      store: "MD",
      people: 2,
      budget: 50,
      fileName: "dieta-settimanale.pdf",
      now: new Date("2026-07-15T10:00:00Z"),
      idFactory: () => `id-${++id}`,
    });
    expect(built.plan).toMatchObject({
      store: "MD",
      people: 2,
      source: "diet-pdf",
      name: "dieta-settimanale",
    });
    expect(built.plan.meals).toHaveLength(2);
    expect(built.plan.meals.every((meal) => meal.cost > 0)).toBe(true);
    expect(built.plan.total).toBeGreaterThan(0);
    expect(built.recipes).toHaveLength(2);
    expect(built.shopping.length).toBeGreaterThan(0);
    expect(built.newPrices).toHaveLength(1);
  });
});
