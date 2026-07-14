export type ReceiptRow = { name: string; price: number };

const ignored = /^(totale|subtotale|iva|imponibile|contanti|carta|bancomat|resto|sconto|pagamento|numero|documento|transazione|eur\b)/i;
const cleanName = (value: string) => value
  .replace(/^\s*(?:\d{8,}|\d+\s*[xX]\s*)/, "")
  .replace(/[^a-zàèéìòù0-9% .'/-]/gi, " ")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, 80);

const priceAtEnd = /(?:€|EUR)?\s*(\d{1,3})\s*[,.]\s*(\d{2})\s*[A-Z*]?\s*$/i;

export const parseReceipt = (text: string): ReceiptRow[] => {
  const lines = text.replace(/\r/g, "").split("\n").map(line => line.replace(/[|]/g, " ").replace(/\s+/g, " ").trim()).filter(Boolean);
  const rows: ReceiptRow[] = [];
  let pendingName = "";

  for (const line of lines) {
    const match = line.match(priceAtEnd);
    if (!match) {
      const candidate = cleanName(line);
      if (candidate.length >= 3 && /[a-zàèéìòù]/i.test(candidate) && !ignored.test(candidate)) pendingName = candidate;
      continue;
    }

    const price = Number(`${match[1]}.${match[2]}`);
    const inlineName = cleanName(line.slice(0, match.index));
    const name = inlineName.length >= 3 && /[a-zàèéìòù]/i.test(inlineName) ? inlineName : pendingName;
    pendingName = "";
    if (!name || ignored.test(name) || !Number.isFinite(price) || price <= 0 || price > 999.99) continue;
    rows.push({ name, price });
  }

  return rows.slice(0, 100);
};

export const prepareReceiptImage = async (file: File): Promise<Blob | File> => {
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return file;
  const image = await createImageBitmap(file);
  const targetWidth = Math.min(2200, Math.max(1400, image.width));
  const scale = targetWidth / image.width;
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) { image.close(); return file; }
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < pixels.data.length; index += 4) {
    const gray = pixels.data[index] * .299 + pixels.data[index + 1] * .587 + pixels.data[index + 2] * .114;
    const contrasted = Math.max(0, Math.min(255, (gray - 128) * 1.55 + 128));
    pixels.data[index] = pixels.data[index + 1] = pixels.data[index + 2] = contrasted;
  }
  context.putImageData(pixels, 0, 0);
  return await new Promise(resolve => canvas.toBlob(blob => resolve(blob ?? file), "image/png", .95));
};
