import { describe, expect, it } from "vitest";
import { seedPrices } from "./seed";
import { mergeFlyerPrices, normalizeFlyerDataset } from "./flyer-prices";

const dataset = {
  version: 1,
  generatedAt: "2026-08-11T08:00:00.000Z",
  stores: [
    {
      store: "Lidl",
      ok: true,
      sourceUrl: "https://www.lidl.it/c/i-nostri-volantini/",
      sourceArea: "Lidl Italia",
      productsFound: 20,
      productsMapped: 1,
    },
  ],
  prices: [
    {
      store: "Lidl",
      catalog_id: "pomodori",
      name: "Pomodori ciliegino 500 g",
      package_quantity: 500,
      package_unit: "g",
      price: 1.49,
      reference_price: 2.98,
      is_promotion: true,
      valid_from: "2026-08-10",
      valid_to: "2026-08-16",
      captured_at: "2026-08-11T08:00:00.000Z",
      source_url: "https://www.lidl.it/c/i-nostri-volantini/",
      source_label: "Volantino ufficiale Lidl",
      source_area: "Lidl Italia",
    },
  ],
} as const;

describe("flyer prices", () => {
  it("normalizza e applica un prezzo corrente alla relativa insegna", () => {
    const normalized = normalizeFlyerDataset(dataset);
    const merged = mergeFlyerPrices(
      seedPrices,
      normalized,
      new Date("2026-08-11T12:00:00.000Z"),
    );
    const tomatoes = merged.find((item) => item.id === "pomodori")!;
    expect(tomatoes.stores.Lidl).toBe(1.49);
    expect(tomatoes.packageQuantities?.Lidl).toBe(500);
    expect(tomatoes.priceSources?.Lidl?.kind).toBe("scraped");
  });

  it("ignora righe malformate e insegne non previste", () => {
    const normalized = normalizeFlyerDataset({
      ...dataset,
      prices: [
        ...dataset.prices,
        { ...dataset.prices[0], store: "Altro" },
        { ...dataset.prices[0], price: -1 },
      ],
    });
    expect(normalized.prices).toHaveLength(1);
  });
});
