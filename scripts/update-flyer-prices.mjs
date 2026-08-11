#!/usr/bin/env node

import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { dirname, resolve } from "node:path";

const capturedAt = new Date().toISOString();
const debug = process.argv.includes("--debug");
const runFile = promisify(execFile);
const outputArgument = process.argv.indexOf("--output");
const outputPath = resolve(
  outputArgument >= 0 && process.argv[outputArgument + 1]
    ? process.argv[outputArgument + 1]
    : "public/flyer-prices.json",
);

const sources = [
  {
    store: "Esselunga",
    area: "Esselunga · Firenze, negozio predefinito del sito",
    url: "https://www.esselunga.it/it-it/promozioni/volantini.all.html",
    parser: "esselungaPdf",
  },
  {
    store: "Lidl",
    area: "Lidl Italia · prezzi nazionali/area pubblicata",
    url: "https://www.lidl.it/c/i-nostri-volantini/",
    parser: "lidl",
  },
  {
    store: "Eurospin",
    area: "Eurospin Italia · promozioni nazionali",
    url: "https://www.eurospin.it/promozioni/",
    parser: "eurospin",
  },
  {
    store: "Coop",
    area: "Unicoop Etruria · Roma Agosta",
    url: "https://coopetruria.coop.it/negozi/romaagosta-roma/volantino-romaagosta-98",
    parser: "linkedPdf",
  },
  {
    store: "Conad",
    area: "Conad Italia · offerte nazionali Bassi e Fissi",
    url: "https://www.conad.it/",
    parser: "conad",
  },
  {
    store: "Vivo",
    area: "Vivo Supermercati · volantino pubblico disponibile",
    url: "https://www.supermercativivo.it/",
    parser: "linkedPdf",
  },
  {
    store: "Contè",
    area: "Contè Supermercati · Calabria",
    url: "https://www.contesupermercati.it/volantinopdf/classico-volantino-web.pdf",
    parser: "pdf",
  },
  {
    store: "Penny",
    area: "Penny Italia · offerte nazionali",
    url: "https://www.penny.it/offerte",
    parser: "penny",
  },
  {
    store: "MD",
    area: "MD Sud · macelleria · no gastronomia",
    url: "https://volantino.mdspa.it/m_sud_mac_nogas.html",
    parser: "md",
  },
];

const catalogMatchers = [
  [
    "pasta",
    /\b(pasta|spaghetti|penne|fusilli|rigatoni|orecchiette|linguine|lasagne)\b/,
  ],
  ["riso", /\briso\b/],
  ["ceci", /\bceci\b/],
  ["lenticchie", /\blenticchie\b/],
  ["pollo", /\bpollo\b/],
  ["salmone", /\bsalmone\b/],
  ["uova", /\buova?\b/],
  ["tofu", /\btofu\b/],
  ["pomodori", /\b(passata di pomodoro|pomodori|pomodorini)\b/],
  ["zucchine", /\bzucchine?\b/],
  ["spinaci", /\bspinaci\b/],
  ["pane", /\bpane senza glutine\b/],
  ["yogurt", /\byogurt greco\b/],
  ["avena", /\b(fiocchi d avena|avena)\b/],
  ["tonno", /\btonno\b/],
  ["fagioli", /\bfagioli\b/],
  ["broccoli", /\bbroccoli?\b/],
  ["patate", /\bpatate\b/],
  ["tacchino", /\btacchino\b/],
  ["mozzarella", /\bmozzarell[ae]\b/],
  ["melanzane", /\bmelanzane?\b/],
  ["peperoni", /\bpeperoni?\b/],
  ["cipolle", /\bcipolle?\b/],
  ["carote", /\bcarote?\b/],
  ["piselli", /\bpiselli\b/],
  ["manzo", /\b(macinato di manzo|carne bovina|bovino|manzo)\b/],
  ["maiale", /\b(lonza di maiale|carne suina|suino|maiale)\b/],
  ["merluzzo", /\bmerluzzo\b/],
  ["ricotta", /\bricotta\b/],
  ["parmigiano", /\bparmigiano reggiano\b/],
  ["polenta", /\bpolenta\b/],
  ["farina", /\bfarina(?: di grano)?\b/],
  ["funghi", /\bfunghi\b/],
  ["zucca", /\bzucca\b/],
  ["olive", /\bolive\b/],
];

