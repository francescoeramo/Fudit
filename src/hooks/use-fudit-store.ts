"use client";

import { Dispatch, SetStateAction, useEffect, useReducer, useRef } from "react";
import {
  aggregateShopping,
  priceFor,
  priceStatusFor,
  recipeCost,
  roundMoney,
} from "@/lib/calculations";
import { defaultPreferences } from "@/lib/config";
import { prunePlans, uniquePlans, normalizeRetention } from "@/lib/plans";
import { recipes, seedPrices } from "@/lib/seed";
import { AppStorageData, loadAppStorage, saveAppStorage } from "@/lib/storage";
import {
  MealPlan,
  PlanRetention,
  Preferences,
  PriceItem,
  Recipe,
  ShoppingItem,
} from "@/lib/types";

export type AppTab =
  "plan" | "shop" | "recipes" | "diet" | "prices" | "settings";

interface FuditState extends AppStorageData {
  tab: AppTab;
  ready: boolean;
  notice: string;
  storageError: string;
  generationStatus: "idle" | "generating" | "success" | "error";
}

type SetAction = {
  type: "set";
  key: keyof FuditState;
  value: SetStateAction<FuditState[keyof FuditState]>;
};

type Action =
  | SetAction
  | { type: "hydrate"; data: AppStorageData; error?: string }
  | { type: "prune"; retention: PlanRetention }
  | { type: "reprice-plans" }
  | { type: "reprice-shopping" };

const defaults = (): AppStorageData => ({
  prefs: defaultPreferences,
  dark: false,
  catalog: seedPrices,
  dietRecipes: [],
  plans: [],
  activePlanId: "",
  shoppingByPlan: {},
  retention: "never",
});

const mergeCatalogWithSeeds = (stored: PriceItem[]): PriceItem[] => [
  ...seedPrices.map((seed) => {
    const saved = stored.find((item) => item.id === seed.id);
    return {
      ...seed,
      ...saved,
      stores: { ...seed.stores, ...saved?.stores },
      packageQuantity: saved?.packageQuantity ?? seed.per,
    };
  }),
  ...stored.filter((item) => !seedPrices.some((seed) => seed.id === item.id)),
];

const hydrate = (data: AppStorageData): AppStorageData => {
  const catalog = mergeCatalogWithSeeds(data.catalog);
  const dietRecipes = data.dietRecipes.filter(
    (recipe) =>
      recipe &&
      typeof recipe.id === "string" &&
      Array.isArray(recipe.ingredients) &&
      Array.isArray(recipe.steps),
  );
  const availableRecipes = [...dietRecipes, ...recipes];
  const retention = normalizeRetention(data.retention);
  const plans = prunePlans(uniquePlans(data.plans), retention);
  const shoppingByPlan = { ...data.shoppingByPlan };
  plans.forEach((plan) => {
    if (!Array.isArray(shoppingByPlan[plan.id])) {
      shoppingByPlan[plan.id] = aggregateShopping(
        plan.meals
          .map((meal) =>
            availableRecipes.find((recipe) => recipe.id === meal.recipeId),
          )
          .filter((recipe) => recipe !== undefined),
        catalog,
        plan.store ?? data.prefs.store,
        plan.people ?? data.prefs.people,
      );
    }
  });
  return {
    ...data,
    catalog,
    dietRecipes,
    plans,
    shoppingByPlan,
    retention,
    activePlanId: plans.some((plan) => plan.id === data.activePlanId)
      ? data.activePlanId
      : (plans[0]?.id ?? ""),
  };
};

const initialState: FuditState = {
  ...defaults(),
  tab: "plan",
  ready: false,
  notice: "",
  storageError: "",
  generationStatus: "idle",
};

