"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  LoaderCircle,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import {
  buildDietPlan,
  BuiltDietPlan,
  DietIngredientDraft,
  DietMealDraft,
  matchCatalogIngredient,
  parseDietText,
} from "@/lib/diet";
import { MealSlot, PriceItem, Store } from "@/lib/types";

const days = [
  "Lunedì",
  "Martedì",
  "Mercoledì",
  "Giovedì",
  "Venerdì",
  "Sabato",
  "Domenica",
];
const slots: MealSlot[] = [
  "colazione",
  "spuntino",
  "pranzo",
  "merenda",
  "cena",
];

export const extractPdfText = async (
  file: File,
  onProgress: (value: string) => void,
) => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const signature = new TextDecoder("ascii").decode(bytes.slice(0, 5));
  if (signature !== "%PDF-")
    throw new Error("Il file selezionato non è un PDF valido.");
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  const task = pdfjs.getDocument({
    data: bytes,
  });
  const document = await task.promise;
  let worker:
    | Awaited<ReturnType<(typeof import("tesseract.js"))["createWorker"]>>
    | undefined;
  try {
    if (document.numPages > 30)
      throw new Error("La dieta supera il limite di 30 pagine.");
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      onProgress(`Lettura pagina ${pageNumber} di ${document.numPages}`);
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      let pageText = "";
      for (const item of content.items) {
        if (!("str" in item)) continue;
        pageText += `${item.str}${item.hasEOL ? "\n" : " "}`;
      }
      pages.push(pageText);
    }
    const selectableText = pages
      .join("\n")
      .replace(/\u0000/g, " ")
      .trim();
    if (selectableText.length >= 20) return selectableText;
    if (document.numPages > 8)
      throw new Error(
        "Il PDF è scansionato e supera il limite OCR di 8 pagine. Dividilo in più file oppure usa un PDF con testo selezionabile.",
      );

    const { createWorker, PSM } = await import("tesseract.js");
    worker = await createWorker("ita");
    await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
    const ocrPages: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      onProgress(`OCR pagina ${pageNumber} di ${document.numPages}`);
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.7 });
      const canvas = globalThis.document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("Il browser non supporta la lettura OCR.");
      await page.render({ canvas, canvasContext: context, viewport }).promise;
      const result = await worker.recognize(canvas);
      ocrPages.push(result.data.text);
    }
    return ocrPages.join("\n").trim();
  } finally {
    await worker?.terminate().catch(() => undefined);
    await task.destroy().catch(() => undefined);
  }
};

