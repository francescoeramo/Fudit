import { normalizeReceiptName, ReceiptRow } from "./receipt";

export interface QualityReport {
  expected: number;
  recognized: number;
  matched: number;
  precision: number;
  recall: number;
  f1: number;
}

export const measureReceiptQuality = (
  expected: ReceiptRow[],
  recognized: ReceiptRow[],
): QualityReport => {
  const used = new Set<number>();
  let matched = 0;
  expected.forEach((target) => {
    const index = recognized.findIndex(
      (row, rowIndex) =>
        !used.has(rowIndex) &&
        normalizeReceiptName(row.name) === normalizeReceiptName(target.name) &&
        Math.abs(row.price - target.price) <= 0.01,
    );
    if (index >= 0) {
      used.add(index);
      matched += 1;
    }
  });
  const precision = recognized.length ? matched / recognized.length : 0;
  const recall = expected.length ? matched / expected.length : 0;
  return {
    expected: expected.length,
    recognized: recognized.length,
    matched,
    precision,
    recall,
    f1:
      precision + recall ? (2 * precision * recall) / (precision + recall) : 0,
  };
};
