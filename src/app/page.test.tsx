// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { recipes, seedPrices } from "@/lib/seed";
import { STORAGE_KEY, StorageEnvelope } from "@/lib/storage";
import Home from "./page";
const storedData = () =>
  (JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as StorageEnvelope)
    .data;
beforeEach(() => {
  localStorage.clear();
  let id = 0;
  vi.spyOn(globalThis.crypto, "randomUUID").mockImplementation(
    () => `00000000-0000-4000-8000-${String(++id).padStart(12, "0")}`,
  );
});
describe("flussi principali Fudit", () => {
  it("genera e naviga in tutte le sezioni", async () => {
    render(<Home />);
    await screen.findByText("Il tuo piano");
    expect(screen.getByRole("option", { name: "MD" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Genera piano" }));
    expect(await screen.findByText("Lun")).toBeInTheDocument();
    for (const section of [
      "Spesa",
      "Ricette",
      "Dieta",
      "Prezzi",
      "Impostazioni",
      "Pianifica",
    ])
      fireEvent.click(screen.getByRole("button", { name: section }));
    expect(screen.getByText("Preferenze")).toBeInTheDocument();
  });
  it("aggiunge modifica categorizza e rimuove dalla spesa", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await screen.findByText("Il tuo piano");
    await user.click(screen.getByRole("button", { name: "Genera piano" }));
    await screen.findByText("Lun");
    await user.click(screen.getByRole("button", { name: "Spesa" }));
    await user.click(screen.getByTestId("add-shopping"));
    const name = screen.getByLabelText("Nome Nuovo elemento");
    expect(name).toBeVisible();
    await user.clear(name);
    await user.type(name, "Limoni");
    fireEvent.blur(name, { relatedTarget: document.body });
    expect(screen.getAllByText("Frutta e verdura").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "Elimina Limoni" }));
    expect(screen.queryByDisplayValue("Limoni")).not.toBeInTheDocument();
  });
  it("aggiunge al catalogo e attiva la dark mode", async () => {
    render(<Home />);
    await screen.findByText("Il tuo piano");
    fireEvent.click(screen.getByLabelText("Cambia tema"));
    expect(document.querySelector("main")).toHaveClass("dark");
    fireEvent.click(screen.getByRole("button", { name: "Genera piano" }));
    await screen.findByText("Lun");
    fireEvent.click(screen.getByRole("button", { name: "Prezzi" }));
    fireEvent.click(screen.getByTestId("add-catalog"));
    expect(screen.getByDisplayValue("Nuovo ingrediente")).toBeVisible();
    await waitFor(() =>
      expect(
        storedData().catalog.some((item) => item.name === "Nuovo ingrediente"),
      ).toBe(true),
    );
  });
  it("consente di svuotare budget e persone e blocca la generazione a zero", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await screen.findByText("Il tuo piano");
    const budget = screen.getByLabelText("Budget settimanale (€)");
    const people = screen.getByLabelText("Persone");
    await user.clear(budget);
    await user.clear(people);
    expect(budget).toHaveValue(null);
    expect(people).toHaveValue(null);
    await user.click(screen.getByRole("button", { name: "Genera piano" }));
    expect(
      screen.getByText(
        "Inserisci un budget e un numero di persone maggiori di zero.",
      ),
    ).toBeInTheDocument();
    await user.type(people, "3");
    expect(people).toHaveValue(3);
  });

  it("archivia ogni piano e permette di selezionarlo in home, spesa e prezzi", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await screen.findByText("Il tuo piano");
    await user.click(screen.getByRole("button", { name: "Genera piano" }));
    await screen.findByText("Lun");
    await user.selectOptions(screen.getByRole("combobox"), "Despar");
    await user.click(screen.getByRole("button", { name: "Genera piano" }));

    await waitFor(() =>
      expect(
        document.querySelectorAll(".plan-picker.cards .plan-option"),
      ).toHaveLength(2),
    );
    await waitFor(() => expect(storedData().plans).toHaveLength(2));

    await user.click(screen.getByRole("button", { name: "Spesa" }));
    expect(
      document.querySelectorAll(".plan-picker.list .plan-option"),
    ).toHaveLength(2);
    const lidlPlan = Array.from(
      document.querySelectorAll<HTMLButtonElement>(
        ".plan-picker.list .plan-option",
      ),
    ).find((button) => button.textContent?.includes("Lidl"));
    expect(lidlPlan).toBeDefined();
    await user.click(lidlPlan!);
    expect(document.querySelector(".store-context strong")).toHaveTextContent(
      "Lidl",
    );

    await user.click(screen.getByRole("button", { name: "Prezzi" }));
    expect(
      document.querySelectorAll(".plan-picker.list .plan-option"),
    ).toHaveLength(2);
  });

  it("salva la durata scelta per l'eliminazione automatica", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await screen.findByText("Il tuo piano");
    await user.click(screen.getByRole("button", { name: "Impostazioni" }));
    const retention = screen.getByLabelText("Eliminazione automatica");
    await user.selectOptions(retention, "15");
    await waitFor(() => expect(storedData().retention).toBe(15));
  });

  it("mostra il prezzo per porzione solo dopo piano e prezzi reali", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await screen.findByText("Il tuo piano");
    await user.click(screen.getByRole("button", { name: "Ricette" }));
    const recipeCard = screen.getByText(recipes[0].title).closest("article")!;
    expect(recipeCard.querySelector(".recipe-price.pending")).toHaveTextContent(
      "genera un piano",
    );

    await user.click(screen.getByRole("button", { name: "Pianifica" }));
    await user.click(screen.getByRole("button", { name: "Genera piano" }));
    await screen.findByText("Lun");
    await user.click(screen.getByRole("button", { name: "Prezzi" }));
    for (const ingredient of recipes[0].ingredients) {
      const price = seedPrices.find((item) => item.id === ingredient.id)!;
      fireEvent.change(screen.getByLabelText(`prezzo ${price.name}`), {
        target: { value: "2" },
      });
    }
    await user.click(screen.getByRole("button", { name: "Ricette" }));
    const confirmedCard = screen
      .getByText(recipes[0].title)
      .closest("article")!;
    expect(
      confirmedCard.querySelector(".recipe-price.confirmed"),
    ).toHaveTextContent("prezzi reali");
  });

  it("segnala quando il browser rifiuta il salvataggio", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await screen.findByText("Il tuo piano");
    const storageSpy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new DOMException("Quota esaurita", "QuotaExceededError");
      });
    await user.click(screen.getByLabelText("Cambia tema"));
    expect(await screen.findByText("Modifiche non salvate")).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent("Spazio del browser");
    storageSpy.mockRestore();
  });
});