export default function DietImporter({
  stores,
  catalog,
  defaultStore,
  defaultPeople,
  defaultBudget,
  onGenerated,
}: {
  stores: Store[];
  catalog: PriceItem[];
  defaultStore: Store;
  defaultPeople: number;
  defaultBudget: number;
  onGenerated: (result: BuiltDietPlan) => void;
}) {
  const [store, setStore] = useState<Store>(defaultStore);
  const [people, setPeople] = useState<number | "">(Math.max(1, defaultPeople));
  const [budget, setBudget] = useState<number | "">(Math.max(0, defaultBudget));
  const [fileName, setFileName] = useState("");
  const [meals, setMeals] = useState<DietMealDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const recognized = useMemo(
    () =>
      meals.reduce(
        (count, meal) =>
          count +
          meal.ingredients.filter((ingredient) =>
            matchCatalogIngredient(ingredient.name, catalog),
          ).length,
        0,
      ),
    [meals, catalog],
  );
  const totalIngredients = meals.reduce(
    (count, meal) => count + meal.ingredients.length,
    0,
  );

  const readFile = async (file: File) => {
    if (file.type && file.type !== "application/pdf") {
      setError("Formato non valido: carica un file PDF.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError("PDF troppo grande: il limite è 12 MB.");
      return;
    }
    setBusy(true);
    setError("");
    setMeals([]);
    setFileName(file.name.slice(0, 120));
    try {
      const text = await extractPdfText(file, setProgress);
      if (text.length < 20)
        throw new Error(
          "Il PDF non contiene testo selezionabile. Esportalo nuovamente dal documento originale oppure usa un PDF con OCR.",
        );
      const parsed = parseDietText(text);
      if (!parsed.length)
        throw new Error(
          "Non ho trovato pasti con quantità. Controlla che ogni riga contenga giorno, pasto, alimento e dose (es. Lunedì pranzo: pasta 80 g).",
        );
      setMeals(parsed);
      setProgress("");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Non è stato possibile leggere il PDF.",
      );
      setProgress("");
    } finally {
      setBusy(false);
    }
  };

  const updateMeal = (id: string, patch: Partial<DietMealDraft>) =>
    setMeals((current) =>
      current.map((meal) => (meal.id === id ? { ...meal, ...patch } : meal)),
    );
  const updateIngredient = (
    mealId: string,
    ingredientId: string,
    patch: Partial<DietIngredientDraft>,
  ) =>
    setMeals((current) =>
      current.map((meal) =>
        meal.id === mealId
          ? {
              ...meal,
              ingredients: meal.ingredients.map((ingredient) =>
                ingredient.id === ingredientId
                  ? { ...ingredient, ...patch }
                  : ingredient,
              ),
            }
          : meal,
      ),
    );

  const generate = () => {
    if (!meals.length) {
      setError("Aggiungi almeno un pasto prima di creare il piano.");
      return;
    }
    if (people === "" || people <= 0) {
      setError("Inserisci almeno una persona.");
      return;
    }
    const validMeals = meals
      .map((meal) => ({
        ...meal,
        title: meal.title.trim(),
        ingredients: meal.ingredients.filter(
          (ingredient) => ingredient.name.trim() && ingredient.quantity > 0,
        ),
      }))
      .filter((meal) => meal.title && meal.ingredients.length);
    if (!validMeals.length) {
      setError("Completa almeno un pasto con titolo, alimento e quantità.");
      return;
    }
    onGenerated(
      buildDietPlan({
        meals: validMeals,
        catalog,
        store,
        people,
        budget: budget === "" ? 0 : budget,
        fileName,
      }),
    );
  };

  const addMeal = () =>
    setMeals((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        day: current.at(-1)?.day ?? 0,
        slot: "pranzo",
        title: "Nuovo pasto",
        rawText: "Inserito manualmente",
        ingredients: [
          {
            id: crypto.randomUUID(),
            name: "",
            quantity: 100,
            unit: "g",
          },
        ],
      },
    ]);

  return (
    <section className="diet-layout">
      <div className="card diet-upload-card">
        <div className="section-heading">
          <div>
            <h2>Importa la dieta</h2>
            <p className="muted">Il PDF viene elaborato solo nel browser.</p>
          </div>
          <FileText size={22} />
        </div>
        <div className="grid diet-settings">
          <div>
            <label htmlFor="diet-store">Negozio</label>
            <select
              id="diet-store"
              value={store}
              onChange={(event) => setStore(event.target.value as Store)}
            >
              {stores.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="diet-people">Persone</label>
            <input
              id="diet-people"
              type="number"
              min="1"
              max="30"
              value={people}
              onChange={(event) => {
                const value = event.target.value;
                setPeople(
                  value === "" ? "" : Math.min(30, Math.max(0, +value)),
                );
              }}
            />
          </div>
          <div>
            <label htmlFor="diet-budget">Budget (€)</label>
            <input
              id="diet-budget"
              type="number"
              min="0"
              max="10000"
              step="0.01"
              value={budget}
              onChange={(event) => {
                const value = event.target.value;
                setBudget(
                  value === "" ? "" : Math.min(10000, Math.max(0, +value)),
                );
              }}
            />
          </div>
        </div>
        <label className={`upload diet-upload ${busy ? "disabled" : ""}`}>
          {busy ? (
            <LoaderCircle className="spin" size={18} />
          ) : (
            <Upload size={18} />
          )}
          {busy ? progress || "Lettura PDF" : "Seleziona PDF dieta"}
          <input
            aria-label="PDF dieta"
            type="file"
            accept="application/pdf,.pdf"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void readFile(file);
              event.target.value = "";
            }}
          />
        </label>
        <p className="muted diet-hint">
          Max 12 MB e 30 pagine (8 se serve OCR). Le quantità devono essere
          espresse in g, kg, ml, l o pezzi e sono considerate per una persona.
        </p>
        {error && (
          <p className="error diet-error" role="alert">
            <AlertTriangle size={15} /> {error}
          </p>
        )}
      </div>

      <div className="card diet-review-card">
        <div className="section-heading">
          <div>
            <h2>Revisione pasti</h2>
            <p className="muted">{fileName || "Carica un PDF per iniziare"}</p>
          </div>
          {meals.length > 0 && (
            <span className="diet-count">{meals.length} pasti</span>
          )}
        </div>
        {!meals.length ? (
          <div className="empty diet-empty">
            <FileText size={28} />
            <span>Nessun pasto estratto</span>
            <button type="button" className="button alt" onClick={addMeal}>
              <Plus size={15} /> Inserisci manualmente
            </button>
          </div>
        ) : (
          <>
            <div className="diet-coverage">
              <CheckCircle2 size={17} />
              <div>
                <strong>
                  {recognized}/{totalIngredients} alimenti riconosciuti
                </strong>
                <small>
                  Gli altri verranno aggiunti al catalogo con prezzo
                  dimostrativo modificabile.
                </small>
              </div>
            </div>
            <div className="diet-meals">
              {meals.map((meal) => (
                <article className="diet-meal" key={meal.id}>
                  <div className="diet-meal-head">
                    <select
                      aria-label={`Giorno ${meal.title}`}
                      value={meal.day}
                      onChange={(event) =>
                        updateMeal(meal.id, { day: +event.target.value })
                      }
                    >
                      {days.map((day, index) => (
                        <option value={index} key={day}>
                          {day}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label={`Pasto ${meal.title}`}
                      value={meal.slot}
                      onChange={(event) =>
                        updateMeal(meal.id, {
                          slot: event.target.value as MealSlot,
                        })
                      }
                    >
                      {slots.map((slot) => (
                        <option key={slot}>{slot}</option>
                      ))}
                    </select>
                    <button
                      className="row-delete"
                      aria-label={`Elimina ${meal.title}`}
                      onClick={() =>
                        setMeals((current) =>
                          current.filter((item) => item.id !== meal.id),
                        )
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <input
                    aria-label={`Titolo ${meal.title}`}
                    className="diet-title-input"
                    value={meal.title}
                    maxLength={100}
                    onChange={(event) =>
                      updateMeal(meal.id, {
                        title: event.target.value.slice(0, 100),
                      })
                    }
                  />
                  <div className="diet-ingredients">
                    {meal.ingredients.map((ingredient) => (
                      <div className="diet-ingredient" key={ingredient.id}>
                        <input
                          aria-label={`Alimento ${ingredient.name}`}
                          value={ingredient.name}
                          maxLength={80}
                          onChange={(event) =>
                            updateIngredient(meal.id, ingredient.id, {
                              name: event.target.value.slice(0, 80),
                            })
                          }
                        />
                        <input
                          aria-label={`Quantità ${ingredient.name}`}
                          type="number"
                          min="0.001"
                          max="10000"
                          step="0.001"
                          value={ingredient.quantity}
                          onChange={(event) =>
                            updateIngredient(meal.id, ingredient.id, {
                              quantity: Math.min(
                                10000,
                                Math.max(0, +event.target.value || 0),
                              ),
                            })
                          }
                        />
                        <select
                          aria-label={`Unità ${ingredient.name}`}
                          value={ingredient.unit}
                          onChange={(event) =>
                            updateIngredient(meal.id, ingredient.id, {
                              unit: event.target
                                .value as DietIngredientDraft["unit"],
                            })
                          }
                        >
                          <option>g</option>
                          <option>ml</option>
                          <option>pz</option>
                        </select>
                        <button
                          className="row-delete"
                          aria-label={`Elimina alimento ${ingredient.name}`}
                          onClick={() =>
                            updateMeal(meal.id, {
                              ingredients: meal.ingredients.filter(
                                (item) => item.id !== ingredient.id,
                              ),
                            })
                          }
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      className="diet-add-ingredient"
                      onClick={() =>
                        updateMeal(meal.id, {
                          ingredients: [
                            ...meal.ingredients,
                            {
                              id: crypto.randomUUID(),
                              name: "Nuovo alimento",
                              quantity: 100,
                              unit: "g",
                            },
                          ],
                        })
                      }
                    >
                      <Plus size={14} /> Aggiungi alimento
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <div className="diet-review-actions">
              <button type="button" className="button alt" onClick={addMeal}>
                <Plus size={15} /> Aggiungi pasto
              </button>
              <button
                type="button"
                className="button diet-generate"
                onClick={generate}
              >
                Crea piano e stima prezzi
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
