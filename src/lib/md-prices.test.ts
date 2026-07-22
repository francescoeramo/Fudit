import { describe, expect, it } from "vitest";
import { mergeMdPrices, MdRemotePrice } from "./md-prices";
import { seedPrices } from "./seed";

const remote = (overrides: Partial<MdRemotePrice> = {}): MdRemotePrice => ({
  catalog_id: "riso",
  name: "Riso Arborio",
  package_quantity: 1000,
  package_unit: "g",
  price: 1.79,
  reference_price: 1.79,
  is_promotion: true,
  valid_from: "2026-07-14",
  valid_to: "2026-07-26",
  captured_at: "2026-07-22T18:00:00.000Z",
  source_url: "https://volantino.mdspa.it/test.html",
  source_label: "Volantino ufficiale MD Sud",
  source_area: "MD Sud",
  ...overrides,
});

describe("mergeMdPrices", () => {
  it("applica il prezzo MD corrente e la confezione specifica", () => {
    const result = mergeMdPrices(
      seedPrices,
      [remote()],
      new Date("2026-07-22"),
    );
    const rice = result.find((item) => item.id === "riso")!;
    expect(rice.stores.MD).toBe(1.79);
    expect(rice.packageQuantities?.MD).toBe(1000);
    expect(rice.priceSources?.MD?.kind).toBe("scraped");
    expect(rice.confirmedStores?.MD).toBe(true);
  });

  it("non sovrascrive un prezzo inserito dall'utente", () => {
    const source = seedPrices.find((item) => item.id === "riso")!;
    const local = {
      ...source,
      stores: { ...source.stores, MD: 2.5 },
      confirmedStores: { MD: true },
      priceUpdatedAt: { MD: "2026-07-21T10:00:00.000Z" },
      priceSources: {
        MD: {
          kind: "manual" as const,
          importedAt: "2026-07-21T10:00:00.000Z",
        },
      },
    };
    const result = mergeMdPrices([local], [remote()], new Date("2026-07-22"));
    expect(result[0].stores.MD).toBe(2.5);
    expect(result[0].priceSources?.MD?.kind).toBe("manual");
  });

  it("ignora i prezzi scaduti", () => {
    const result = mergeMdPrices(
      seedPrices,
      [remote({ valid_to: "2026-07-20" })],
      new Date("2026-07-22"),
    );
    expect(
      result.find((item) => item.id === "riso")?.confirmedStores?.MD,
    ).not.toBe(true);
  });

  it("declassa a stima un prezzo importato il cui volantino è scaduto", () => {
    const source = mergeMdPrices(
      seedPrices,
      [remote({ valid_to: "2026-07-20" })],
      new Date("2026-07-18"),
    );
    const result = mergeMdPrices(source, [], new Date("2026-07-22"));
    const rice = result.find((item) => item.id === "riso")!;
    expect(rice.stores.MD).toBeUndefined();
    expect(rice.confirmedStores?.MD).toBe(false);
    expect(rice.priceSources?.MD?.validTo).toBe("2026-07-20");
  });
});
