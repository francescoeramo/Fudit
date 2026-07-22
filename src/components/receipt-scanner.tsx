"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Plus, ScanLine, Trash2, Upload } from "lucide-react";
import {
  isUncertainReceiptMatch,
  normalizeReceiptName,
  parseReceipt,
  prepareReceiptImage,
  ReceiptImportRow,
  receiptCatalogMatches,
} from "@/lib/receipt";
import { PriceItem } from "@/lib/types";

export type { ReceiptImportRow } from "@/lib/receipt";

export default function ReceiptScanner({
  catalog,
  onImport,
}: {
  catalog: PriceItem[];
  onImport: (rows: ReceiptImportRow[]) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<ReceiptImportRow[]>([]);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);

  const review = useMemo(
    () =>
      rows.map((row) => {
        const matches = receiptCatalogMatches(row.name, catalog);
        const duplicate = rows.some(
          (other) =>
            other.id !== row.id &&
            ((row.matchedItemId && row.matchedItemId === other.matchedItemId) ||
              normalizeReceiptName(row.name) ===
                normalizeReceiptName(other.name)),
        );
        return {
          row,
          matches,
          duplicate,
          uncertain: isUncertainReceiptMatch(matches),
        };
      }),
    [catalog, rows],
  );

  const scan = async (file: File) => {
    if (busy) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Formato non supportato: usa JPG, PNG o WebP.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Immagine troppo grande: il limite è 8 MB.");
      return;
    }
    setBusy(true);
    setProgress(0);
    setError("");
    setRows([]);
    let worker:
      | Awaited<ReturnType<(typeof import("tesseract.js"))["createWorker"]>>
      | undefined;
    try {
      const source = await prepareReceiptImage(file);
      const { createWorker, PSM } = await import("tesseract.js");
      worker = await createWorker("ita", 1, {
        logger: (message) => {
          if (message.status === "recognizing text")
            setProgress(Math.round((message.progress ?? 0) * 100));
        },
      });
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SPARSE_TEXT,
        preserve_interword_spaces: "1",
      });
      const result = await worker.recognize(source);
      const importedAt = new Date().toISOString();
      const parsed = parseReceipt(result.data.text).map((row) => {
        const matches = receiptCatalogMatches(row.name, catalog);
        return {
          ...row,
          id: crypto.randomUUID(),
          matchedItemId:
            matches[0]?.confidence >= 0.45 ? matches[0].item.id : undefined,
          sourceLabel: file.name.slice(0, 120),
          importedAt,
        };
      });
      setRows(parsed);
      if (!parsed.length)
        setError(
          "Testo letto, ma nessuna riga prodotto/prezzo riconosciuta. Puoi riprovare ritagliando lo scontrino.",
        );
    } catch {
      setError(
        "Non è stato possibile leggere lo scontrino. Controlla la connessione e riprova.",
      );
    } finally {
      await worker?.terminate().catch(() => undefined);
      setBusy(false);
    }
  };

  const update = (id: string, patch: Partial<ReceiptImportRow>) =>
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );

  return (
    <div className="receipt" data-testid="receipt-scanner">
      <label className={`upload ${busy ? "disabled" : ""}`}>
        <Upload size={16} />
        {busy ? `Lettura ${progress}%` : "Carica foto scontrino"}
        <input
          aria-label="Foto scontrino"
          disabled={busy}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void scan(file);
          }}
        />
      </label>
      <p className="muted">
        OCR locale. Controlla nomi, prezzi e corrispondenze prima di importare.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {rows.length > 0 && (
        <>
          <div className="receipt-review" aria-label="Revisione scontrino">
            {review.map(({ row, matches, duplicate, uncertain }) => (
              <div className="receipt-review-row" key={row.id}>
                <input
                  aria-label={`Nome prodotto ${row.name}`}
                  value={row.name}
                  maxLength={80}
                  onChange={(event) =>
                    update(row.id, {
                      name: event.target.value,
                      matchedItemId: undefined,
                    })
                  }
                />
                <input
                  aria-label={`Prezzo prodotto ${row.name}`}
                  type="number"
                  min="0.01"
                  max="999.99"
                  step="0.01"
                  value={row.price}
                  onChange={(event) =>
                    update(row.id, {
                      price: Math.max(0, +event.target.value || 0),
                    })
                  }
                />
                <select
                  aria-label={`Corrispondenza catalogo ${row.name}`}
                  value={row.matchedItemId ?? ""}
                  onChange={(event) =>
                    update(row.id, {
                      matchedItemId: event.target.value || undefined,
                    })
                  }
                >
                  <option value="">Crea nuovo alimento</option>
                  {matches.map((match) => (
                    <option key={match.item.id} value={match.item.id}>
                      {match.item.name} ({Math.round(match.confidence * 100)}%)
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="row-delete"
                  aria-label={`Elimina riga ${row.name}`}
                  onClick={() =>
                    setRows((current) =>
                      current.filter((item) => item.id !== row.id),
                    )
                  }
                >
                  <Trash2 size={15} />
                </button>
                {(uncertain || duplicate) && (
                  <div className="receipt-flags">
                    {uncertain && (
                      <span className="match-warning">
                        <AlertTriangle size={12} /> Corrispondenza dubbia
                      </span>
                    )}
                    {duplicate && (
                      <span className="duplicate-warning">
                        Possibile duplicato
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="receipt-actions">
            <button
              type="button"
              className="button alt"
              onClick={() =>
                setRows((current) => [
                  ...current,
                  {
                    id: crypto.randomUUID(),
                    name: "",
                    price: 0,
                    sourceLabel:
                      current[0]?.sourceLabel ?? "Inserimento manuale",
                    importedAt:
                      current[0]?.importedAt ?? new Date().toISOString(),
                  },
                ])
              }
            >
              <Plus size={15} /> Aggiungi riga
            </button>
            <button
              className="button"
              disabled={rows.some((row) => !row.name.trim() || row.price <= 0)}
              onClick={() => {
                onImport(rows);
                setRows([]);
              }}
            >
              <ScanLine size={16} /> Importa {rows.length} righe verificate
            </button>
          </div>
        </>
      )}
    </div>
  );
}
