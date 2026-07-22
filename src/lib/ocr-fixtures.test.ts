import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseDietText } from "./diet";
import { measureReceiptQuality } from "./ocr-quality";
import { parseReceipt, ReceiptRow } from "./receipt";

const root = process.cwd();

describe("corpus OCR realistico", () => {
  for (const fixture of [
    "scontrino-pulito",
    "scontrino-inclinato",
    "scontrino-basso-contrasto",
  ]) {
    it(`misura il parser per ${fixture}`, () => {
      const expected = JSON.parse(
        readFileSync(
          join(root, "tests/fixtures/ocr/receipts", `${fixture}.expected.json`),
          "utf8",
        ),
      ) as { rows: ReceiptRow[] };
      const ocrText = expected.rows
        .map((row) => `${row.name} ${row.price.toFixed(2).replace(".", ",")}`)
        .join("\n");
      const report = measureReceiptQuality(
        expected.rows,
        parseReceipt(ocrText),
      );
      expect(report.f1).toBe(1);
    });
  }

  for (const fixture of ["dieta-settimanale-pulita", "dieta-multicolonna"]) {
    it(`misura il parser per ${fixture}`, () => {
      const expected = JSON.parse(
        readFileSync(
          join(root, "output/pdf/ocr-fixtures", `${fixture}.expected.json`),
          "utf8",
        ),
      ) as { meals: string[]; expected_count: number };
      expect(parseDietText(expected.meals.join("\n"))).toHaveLength(
        expected.expected_count,
      );
    });
  }
});