const exclusions = {
  carote: /omogeneizz|succo|insalata pronta/i,
  fagioli: /omogeneizz|zuppa pronta|insalata pronta/i,
  manzo: /crocchett|cane|gatto|pet|mousse|fegato/i,
  maiale: /wurstel|salsiccia|luganega|salame|prosciutto/i,
  olive: /ascolana|ripien/i,
  pane: /grattugiat|carasau|pancarr/i,
  pasta: /sfoglia|frolla|dentifric|filata/i,
  patate: /fritte|chips|gnocch|pur[eè]/i,
  piselli: /menta|vellutat|zuppa pronta/i,
  pollo: /crocchett|cane|gatto|pet|findus/i,
  salmone: /sushi|burger|insalata pronta|affumicat|olio/i,
  spinaci: /ravioli|torta|pizza|gnocch|vellutat/i,
  tacchino: /arrosto|affettat|prosciutto|hamburger|wurstel|sofficette/i,
  tonno: /crocchett|cane|gatto|pet/i,
  zucchine: /arrosti|omogeneizz|burger|polpett/i,
  zucca: /semi|crema corpo|vellutat/i,
};

const normalize = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const decodeHtml = (value) =>
  String(value ?? "")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&euro;|&#8364;/g, "€")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const plainText = (html) =>
  decodeHtml(html)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const absoluteUrl = (href, base) => new URL(decodeHtml(href), base).href;

async function fetchResponse(url, accepted = "text/html,application/pdf") {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      Accept: accepted,
      "Cache-Control": "no-cache",
      "User-Agent":
        "FuditPriceBot/1.1 (+https://github.com/francescoeramo/Fudit)",
    },
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response;
}

async function fetchText(url) {
  return (await fetchResponse(url)).text();
}

const parseEuro = (value) => {
  const match = String(value ?? "").match(/\d{1,3}(?:[.,]\d{1,2})/);
  return match ? Number(match[0].replace(",", ".")) : 0;
};

function packageFromText(value) {
  const matches = [
    ...String(value ?? "")
      .toUpperCase()
      .matchAll(
        /(\d+(?:[.,]\d+)?)\s*(KG|GR|G|ML|CL|LT|L|PZ)(?:\s*[X×]\s*(\d+))?/g,
      ),
  ];
  const match = matches.at(-1);
  if (!match) return null;
  const amount = Number(match[1].replace(",", "."));
  const multiplier = Number(match[3] ?? 1);
  if (!Number.isFinite(amount) || amount <= 0 || multiplier <= 0) return null;
  if (match[2] === "KG")
    return { quantity: amount * 1000 * multiplier, unit: "g" };
  if (match[2] === "LT" || match[2] === "L")
    return { quantity: amount * 1000 * multiplier, unit: "ml" };
  if (match[2] === "CL")
    return { quantity: amount * 10 * multiplier, unit: "ml" };
  if (match[2] === "ML") return { quantity: amount * multiplier, unit: "ml" };
  if (match[2] === "PZ") return { quantity: amount * multiplier, unit: "pz" };
  return { quantity: amount * multiplier, unit: "g" };
}

function catalogIdFor(value) {
  const searchable = normalize(value);
  for (const [id, matcher] of catalogMatchers) {
    if (!matcher.test(searchable)) continue;
    if (exclusions[id]?.test(searchable)) continue;
    return id;
  }
  return null;
}

const isoDay = (value) => {
  if (value === null || value === undefined || value === "" || value === 0)
    return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toISOString().slice(0, 10)
    : null;
};

