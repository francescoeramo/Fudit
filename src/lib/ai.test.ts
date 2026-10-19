import { afterEach, describe, expect, it, vi } from "vitest";
import { AI_MODEL, rankRecipesWithAi, validateAiRanking } from "./ai";
import { recipes } from "./seed";

afterEach(() => vi.unstubAllGlobals());
describe("assistente Gemini", () => {
  it("rifiuta ID inventati e duplicati senza alterare il catalogo compatibile", () => {
    expect(
      validateAiRanking(
        { recipeIds: [recipes[0].id, "inventata", recipes[0].id] },
        [recipes[0]],
      ),
    ).toEqual([recipes[0].id]);
    expect(() =>
      validateAiRanking({ recipeIds: ["inventata"] }, recipes),
    ).toThrow();
  });
  it("invia una sola richiesta senza chiave nell’URL o dati delle diete", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  { text: JSON.stringify({ recipeIds: [recipes[0].id] }) },
                ],
              },
            },
          ],
        }),
      ),
    );
    vi.stubGlobal("fetch", fetch);
    await expect(
      rankRecipesWithAi("test-secret", "cena veloce", [recipes[0]]),
    ).resolves.toEqual([recipes[0].id]);
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toContain(AI_MODEL);
    expect(url).not.toContain("test-secret");
    expect(options.headers["x-goog-api-key"]).toBe("test-secret");
    expect(options.body).not.toContain("allergies");
  });
  it("gestisce quota gratuita esaurita senza tentativi a pagamento", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("", { status: 429 }));
    vi.stubGlobal("fetch", fetch);
    await expect(rankRecipesWithAi("key", "cena", recipes)).rejects.toThrow(
      "Quota gratuita",
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
