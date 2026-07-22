import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const SOURCE_URL = "https://volantino.mdspa.it/m_sud_mac_nogas.html";
const SOURCE_AREA = "MD Sud · macelleria · no gastronomia";
const SOURCE_LABEL = "Volantino ufficiale MD Sud";
const MINIMUM_INTERVAL_MS = 6 * 60 * 60 * 1000;

type FlyerProduct = {
  idProduct: number;
  idVolantino: number;
  code?: string;
  name: string;
  brand?: string;
  category?: string;
  section?: string;
  weight?: number;
  weight_um?: string;
  price?: number;
  priceOff?: number;
  prezzoPartenzaSIF?: number;
  cardMD?: boolean;
  x32?: boolean;
  menoSpendi?: boolean;
  sellOutStart?: string | null;
  sellOutEnd?: string | null;
  webstoreUrl?: string;
};

type ProductRow = {
  external_id: string;
  catalog_id: string | null;
  name: string;
  brand: string | null;
  category: string | null;
  package_quantity: number;
  package_unit: "g" | "ml" | "pz";
  price: number;
  regular_price: number | null;
  reference_price: number | null;
  reference_unit: "kg" | "l" | "pz" | null;
  is_promotion: boolean;
  valid_from: string | null;
  valid_to: string | null;
  captured_at: string;
  source_url: string;
  source_label: string;
  source_area: string;
  active: boolean;
  raw_data: Record<string, unknown>;
  updated_at: string;
};

const monthNumber: Record<string, number> = {
  gennaio: 1,
  febbraio: 2,
  marzo: 3,
  aprile: 4,
  maggio: 5,
  giugno: 6,
  luglio: 7,
  agosto: 8,
  settembre: 9,
  ottobre: 10,
  novembre: 11,
  dicembre: 12,
};

const isoDate = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

function flyerValidity(html: string) {
  const match = html.match(
    /dal\s+(\d{1,2})\s+([a-zà]+)\s+al\s+(\d{1,2})\s+([a-zà]+)\s+(\d{4})/i,
  );
  if (!match) return { validFrom: null, validTo: null };
  const startMonth = monthNumber[match[2].toLowerCase()];
  const endMonth = monthNumber[match[4].toLowerCase()];
  if (!startMonth || !endMonth) return { validFrom: null, validTo: null };
  const year = Number(match[5]);
  return {
    validFrom: isoDate(year, startMonth, Number(match[1])),
    validTo: isoDate(year, endMonth, Number(match[3])),
  };
}

function parseFlyerProducts(html: string): FlyerProduct[] {
  const marker = "var data = ";
  const start = html.indexOf(marker);
  if (start < 0) throw new Error("Blocco prodotti MD non trovato");
  const jsonStart = start + marker.length;
  const end = html.indexOf("];", jsonStart);
  if (end < 0) throw new Error("Blocco prodotti MD incompleto");
  const sections = JSON.parse(html.slice(jsonStart, end + 1)) as Array<{
    products?: FlyerProduct[];
  }>;
  return sections.flatMap((section) => section.products ?? []);
}

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const catalogMatchers: Array<[string, RegExp]> = [
  [
    "pasta",
    /\b(pasta|spaghetti|penne|fusilli|rigatoni|calamarata|strozzapreti|orecchiette|lasagnette|pappardelle)\b/,
  ],
  ["riso", /\briso\b/],
  ["ceci", /\bceci\b/],
  ["lenticchie", /\blenticchie\b/],
  ["pollo", /\bpollo\b/],
  ["salmone", /\bsalmone\b/],
  ["uova", /\buova\b/],
  ["tofu", /\btofu\b/],
  ["pomodori", /\b(passata di pomodoro|pomodori|pomodorini)\b/],
  ["zucchine", /\bzucchine\b/],
  ["spinaci", /\bspinaci\b/],
  ["pane", /\bpane senza glutine\b/],
  ["yogurt", /\byogurt greco\b/],
  ["avena", /\b(fiocchi d avena|avena)\b/],
  ["tonno", /\btonno\b/],
  ["fagioli", /\bfagioli\b/],
  ["broccoli", /\bbroccoli\b/],
  ["patate", /\bpatate\b/],
  ["tacchino", /\btacchino\b/],
  ["mozzarella", /\b(mozzarella|bocconcini di bufala)\b/],
  ["melanzane", /\bmelanzane\b/],
  ["peperoni", /\bpeperoni\b/],
  ["cipolle", /\bcipolle\b/],
  ["carote", /\bcarote\b/],
  ["piselli", /\bpiselli\b/],
  ["manzo", /\b(macinato di manzo|carne bovina|bovino)\b/],
  ["maiale", /\b(lonza di maiale|lonza|carne suina|suino)\b/],
  ["merluzzo", /\bmerluzzo\b/],
  ["ricotta", /\bricotta\b/],
  ["parmigiano", /\bparmigiano reggiano\b/],
  ["polenta", /\bpolenta\b/],
  ["farina", /\bfarina di grano\b/],
  ["funghi", /\bfunghi\b/],
  ["zucca", /\bzucca\b/],
  ["olive", /\bolive\b/],
];

