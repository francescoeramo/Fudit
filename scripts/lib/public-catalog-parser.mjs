const decode = (s) =>
  String(s ?? "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&euro;/g, "€");
const plain = (s) =>
  decode(s)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Public, server-rendered product cards only; no private endpoints or cookies. */
export function parseCarrefourCards(html) {
  return [...html.matchAll(/data-product-json="([^"]+)"/g)].flatMap((match) => {
    try {
      const p = JSON.parse(decode(match[1]));
      if (!p.id || !p.name || !(Number(p.price) > 0)) return [];
      return [
        {
          name: p.name,
          details: p.dimension52,
          price: Number(p.price),
          sourceUrl: `https://www.carrefour.it/p/${encodeURIComponent(p.id)}.html`,
          isPromotion: Number(p.metric19) > Number(p.price),
        },
      ];
    } catch {
      return [];
    }
  });
}

export function parseAldiCards(html, today) {
  return html
    .split(/<div id="product-tile-/)
    .slice(1)
    .flatMap((block) => {
      const field = (key) =>
        plain(
          block.match(
            new RegExp(
              `data-test="product-tile__${key}"[^>]*>([\\s\\S]*?)<\\/div>`,
            ),
          )?.[1],
        );
      const name = field("name");
      const details = field("unit-of-measurement");
      const priceText =
        block.match(
          /class="base-price__reduced"[^>]*>([\s\S]*?)<\/span>/,
        )?.[1] ??
        block.match(/class="base-price__regular"[^>]*>([\s\S]*?)<\/span>/)?.[1];
      const amount = plain(priceText).match(/(\d+)[,.](\d{2})\s*€/);
      const path = block.match(/href="(\/prodotto\/[^"?]+)"/)?.[1];
      const date = field("on-sale-label").match(/(\d{2})\.(\d{2})\.(\d{4})/);
      const validFrom = date ? `${date[3]}-${date[2]}-${date[1]}` : null;
      if (
        !name ||
        !details ||
        !amount ||
        !path ||
        (validFrom && validFrom > today)
      )
        return [];
      return [
        {
          name,
          details,
          price: Number(`${amount[1]}.${amount[2]}`),
          sourceUrl: `https://www.aldi.it${path}`,
          validFrom,
        },
      ];
    });
}
