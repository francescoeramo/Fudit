const decodeHtml = (value = "") =>
  String(value)
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&euro;|&#8364;/gi, "€");

const plainText = (value = "") =>
  decodeHtml(String(value).replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

const parseEuro = (value) => {
  const match = String(value ?? "").match(/\d{1,3}(?:[.,]\d{1,2})/);
  return match ? Number(match[0].replace(",", ".")) : 0;
};

const packageValue = (amount, unit, multiplier = 1) => {
  const quantity = Number(String(amount).replace(",", "."));
  const count = Number(multiplier);
  if (!Number.isFinite(quantity) || quantity <= 0 || count <= 0) return null;
  if (unit === "KG") return { quantity: quantity * 1000 * count, unit: "g" };
  if (unit === "LT" || unit === "L")
    return { quantity: quantity * 1000 * count, unit: "ml" };
  if (unit === "CL") return { quantity: quantity * 10 * count, unit: "ml" };
  if (unit === "ML") return { quantity: quantity * count, unit: "ml" };
  if (unit === "PZ" || unit === "PEZZI")
    return { quantity: quantity * count, unit: "pz" };
  return { quantity: quantity * count, unit: "g" };
};

/** Interpreta confezioni e prezzi al peso presenti nelle schede Coop. */
export function parseCoopPackage(value) {
  const text = String(value ?? "").toUpperCase();
  const multipacks = [
    ...text.matchAll(
      /(\d+)\s*[X×]\s*(\d+(?:[.,]\d+)?)\s*(KG|GR|G|ML|CL|LT|L|PZ|PEZZI)\b/g,
    ),
  ];
  const multipack = multipacks.at(-1);
  if (multipack) return packageValue(multipack[2], multipack[3], multipack[1]);

  const packs = [
    ...text.matchAll(
      /(\d+(?:[.,]\d+)?)\s*(KG|GR|G|ML|CL|LT|L|PZ|PEZZI)(?:\s*[X×]\s*(\d+))?\b/g,
    ),
  ];
  const pack = packs.at(-1);
  if (pack) return packageValue(pack[1], pack[2], pack[3] ?? 1);
  if (/\bAL\s+KG\b/.test(text)) return { quantity: 1000, unit: "g" };
  if (/\bALL['’]?ETTO\b/.test(text)) return { quantity: 100, unit: "g" };
  if (/\bAL\s+LITRO\b/.test(text)) return { quantity: 1000, unit: "ml" };
  return null;
}

/** Estrae le schede pubbliche restituite da VolantinoPiù, senza rete. */
export function parseCoopOfferCards(fragment) {
  return String(fragment ?? "")
    .split(/<div class=['"]col space p-0['"]>/i)
    .slice(1)
    .map((block) => ({
      name: plainText(
        block.match(
          /class=['"]card-title[^'"]*['"][^>]*>([\s\S]*?)<\/h6>/i,
        )?.[1],
      ),
      details: plainText(
        block.match(/class=['"]card-text[^'"]*['"][^>]*>([\s\S]*?)<\/p>/i)?.[1],
      ),
      price: parseEuro(
        plainText(
          block.match(
            /class=['"]product-price[^'"]*['"][^>]*>([\s\S]*?)<\/div>/i,
          )?.[1],
        ),
      ),
    }))
    .filter((offer) => offer.name && offer.details && offer.price > 0);
}
