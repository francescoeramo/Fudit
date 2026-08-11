import { stores } from "./config";
import {
  mergeRetailerPrices,
  normalizeRetailerPrice,
  RetailerRemotePrice,
} from "./retailer-prices";
import { PriceItem, Store } from "./types";

export const flyerStores = stores.filter(
  (store): store is Exclude<Store, "Altro"> => store !== "Altro",
);

export interface FlyerStoreStatus {
  store: Exclude<Store, "Altro">;
  ok: boolean;
  sourceUrl: string;
  sourceArea: string;
  productsFound: number;
  productsMapped: number;
  error?: string;
}

export interface FlyerPriceDataset {
  version: 1;
  generatedAt: string;
  prices: Array<RetailerRemotePrice & { store: Exclude<Store, "Altro"> }>;
  stores: FlyerStoreStatus[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const isFlyerStore = (value: unknown): value is Exclude<Store, "Altro"> =>
  typeof value === "string" &&
  flyerStores.includes(value as Exclude<Store, "Altro">);

export function normalizeFlyerDataset(value: unknown): FlyerPriceDataset {
  if (!isRecord(value) || value.version !== 1)
    throw new Error("Archivio volantini non valido");
  const generatedAt =
    typeof value.generatedAt === "string" &&
    Number.isFinite(Date.parse(value.generatedAt))
      ? value.generatedAt
      : null;
  if (
    !generatedAt ||
    !Array.isArray(value.prices) ||
    !Array.isArray(value.stores)
  )
    throw new Error("Archivio volantini incompleto");

  const prices = value.prices.flatMap((entry) => {
    if (!isRecord(entry) || !isFlyerStore(entry.store)) return [];
    const normalized = normalizeRetailerPrice(entry);
    return normalized ? [{ ...normalized, store: entry.store }] : [];
  });
  const statuses = value.stores.flatMap((entry) => {
    if (!isRecord(entry) || !isFlyerStore(entry.store)) return [];
    const sourceUrl =
      typeof entry.sourceUrl === "string" ? entry.sourceUrl : "";
    const sourceArea =
      typeof entry.sourceArea === "string" ? entry.sourceArea : "";
    let https = false;
    try {
      https = new URL(sourceUrl).protocol === "https:";
    } catch {
      https = false;
    }
    if (!https || !sourceArea) return [];
    return [
      {
        store: entry.store,
        ok: entry.ok === true,
        sourceUrl,
        sourceArea: sourceArea.slice(0, 180),
        productsFound: Math.max(0, Number(entry.productsFound) || 0),
        productsMapped: Math.max(0, Number(entry.productsMapped) || 0),
        error:
          typeof entry.error === "string" && entry.error.trim()
            ? entry.error.trim().slice(0, 240)
            : undefined,
      },
    ];
  });

  return { version: 1, generatedAt, prices, stores: statuses };
}

export async function fetchFlyerPrices(
  signal?: AbortSignal,
): Promise<FlyerPriceDataset> {
  const response = await fetch("/flyer-prices.json", {
    signal,
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error(`Archivio volantini: HTTP ${response.status}`);
  return normalizeFlyerDataset(await response.json());
}

export function mergeFlyerPrices(
  catalog: PriceItem[],
  dataset?: FlyerPriceDataset,
  now = new Date(),
) {
  return flyerStores.reduce(
    (current, store) =>
      mergeRetailerPrices(
        current,
        dataset?.prices.filter((price) => price.store === store) ?? [],
        store,
        now,
      ),
    catalog,
  );
}