function italianDate(value, reference = new Date()) {
  const match = String(value ?? "").match(
    /(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?/,
  );
  if (!match) return null;
  let year = Number(match[3] ?? reference.getUTCFullYear());
  if (year < 100) year += 2000;
  return `${year}-${String(Number(match[2])).padStart(2, "0")}-${String(Number(match[1])).padStart(2, "0")}`;
}

function validityFromText(value) {
  const match = String(value ?? "").match(
    /(?:dal|da)\s*(\d{1,2}[/.]\d{1,2}(?:[/.]\d{2,4})?)\s*(?:al|a)\s*(\d{1,2}[/.]\d{1,2}(?:[/.]\d{2,4})?)/i,
  );
  return match
    ? { validFrom: italianDate(match[1]), validTo: italianDate(match[2]) }
    : { validFrom: null, validTo: null };
}

function offerRow(source, offer) {
  const name = plainText(offer.name).slice(0, 180);
  if (/\b(cane|gatto|pet|miba)\b/i.test(normalize(name))) return null;
  const catalogId = offer.catalogId ?? catalogIdFor(name);
  if (catalogId && exclusions[catalogId]?.test(normalize(name))) return null;
  const pack = offer.pack ?? packageFromText(`${name} ${offer.details ?? ""}`);
  const price = Number(offer.price);
  if (
    !catalogId ||
    !pack ||
    !Number.isFinite(price) ||
    price <= 0 ||
    price > 500
  )
    return null;
  const expectedUnit = catalogId === "uova" ? "pz" : "g";
  if (pack.unit !== expectedUnit) return null;
  const referencePrice =
    pack.unit === "pz" ? price / pack.quantity : (price * 1000) / pack.quantity;
  if (
    !Number.isFinite(referencePrice) ||
    referencePrice <= 0 ||
    referencePrice > 1000
  )
    return null;
  const validFrom = offer.validFrom ?? null;
  const validTo = offer.validTo ?? null;
  const external = normalize(
    `${source.store}-${name}-${pack.quantity}-${pack.unit}`,
  )
    .replace(/ /g, "-")
    .slice(0, 160);
  return {
    store: source.store,
    catalog_id: catalogId,
    name,
    package_quantity: Math.round(pack.quantity * 1000) / 1000,
    package_unit: pack.unit,
    price: Math.round(price * 100) / 100,
    reference_price: Math.round(referencePrice * 100) / 100,
    is_promotion: offer.isPromotion !== false,
    valid_from: validFrom,
    valid_to: validTo,
    captured_at: capturedAt,
    source_url: offer.sourceUrl ?? source.url,
    source_label: `Volantino pubblico ${source.store}`,
    source_area: source.area,
    external_id: external,
  };
}

function dedupe(rows) {
  const best = new Map();
  for (const row of rows.filter(Boolean)) {
    const key = `${row.store}:${row.catalog_id}:${row.package_unit}`;
    const current = best.get(key);
    if (!current || row.reference_price < current.reference_price)
      best.set(key, row);
  }
  return [...best.values()].map(({ external_id: _externalId, ...row }) => row);
}

function parseLidl(source, html) {
  const offers = [];
  for (const match of html.matchAll(/data-grid-data="(\{[\s\S]*?\})"/g)) {
    try {
      const product = JSON.parse(decodeHtml(match[1]));
      const region = Object.values(product.regionsPrices ?? {})[0];
      const current = region?.currentPrice ?? product.price;
      const price = Number(current?.price ?? product.price?.price);
      const packaging =
        current?.packaging?.text ?? product.price?.packaging?.text ?? "";
      offers.push(
        offerRow(source, {
          name: product.fullTitle ?? product.title,
          details: packaging,
          price,
          validFrom: isoDay(
            current?.startDate ?? product.storeStartDate * 1000,
          ),
          validTo: isoDay(current?.endDate ?? product.storeEndDate * 1000),
          isPromotion: Boolean(current?.discount ?? current?.oldPrice),
        }),
      );
    } catch {
      // A malformed product card is ignored; the source status records totals.
    }
  }
  return {
    found: [...html.matchAll(/data-grid-data="/g)].length,
    rows: dedupe(offers),
  };
}

function parseEurospin(source, html) {
  const validity = validityFromText(plainText(html));
  const blocks = html
    .split(/itemtype="http:\/\/schema\.org\/Product"/i)
    .slice(1);
  const offers = blocks.map((block) => {
    const name = block.match(/itemprop="name"[^>]*>([\s\S]*?)<\/h\d>/i)?.[1];
    const price = parseEuro(
      block.match(/itemprop="price"[^>]*>([\s\S]*?)<\/i>/i)?.[1],
    );
    return offerRow(source, {
      name,
      details: plainText(block.slice(0, 2500)),
      price,
      ...validity,
    });
  });
  return { found: blocks.length, rows: dedupe(offers) };
}

function parseConad(source, html) {
  const starts = [
    ...html.matchAll(
      /class="rt213-card-product-flyer rt213-card-product-flyer--carousel[^"]*"/g,
    ),
  ];
  const blocks = starts.map((match, index) =>
    html.slice(match.index, starts[index + 1]?.index ?? html.length),
  );
  const offers = blocks.map((block) => {
    const name = decodeHtml(block.match(/data-nome="([^"]+)"/)?.[1]);
    const price = parseEuro(
      block.match(
        /rt213-card-product-flyer__finalPrice[^>]*>([\s\S]*?)<\/span>/,
      )?.[1],
    );
    const validity = validityFromText(
      plainText(
        block.match(
          /rt213-card-product-flyer__validity[^>]*>([\s\S]*?)<\/span>/,
        )?.[1],
      ),
    );
    return offerRow(source, { name, price, ...validity });
  });
  if (debug)
    console.log("DEBUG Conad", {
      blocks: blocks.length,
      firstName: decodeHtml(blocks[0]?.match(/data-nome="([^"]+)"/)?.[1]),
      firstPrice: blocks[0]?.match(
        /rt213-card-product-flyer__finalPrice[^>]*>([\s\S]*?)<\/span>/,
      )?.[1],
    });
  return { found: blocks.length, rows: dedupe(offers) };
}

function unflattenDevalue(input) {
  const hydrated = new Map();
  const visit = (index) => {
    if (typeof index !== "number") return index;
    if (index < 0) return index === -1 ? undefined : null;
    if (hydrated.has(index)) return hydrated.get(index);
    const value = input[index];
    if (!value || typeof value !== "object") return value;
    if (Array.isArray(value) && typeof value[0] === "string") {
      if (["ShallowReactive", "Reactive", "Ref", "EmptyRef"].includes(value[0]))
        return visit(value[1]);
      if (value[0] === "Set") return value.slice(1).map(visit);
    }
    const output = Array.isArray(value) ? [] : {};
    hydrated.set(index, output);
    if (Array.isArray(value))
      value.forEach((entry) => output.push(visit(entry)));
    else
      Object.entries(value).forEach(
        ([key, entry]) => (output[key] = visit(entry)),
      );
    return output;
  };
  return visit(0);
}

function walkObjects(value, result = [], seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return result;
  seen.add(value);
  if (!Array.isArray(value)) result.push(value);
  Object.values(value).forEach((child) => walkObjects(child, result, seen));
  return result;
}

const numericValue = (value) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseEuro(value);
  if (!value || typeof value !== "object") return 0;
  for (const key of [
    "value",
    "price",
    "amount",
    "current",
    "currentPrice",
    "salesPrice",
    "promotion",
    "promotional",
    "regular",
  ]) {
    const found = numericValue(value[key]);
    if (found > 0) return found;
  }
  return 0;
};

function parsePenny(source, html) {
  const payload = html.match(
    /<script[^>]+id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
  )?.[1];
  if (!payload) throw new Error("Payload offerte Penny non trovato");
  const root = unflattenDevalue(JSON.parse(payload));
  const candidates = walkObjects(root).filter(
    (item) =>
      typeof (item.name ?? item.title ?? item.fullTitle) === "string" &&
      "price" in item,
  );
  const offers = candidates.map((item) => {
    const name = item.fullTitle ?? item.title ?? item.name;
    const serialized = JSON.stringify(item);
    const rawPrice = numericValue(item.price);
    const validity = validityFromText(serialized);
    return offerRow(source, {
      name,
      details: `${item.packageLabel ?? ""} ${item.weight ?? ""} ${item.volumeLabelShort ?? ""}`,
      price: rawPrice > 50 ? rawPrice / 100 : rawPrice,
      validFrom:
        isoDay(item.price?.validityStart ?? item.validFrom ?? item.startDate) ??
        validity.validFrom,
      validTo:
        isoDay(item.price?.validityEnd ?? item.validTo ?? item.endDate) ??
        validity.validTo,
    });
  });
  if (debug)
    console.log(
      "DEBUG Penny",
      candidates.slice(0, 3).map((item) => ({
        name: item.fullTitle ?? item.title ?? item.name,
        price: JSON.stringify(item.price),
        packageLabel: item.packageLabel,
        weight: item.weight,
        keys: Object.keys(item),
      })),
    );
  return { found: candidates.length, rows: dedupe(offers) };
}

function jsonArrayAfterMarker(source, marker) {
  const markerIndex = source.indexOf(marker);
  const start = source.indexOf("[", markerIndex + marker.length);
  if (markerIndex < 0 || start < 0)
    throw new Error("Blocco prodotti non trovato");
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') quoted = false;
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === "[") depth += 1;
    else if (character === "]") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error("Blocco prodotti incompleto");
}

