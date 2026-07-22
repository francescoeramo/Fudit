import {
  MealPlan,
  PlanRetention,
  Preferences,
  PriceItem,
  Recipe,
  ShoppingItem,
} from "./types";

export const STORAGE_KEY = "fudit:data";
export const STORAGE_VERSION = 5;
export const MAX_STORED_BYTES = 4_500_000;

export interface AppStorageData {
  prefs: Preferences;
  dark: boolean;
  catalog: PriceItem[];
  dietRecipes: Recipe[];
  plans: MealPlan[];
  activePlanId: string;
  shoppingByPlan: Record<string, ShoppingItem[]>;
  retention: PlanRetention;
}

export interface StorageEnvelope {
  app: "Fudit";
  version: number;
  savedAt: string;
  data: AppStorageData;
}

export type StorageResult =
  { ok: true; bytes: number } | { ok: false; error: string; bytes?: number };

const serializedBytes = (value: string) => new Blob([value]).size;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readLegacy = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const copyPreferences = (prefs: Preferences): Preferences => ({
  ...prefs,
  meals: [...prefs.meals],
  styles: [...prefs.styles],
  allergies: [...prefs.allergies],
});

const safeHttpsUrl = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
};

const migratePrice = (item: PriceItem): PriceItem => ({
  ...item,
  packageQuantity:
    Number.isFinite(item.packageQuantity) && Number(item.packageQuantity) > 0
      ? Number(item.packageQuantity)
      : item.per,
  packageQuantities:
    item.packageQuantities && typeof item.packageQuantities === "object"
      ? item.packageQuantities
      : {},
  priceUpdatedAt:
    item.priceUpdatedAt && typeof item.priceUpdatedAt === "object"
      ? item.priceUpdatedAt
      : {},
  priceSources: item.priceSources
    ? Object.fromEntries(
        Object.entries(item.priceSources).map(([store, source]) => [
          store,
          source
            ? {
                ...source,
                label:
                  typeof source.label === "string"
                    ? source.label.slice(0, 240)
                    : undefined,
                sourceUrl: safeHttpsUrl(source.sourceUrl),
              }
            : source,
        ]),
      )
    : {},
});

const migratePlan = (plan: MealPlan, prefs: Preferences): MealPlan => ({
  ...plan,
  meals: plan.meals
    .filter(
      (meal) =>
        isRecord(meal) &&
        Number.isInteger(meal.day) &&
        Number(meal.day) >= 0 &&
        Number(meal.day) <= 6 &&
        typeof meal.slot === "string" &&
        typeof meal.recipeId === "string" &&
        Number.isFinite(meal.cost),
    )
    .map((meal) => ({
      ...meal,
      regenerationHistory: Array.isArray(meal.regenerationHistory)
        ? meal.regenerationHistory
            .filter((id): id is string => typeof id === "string")
            .slice(-100)
        : undefined,
    })),
  source: plan.source ?? "generated",
  preferences:
    plan.preferences ??
    (plan.source === "diet-pdf"
      ? undefined
      : copyPreferences({
          ...prefs,
          store: plan.store ?? prefs.store,
          people: plan.people ?? prefs.people,
          budget: plan.budget ?? prefs.budget,
        })),
});

