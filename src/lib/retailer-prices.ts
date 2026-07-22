import { PriceItem, Store } from "./types";

export interface RetailerRemotePrice {
  catalog_id: string;
  name: string;
  package_quantity: number;
  package_unit: "g" | "ml" | "pz";
  price: number;
  reference_price: number | null;
  is_promotion: boolean;
  valid_from: string | null;
  valid_to: string | null;
  captured_at: string;
  source_url: string;
  source_label: string;
  source_area: string;
}

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://oaazqgfeawpwkgmcykgg.supabase.co";
const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable_g-oa0MClSRkAXDnDTq2ZDQ_i8FMVGnW";

const fields = [
  "catalog_id",
  "name",
  "package_quantity",
  "package_unit",
  "price",
  "reference_price",
  "is_promotion",
  "valid_from",
  "valid_to",
  "captured_at",
  "source_url",
  "source_label",
  "source_area",
].join(",");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const textField = (value: unknown, maximum = 240) =>
  typeof value === "string" && value.trim()
    ? value.trim().slice(0, maximum)
    : null;

const dateField = (value: unknown) =>
  value === null || value === undefined
    ? null
    : typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? value
      : null;

export const normalizeRetailerPrice = (
  value: unknown,
): RetailerRemotePrice | null => {
  if (!isRecord(value)) return null;
  const catalogId = textField(value.catalog_id, 80);
  const name = textField(value.name, 180);
  const packageQuantity = Number(value.package_quantity);
  const packageUnit = value.package_unit;
  const price = Number(value.price);
  const referencePrice =
    value.reference_price === null ? null : Number(value.reference_price);
  const capturedAt = textField(value.captured_at, 40);
  const sourceUrl = textField(value.source_url, 500);
  const sourceLabel = textField(value.source_label, 180);
  const sourceArea = textField(value.source_area, 180);
  let validSourceUrl = false;
  try {
    validSourceUrl = Boolean(
      sourceUrl && new URL(sourceUrl).protocol === "https:",
    );
  } catch {
    validSourceUrl = false;
  }
  if (
    !catalogId ||
    !name ||
    !["g", "ml", "pz"].includes(String(packageUnit)) ||
    !Number.isFinite(packageQuantity) ||
    packageQuantity <= 0 ||
    !Number.isFinite(price) ||
    price <= 0 ||
    (referencePrice !== null &&
      (!Number.isFinite(referencePrice) || referencePrice <= 0)) ||
    !capturedAt ||
    !Number.isFinite(Date.parse(capturedAt)) ||
    !validSourceUrl ||
    !sourceLabel ||
    !sourceArea
  )
    return null;
  return {
    catalog_id: catalogId,
    name,
    package_quantity: packageQuantity,
    package_unit: packageUnit as RetailerRemotePrice["package_unit"],
    price,
    reference_price: referencePrice,
    is_promotion: value.is_promotion === true,
    valid_from: dateField(value.valid_from),
    valid_to: dateField(value.valid_to),
    captured_at: capturedAt,
    source_url: sourceUrl!,
    source_label: sourceLabel,
    source_area: sourceArea,
  };
};

export async function fetchRetailerPrices(
  table: "md_products" | "despar_products",
  signal?: AbortSignal,
): Promise<RetailerRemotePrice[]> {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/${table}?select=${fields}&catalog_id=not.is.null&active=eq.true`,
    {
      signal,
      headers: { apikey: publishableKey },
      cache: "no-store",
    },
  );
  if (!response.ok)
    throw new Error(`Supabase ha risposto con HTTP ${response.status}`);
  const body = (await response.json()) as unknown;
  if (!Array.isArray(body)) throw new Error("Catalogo prezzi non valido");
  return body
    .map(normalizeRetailerPrice)
    .filter((price): price is RetailerRemotePrice => price !== null);
}

const isCurrentlyValid = (
  price: RetailerRemotePrice,
  today: string,
  freshAfter: number,
) =>
  (!price.valid_from || price.valid_from <= today) &&
  (!price.valid_to || price.valid_to >= today) &&
  (Boolean(price.valid_to) || Date.parse(price.captured_at) >= freshAfter);

const localPriceHasPriority = (item: PriceItem, store: Store) => {
  const source = item.priceSources?.[store];
  if (source && source.kind !== "seed" && source.kind !== "scraped")
    return true;
  return (
    !source &&
    Boolean(item.confirmedStores?.[store] && item.priceUpdatedAt?.[store])
  );
};

export function mergeRetailerPrices(
  catalog: PriceItem[],
  remotePrices: RetailerRemotePrice[],
  store: Store,
  now = new Date(),
  maximumAgeDays = 14,
): PriceItem[] {
  const today = now.toISOString().slice(0, 10);
  const freshAfter = now.getTime() - maximumAgeDays * 86_400_000;
  const candidates = new Map<string, RetailerRemotePrice[]>();
  remotePrices
    .filter((price) => isCurrentlyValid(price, today, freshAfter))
    .forEach((price) => {
      const current = candidates.get(price.catalog_id) ?? [];
      current.push(price);
      candidates.set(price.catalog_id, current);
    });

  return catalog.map((item) => {
    if (localPriceHasPriority(item, store)) return item;
    const best = (candidates.get(item.id) ?? [])
      .filter(
        (price) =>
          price.package_unit === item.unit &&
          price.package_quantity > 0 &&
          price.price > 0,
      )
      .sort(
        (left, right) =>
          (left.reference_price ?? Number.MAX_SAFE_INTEGER) -
          (right.reference_price ?? Number.MAX_SAFE_INTEGER),
      )[0];
    if (!best) {
      const source = item.priceSources?.[store];
      const importedAt = source ? Date.parse(source.importedAt) : NaN;
      const stale =
        source?.kind === "scraped" &&
        ((source.validTo && source.validTo < today) ||
          (!source.validTo &&
            (!Number.isFinite(importedAt) || importedAt < freshAfter)));
      if (!stale) return item;
      const stores = { ...item.stores };
      const packageQuantities = { ...item.packageQuantities };
      delete stores[store];
      delete packageQuantities[store];
      return {
        ...item,
        stores,
        packageQuantities,
        confirmedStores: { ...item.confirmedStores, [store]: false },
      };
    }

    const validity =
      best.valid_from && best.valid_to
        ? ` · valido ${best.valid_from}–${best.valid_to}`
        : "";
    return {
      ...item,
      stores: { ...item.stores, [store]: best.price },
      packageQuantities: {
        ...item.packageQuantities,
        [store]: best.package_quantity,
      },
      confirmedStores: { ...item.confirmedStores, [store]: true },
      priceUpdatedAt: { ...item.priceUpdatedAt, [store]: best.captured_at },
      priceSources: {
        ...item.priceSources,
        [store]: {
          kind: "scraped",
          label: `${best.source_label} · ${best.source_area}${validity}`,
          importedAt: best.captured_at,
          sourceUrl: best.source_url,
          validFrom: best.valid_from ?? undefined,
          validTo: best.valid_to ?? undefined,
        },
      },
    };
  });
}
