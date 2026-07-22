import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const SHOP_ROOT = "https://shop.despar.com/spesa-consegna-domicilio/70037";
const SOURCE_LABEL = "Catalogo ufficiale Despar a Casa";
const SOURCE_AREA = "Despar Centro Sud · Corato (BA) · CAP 70037";
const MINIMUM_INTERVAL_MS = 6 * 60 * 60 * 1000;

type CatalogQuery = {
  catalogId: string;
  term: string;
  include?: RegExp;
  exclude?: RegExp;
};
type SearchResult = {
  label?: string;
  code?: string;
  type?: string;
  URL?: string;
  price?: string | null;
  pricePromo?: string | null;
  isPromo?: boolean;
};
type ProductRow = {
  external_id: string;
  catalog_id: string;
  name: string;
  brand: string | null;
  category: string | null;
  package_quantity: number;
  package_unit: "g" | "ml" | "pz";
  price: number;
  regular_price: number | null;
  reference_price: number;
  reference_unit: "kg" | "l" | "pz";
  is_promotion: boolean;
  valid_from: null;
  valid_to: null;
  captured_at: string;
  source_url: string;
  source_label: string;
  source_area: string;
  active: boolean;
  raw_data: Record<string, unknown>;
  updated_at: string;
};

const queries: CatalogQuery[] = [
  { catalogId: "pasta", term: "pasta", exclude: /filata|frolla|acciugh/i },
  { catalogId: "riso", term: "riso" },
  { catalogId: "ceci", term: "ceci" },
  { catalogId: "lenticchie", term: "lenticchie" },
  { catalogId: "pollo", term: "pollo" },
  { catalogId: "salmone", term: "salmone" },
  { catalogId: "uova", term: "uova" },
  { catalogId: "tofu", term: "tofu" },
  { catalogId: "pomodori", term: "pomodoro" },
  { catalogId: "zucchine", term: "zucchine" },
  { catalogId: "spinaci", term: "spinaci" },
  { catalogId: "pane", term: "pane" },
  { catalogId: "yogurt", term: "yogurt" },
  { catalogId: "avena", term: "avena" },
  { catalogId: "tonno", term: "tonno" },
  { catalogId: "fagioli", term: "fagioli" },
  { catalogId: "broccoli", term: "broccoli", include: /broccol/i },
  { catalogId: "patate", term: "patate" },
  { catalogId: "tacchino", term: "tacchino", include: /tacchin/i },
  { catalogId: "mozzarella", term: "mozzarella", include: /mozzarell/i },
  { catalogId: "melanzane", term: "melanzane" },
  { catalogId: "peperoni", term: "peperoni" },
  { catalogId: "cipolle", term: "cipolle" },
  { catalogId: "carote", term: "carote" },
  { catalogId: "piselli", term: "piselli" },
  {
    catalogId: "manzo",
    term: "manzo",
    include: /manzo|bovin/i,
    exclude: /crocchett|cane|gatto|pet|molly|mousse|fegato/i,
  },
  { catalogId: "maiale", term: "lonza maiale" },
  { catalogId: "merluzzo", term: "merluzzo" },
  { catalogId: "ricotta", term: "ricotta" },
  { catalogId: "parmigiano", term: "parmigiano" },
  { catalogId: "polenta", term: "polenta" },
  { catalogId: "farina", term: "farina" },
  { catalogId: "funghi", term: "funghi" },
  { catalogId: "zucca", term: "zucca", exclude: /crema|vellutat|semi/i },
  { catalogId: "olive", term: "olive" },
];

const parseEuro = (value?: string | null) => {
  const match = value?.match(/\d+(?:[.,]\d{1,2})?/);
  return match ? Number(match[0].replace(",", ".")) : 0;
};