const catalogIdFor = (product: FlyerProduct) => {
  const searchable = normalize(
    `${product.name} ${product.brand ?? ""} ${product.category ?? ""}`,
  );
  return (
    catalogMatchers.find(([, matcher]) => matcher.test(searchable))?.[0] ?? null
  );
};

function packageUnit(value?: string): "g" | "ml" | "pz" | null {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "g") return "g";
  if (normalized === "ml") return "ml";
  if (normalized === "pz") return "pz";
  return null;
}

function effectivePrice(product: FlyerProduct) {
  const regular = Number(product.price) || 0;
  const discounted = Number(product.priceOff) || 0;
  const cardPrice = Number(product.prezzoPartenzaSIF) || 0;
  if (product.cardMD && cardPrice > 0) return cardPrice;
  if (discounted > 0 && (regular <= 0 || discounted <= regular))
    return discounted;
  return regular > 0 ? regular : discounted;
}

function toProductRow(
  product: FlyerProduct,
  capturedAt: string,
  flyerDates: { validFrom: string | null; validTo: string | null },
): ProductRow | null {
  const unit = packageUnit(product.weight_um);
  const quantity = Number(product.weight) || 0;
  const price = effectivePrice(product);
  const section = normalize(product.section ?? "");
  if (
    !unit ||
    quantity <= 0 ||
    price <= 0 ||
    section.includes("md viaggi") ||
    Boolean(product.webstoreUrl)
  )
    return null;

  const regularPrice = Number(product.price) || null;
  const referencePrice =
    unit === "g" || unit === "ml"
      ? Math.round((price * 1000 * 100) / quantity) / 100
      : Math.round((price * 100) / quantity) / 100;
  const validFrom = product.sellOutStart?.slice(0, 10) ?? flyerDates.validFrom;
  const validTo = product.sellOutEnd?.slice(0, 10) ?? flyerDates.validTo;

  return {
    external_id: `md:${product.idProduct}`,
    catalog_id: catalogIdFor(product),
    name: product.name.trim().slice(0, 180),
    brand: product.brand?.trim().slice(0, 120) || null,
    category: product.category?.trim().slice(0, 120) || null,
    package_quantity: quantity,
    package_unit: unit,
    price,
    regular_price: regularPrice,
    reference_price: referencePrice,
    reference_unit: unit === "g" ? "kg" : unit === "ml" ? "l" : "pz",
    is_promotion:
      Boolean(product.cardMD || product.x32 || product.menoSpendi) ||
      Boolean(regularPrice && price < regularPrice),
    valid_from: validFrom,
    valid_to: validTo,
    captured_at: capturedAt,
    source_url: SOURCE_URL,
    source_label: SOURCE_LABEL,
    source_area: SOURCE_AREA,
    active: true,
    raw_data: {
      flyerId: product.idVolantino,
      productCode: product.code ?? null,
      section: product.section ?? null,
      cardOnly: Boolean(product.cardMD),
      multiBuy: Boolean(product.x32 || product.menoSpendi),
    },
    updated_at: capturedAt,
  };
}

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
      await ctx.supabaseAdmin.rpc("verify_fudit_md_cron_token", { token });
    if (tokenError || tokenIsValid !== true)
      return Response.json({ error: "Unauthorized" }, { status: 401 });

    const recentThreshold = new Date(
      Date.now() - MINIMUM_INTERVAL_MS,
    ).toISOString();
    const { data: recentRun } = await ctx.supabaseAdmin
      .from("md_price_scrape_runs")
      .select("id,status,started_at")
      .in("status", ["running", "success"])
      .gte("started_at", recentThreshold)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recentRun)
      return Response.json({ ok: true, skipped: true, reason: "recent-run" });

    const { data: run, error: runError } = await ctx.supabaseAdmin
      .from("md_price_scrape_runs")
      .insert({ source_url: SOURCE_URL, source_area: SOURCE_AREA })
      .select("id")
      .single();
    if (runError || !run)
      return Response.json(
        { error: "Impossibile avviare il job" },
        { status: 500 },
      );

    try {
      const capturedAt = new Date().toISOString();
      const sourceResponse = await fetch(`${SOURCE_URL}?fudit=${Date.now()}`, {
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "Cache-Control": "no-cache",
          "User-Agent":
            "FuditPriceBot/1.0 (+https://github.com/francescoeramo/Fudit)",
        },
      });
      if (!sourceResponse.ok)
        throw new Error(`MD ha risposto con HTTP ${sourceResponse.status}`);

      const html = await sourceResponse.text();
      const parsed = parseFlyerProducts(html);
      const flyerDates = flyerValidity(html);
      const rows = parsed
        .map((product) => toProductRow(product, capturedAt, flyerDates))
        .filter((row): row is ProductRow => row !== null);
      if (rows.length === 0)
        throw new Error("Nessun prezzo alimentare valido trovato");

      const saved: Array<{ id: number; external_id: string }> = [];
      for (const batch of chunks(rows, 100)) {
        const { data, error } = await ctx.supabaseAdmin
          .from("md_products")
          .upsert(batch, { onConflict: "external_id" })
          .select("id,external_id");
        if (error) throw error;
        saved.push(...(data ?? []));
      }

      const rowByExternalId = new Map(
        rows.map((row) => [row.external_id, row]),
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
            valid_from: row.valid_from,
            valid_to: row.valid_to,
          };
        });
        const { error } = await ctx.supabaseAdmin
          .from("md_price_observations")
          .insert(observations);
        if (error) throw error;
      }

      const { error: deactivateError } = await ctx.supabaseAdmin
        .from("md_products")
        .update({ active: false, updated_at: capturedAt })
        .eq("source_area", SOURCE_AREA)
        .lt("captured_at", capturedAt);
      if (deactivateError) throw deactivateError;

      const mapped = rows.filter((row) => row.catalog_id !== null).length;
      await ctx.supabaseAdmin
        .from("md_price_scrape_runs")
        .update({
          status: "success",
          finished_at: new Date().toISOString(),
          products_found: parsed.length,
          products_saved: saved.length,
          products_mapped: mapped,
          metadata: {
            flyerValidFrom: flyerDates.validFrom,
            flyerValidTo: flyerDates.validTo,
          },
        })
        .eq("id", run.id);

      return Response.json({
        ok: true,
        productsFound: parsed.length,
        productsSaved: saved.length,
        productsMapped: mapped,
        validFrom: flyerDates.validFrom,
        validTo: flyerDates.validTo,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Errore sconosciuto";
      await ctx.supabaseAdmin
        .from("md_price_scrape_runs")
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
