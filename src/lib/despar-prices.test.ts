import { describe, expect, it } from "vitest";
import { DesparRemotePrice, mergeDesparPrices } from "./despar-prices";
import { seedPrices } from "./seed";
import { normalizeRetailerPrice } from "./retailer-prices";

const remote = (
  overrides: Partial<DesparRemotePrice> = {},
): DesparRemotePrice => ({
  catalog_id: "pasta",
  name: "Pasta mista Despar 500 g",
  package_quantity: 500,
  package_unit: "g",
  price: 0.55,
  reference_price: 1.1,
  is_promotion: false,
  valid_from: null,
  valid_to: null,
  captured_at: "2026-07-22T18:00:00.000Z",
  source_url: "https://shop.despar.com/prodotto-test",
  source_label: "Catalogo ufficiale Despar a Casa",
  source_area: "Despar Centro Sud · Corato (BA) · CAP 70037",
  ...overrides,
});

describe("mergeDesparPrices", () => {
  it("normalizza i numeri JSON restituiti da Postgres", () => {
    const normalized = normalizeRetailerPrice({
      ...remote(),
      price: "0.55",
      package_quantity: "500.000",
      reference_price: "1.10",
    });
    expect(normalized?.price).toBe(0.55);
    expect(normalized?.package_quantity).toBe(500);
    expect(normalized?.reference_price).toBe(1.1);
  });

  it("rifiuta fonti non HTTPS o righe numeriche non valide", () => {
    expect(
      normalizeRetailerPrice(remote({ source_url: "javascript:alert(1)" })),
    ).toBeNull();
    expect(normalizeRetailerPrice(remote({ price: Number.NaN }))).toBeNull();
  });

  it("applica il prezzo Despar corrente e la confezione specifica", () => {
    const result = mergeDesparPrices(
      seedPrices,
      [remote()],
      new Date("2026-07-22"),
    );
    const pasta = result.find((item) => item.id === "pasta")!;
    expect(pasta.stores.Despar).toBe(0.55);
    expect(pasta.packageQuantities?.Despar).toBe(500);
    expect(pasta.priceSources?.Despar?.kind).toBe("scraped");
    expect(pasta.confirmedStores?.Despar).toBe(true);
  });

  it("non sovrascrive prezzi manuali o importati da scontrino", () => {
    const source = seedPrices.find((item) => item.id === "pasta")!;
    const local = {
      ...source,
      stores: { ...source.stores, Despar: 1.25 },
      confirmedStores: { Despar: true },
      priceUpdatedAt: { Despar: "2026-07-21T10:00:00.000Z" },
      priceSources: {
        Despar: {
          kind: "receipt-ocr" as const,
          label: "Scontrino corretto",
          importedAt: "2026-07-21T10:00:00.000Z",
        },
      },
    };
    const result = mergeDesparPrices(
      [local],
      [remote()],
      new Date("2026-07-22"),
    );
    expect(result[0].stores.Despar).toBe(1.25);
    expect(result[0].priceSources?.Despar?.kind).toBe("receipt-ocr");
  });

  it("declassa a stima un prezzo automatico più vecchio di 14 giorni", () => {
    const imported = mergeDesparPrices(
      seedPrices,
      [remote()],
      new Date("2026-07-22"),
    );
    const result = mergeDesparPrices(imported, [], new Date("2026-08-06"));
    const pasta = result.find((item) => item.id === "pasta")!;
    expect(pasta.stores.Despar).toBeUndefined();
    expect(pasta.confirmedStores?.Despar).toBe(false);
  });
});