const packageFromLabel = (label: string) => {
  const matches = [
    ...label
      .toUpperCase()
      .matchAll(
        /(\d+(?:[.,]\d+)?)\s*(KG|GR|G|ML|CL|LT|L|PZ)(?:\s*X\s*(\d+))?/g,
      ),
  ];
  const match = matches.at(-1);
  if (!match) return null;
  const amount = Number(match[1].replace(",", "."));
  const multiplier = Number(match[3] ?? 1);
  if (!Number.isFinite(amount) || amount <= 0 || multiplier <= 0) return null;
  const rawUnit = match[2];
  if (rawUnit === "KG")
    return { quantity: amount * 1000 * multiplier, unit: "g" as const };
  if (rawUnit === "LT" || rawUnit === "L")
    return { quantity: amount * 1000 * multiplier, unit: "ml" as const };
  if (rawUnit === "CL")
    return { quantity: amount * 10 * multiplier, unit: "ml" as const };
  if (rawUnit === "ML")
    return { quantity: amount * multiplier, unit: "ml" as const };
  if (rawUnit === "PZ")
    return { quantity: amount * multiplier, unit: "pz" as const };
  return { quantity: amount * multiplier, unit: "g" as const };
};

const rowFor = (
  result: SearchResult,
  query: CatalogQuery,
  capturedAt: string,
): ProductRow | null => {
  const label = result.label?.trim() ?? "";
  if (
    result.type !== "P" ||
    !result.code ||
    !label ||
    (query.include && !query.include.test(label)) ||
    query.exclude?.test(label)
  )
    return null;
  const pack = packageFromLabel(label);
  const regularPrice = parseEuro(result.price);
  const promoPrice = parseEuro(result.pricePromo);
  const price = result.isPromo && promoPrice > 0 ? promoPrice : regularPrice;
  if (!pack || price <= 0) return null;
  const referencePrice =
    pack.unit === "pz" ? price / pack.quantity : (price * 1000) / pack.quantity;
  const sourceUrl = result.URL?.startsWith("/")
    ? `https://shop.despar.com${result.URL}`
    : SHOP_ROOT;
  return {
    external_id: `despar:${result.code}`,
    catalog_id: query.catalogId,
    name: label.slice(0, 180),
    brand: null,
    category: query.term,
    package_quantity: Math.round(pack.quantity * 1000) / 1000,
    package_unit: pack.unit,
    price: Math.round(price * 100) / 100,
    regular_price:
      regularPrice > 0 ? Math.round(regularPrice * 100) / 100 : null,
    reference_price: Math.round(referencePrice * 100) / 100,
    reference_unit: pack.unit === "g" ? "kg" : pack.unit === "ml" ? "l" : "pz",
    is_promotion: Boolean(result.isPromo && promoPrice > 0),
    valid_from: null,
    valid_to: null,
    captured_at: capturedAt,
    source_url: sourceUrl,
    source_label: SOURCE_LABEL,
    source_area: SOURCE_AREA,
    active: true,
    raw_data: {
      query: query.term,
      productCode: result.code,
      listedPrice: result.price ?? null,
      promotionalPrice: result.pricePromo ?? null,
    },
    updated_at: capturedAt,
  };
};

