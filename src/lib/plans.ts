import { MealPlan, PlanRetention } from "./types";

const DAY_MS = 86_400_000;

export const uniquePlans = (plans: MealPlan[]): MealPlan[] => {
  const seen = new Set<string>();
  return plans.filter((plan) => {
    if (
      !plan ||
      typeof plan.id !== "string" ||
      typeof plan.createdAt !== "string" ||
      !Array.isArray(plan.meals) ||
      !Number.isFinite(plan.total) ||
      seen.has(plan.id)
    )
      return false;
    seen.add(plan.id);
    return true;
  });
};

export const prunePlans = (
  plans: MealPlan[],
  retention: PlanRetention,
  now = new Date(),
): MealPlan[] => {
  const unique = uniquePlans(plans);
  if (retention === "never") return unique;
  const cutoff = now.getTime() - retention * DAY_MS;
  return unique.filter((plan) => {
    const createdAt = new Date(plan.createdAt).getTime();
    return Number.isFinite(createdAt) && createdAt >= cutoff;
  });
};

export const planDateLabel = (plan: MealPlan): string =>
  Number.isFinite(new Date(plan.createdAt).getTime())
    ? new Intl.DateTimeFormat("it-IT", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(plan.createdAt))
    : "Data non disponibile";

export const normalizeRetention = (value: unknown): PlanRetention =>
  value === "never" || [7, 15, 30, 60].includes(Number(value))
    ? value === "never"
      ? "never"
      : (Number(value) as PlanRetention)
    : "never";
