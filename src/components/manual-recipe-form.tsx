"use client";

import { FormEvent, useState } from "react";
import { foodStyles } from "@/lib/config";
import { FoodStyle, PriceItem, Recipe, RecipeCourse } from "@/lib/types";

interface IngredientDraft {
  catalogId: string;
  quantity: number;
}

const emptyNutrition = { calories: 0, protein: 0, carbs: 0, fat: 0 };

export default function ManualRecipeForm({
  catalog,
  onSave,
  onCancel,
}: {
  catalog: PriceItem[];
  onSave: (recipe: Recipe) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [time, setTime] = useState(30);
  const [difficulty, setDifficulty] = useState<Recipe["difficulty"]>("Facile");
  const [course, setCourse] = useState<RecipeCourse>("Secondo");
  const [baseServings, setBaseServings] = useState(2);
  const [tags, setTags] = useState<FoodStyle[]>([]);
  const [ingredients, setIngredients] = useState<IngredientDraft[]>([
    { catalogId: catalog[0]?.id ?? "", quantity: 100 },
  ]);
  const [steps, setSteps] = useState([""]);
  const [nutrition, setNutrition] = useState(emptyNutrition);
  const [error, setError] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const effectiveTags =
      course === "Dolce" && !tags.includes("dolci")
        ? [...tags, "dolci" as const]
        : tags;
    const selectedIngredients = ingredients
      .map((draft) => ({
        draft,
        catalogItem: catalog.find((item) => item.id === draft.catalogId),
      }))
      .filter(
        (
          entry,
        ): entry is {
          draft: IngredientDraft;
          catalogItem: PriceItem;
        } => Boolean(entry.catalogItem) && entry.draft.quantity > 0,
      );
    const cleanSteps = steps.map((step) => step.trim()).filter(Boolean);
    if (!effectiveTags.length) {
      setError(
        "Seleziona almeno una categoria per rendere la ricetta recuperabile nei piani.",
      );
      return;
    }
    if (
      !selectedIngredients.length ||
      selectedIngredients.length !== ingredients.length
    ) {
      setError(
        "Completa tutti gli ingredienti con una quantità maggiore di zero.",
      );
      return;
    }
    if (!cleanSteps.length) {
      setError("Inserisci almeno un passaggio del procedimento.");
      return;
    }

    const recipeIngredients = selectedIngredients.map(
      ({ draft, catalogItem }) => ({
        id: catalogItem.id,
        name: catalogItem.name,
        unit: catalogItem.unit,
        quantity: draft.quantity,
        category: catalogItem.category,
        allergens: [...catalogItem.allergens],
      }),
    );
    onSave({
      id: crypto.randomUUID(),
      title: title.trim(),
      time,
      difficulty,
      ingredients: recipeIngredients,
      steps: cleanSteps,
      nutrition,
      tags: effectiveTags,
      allergens: [
        ...new Set(recipeIngredients.flatMap((item) => item.allergens ?? [])),
      ],
      baseServings,
      course,
      origin: "manual",
    });
  };

  return (
    <form className="manual-recipe-form" onSubmit={submit}>
      <div className="manual-recipe-grid">
        <div className="manual-recipe-main">
          <label htmlFor="manual-recipe-title">Nome ricetta</label>
          <input
            id="manual-recipe-title"
            required
            maxLength={120}
            placeholder="Es. Cous cous con verdure"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div>
          <label htmlFor="manual-recipe-time">Tempo (min)</label>
          <input
            id="manual-recipe-time"
            required
            type="number"
            min="1"
            max="600"
            value={time}
            onChange={(event) => setTime(Math.max(1, +event.target.value || 1))}
          />
        </div>
        <div>
          <label htmlFor="manual-recipe-servings">Porzioni base</label>
          <input
            id="manual-recipe-servings"
            required
            type="number"
            min="1"
            max="30"
            value={baseServings}
            onChange={(event) =>
              setBaseServings(
                Math.min(30, Math.max(1, +event.target.value || 1)),
              )
            }
          />
        </div>
        <div>
          <label htmlFor="manual-recipe-difficulty">Difficoltà</label>
          <select
            id="manual-recipe-difficulty"
            value={difficulty}
            onChange={(event) =>
              setDifficulty(event.target.value as Recipe["difficulty"])
            }
          >
            <option>Facile</option>
            <option>Media</option>
          </select>
        </div>
        <div>
          <label htmlFor="manual-recipe-course">Portata</label>
          <select
            id="manual-recipe-course"
            value={course}
            onChange={(event) => setCourse(event.target.value as RecipeCourse)}
          >
            <option>Primo</option>
            <option>Secondo</option>
            <option>Contorno</option>
            <option>Dolce</option>
          </select>
        </div>
      </div>

      <fieldset>
        <legend>Categorie del piano</legend>
        <p className="field-help">
          Fudit usa queste categorie per recuperare e dare priorità alla ricetta
          nei piani compatibili.
        </p>
        <div className="choice-row">
          {foodStyles.map((tag) => (
            <label className="pill meal-choice" key={tag}>
              <input
                className="check"
                type="checkbox"
                checked={tags.includes(tag)}
                onChange={() => {
                  setTags((current) =>
                    current.includes(tag)
                      ? current.filter((item) => item !== tag)
                      : [...current, tag],
                  );
                  setError("");
                }}
              />
              <span>{tag}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Ingredienti per {baseServings} porzioni</legend>
        <p className="field-help">
          Se manca un alimento, aggiungilo prima nel Catalogo prezzi: così costo
          e lista della spesa restano coerenti.
        </p>
        <div className="manual-rows">
          {ingredients.map((ingredient, index) => {
            const selected = catalog.find(
              (item) => item.id === ingredient.catalogId,
            );
            return (
              <div
                className="manual-ingredient-row"
                key={`${index}-${ingredient.catalogId}`}
              >
                <select
                  aria-label={`Ingrediente ${index + 1}`}
                  required
                  value={ingredient.catalogId}
                  onChange={(event) =>
                    setIngredients((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, catalogId: event.target.value }
                          : item,
                      ),
                    )
                  }
                >
                  <option value="" disabled>
                    Seleziona ingrediente
                  </option>
                  {catalog.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <input
                  aria-label={`Quantità ingrediente ${index + 1}`}
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={ingredient.quantity}
                  onChange={(event) =>
                    setIngredients((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, quantity: +event.target.value }
                          : item,
                      ),
                    )
                  }
                />
                <span className="manual-unit">{selected?.unit ?? "—"}</span>
                <button
                  className="row-delete"
                  type="button"
                  aria-label={`Rimuovi ingrediente ${index + 1}`}
                  disabled={ingredients.length === 1}
                  onClick={() =>
                    setIngredients((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
        <button
          className="button alt compact-button"
          type="button"
          disabled={!catalog.length}
          onClick={() =>
            setIngredients((current) => [
              ...current,
              { catalogId: catalog[0]?.id ?? "", quantity: 100 },
            ])
          }
        >
          + Aggiungi ingrediente
        </button>
      </fieldset>

      <fieldset>
        <legend>Procedimento</legend>
        <div className="manual-rows">
          {steps.map((step, index) => (
            <div className="manual-step-row" key={index}>
              <span>{index + 1}</span>
              <textarea
                aria-label={`Passaggio ${index + 1}`}
                required
                maxLength={500}
                rows={2}
                value={step}
                onChange={(event) =>
                  setSteps((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? event.target.value : item,
                    ),
                  )
                }
              />
              <button
                className="row-delete"
                type="button"
                aria-label={`Rimuovi passaggio ${index + 1}`}
                disabled={steps.length === 1}
                onClick={() =>
                  setSteps((current) =>
                    current.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          className="button alt compact-button"
          type="button"
          onClick={() => setSteps((current) => [...current, ""])}
        >
          + Aggiungi passaggio
        </button>
      </fieldset>

      <fieldset>
        <legend>Valori nutrizionali per porzione</legend>
        <div className="nutrition-fields">
          {(
            [
              ["calories", "Kcal"],
              ["protein", "Proteine (g)"],
              ["carbs", "Carboidrati (g)"],
              ["fat", "Grassi (g)"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label htmlFor={`manual-nutrition-${key}`}>{label}</label>
              <input
                id={`manual-nutrition-${key}`}
                required
                type="number"
                min="0"
                step="0.1"
                value={nutrition[key]}
                onChange={(event) =>
                  setNutrition((current) => ({
                    ...current,
                    [key]: Math.max(0, +event.target.value || 0),
                  }))
                }
              />
            </div>
          ))}
        </div>
      </fieldset>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="manual-recipe-actions">
        <button className="button alt" type="button" onClick={onCancel}>
          Annulla
        </button>
        <button className="button" type="submit" disabled={!catalog.length}>
          Salva ricetta
        </button>
      </div>
    </form>
  );
}
