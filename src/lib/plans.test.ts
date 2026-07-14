import { describe, expect, it } from "vitest";
import { prunePlans, uniquePlans } from "./plans";
import { MealPlan } from "./types";

const plan = (id: string, createdAt: string): MealPlan => ({
  id,
  createdAt,
  meals: [],
  total: 0,
  overBudget: false,
});

describe("archivio piani", () => {
  it("mantiene piani distinti senza sovrascriverli", () => {
    expect(
      uniquePlans([
        plan("a", "2026-07-14T10:00:00Z"),
        plan("b", "2026-07-14T11:00:00Z"),
        plan("a", "2026-07-14T10:00:00Z"),
      ]).map((item) => item.id),
    ).toEqual(["a", "b"]);
  });

  it("elimina solo i piani oltre la durata scelta", () => {
    const plans = [
      plan("recente", "2026-07-10T12:00:00Z"),
      plan("vecchio", "2026-06-20T12:00:00Z"),
    ];
    expect(
      prunePlans(plans, 15, new Date("2026-07-14T12:00:00Z")),
    ).toHaveLength(1);
    expect(prunePlans(plans, "never")).toHaveLength(2);
  });
});
