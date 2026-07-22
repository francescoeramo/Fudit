import { describe, expect, it } from "vitest";
import { seedPrices } from "./seed";
import {
  isUncertainReceiptMatch,
  parseReceipt,
  receiptCatalogMatches,
} from "./receipt";
describe("parser scontrino", () => {
  it("legge i formati prezzo comuni", () => {
    expect(
      parseReceipt(
        `PASTA INTEGRALE 1,29 A\nLATTE UHT € 2. 49\n0123456789 POMODORI 2,99*\nCECI BIO EUR 0,89`,
      ),
    ).toEqual([
      { name: "PASTA INTEGRALE", price: 1.29 },
      { name: "LATTE UHT", price: 2.49 },
      { name: "POMODORI", price: 2.99 },
      { name: "CECI BIO", price: 0.89 },
    ]);
  });
  it("unisce descrizione e prezzo su righe separate", () => {
    expect(parseReceipt("MOZZARELLA FIORDILATTE\n1,79 A\nTOTALE 1,79")).toEqual(
      [{ name: "MOZZARELLA FIORDILATTE", price: 1.79 }],
    );
  });
  it("ignora totali e pagamenti", () => {
    expect(parseReceipt("TOTALE 12,40\nCONTANTI 20,00\nRESTO 7,60")).toEqual(
      [],
    );
  });
  it("ordina le corrispondenze e segnala risultati ambigui", () => {
    expect(
      receiptCatalogMatches("Pasta integrale", seedPrices)[0].item.id,
    ).toBe("pasta");
    const ambiguousCatalog = [
      { ...seedPrices[0], id: "latte-intero", name: "Latte intero" },
      { ...seedPrices[0], id: "latte-scremato", name: "Latte scremato" },
    ];
    expect(
      isUncertainReceiptMatch(receiptCatalogMatches("Latte", ambiguousCatalog)),
    ).toBe(true);
  });
});