const fetchQuery = async (query: CatalogQuery, capturedAt: string) => {
  const url = `${SHOP_ROOT}/ajax/autoCompleteSearch?term=${encodeURIComponent(query.term)}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache",
      "User-Agent":
        "FuditPriceBot/1.0 (+https://github.com/francescoeramo/Fudit)",
    },
  });
  if (!response.ok)
    throw new Error(`Despar ha risposto con HTTP ${response.status}`);
  const results = (await response.json()) as SearchResult[];
  return results
    .slice(0, 8)
    .map((result) => rowFor(result, query, capturedAt))
    .filter((row): row is ProductRow => row !== null);
};

const chunks = <T>(items: T[], size: number) => {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size)
    result.push(items.slice(index, index + size));
  return result;
};

const handler = {
  fetch: withSupabase({ auth: "none" }, async (request, ctx) => {
    if (request.method !== "POST")
      return Response.json({ error: "Method not allowed" }, { status: 405 });

    const token = request.headers.get("x-fudit-cron-token") ?? "";
    const { data: tokenIsValid, error: tokenError } =
      await ctx.supabaseAdmin.rpc("verify_fudit_despar_cron_token", { token });
    if (tokenError || tokenIsValid !== true)
      return Response.json({ error: "Unauthorized" }, { status: 401 });

    const payload = (await request.json().catch(() => ({}))) as {
      force?: boolean;
    };

    const recentThreshold = new Date(
      Date.now() - MINIMUM_INTERVAL_MS,
    ).toISOString();
    const { data: recentRun } = await ctx.supabaseAdmin
      .from("despar_price_scrape_runs")
      .select("id,status,started_at")
      .in("status", ["running", "success"])
      .gte("started_at", recentThreshold)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recentRun && payload.force !== true)
      return Response.json({ ok: true, skipped: true, reason: "recent-run" });

    const { data: run, error: runError } = await ctx.supabaseAdmin
      .from("despar_price_scrape_runs")
      .insert({ source_url: SHOP_ROOT, source_area: SOURCE_AREA })
      .select("id")
      .single();
    if (runError || !run)
      return Response.json(
        { error: "Impossibile avviare il job" },
        { status: 500 },
      );

    try {
      const capturedAt = new Date().toISOString();
      const rows: ProductRow[] = [];
      for (const batch of chunks(queries, 6)) {
        const batchRows = await Promise.all(
          batch.map((query) => fetchQuery(query, capturedAt)),
        );
        rows.push(...batchRows.flat());
      }
      const uniqueRows = [
        ...new Map(rows.map((row) => [row.external_id, row])).values(),
      ];
      if (!uniqueRows.length)
        throw new Error("Nessun prezzo alimentare valido trovato");

      const saved: Array<{ id: number; external_id: string }> = [];
      for (const batch of chunks(uniqueRows, 100)) {
        const { data, error } = await ctx.supabaseAdmin
          .from("despar_products")
          .upsert(batch, { onConflict: "external_id" })
          .select("id,external_id");
        if (error) throw error;
        saved.push(...(data ?? []));
      }

      const rowByExternalId = new Map(
        uniqueRows.map((row) => [row.external_id, row]),
      );
      for (const batch of chunks(saved, 100)) {
        const observations = batch.map((item) => {
          const row = rowByExternalId.get(item.external_id)!;
          return {
            product_id: item.id,
            run_id: run.id,
            price: row.price,
            regular_price: row.regular_price,
            captured_at: capturedAt,
          };
        });
        const { error } = await ctx.supabaseAdmin
          .from("despar_price_observations")
          .insert(observations);
        if (error) throw error;
      }

      const { error: deactivateError } = await ctx.supabaseAdmin
        .from("despar_products")
        .update({ active: false, updated_at: capturedAt })
        .lt("captured_at", capturedAt);
      if (deactivateError) throw deactivateError;

      const mappedCatalogIds = new Set(uniqueRows.map((row) => row.catalog_id))
        .size;
      await ctx.supabaseAdmin
        .from("despar_price_scrape_runs")
        .update({
          status: "success",
          finished_at: new Date().toISOString(),
          products_found: rows.length,
          products_saved: saved.length,
          products_mapped: mappedCatalogIds,
          metadata: { queries: queries.length, postalCode: "70037" },
        })
        .eq("id", run.id);

      return Response.json({
        ok: true,
        productsFound: rows.length,
        productsSaved: saved.length,
        catalogIngredientsMapped: mappedCatalogIds,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Errore sconosciuto";
      await ctx.supabaseAdmin
        .from("despar_price_scrape_runs")
        .update({
          status: "error",
          finished_at: new Date().toISOString(),
          error_message: message.slice(0, 1000),
        })
        .eq("id", run.id);
      return Response.json({ error: message }, { status: 502 });
    }
  }),
};

export default handler;
