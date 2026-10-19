import { describe, expect, it } from "vitest";
import {
  parseAldiCards,
  parseCarrefourCards,
} from "./lib/public-catalog-parser.mjs";

describe("cataloghi pubblici", () => {
  it("legge nome, confezione e prezzo Carrefour dagli attributi JSON", () => {
    const json = JSON.stringify({
      id: "800123",
      name: "Riso 1 kg",
      price: "2.39",
      metric19: "2.99",
      dimension52: "1000 g",
    }).replaceAll('"', "&quot;");
    expect(
      parseCarrefourCards(`<div data-product-json="${json}"></div>`),
    ).toEqual([
      {
        name: "Riso 1 kg",
        details: "1000 g",
        price: 2.39,
        sourceUrl: "https://www.carrefour.it/p/800123.html",
        isPromotion: true,
      },
    ]);
    expect(
      parseCarrefourCards('<div data-product-json="broken"></div>'),
    ).toEqual([]);
  });
  it("ignora offerte ALDI future e legge solo prezzo e confezione della stessa scheda", () => {
    const card =
      '<div id="product-tile-1"><a href="/prodotto/riso-1"><div data-test="product-tile__name"><p>Riso</p></div><div data-test="product-tile__unit-of-measurement"><p>1 kg</p></div><div data-test="product-tile__on-sale-label">Disponibile dal 19.10.2026</div><span class="base-price__regular"><span>2,39 €</span></span></a></div>';
    expect(parseAldiCards(card, "2026-10-18")).toEqual([]);
    expect(parseAldiCards(card, "2026-10-19")[0]).toMatchObject({
      name: "Riso",
      details: "1 kg",
      price: 2.39,
      validFrom: "2026-10-19",
    });
  });
});