const normalizeData = (
  candidate: Partial<AppStorageData> | undefined,
  defaults: AppStorageData,
): AppStorageData => {
  const prefs =
    candidate?.prefs && typeof candidate.prefs === "object"
      ? { ...defaults.prefs, ...candidate.prefs }
      : defaults.prefs;
  const normalizedPrefs = copyPreferences({
    ...prefs,
    meals: Array.isArray(prefs.meals) ? prefs.meals : defaults.prefs.meals,
    styles: Array.isArray(prefs.styles) ? prefs.styles : defaults.prefs.styles,
    allergies: Array.isArray(prefs.allergies)
      ? prefs.allergies
      : defaults.prefs.allergies,
  });
  const plans = Array.isArray(candidate?.plans)
    ? candidate.plans
        .filter(
          (plan) =>
            isRecord(plan) &&
            typeof plan.id === "string" &&
            typeof plan.createdAt === "string" &&
            Array.isArray(plan.meals),
        )
        .map((plan) =>
          migratePlan(plan as unknown as MealPlan, normalizedPrefs),
        )
    : defaults.plans;
  const catalog = Array.isArray(candidate?.catalog)
    ? candidate.catalog
        .filter(
          (item) =>
            isRecord(item) &&
            typeof item.id === "string" &&
            typeof item.name === "string" &&
            isRecord(item.stores) &&
            Number.isFinite(item.per),
        )
        .map((item) => migratePrice(item as unknown as PriceItem))
    : defaults.catalog.map(migratePrice);
  const shoppingByPlan = isRecord(candidate?.shoppingByPlan)
    ? Object.fromEntries(
        Object.entries(candidate.shoppingByPlan).filter(([, items]) =>
          Array.isArray(items),
        ),
      )
    : defaults.shoppingByPlan;
  const retentionValue = candidate?.retention;
  return {
    prefs: normalizedPrefs,
    dark: typeof candidate?.dark === "boolean" ? candidate.dark : defaults.dark,
    catalog,
    dietRecipes: Array.isArray(candidate?.dietRecipes)
      ? candidate.dietRecipes
      : defaults.dietRecipes,
    plans,
    activePlanId:
      typeof candidate?.activePlanId === "string"
        ? candidate.activePlanId
        : defaults.activePlanId,
    shoppingByPlan: shoppingByPlan as Record<string, ShoppingItem[]>,
    retention:
      retentionValue === "never" ||
      [7, 15, 30, 60].includes(Number(retentionValue))
        ? retentionValue === "never"
          ? "never"
          : (Number(retentionValue) as PlanRetention)
        : defaults.retention,
  };
};

const migrateEnvelope = (
  value: unknown,
  defaults: AppStorageData,
): StorageEnvelope => {
  if (!value || typeof value !== "object")
    throw new Error("Il file non contiene un backup Fudit valido.");
  const envelope = value as Partial<StorageEnvelope>;
  if (envelope.app !== "Fudit" || !Number.isInteger(envelope.version))
    throw new Error("Il file non contiene un backup Fudit valido.");
  if (Number(envelope.version) > STORAGE_VERSION)
    throw new Error(
      "Il backup proviene da una versione più recente di Fudit. Aggiorna l’app prima di importarlo.",
    );

  // V2 aggiunge metadati e preferenze; V3 la provenienza; V4 le confezioni;
  // V5 conserva la cronologia di rigenerazione e bonifica gli URL importati.
  if (![1, 2, 3, 4, 5].includes(Number(envelope.version)))
    throw new Error("Questa versione del backup non è più supportata.");
  return {
    app: "Fudit",
    version: STORAGE_VERSION,
    savedAt:
      typeof envelope.savedAt === "string"
        ? envelope.savedAt
        : new Date().toISOString(),
    data: normalizeData(envelope.data, defaults),
  };
};

const legacyData = (defaults: AppStorageData): AppStorageData => {
  const legacyPlan = readLegacy<MealPlan | null>("fudit:plan", null);
  const legacySaved = readLegacy<MealPlan[]>("fudit:saved", []);
  const storedPlans = readLegacy<MealPlan[]>("fudit:plans", []);
  const shoppingByPlan = readLegacy<Record<string, ShoppingItem[]>>(
    "fudit:shopping-by-plan",
    defaults.shoppingByPlan,
  );
  const legacyShopping = readLegacy<ShoppingItem[]>("fudit:shopping", []);
  if (
    legacyPlan &&
    legacyShopping.length &&
    !Array.isArray(shoppingByPlan[legacyPlan.id])
  )
    shoppingByPlan[legacyPlan.id] = legacyShopping;
  return normalizeData(
    {
      prefs: readLegacy("fudit:prefs", defaults.prefs),
      dark: readLegacy("fudit:dark", defaults.dark),
      catalog: readLegacy("fudit:catalog", defaults.catalog),
      dietRecipes: readLegacy("fudit:diet-recipes", defaults.dietRecipes),
      plans: storedPlans.length
        ? storedPlans
        : [legacyPlan, ...legacySaved].filter(
            (plan): plan is MealPlan => plan !== null,
          ),
      activePlanId: readLegacy("fudit:active-plan", defaults.activePlanId),
      shoppingByPlan,
      retention: readLegacy("fudit:plan-retention", defaults.retention),
    },
    defaults,
  );
};

