"use client";

import { FormEvent, useMemo, useState } from "react";
import { Dices, Search } from "lucide-react";
import { scaleIngredients } from "@/lib/calculations";
import { recipeCourse } from "@/lib/food";
import { suggestRecipes } from "@/lib/ideas";
import { PriceItem, Recipe, RecipeCourse } from "@/lib/types";

const courses: RecipeCourse[] = ["Primo", "Secondo", "Contorno", "Dolce"];

export default function IdeasSection({
  recipes,
  catalog,
}: {
  recipes: Recipe[];
  catalog: PriceItem[];
}) {
  const [checked, setChecked] = useState<string[]>([]);
  const [written, setWritten] = useState("");
  const [selectedCourses, setSelectedCourses] = useState<RecipeCourse[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [servings, setServings] = useState<number | "">(2);
  const quickIngredients = useMemo(
    () =>
      catalog
        .filter((item) =>
          recipes.some((recipe) =>
            recipe.ingredients.some((ingredient) => ingredient.id === item.id),
          ),
        )
        .slice()
        .sort((left, right) => left.name.localeCompare(right.name, "it"))
        .slice(0, 30),
    [catalog, recipes],
  );
  const requested = useMemo(
    () => [
      ...checked,
      ...written
        .split(/[,;\n]/)
        .slice(0, 20)
        .map((item) => item.trim().slice(0, 50))
        .filter(Boolean),
    ],
    [checked, written],
  );
  const suggestions = useMemo(
    () => suggestRecipes(recipes, requested, selectedCourses),
    [recipes, requested, selectedCourses],
  );
  const selected = recipes.find((recipe) => recipe.id === selectedId);

  const search = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    setSelectedId(suggestions[0]?.id ?? "");
  };
  const random = () => {
    setSubmitted(true);
    if (!suggestions.length) {
      setSelectedId("");
      return;
    }
    const index = Math.floor(Math.random() * suggestions.length);
    setSelectedId(suggestions[index].id);
  };

  return (
    <>
      <section className="card ideas-builder">
        <h2>Cosa hai già in casa?</h2>
        <p className="muted">
          Spunta gli ingredienti oppure scrivili separati da virgole. Maiuscole
          e minuscole non cambiano il risultato.
        </p>
        <form onSubmit={search}>
          <label htmlFor="ideas-ingredients">Ingredienti scritti</label>
          <textarea
            id="ideas-ingredients"
            rows={2}
            maxLength={600}
            value={written}
            onChange={(event) => {
              setWritten(event.target.value);
              setSubmitted(false);
            }}
            placeholder="Es. UOVA, Farina, cioccolato fondente"
          />
          <fieldset>
            <legend>Ingredienti rapidi</legend>
            <div className="ideas-checklist">
              {quickIngredients.map((item) => (
                <label className="pill meal-choice" key={item.id}>
                  <input
                    className="check"
                    type="checkbox"
                    checked={checked.includes(item.name)}
                    onChange={() => {
                      setChecked((current) =>
                        current.includes(item.name)
                          ? current.filter((name) => name !== item.name)
                          : [...current, item.name],
                      );
                      setSubmitted(false);
                    }}
                  />
                  <span>{item.name}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>Categorie (facoltative, anche più di una)</legend>
            <div className="choice-row">
              {courses.map((course) => (
                <label className="pill meal-choice" key={course}>
                  <input
                    className="check"
                    type="checkbox"
                    checked={selectedCourses.includes(course)}
                    onChange={() => {
                      setSelectedCourses((current) =>
                        current.includes(course)
                          ? current.filter((item) => item !== course)
                          : [...current, course],
                      );
                      setSubmitted(false);
                    }}
                  />
                  <span>{course}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="ideas-actions">
            <button className="button" type="submit">
              <Search size={17} /> Suggerisci ricette
            </button>
            <button className="button alt" type="button" onClick={random}>
              <Dices size={17} /> Random
            </button>
          </div>
        </form>
      </section>
      {submitted && (
        <section className="ideas-results" aria-live="polite">
          <p className="results-count">
            {suggestions.length} ricette compatibili
          </p>
          {!suggestions.length ? (
            <div className="card empty">
              Nessuna ricetta contiene tutti gli ingredienti indicati. Prova a
              rimuoverne uno o a cambiare categoria.
            </div>
          ) : (
            <div className="ideas-layout">
              <div className="card ideas-list">
                {suggestions.slice(0, 20).map((recipe) => (
                  <button
                    type="button"
                    key={recipe.id}
                    className={selected?.id === recipe.id ? "active" : ""}
                    onClick={() => setSelectedId(recipe.id)}
                  >
                    <span>{recipe.title}</span>
                    <small>{recipeCourse(recipe)} · {recipe.time} min</small>
                  </button>
                ))}
              </div>
              {selected && (
                <article className="card idea-recipe">
                  <div className="section-heading">
                    <div>
                      <h2>{selected.title}</h2>
                      <p className="muted">{recipeCourse(selected)} · {selected.difficulty}</p>
                    </div>
                    <label className="idea-servings">
                      Porzioni
                      <input
                        aria-label="Porzioni ricetta suggerita"
                        type="number"
                        min="1"
                        max="30"
                        value={servings}
                        onChange={(event) =>
                          setServings(event.target.value === ""
                            ? ""
                            : Math.min(30, Math.max(1, Number(event.target.value) || 1)))
                        }
                        onBlur={() => servings === "" && setServings(1)}
                      />
                    </label>
                  </div>
                  <h3>Dosi adattate</h3>
                  <div className="ingredients-list">
                    {scaleIngredients(
                      selected.ingredients,
                      selected.baseServings,
                      Number(servings) || 1,
                    ).map((ingredient) => (
                      <div key={ingredient.id}>
                        <span>{ingredient.name}</span>
                        <b>{ingredient.quantity}{ingredient.unit}</b>
                      </div>
                    ))}
                  </div>
                  <div className="recipe-separator"><span>Procedimento</span></div>
                  <ol className="steps">
                    {selected.steps.map((step, index) => (
                      <li key={`${index}-${step}`}><span>{index + 1}</span><p>{step}</p></li>
                    ))}
                  </ol>
                </article>
              )}
            </div>
          )}
        </section>
      )}
    </>
  );
}
