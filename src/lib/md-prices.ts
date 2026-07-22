import { PriceItem } from "./types";

export interface MdRemotePrice {
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

export const mdPriceSyncConfigured = true;

export async function fetchMdPrices(
  signal?: AbortSignal,
): Promise<MdRemotePrice[]> {
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
  const response = await fetch(
    `${supabaseUrl}/rest/v1/md_products?select=${fields}&catalog_id=not.is.null&active=eq.true`,
    {
      signal,
      headers: { apikey: publishableKey },
      cache: "no-store",
    },
  );
  if (!response.ok)
    throw new Error(`Supabase ha risposto con HTTP ${response.status}`);
  return (await response.json()) as MdRemotePrice[];
}

const isCurrentlyValid = (price: MdRemotePrice, today: string) =>
  (!price.valid_from || price.valid_from <= today) &&
  (!price.valid_to || price.valid_to >= today);

const localPriceHasPriority = (item: PriceItem) => {
  const source = item.priceSources?.MD;
  if (source && source.kind !== "seed" && source.kind !== "scraped")
    return true;
  return (
    !source && Boolean(item.confirmedStores?.MD && item.priceUpdatedAt?.MD)
  );
};

export function mergeMdPrices(
  catalog: PriceItem[],
  remotePrices: MdRemotePrice[],
  now = new Date(),
): PriceItem[] {
  const today = now.toISOString().slice(0, 10);
  const candidates = new Map<string, MdRemotePrice[]>();
  remotePrices
    .filter((price) => isCurrentlyValid(price, today))
    .forEach((price) => {
      const current = candidates.get(price.catalog_id) ?? [];
      current.push(price);
      candidates.set(price.catalog_id, current);
    });

  return catalog.map((item) => {
    if (localPriceHasPriority(item)) return item;
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
      const source = item.priceSources?.MD;
      if (
        source?.kind !== "scraped" ||
        !source.validTo ||
        source.validTo >= today
      )
        return item;
      const stores = { ...item.stores };
      const packageQuantities = { ...item.packageQuantities };
      delete stores.MD;
      delete packageQuantities.MD;
      return {
        ...item,
        stores,
        packageQuantities,
        confirmedStores: { ...item.confirmedStores, MD: false },
      };
    }

    const validity =
      best.valid_from && best.valid_to
        ? ` · valido ${best.valid_from}–${best.valid_to}`
        : "";
    return {
      ...item,
      stores: { ...item.stores, MD: best.price },
      packageQuantities: {
        ...item.packageQuantities,
        MD: best.package_quantity,
      },
      confirmedStores: { ...item.confirmedStores, MD: true },
      priceUpdatedAt: { ...item.priceUpdatedAt, MD: best.captured_at },
      priceSources: {
        ...item.priceSources,
        MD: {
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
