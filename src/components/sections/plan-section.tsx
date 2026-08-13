"use client";

import { Dispatch, SetStateAction } from "react";
import { LoaderCircle, RotateCcw } from "lucide-react";
import PlanPicker from "@/components/plan-picker";
import { foodStyles, stores, weekDays } from "@/lib/config";
import { FoodStyle, MealPlan, Preferences, Recipe, Store } from "@/lib/types";
import { PriceStatus } from "@/lib/calculations";
import { summarizePlanNutrition } from "@/lib/nutrition";

export default function PlanSection({
  plans,
  plan,
  recipes,
  prefs,
  coverage,
  generationStatus,
  onGenerate,
  onSelectPlan,
  onRegenerate,
  setPrefs,
  onToggleStyle,
}: {
  plans: MealPlan[];
  plan: MealPlan | null;
  recipes: Recipe[];
  prefs: Preferences;
  coverage: Record<PriceStatus, number> & { total: number };
  generationStatus: "idle" | "generating" | "success" | "error";
  onGenerate: () => void;
  onSelectPlan: (id: string) => void;
  onRegenerate: (day: number, slot: string) => void;
  setPrefs: Dispatch<SetStateAction<Preferences>>;
  onToggleStyle: (style: FoodStyle) => void;
}) {
  const nutrition = summarizePlanNutrition(plan, recipes);
  const plannedSlots = plan?.preferences?.meals.length ?? 0;
  return (
    <>
      {generationStatus === "generating" && (
        <div className="generation-progress" role="status" aria-live="polite">
          <LoaderCircle className="spin" size={17} />
          Sto confrontando ricette, prezzi e vincoli del budget…
        </div>
      )}
      <PlanPicker
        plans={plans}
        activeId={plan?.id ?? ""}
        onSelect={onSelectPlan}
      />
      <section className="grid two plan-grid">
        <div className="card">
          <h2>Il tuo piano</h2>
          {!plan ? (
            <>
              <p className="muted">
                Imposta preferenze e budget: Fudit creerà 7 giorni e la lista
                della spesa associata.
              </p>
              <button className="button" onClick={onGenerate}>
                Crea piano di 7 giorni
              </button>
            </>
          ) : (
            <>
              <div className="grid three">
                <div>
                  <span className="muted">Stimato</span>
                  <div className="money">€ {plan.total.toFixed(2)}</div>
                </div>
                <div>
                  <span className="muted">Budget</span>
                  <div>€ {(plan.budget ?? prefs.budget).toFixed(0)}</div>
                </div>
                <div>
                  <span className="muted">Stato</span>
                  <div>
                    {coverage.missing
                      ? "Prezzi incompleti"
                      : plan.overBudget
                        ? "Da ottimizzare"
                        : "In linea"}
                  </div>
                </div>
              </div>
              <div className="price-coverage" aria-label="Copertura prezzi">
                <span className="price-confirmed">
                  {coverage.confirmed} confermati
                </span>
                <span className="price-estimated">
                  {coverage.estimated} stimati
                </span>
                <span className="price-missing">
                  {coverage.missing} mancanti
                </span>
              </div>
              {nutrition && (
                <div
                  className="nutrition-summary"
                  aria-label="Equilibrio nutrizionale del piano"
                >
                  <div className="nutrition-summary-heading">
                    <div>
                      <b>Macro del piano</b>
                      <small>Media per persona e per pasto</small>
                    </div>
                    <span
                      className={
                        nutrition.balancedMacroDistribution
                          ? "macro-status balanced"
                          : "macro-status review"
                      }
                    >
                      {nutrition.balancedMacroDistribution
                        ? "Distribuzione in linea"
                        : "Distribuzione da rivedere"}
                    </span>
                  </div>
                  <div className="nutrition-summary-values">
                    <span>{nutrition.averageCalories} kcal</span>
                    <span>
                      P {nutrition.averageProtein} g ·{" "}
                      {nutrition.proteinEnergyPercent}%
                    </span>
                    <span>
                      C {nutrition.averageCarbs} g ·{" "}
                      {nutrition.carbsEnergyPercent}%
                    </span>
                    <span>
                      G {nutrition.averageFat} g · {nutrition.fatEnergyPercent}%
                    </span>
                  </div>
                  <p>
                    Confronto generale EFSA: carboidrati 45–60% e grassi 20–35%
                    dell’energia.{" "}
                    {plannedSlots < 3 &&
                      "Il piano copre solo i pasti selezionati, non l’intera giornata."}
                  </p>
                </div>
              )}
              {weekDays.map((day, dayIndex) => (
                <div className="day" key={day}>
                  <b>{day}</b>
                  {plan.meals
                    .filter((meal) => meal.day === dayIndex)
                    .map((meal) => {
                      const recipe = recipes.find(
                        (item) => item.id === meal.recipeId,
                      );
                      if (!recipe) return null;
                      return (
                        <div
                          key={`${meal.slot}-${meal.recipeId}`}
                          className="meal-row"
                        >
                          <span className="meal-title">
                            {meal.slot} · {recipe.title}
                            <small className="meal-cost">
                              € {meal.cost.toFixed(2)}
                            </small>
                          </span>
                          {plan.source !== "diet-pdf" && (
                            <button
                              className="meal-refresh"
                              aria-label={`Rigenera ${meal.slot} di ${day}`}
                              onClick={() => onRegenerate(dayIndex, meal.slot)}
                            >
                              <RotateCcw size={13} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                </div>
              ))}
              {plan.desserts && plan.desserts.length > 0 && (
                <section className="weekly-desserts" aria-label="Dolci della settimana">
                  <div className="weekly-desserts-heading">
                    <div>
                      <b>3 dolci della settimana</b>
                      <small>Salvati insieme a questo piano</small>
                    </div>
                  </div>
                  {plan.desserts.map((dessert) => {
                    const recipe = recipes.find(
                      (item) => item.id === dessert.recipeId,
                    );
                    return recipe ? (
                      <div className="dessert-row" key={dessert.recipeId}>
                        <span>{recipe.title}</span>
                        <small>€ {dessert.cost.toFixed(2)}</small>
                      </div>
                    ) : null;
                  })}
                </section>
              )}
              <div className="autosave-note">Salvato automaticamente</div>
            </>
          )}
        </div>
        <div className="card preferences-card">
          <h2>Preferenze</h2>
          <label htmlFor="plan-store">Supermercato</label>
          <select
            id="plan-store"
            value={prefs.store}
            onChange={(event) =>
              setPrefs({ ...prefs, store: event.target.value as Store })
            }
          >
            {stores.map((store) => (
              <option key={store}>{store}</option>
            ))}
          </select>
          <div className="grid two compact-grid">
            <div>
              <label htmlFor="weekly-budget">Budget settimanale (€)</label>
              <input
                id="weekly-budget"
                aria-label="Budget settimanale (€)"
                type="number"
                min="0"
                max="10000"
                value={prefs.budget || ""}
                onChange={(event) =>
                  setPrefs({
                    ...prefs,
                    budget:
                      event.target.value === ""
                        ? 0
                        : Math.min(
                            10000,
                            Math.max(0, +event.target.value || 0),
                          ),
                  })
                }
              />
            </div>
            <div>
              <label htmlFor="plan-people">Persone</label>
              <input
                id="plan-people"
                aria-label="Persone"
                type="number"
                min="0"
                max="30"
                value={prefs.people || ""}
                onChange={(event) =>
                  setPrefs({
                    ...prefs,
                    people:
                      event.target.value === ""
                        ? 0
                        : Math.min(30, Math.max(0, +event.target.value || 0)),
                  })
                }
              />
            </div>
          </div>
          <fieldset>
            <legend>Pasti</legend>
            <div className="choice-row">
              {(["pranzo", "cena"] as const).map((meal) => (
                <label key={meal} className="pill meal-choice">
                  <input
                    className="check"
                    type="checkbox"
                    checked={prefs.meals.includes(meal)}
                    onChange={() =>
                      setPrefs((current) => ({
                        ...current,
                        meals: current.meals.includes(meal)
                          ? current.meals.filter((item) => item !== meal)
                          : [...current.meals, meal],
                      }))
                    }
                  />
                  <span>{meal}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>Stile</legend>
            <div className="choice-row">
              {foodStyles.map((style) => (
                <button
                  type="button"
                  key={style}
                  className={`pill style-choice ${
                    prefs.styles.includes(style) ? "active" : ""
                  }`}
                  aria-pressed={prefs.styles.includes(style)}
                  onClick={() => onToggleStyle(style)}
                >
                  {style}
                </button>
              ))}
            </div>
            <p className="field-help plan-style-help">
              Attiva “dolci” per aggiungere 3 proposte nel riquadro sotto il
              piano e nella lista della spesa.
            </p>
          </fieldset>
          {prefs.styles.includes("low FODMAP") && (
            <aside
              className="fodmap-note"
              aria-label="Informazioni dieta low FODMAP"
            >
              <b>Fase 1 · low FODMAP</b>
              <p>
                Il piano usa solo le ricette dedicate, con porzioni esplicite e
                senza cipolla o aglio. È una fase temporanea di 2–6 settimane,
                seguita da reintroduzione e personalizzazione.
              </p>
              <p>
                Non è una dieta dimagrante né una prescrizione medica. Per IBS,
                applicala con un dietista formato, soprattutto in presenza di
                altre patologie o restrizioni.
              </p>
              <div className="source-links">
                <a
                  href="https://monashfodmap.com/ibs-central/diets/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Protocollo Monash
                </a>
                <a
                  href="https://webfiles.gi.org/links/PCC/ACG_Clinical_Guideline__Management_of_Irritable.11.pdf"
                  target="_blank"
                  rel="noreferrer"
                >
                  Linea guida ACG
                </a>
              </div>
            </aside>
          )}
          <label htmlFor="allergies">Allergie / intolleranze</label>
          <input
            id="allergies"
            maxLength={300}
            value={prefs.allergies.join(", ")}
            onChange={(event) =>
              setPrefs({
                ...prefs,
                allergies: event.target.value
                  .split(",")
                  .slice(0, 20)
                  .map((item) => item.trim().slice(0, 40))
                  .filter(Boolean),
              })
            }
            placeholder="es. glutine, latte"
          />
        </div>
      </section>
    </>
  );
}
