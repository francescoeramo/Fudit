import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  parseCoopOfferCards,
  parseCoopPackage,
} from "./lib/coop-lombardia-parser.mjs";

describe("parser Coop Lombardia", () => {
  it("estrae nome, confezione e prezzo dalla fixture VolantinoPiù", async () => {
    const html = await readFile(
      `${process.cwd()}/tests/fixtures/coop-lombardia-offers.html`,
      "utf8",
    );
    expect(parseCoopOfferCards(html)).toEqual([
      {
        name: "RISO ARBORIO GALLO",
        details: "confezione 1 KG",
        price: 2.39,
      },
      {
        name: "FARINA DI GRANO TENERO TIPO 00 COOP",
        details: "1 kg",
        price: 0.69,
      },
    ]);
  });

  it("interpreta multipack e prodotti venduti al peso", () => {
    expect(parseCoopPackage("3 x 125 g")).toEqual({
      quantity: 375,
      unit: "g",
    });
    expect(parseCoopPackage("di pollo, al kg")).toEqual({
      quantity: 1000,
      unit: "g",
    });
    expect(parseCoopPackage("all'etto")).toEqual({
      quantity: 100,
      unit: "g",
    });
    expect(parseCoopPackage("bottiglia, 1 lt")).toEqual({
      quantity: 1000,
      unit: "ml",
    });
  });
});