export const loadAppStorage = (
  defaults: AppStorageData,
): { data: AppStorageData; migrated: boolean; error?: string } => {
  if (typeof window === "undefined") return { data: defaults, migrated: false };
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return {
      data: normalizeData(defaults, defaults),
      migrated: false,
      error:
        "Il browser ha bloccato l’accesso ai dati locali. Le modifiche resteranno disponibili solo fino alla chiusura della pagina.",
    };
  }
  if (!raw) {
    const hasLegacyData = Object.keys(localStorage).some((key) =>
      key.startsWith("fudit:"),
    );
    return {
      data: hasLegacyData
        ? legacyData(defaults)
        : normalizeData(defaults, defaults),
      migrated: hasLegacyData,
    };
  }
  if (serializedBytes(raw) > MAX_STORED_BYTES)
    return {
      data: normalizeData(defaults, defaults),
      migrated: false,
      error:
        "I dati salvati superano il limite supportato e non sono stati caricati.",
    };
  try {
    const parsed = JSON.parse(raw) as StorageEnvelope;
    const migrated = migrateEnvelope(parsed, defaults);
    return {
      data: migrated.data,
      migrated: parsed.version !== STORAGE_VERSION,
    };
  } catch (reason) {
    return {
      data: normalizeData(defaults, defaults),
      migrated: false,
      error:
        reason instanceof Error
          ? `Dati locali non leggibili: ${reason.message}`
          : "I dati locali non sono leggibili.",
    };
  }
};

export const saveAppStorage = (data: AppStorageData): StorageResult => {
  try {
    const raw = JSON.stringify({
      app: "Fudit",
      version: STORAGE_VERSION,
      savedAt: new Date().toISOString(),
      data: normalizeData(data, data),
    } satisfies StorageEnvelope);
    const bytes = serializedBytes(raw);
    if (bytes > MAX_STORED_BYTES)
      return {
        ok: false,
        bytes,
        error: `Salvataggio non riuscito: i dati occupano ${(bytes / 1_000_000).toFixed(1)} MB e superano il limite di ${(MAX_STORED_BYTES / 1_000_000).toFixed(1)} MB. Esporta un backup e rimuovi i piani meno recenti.`,
      };
    localStorage.setItem(STORAGE_KEY, raw);
    return { ok: true, bytes };
  } catch (reason) {
    const quota =
      reason instanceof DOMException &&
      ["QuotaExceededError", "NS_ERROR_DOM_QUOTA_REACHED"].includes(
        reason.name,
      );
    return {
      ok: false,
      error: quota
        ? "Spazio del browser esaurito: le ultime modifiche non sono state salvate. Esporta un backup e libera alcuni dati."
        : "Il browser ha bloccato il salvataggio locale. Controlla le impostazioni di privacy.",
    };
  }
};

export const createBackup = (data: AppStorageData) =>
  JSON.stringify(
    {
      app: "Fudit",
      version: STORAGE_VERSION,
      savedAt: new Date().toISOString(),
      data: normalizeData(data, data),
    } satisfies StorageEnvelope,
    null,
    2,
  );

export const parseBackup = (text: string, defaults: AppStorageData) => {
  if (serializedBytes(text) > MAX_STORED_BYTES)
    throw new Error("Il backup supera il limite di 4,5 MB.");
  try {
    return migrateEnvelope(JSON.parse(text), defaults).data;
  } catch (reason) {
    if (reason instanceof SyntaxError)
      throw new Error("Il file non contiene JSON valido.");
    throw reason;
  }
};

export const clearAppStorage = () => {
  try {
    const keys = Object.keys(localStorage).filter((key) =>
      key.startsWith("fudit:"),
    );
    keys.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Il reset dello stato React continua anche se il browser blocca lo storage.
  }
};
