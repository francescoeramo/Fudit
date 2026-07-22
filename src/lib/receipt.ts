import { PriceItem } from "./types";

export type ReceiptRow = { name: string; price: number };
export type ReceiptMatch = { item: PriceItem; confidence: number };
export interface ReceiptImportRow extends ReceiptRow {
  id: string;
  matchedItemId?: string;
  sourceLabel: string;
  importedAt: string;
}

const ignored =
  /^(totale|subtotale|iva|imponibile|contanti|carta|bancomat|resto|sconto|pagamento|numero|documento|transazione|eur\b)/i;

const cleanName = (value: string) =>
  value
    .replace(/^\s*(?:\d{8,}|\d+\s*[xX]\s*)/, "")
    .replace(/[^a-zàèéìòù0-9% .'/-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

export const normalizeReceiptName = (value: string) =>
  cleanName(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(?:bio|gr|g|kg|ml|lt|l|pz)\b/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokens = (value: string) =>
  normalizeReceiptName(value)
    .split(" ")
    .filter((token) => token.length > 2);

export const receiptCatalogMatches = (
  name: string,
  catalog: PriceItem[],
): ReceiptMatch[] => {
  const normalized = normalizeReceiptName(name);
  const nameTokens = tokens(name);
  if (!normalized) return [];
  return catalog
    .map((item) => {
      const candidate = normalizeReceiptName(item.name);
      const candidateTokens = tokens(item.name);
      const common = nameTokens.filter((token) =>
        candidateTokens.some(
          (other) =>
            token === other ||
            token.startsWith(other) ||
            other.startsWith(token),
        ),
      ).length;
      const union = new Set([...nameTokens, ...candidateTokens]).size || 1;
      const confidence =
        normalized === candidate
          ? 1
          : normalized.includes(candidate) || candidate.includes(normalized)
            ? 0.82
            : common / union;
      return { item, confidence };
    })
    .filter((match) => match.confidence >= 0.2)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 4);
};

export const isUncertainReceiptMatch = (matches: ReceiptMatch[]) =>
  Boolean(
    matches.length &&
    (matches[0].confidence < 0.72 ||
      (matches[1] && matches[0].confidence - matches[1].confidence < 0.12)),
  );

const priceAtEnd = /(?:€|EUR)?\s*(\d{1,3})\s*[,.]\s*(\d{2})\s*[A-Z*]?\s*$/i;

export const parseReceipt = (text: string): ReceiptRow[] => {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/[|]/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const rows: ReceiptRow[] = [];
  let pendingName = "";

  for (const line of lines) {
    const match = line.match(priceAtEnd);
    if (!match) {
      const candidate = cleanName(line);
      if (
        candidate.length >= 3 &&
        /[a-zàèéìòù]/i.test(candidate) &&
        !ignored.test(candidate)
      )
        pendingName = candidate;
      continue;
    }

    const price = Number(`${match[1]}.${match[2]}`);
    const inlineName = cleanName(line.slice(0, match.index));
    const name =
      inlineName.length >= 3 && /[a-zàèéìòù]/i.test(inlineName)
        ? inlineName
        : pendingName;
    pendingName = "";
    if (
      !name ||
      ignored.test(name) ||
      !Number.isFinite(price) ||
      price <= 0 ||
      price > 999.99
    )
      continue;
    rows.push({ name, price });
  }

  return rows.slice(0, 100);
};

export const prepareReceiptImage = async (file: File): Promise<Blob | File> => {
  if (
    typeof createImageBitmap !== "function" ||
    typeof document === "undefined"
  )
    return file;
  const image = await createImageBitmap(file);
  const targetWidth = Math.min(2200, Math.max(1400, image.width));
  const scale = targetWidth / image.width;
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    image.close();
    return file;
  }
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < pixels.data.length; index += 4) {
    const gray =
      pixels.data[index] * 0.299 +
      pixels.data[index + 1] * 0.587 +
      pixels.data[index + 2] * 0.114;
    const contrasted = Math.max(0, Math.min(255, (gray - 128) * 1.55 + 128));
    pixels.data[index] =
      pixels.data[index + 1] =
      pixels.data[index + 2] =
        contrasted;
  }
  context.putImageData(pixels, 0, 0);
  return await new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(blob ?? file), "image/png", 0.95),
  );
};
