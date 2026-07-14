// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ReceiptScanner from "./receipt-scanner";
const terminate = vi.fn().mockResolvedValue(undefined);
vi.mock("tesseract.js", () => ({ PSM:{SPARSE_TEXT:"11"}, createWorker:vi.fn().mockResolvedValue({setParameters:vi.fn().mockResolvedValue(undefined),recognize:vi.fn().mockResolvedValue({data:{text:"PASTA 1,29 A\nLATTE 2,49"}}),terminate}) }));
describe("ReceiptScanner",()=>{
  it("rifiuta file non supportati",async()=>{render(<ReceiptScanner onImport={vi.fn()}/>);fireEvent.change(screen.getByLabelText("Foto scontrino"),{target:{files:[new File(["x"],"note.txt",{type:"text/plain"})]}});expect(await screen.findByRole("alert")).toHaveTextContent("Formato non supportato")});
  it("legge e importa le righe",async()=>{const onImport=vi.fn();render(<ReceiptScanner onImport={onImport}/>);fireEvent.change(screen.getByLabelText("Foto scontrino"),{target:{files:[new File(["image"],"receipt.png",{type:"image/png"})]}});await waitFor(()=>expect(screen.getByText("PASTA")).toBeInTheDocument());fireEvent.click(screen.getByRole("button",{name:"Importa 2 righe"}));expect(onImport).toHaveBeenCalledWith([{name:"PASTA",price:1.29},{name:"LATTE",price:2.49}]);expect(terminate).toHaveBeenCalled()});
});
