import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Il tuo piano" }),
  ).toBeVisible();
});

test("genera piano e rende disponibile la lista della spesa", async ({
  page,
}) => {
  await page.getByLabel("Budget settimanale (€)").fill("60");
  await page.getByRole("button", { name: "Genera piano" }).click();
  await expect(page.locator(".notice")).toContainText("Analizzo");
  await expect(page.getByText("Piano creato e ottimizzato")).toBeVisible();
  await expect(page.getByText("Lun", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Spesa" }).click();
  await expect(
    page.getByRole("heading", { name: "Lista modificabile" }),
  ).toBeVisible();
});

test("carica i prezzi MD dal catalogo pubblico Supabase", async ({ page }) => {
  await page.getByLabel("Supermercato").selectOption("MD");
  await page.getByRole("button", { name: "Genera piano" }).click();
  await expect(page.getByText("Piano creato", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Prezzi" }).click();
  await expect(page.getByText(/aggiornati ogni martedì/)).toBeVisible();
  await expect(
    page.getByText(/Volantino ufficiale MD Sud/).first(),
  ).toBeVisible();
});

test("conferme distruttive supportano annulla ed Escape", async ({ page }) => {
  await page.getByRole("button", { name: "Genera piano" }).click();
  await expect(page.getByText("Piano creato", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Impostazioni" }).click();
  await page.getByRole("button", { name: /Elimina piano/ }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("alertdialog")).toBeHidden();
  await page.getByRole("button", { name: "Svuota e ripristina" }).click();
  await expect(page.getByRole("button", { name: "Annulla" })).toBeFocused();
  await page.getByRole("button", { name: "Annulla" }).press("Enter");
  await expect(page.getByRole("alertdialog")).toBeHidden();
});

test("layout mobile non produce scorrimento orizzontale", async ({ page }) => {
  const viewport = page.viewportSize();
  test.skip(!viewport || viewport.width > 700, "Controllo specifico mobile");
  await expect(
    page.getByRole("navigation", { name: "Sezioni principali" }),
  ).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(
    dimensions.clientWidth + 1,
  );
});
