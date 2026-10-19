import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // Each Playwright test already has an isolated browser context. Preserve
  // storage on reload so first-run persistence can be verified.
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

test("carica i prezzi Despar Centro Sud dal catalogo pubblico", async ({
  page,
}) => {
  await page.getByLabel("Supermercato").selectOption("Despar");
  await page.getByRole("button", { name: "Genera piano" }).click();
  await expect(page.getByText("Piano creato", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Prezzi" }).click();
  await expect(page.getByText(/Corato \(BA\).*ogni martedì/)).toBeVisible();
  const importedSource = page
    .getByText(/Catalogo ufficiale Despar a Casa/)
    .first();
  await expect(importedSource).toBeVisible();
  await expect(
    importedSource
      .locator("xpath=ancestor::div[contains(@class, 'catalog-row')]")
      .locator(".price-confirmed"),
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
  await expect(
    page.getByRole("button", { name: "Chiudi finestra" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Chiudi finestra" }).click();
  await expect(page.getByRole("alertdialog")).toBeHidden();
  await page.getByRole("button", { name: "Svuota e ripristina" }).click();
  await page.getByRole("button", { name: "Annulla" }).press("Enter");
  await expect(page.getByRole("alertdialog")).toBeHidden();
});

test("Idee propone pasta e riso e mostra la copertura ingredienti", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Idee" }).click();
  const quick = page.getByRole("group", { name: /Ingredienti rapidi/ });
  await expect(
    quick.getByRole("checkbox", { name: "Pasta", exact: true }),
  ).toBeVisible();
  await expect(
    quick.getByRole("checkbox", { name: "Riso", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Ingredienti scritti").fill("PASTA, ríso");
  await page.getByRole("button", { name: "Suggerisci ricette" }).click();
  await expect(page.getByText(/su 2 ingredienti/).first()).toBeVisible();
  await expect(page.getByLabel("Porzioni ricetta suggerita")).toHaveValue("2");
});

test("assistente AI usa la chiave in memoria e gestisce la quota gratuita", async ({
  page,
}, testInfo) => {
  let requests = 0;
  await page.route(
    "https://generativelanguage.googleapis.com/**",
    async (route) => {
      requests += 1;
      if (requests > 1) {
        const body = route.request().postDataJSON();
        const candidates = JSON.parse(body.contents[0].parts[0].text).recipes;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        recipeIds: [
                          "inventata",
                          candidates[0].id,
                          candidates[0].id,
                        ],
                      }),
                    },
                  ],
                },
              },
            ],
          }),
        });
        return;
      }
      await route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({ error: { message: "Quota" } }),
      });
    },
  );
  await page.getByRole("button", { name: "Impostazioni", exact: true }).click();
  await page.getByLabel(/Chiave API Gemini/).fill("fake-key-for-browser-test");
  await expect(
    page.getByRole("button", { name: "Rimuovi chiave" }),
  ).toBeEnabled();
  await page.screenshot({
    path: testInfo.outputPath("ai-settings.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Idee", exact: true }).click();
  await page
    .getByLabel("Cosa vuoi cucinare?")
    .fill("Una cena cremosa autunnale");
  await page.getByRole("button", { name: "Chiedi a Gemini" }).click();
  await expect(page.getByText(/Quota gratuita Gemini esaurita/)).toBeVisible();
  await page.getByRole("button", { name: "Chiedi a Gemini" }).click();
  await expect(
    page.getByText(/Ricetta suggerita da Gemini e verificata/),
  ).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "fake-key-for-browser-test",
  );
  await page.screenshot({
    path: testInfo.outputPath("ideas-ai.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth + 1,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Cambia tema" }).click();
  await expect(page.locator(".shell")).toHaveClass(/dark/);
  await page.screenshot({
    path: testInfo.outputPath("ideas-ai-dark.png"),
    fullPage: true,
  });
  await page.reload();
  await page.getByRole("button", { name: "Impostazioni", exact: true }).click();
  await expect(page.getByLabel(/Chiave API Gemini/)).toHaveValue("");
});

test("tutorial prima apertura guida alla chiave e si riapre dalle impostazioni", async ({
  page,
}, testInfo) => {
  await expect(
    page.getByRole("heading", { name: "Benvenuto in Fudit" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Configura l’assistente" }).click();
  await expect(
    page.getByRole("heading", { name: "Crea la tua chiave gratuita" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Google AI Studio/ }),
  ).toHaveAttribute("target", "_blank");
  await page.screenshot({
    path: testInfo.outputPath("onboarding-setup.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Avanti", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Avanti", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("La tua chiave API Gemini").fill("tutorial-fake-key");
  await page.getByRole("button", { name: "Avanti", exact: true }).click();
  await page.getByRole("button", { name: "Vai a Pianifica" }).click();
  expect(
    await page.evaluate(() => localStorage.getItem("fudit:ai-onboarding:v1")),
  ).toBe("done");
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "tutorial-fake-key",
  );
  await page.getByRole("button", { name: "Impostazioni", exact: true }).click();
  await page
    .getByRole("button", { name: "Riapri il tutorial guidato" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Benvenuto in Fudit" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continua senza AI" }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Il tuo piano" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Benvenuto in Fudit" }),
  ).toHaveCount(0);
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

  await page.getByRole("button", { name: "Ricette" }).click();
  await expect(
    page.getByRole("button", { name: "Torna a Pianifica" }),
  ).toBeVisible();
  const toolbar = page.locator(".recipe-toolbar");
  await expect(toolbar).toBeVisible();
  const toolbarBox = await toolbar.boundingBox();
  expect(toolbarBox?.height).toBeLessThan(230);
  await expect(page.getByText(/\d+ ricette trovate/)).toBeVisible();
  await page.getByRole("button", { name: "Torna a Pianifica" }).click();
  await expect(
    page.getByRole("heading", { name: "Il tuo piano" }),
  ).toBeVisible();
});
