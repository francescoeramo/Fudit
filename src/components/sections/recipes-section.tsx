"use client";

import { Dispatch, SetStateAction, useMemo, useState } from "react";
import {
  confirmedPriceCoverage,
  confirmedRecipeCost,
  scaleIngredients,
} from "@/lib/calculations";
import { foodStyles } from "@/lib/config";
import {
  FoodStyle,
  MealPlan,
  Preferences,
  PriceItem,
  Recipe,
} from "@/lib/types";

export default function RecipesSection({
  recipes,
  plan,
  catalog,
  prefs,
  setPrefs,
}: {
  recipes: Recipe[];
  plan: MealPlan | null;
  catalog: PriceItem[];
  prefs: Preferences;
  setPrefs: Dispatch<SetStateAction<Preferences>>;
}) {
  const [query, setQuery] = useState("");
  const [style, setStyle] = useState<FoodStyle | "all">("all");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return recipes.filter(
      (recipe) =>
        (style === "all" || recipe.tags.includes(style)) &&
        (!needle ||
          recipe.title.toLowerCase().includes(needle) ||
          recipe.ingredients.some((ingredient) =>
            ingredient.name.toLowerCase().includes(needle),
          )),
    );
  }, [query, recipes, style]);
  const store = plan?.store ?? prefs.store;
  const people = plan?.people ?? prefs.people;

  return (
    <>
      <div className="recipe-toolbar search-toolbar">
        <div className="search-controls">
          <input
            type="search"
            aria-label="Cerca ricette"
            placeholder="Cerca ricetta o ingrediente"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select
            aria-label="Filtra ricette per stile"
            value={style}
            onChange={(event) =>
              setStyle(event.target.value as FoodStyle | "all")
            }
          >
            <option value="all">Tutti gli stili</option>
            {foodStyles.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="people-control">
          <button
            aria-label="Riduci persone"
            onClick={() =>
              setPrefs((current) => ({
                ...current,
                people: Math.max(0, current.people - 1),
              }))
            }
          >
            −
          </button>
          <input
            aria-label="Numero persone"
            type="number"
            min="0"
            max="30"
            value={prefs.people || ""}
            onChange={(event) =>
              setPrefs((current) => ({
                ...current,
                people:
                  event.target.value === ""
                    ? 0
                    : Math.min(30, Math.max(0, +event.target.value || 0)),
              }))
            }
          />
          <button
            aria-label="Aumenta persone"
            onClick={() =>
              setPrefs((current) => ({
                ...current,
                people: current.people + 1,
              }))
            }
          >
            +
          </button>
          <span>persone</span>
        </div>
      </div>
      <p className="results-count" aria-live="polite">
        {filtered.length} ricette trovate
      </p>
      <section className="grid two recipe-grid">
        {filtered.map((recipe) => {
          const coverage = confirmedPriceCoverage(recipe, catalog, store);
          const cost = plan
            ? confirmedRecipeCost(recipe, catalog, store, people)
            : null;
          return (
            <article className="card recipe-card" key={recipe.id}>
              <div className="recipe-top">
                <div>
                  <h2>{recipe.title}</h2>
                  <p className="muted">
                    {recipe.time} min · {recipe.difficulty}
                  </p>
                </div>
                {!plan ? (
                  <div className="recipe-price pending">
                    <strong>—</strong>
                    <small>genera un piano</small>
                  </div>
                ) : cost === null ? (
                  <div className="recipe-price pending">
                    <strong>—</strong>
                    <small>
                      {coverage.confirmed}/{coverage.total} prezzi reali
                    </small>
                  </div>
                ) : (
                  <div className="recipe-price confirmed">
                    <strong>€ {(cost / people).toFixed(2)}</strong>
                    <small>/porzione · prezzi reali</small>
                  </div>
                )}
              </div>
              <div className="tag-row">
                {recipe.tags.map((tag) => (
                  <span className="pill" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
              <h3>
                Ingredienti <span>{prefs.people} persone</span>
              </h3>
              <div className="ingredients-list">
                {scaleIngredients(
                  recipe.ingredients,
                  recipe.baseServings,
                  prefs.people,
                ).map((ingredient) => (
                  <div key={ingredient.id}>
                    <span>{ingredient.name}</span>
                    <b>
                      {ingredient.quantity}
                      {ingredient.unit}
                    </b>
                  </div>
                ))}
              </div>
              <div className="recipe-separator">
                <span>Procedimento</span>
              </div>
              <ol className="steps">
                {recipe.steps.map((step, index) => (
                  <li key={step}>
                    <span>{index + 1}</span>
                    <p>{step}</p>
                  </li>
                ))}
              </ol>
              <div className="nutrition">
                <span>{recipe.nutrition.calories} kcal</span>
                <span>P {recipe.nutrition.protein}g</span>
                <span>C {recipe.nutrition.carbs}g</span>
                <span>G {recipe.nutrition.fat}g</span>
              </div>
            </article>
          );
        })}
        {!filtered.length && (
          <div className="card empty">
            Nessuna ricetta corrisponde ai filtri.
          </div>
        )}
      </section>
    </>
  );
}
