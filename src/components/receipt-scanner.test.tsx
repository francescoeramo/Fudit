// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { seedPrices } from "@/lib/seed";
import ReceiptScanner from "./receipt-scanner";
const terminate = vi.fn().mockResolvedValue(undefined);
vi.mock("tesseract.js", () => ({
  PSM: { SPARSE_TEXT: "11" },
  createWorker: vi.fn().mockResolvedValue({
    setParameters: vi.fn().mockResolvedValue(undefined),
    recognize: vi
      .fn()
      .mockResolvedValue({ data: { text: "PASTA 1,29 A\nLATTE 2,49" } }),
    terminate,
  }),
}));
describe("ReceiptScanner", () => {
  it("rifiuta file non supportati", async () => {
    render(<ReceiptScanner catalog={[]} onImport={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Foto scontrino"), {
      target: { files: [new File(["x"], "note.txt", { type: "text/plain" })] },
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Formato non supportato",
    );
  });
  it("legge e importa le righe", async () => {
    const onImport = vi.fn();
    render(<ReceiptScanner catalog={[]} onImport={onImport} />);
    fireEvent.change(screen.getByLabelText("Foto scontrino"), {
      target: {
        files: [new File(["image"], "receipt.png", { type: "image/png" })],
      },
    });
    await waitFor(() =>
      expect(screen.getByDisplayValue("PASTA")).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByLabelText("Prezzo prodotto PASTA"), {
      target: { value: "1.49" },
    });
    fireEvent.change(screen.getByLabelText("Nome prodotto PASTA"), {
      target: { value: "Pasta corretta" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Importa 2 righe verificate" }),
    );
    expect(onImport).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ name: "Pasta corretta", price: 1.49 }),
        expect.objectContaining({ name: "LATTE", price: 2.49 }),
      ]),
    );
    expect(terminate).toHaveBeenCalled();
  });
  it("segnala righe che potrebbero aggiornare lo stesso prodotto", async () => {
    render(
      <ReceiptScanner
        catalog={[
          {
            ...seedPrices[0],
            id: "pasta-latte",
            name: "Pasta latte",
          },
        ]}
        onImport={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Foto scontrino"), {
      target: {
        files: [new File(["image"], "receipt.png", { type: "image/png" })],
      },
    });
    await waitFor(() =>
      expect(screen.getAllByText("Possibile duplicato")).toHaveLength(2),
    );
  });
});