const reducer = (state: FuditState, action: Action): FuditState => {
  if (action.type === "set") {
    const current = state[action.key];
    const value =
      typeof action.value === "function"
        ? (action.value as (previous: typeof current) => typeof current)(
            current,
          )
        : action.value;
    return { ...state, [action.key]: value };
  }
  if (action.type === "hydrate")
    return {
      ...state,
      ...hydrate(action.data),
      ready: true,
      storageError: action.error ?? "",
    };
  if (action.type === "prune") {
    const plans = prunePlans(state.plans, action.retention);
    const ids = new Set(plans.map((plan) => plan.id));
    return {
      ...state,
      plans,
      activePlanId: ids.has(state.activePlanId)
        ? state.activePlanId
        : (plans[0]?.id ?? ""),
      shoppingByPlan: Object.fromEntries(
        Object.entries(state.shoppingByPlan).filter(([id]) => ids.has(id)),
      ),
    };
  }
  if (action.type === "reprice-plans") {
    const availableRecipes = [...state.dietRecipes, ...recipes];
    const plans = state.plans.map((plan) => {
      const store = plan.store ?? defaultPreferences.store;
      const people = plan.people ?? defaultPreferences.people;
      const date = new Date(plan.weekKey ?? plan.createdAt);
      const meals = plan.meals.map((meal) => {
        const recipe = availableRecipes.find(
          (item) => item.id === meal.recipeId,
        );
        return recipe
          ? {
              ...meal,
              cost: recipeCost(recipe, state.catalog, store, people, date),
            }
          : meal;
      });
      const total = roundMoney(meals.reduce((sum, meal) => sum + meal.cost, 0));
      return {
        ...plan,
        meals,
        total,
        overBudget: total > (plan.budget ?? defaultPreferences.budget),
      };
    });
    return { ...state, plans };
  }
  const shoppingByPlan = Object.fromEntries(
    Object.entries(state.shoppingByPlan).map(([planId, items]) => {
      const plan = state.plans.find((item) => item.id === planId);
      const store = plan?.store ?? defaultPreferences.store;
      return [
        planId,
        items.map((item) => {
          if (item.manual) return item;
          const catalogItem = state.catalog.find(
            (price) => price.id === item.id,
          );
          return {
            ...item,
            estimatedCost: priceFor(item, state.catalog, store),
            priceStatus: priceStatusFor(catalogItem, store),
            priceUpdatedAt: catalogItem?.priceUpdatedAt?.[store],
          };
        }),
      ];
    }),
  );
  return { ...state, shoppingByPlan };
};

export function useFuditStore() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const hydrated = useRef(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const loaded = loadAppStorage(defaults());
      hydrated.current = true;
      dispatch({ type: "hydrate", data: loaded.data, error: loaded.error });
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!state.ready || !hydrated.current) return;
    const result = saveAppStorage({
      prefs: state.prefs,
      dark: state.dark,
      catalog: state.catalog,
      dietRecipes: state.dietRecipes,
      plans: state.plans,
      activePlanId: state.activePlanId,
      shoppingByPlan: state.shoppingByPlan,
      retention: state.retention,
    });
    queueMicrotask(() =>
      dispatch({
        type: "set",
        key: "storageError",
        value: result.ok ? "" : result.error,
      }),
    );
  }, [
    state.activePlanId,
    state.catalog,
    state.dark,
    state.dietRecipes,
    state.plans,
    state.prefs,
    state.ready,
    state.retention,
    state.shoppingByPlan,
  ]);

  useEffect(() => {
    if (!state.ready || state.retention === "never") return;
    const interval = window.setInterval(
      () => dispatch({ type: "prune", retention: state.retention }),
      3_600_000,
    );
    return () => window.clearInterval(interval);
  }, [state.ready, state.retention]);

  useEffect(() => {
    if (!state.ready) return;
    queueMicrotask(() => dispatch({ type: "reprice-plans" }));
  }, [state.catalog, state.dietRecipes, state.ready]);

  useEffect(() => {
    if (!state.ready) return;
    queueMicrotask(() => dispatch({ type: "reprice-shopping" }));
  }, [state.catalog, state.plans, state.ready]);

  const setter =
    <K extends keyof FuditState>(
      key: K,
    ): Dispatch<SetStateAction<FuditState[K]>> =>
    (value) =>
      dispatch({ type: "set", key, value } as SetAction);

  return {
    ...state,
    setTab: setter("tab"),
    setDark: setter("dark"),
    setPrefs: setter("prefs"),
    setCatalog: setter("catalog"),
    setDietRecipes: setter("dietRecipes"),
    setPlans: setter("plans"),
    setActivePlanId: setter("activePlanId"),
    setShoppingByPlan: setter("shoppingByPlan"),
    setRetention: setter("retention"),
    setNotice: setter("notice"),
    setStorageError: setter("storageError"),
    setGenerationStatus: setter("generationStatus"),
    storageDefaults: defaults,
    applyStoredData: (data: AppStorageData) =>
      dispatch({ type: "hydrate", data }),
  };
}

export type FuditStore = ReturnType<typeof useFuditStore>;
