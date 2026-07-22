// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { seedPrices } from "@/lib/seed";
import { Store } from "@/lib/types";
import DietImporter from "./diet-importer";

const stores: Store[] = [
  "Esselunga",
  "Lidl",
  "Eurospin",
  "Coop",
  "Conad",
  "Vivo",
  "Contè",
  "Despar",
  "Penny",
  "MD",
  "Altro",
];

beforeEach(() => {
  let id = 0;
  vi.spyOn(globalThis.crypto, "randomUUID").mockImplementation(
    () => `00000000-0000-4000-8000-${String(++id).padStart(12, "0")}`,
  );
});

describe("DietImporter", () => {
  it("consente la revisione manuale e crea un piano con prezzi", async () => {
    const user = userEvent.setup();
    const onGenerated = vi.fn();
    render(
      <DietImporter
        stores={stores}
        catalog={seedPrices}
        defaultStore="MD"
        defaultPeople={1}
        defaultBudget={60}
        onGenerated={onGenerated}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Inserisci manualmente" }),
    );
    const food = screen.getByLabelText(/^Alimento/);
    await user.type(food, "pasta");
    await user.click(
      screen.getByRole("button", { name: "Crea piano e stima prezzi" }),
    );

    expect(onGenerated).toHaveBeenCalledOnce();
    expect(onGenerated.mock.calls[0][0].plan).toMatchObject({
      source: "diet-pdf",
      store: "MD",
      people: 1,
    });
    expect(onGenerated.mock.calls[0][0].plan.total).toBeGreaterThan(0);
  });

  it("accetta il campo persone vuoto e mostra una validazione", async () => {
    const user = userEvent.setup();
    const onGenerated = vi.fn();
    render(
      <DietImporter
        stores={stores}
        catalog={seedPrices}
        defaultStore="Lidl"
        defaultPeople={1}
        defaultBudget={50}
        onGenerated={onGenerated}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: "Inserisci manualmente" }),
    );
    fireEvent.change(screen.getByLabelText("Persone"), {
      target: { value: "" },
    });
    await user.click(
      screen.getByRole("button", { name: "Crea piano e stima prezzi" }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Inserisci almeno una persona.",
    );
    expect(onGenerated).not.toHaveBeenCalled();
  });
});