function parseMd(source, html) {
  const sections = JSON.parse(jsonArrayAfterMarker(html, "var data ="));
  const products = sections.flatMap((section) => section.products ?? []);
  const offers = products.map((product) => {
    const regular = Number(product.price) || 0;
    const discount = Number(product.priceOff) || 0;
    const card = Number(product.prezzoPartenzaSIF) || 0;
    const price =
      product.cardMD && card > 0
        ? card
        : discount > 0 && (regular <= 0 || discount <= regular)
          ? discount
          : regular;
    const unit = String(product.weight_um ?? "").toLowerCase();
    const details = `${product.weight ?? ""} ${unit}`;
    return offerRow(source, {
      name: `${product.name ?? ""} ${product.brand ?? ""}`,
      details,
      price,
      validFrom: isoDay(product.sellOutStart),
      validTo: isoDay(product.sellOutEnd),
      isPromotion: Boolean(
        product.cardMD || product.x32 || product.menoSpendi || discount,
      ),
    });
  });
  return { found: products.length, rows: dedupe(offers) };
}

async function pdfText(url) {
  const bytes = new Uint8Array(
    await (await fetchResponse(url, "application/pdf")).arrayBuffer(),
  );
  const originalBytes = bytes.slice();
  const document = await getDocument({
    data: bytes,
    useWorkerFetch: false,
    isEvalSupported: false,
  }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(
      content.items.map((item) => ("str" in item ? item.str : "")).join(" "),
    );
  }
  const text = pages.join("\n").replace(/\s+/g, " ");
  if (text.length >= 500) return text;

  const temporaryDirectory = await mkdtemp(`${tmpdir()}/fudit-flyer-`);
  try {
    const pdfPath = `${temporaryDirectory}/flyer.pdf`;
    await writeFile(pdfPath, originalBytes);
    const lastPage = Math.min(document.numPages, 20);
    await runFile("pdftoppm", [
      "-f",
      "1",
      "-l",
      String(lastPage),
      "-r",
      "140",
      "-jpeg",
      pdfPath,
      `${temporaryDirectory}/page`,
    ]);
    const images = (await readdir(temporaryDirectory))
      .filter((name) => name.endsWith(".jpg"))
      .sort((left, right) =>
        left.localeCompare(right, undefined, { numeric: true }),
      );
    const recognized = [];
    for (const image of images) {
      const { stdout } = await runFile(
        "tesseract",
        [
          `${temporaryDirectory}/${image}`,
          "stdout",
          "-l",
          "ita+eng",
          "--psm",
          "6",
        ],
        { maxBuffer: 8 * 1024 * 1024 },
      );
      recognized.push(stdout);
    }
    const ocrText = recognized.join("\n").replace(/\s+/g, " ");
    if (ocrText.length < 500) throw new Error("PDF senza testo estraibile");
    return ocrText;
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

function parsePdfOffers(source, text, sourceUrl) {
  const validity = validityFromText(text);
  const offers = [];
  for (const [catalogId, matcher] of catalogMatchers) {
    const global = new RegExp(
      matcher.source,
      `${matcher.flags.replace("g", "")}gi`,
    );
    for (const match of text.matchAll(global)) {
      const originalWindow = text.slice(match.index, match.index + 220);
      const exclusionWindow = text.slice(
        Math.max(0, match.index - 90),
        match.index + 220,
      );
      if (exclusions[catalogId]?.test(normalize(exclusionWindow))) continue;
      const packageMatch = originalWindow.match(
        /(\d+(?:[.,]\d+)?)\s*(KG|GR|G|ML|CL|LT|L|PZ)(?:\s*[X×]\s*(\d+))?/i,
      );
      if (!packageMatch || (packageMatch.index ?? 999) > 120) continue;
      const between = originalWindow.slice(0, packageMatch.index ?? 0);
      if (/€|\bal\s+kg\b/i.test(between)) continue;
      const pack = packageFromText(packageMatch[0]);
      const afterPackage = originalWindow.slice(
        (packageMatch.index ?? 0) + packageMatch[0].length,
        (packageMatch.index ?? 0) + packageMatch[0].length + 110,
      );
      const euroMatches = [
        ...afterPackage.matchAll(/€\s*(\d{1,3})\s*[,.'’]\s*(\d{2})/g),
      ].filter(
        (entry) =>
          !/^\s*(?:al|\/)?\s*(?:kg|l|litro|etto)/i.test(
            afterPackage.slice(
              (entry.index ?? 0) + entry[0].length,
              (entry.index ?? 0) + entry[0].length + 18,
            ),
          ),
      );
      if (!pack) continue;
      const expectedReference = (price) =>
        pack.unit === "pz"
          ? price / pack.quantity
          : (price * 1000) / pack.quantity;
      const validated = euroMatches.filter((entry) => {
        const tail = afterPackage.slice(
          (entry.index ?? 0) + entry[0].length,
          (entry.index ?? 0) + entry[0].length + 48,
        );
        const reference = tail.match(
          /\(\s*€\s*(\d{1,3})\s*[,.'’]\s*(\d{2})\s*(?:al|\/)\s*(kg|l|litro|etto)/i,
        );
        if (!reference)
          return (entry.index ?? 999) < 24 && euroMatches.length === 1;
        const advertised =
          Number(`${reference[1]}.${reference[2]}`) *
          (reference[3].toLowerCase() === "etto" ? 10 : 1);
        const computed = expectedReference(Number(`${entry[1]}.${entry[2]}`));
        return Math.abs(advertised - computed) / advertised <= 0.12;
      });
      const priceMatch = validated.at(-1);
      if (!priceMatch) continue;
      offers.push(
        offerRow(source, {
          name: originalWindow.slice(0, 150),
          catalogId,
          pack,
          price: Number(`${priceMatch[1]}.${priceMatch[2]}`),
          sourceUrl,
          ...validity,
        }),
      );
    }
  }
  return { found: offers.filter(Boolean).length, rows: dedupe(offers) };
}

async function discoverLinkedPdf(source, html) {
  const base = html.match(/"flyersPdfBaseUrl":"([^"]+)"/)?.[1] ?? source.url;
  const links = [
    ...html.matchAll(/(?:href=|"link":)["']([^"']+\.pdf(?:\?[^"']*)?)["']/gi),
  ].map((match) => absoluteUrl(match[1], base));
  const flyer = links.find((url) => /vol|promo/i.test(url)) ?? links[0];
  if (!flyer) throw new Error("PDF del volantino non trovato");
  return flyer;
}

async function discoverEsselungaPdf(source, listing) {
  const detailHref = listing.match(
    /href="([^"]+\/volantini\/volantino\.(?!digitale)[^"]+\.html)"/i,
  )?.[1];
  if (!detailHref) throw new Error("Volantino Esselunga corrente non trovato");
  const detailUrl = absoluteUrl(detailHref, source.url);
  const detail = await fetchText(detailUrl);
  const viewer = detail.match(/src="(https:\/\/[^" ]+\/index\.html)"/i)?.[1];
  if (!viewer) throw new Error("Lettore Esselunga non trovato");
  return new URL(
    "files/assets/common/downloads/volantino_esselunga.pdf",
    viewer,
  ).href;
}

async function scrape(source) {
  if (source.parser === "pdf") {
    const text = await pdfText(source.url);
    return parsePdfOffers(source, text, source.url);
  }
  const html = await fetchText(source.url);
  if (source.parser === "lidl") return parseLidl(source, html);
  if (source.parser === "eurospin") return parseEurospin(source, html);
  if (source.parser === "conad") return parseConad(source, html);
  if (source.parser === "penny") return parsePenny(source, html);
  if (source.parser === "md") return parseMd(source, html);
  const pdfUrl =
    source.parser === "esselungaPdf"
      ? await discoverEsselungaPdf(source, html)
      : await discoverLinkedPdf(source, html);
  return parsePdfOffers(source, await pdfText(pdfUrl), pdfUrl);
}

async function previousDataset() {
  try {
    return JSON.parse(await readFile(outputPath, "utf8"));
  } catch {
    return { prices: [] };
  }
}

const previous = await previousDataset();
const results = await Promise.all(
  sources.map(async (source) => {
    try {
      const result = await scrape(source);
      if (result.found === 0)
        throw new Error("Nessuna offerta leggibile trovata");
      return { source, ok: true, ...result };
    } catch (error) {
      return {
        source,
        ok: false,
        found: 0,
        rows: [],
        error: error instanceof Error ? error.message : "Errore sconosciuto",
      };
    }
  }),
);

const retained = (previous.prices ?? []).filter((price) => {
  const result = results.find((entry) => entry.source.store === price.store);
  if (!result || result.ok) return false;
  return !price.valid_to || price.valid_to >= capturedAt.slice(0, 10);
});
const prices = dedupe([...retained, ...results.flatMap((entry) => entry.rows)]);
const statuses = results.map((result) => ({
  store: result.source.store,
  ok: result.ok,
  sourceUrl: result.source.url,
  sourceArea: result.source.area,
  productsFound: result.found,
  productsMapped: result.rows.length,
  ...(result.error ? { error: result.error.slice(0, 240) } : {}),
}));
statuses.push({
  store: "Despar",
  ok: true,
  sourceUrl: "https://shop.despar.com/spesa-consegna-domicilio/70037",
  sourceArea: "Despar Centro Sud · Corato (BA) · CAP 70037 · import Supabase",
  productsFound: 0,
  productsMapped: 0,
});

const dataset = {
  version: 1,
  generatedAt: capturedAt,
  prices,
  stores: statuses,
};
await mkdir(dirname(outputPath), { recursive: true });
const temporary = `${outputPath}.tmp`;
await writeFile(temporary, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
await rename(temporary, outputPath);

for (const status of statuses)
  console.log(
    `${status.ok ? "OK" : "ERRORE"} ${status.store}: ${status.productsMapped}/${status.productsFound}${status.error ? ` · ${status.error}` : ""}`,
  );
console.log(`Archivio: ${prices.length} prezzi in ${outputPath}`);
