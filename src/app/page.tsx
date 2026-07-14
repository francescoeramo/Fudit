"use client";
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/static-components */
import { useEffect, useState, type SetStateAction } from "react";
import {
  CalendarDays,
  ChefHat,
  CircleDollarSign,
  FileHeart,
  Settings,
  ShoppingBasket,
  Plus,
  Copy,
  RotateCcw,
  Trash2,
  Moon,
  Sun,
  X,
} from "lucide-react";
import {
  aggregateShopping,
  confirmedPriceCoverage,
  confirmedRecipeCost,
  getWeekKey,
  roundMoney,
  scaleIngredients,
  storeUnitPrice,
} from "@/lib/calculations";
import { categorizeFood } from "@/lib/food";
import DietImporter from "@/components/diet-importer";
import { BuiltDietPlan } from "@/lib/diet";
import { createPlan } from "@/lib/planner";
import {
  normalizeRetention,
  planDateLabel,
  prunePlans,
  uniquePlans,
} from "@/lib/plans";
import { recipes, seedPrices } from "@/lib/seed";
import { load, save } from "@/lib/storage";
import {
  FoodStyle,
  MealPlan,
  PlanRetention,
  Preferences,
  PriceItem,
  Recipe,
  ShoppingItem,
  Store,
} from "@/lib/types";
import ReceiptScanner, { ReceiptRow } from "@/components/receipt-scanner";
const stores: Store[] = [
  "Esselunga",
  "Lidl",
  "Eurospin",
  "Coop",
  "Conad",
  "Vivo",
  "Contè",
  "Despar",
  "Penny",
  "MD",
  "Altro",
];
const styles: FoodStyle[] = [
  "veloci",
  "economici",
  "high protein",
  "salutari",
  "classici italiani",
  "vegetariani",
  "vegani",
  "senza glutine",
  "senza lattosio",
];
const days = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const defaultPrefs: Preferences = {
  store: "Lidl",
  budget: 55,
  people: 2,
  meals: ["cena"],
  styles: ["veloci", "economici"],
  allergies: [],
};

const retentionOptions: Array<{ value: PlanRetention; label: string }> = [
  { value: 7, label: "Dopo 7 giorni" },
  { value: 15, label: "Dopo 15 giorni" },
  { value: 30, label: "Dopo 30 giorni" },
  { value: 60, label: "Dopo 60 giorni" },
  { value: "never", label: "Mai" },
];

function PlanPicker({
  plans,
  activeId,
  onSelect,
  variant = "cards",
}: {
  plans: MealPlan[];
  activeId: string;
  onSelect: (id: string) => void;
  variant?: "cards" | "list";
}) {
  if (!plans.length) return null;
  return (
    <div className={`plan-picker ${variant}`}>
      <div className="plan-picker-heading">
        <strong>
          {variant === "cards" ? "I tuoi piani" : "Piani disponibili"}
        </strong>
        <span>{plans.length}</span>
      </div>
      <div className="plan-options">
        {plans.map((item, index) => {
          const active = item.id === activeId;
          const number = plans.length - index;
          const label = `Piano ${number}, ${item.store ?? "Supermercato"}, ${planDateLabel(item)}`;
          return (
            <button
              type="button"
              key={item.id}
              className={`plan-option ${active ? "active" : ""}`}
              aria-pressed={active}
              aria-label={`Apri piano ${label}`}
              onClick={() => onSelect(item.id)}
            >
              <span>
                <strong>
                  {item.source === "diet-pdf"
                    ? `Dieta · ${item.name || item.store || `Piano ${number}`}`
                    : `${item.store ?? "Altro"} · Piano ${number}`}
                </strong>
                <small>
                  {item.source === "diet-pdf" && `${item.store} · `}
                  {planDateLabel(item)}
                </small>
              </span>
              <span className="plan-option-meta">
                € {item.total.toFixed(2)} · {item.people ?? 1} pers.
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Home() {
  const [tab, setTab] = useState("plan");
  const [ready, setReady] = useState(false);
  const [dark, setDark] = useState(false);
  const [prefs, setPrefs] = useState(defaultPrefs);
  const [catalog, setCatalog] = useState<PriceItem[]>(seedPrices);
  const [dietRecipes, setDietRecipes] = useState<Recipe[]>([]);
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [activePlanId, setActivePlanId] = useState("");
  const [shoppingByPlan, setShoppingByPlan] = useState<
    Record<string, ShoppingItem[]>
  >({});
  const [retention, setRetention] = useState<PlanRetention>("never");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    setPrefs(load("fudit:prefs", defaultPrefs));
    setDark(load("fudit:dark", false));
    const stored = load<PriceItem[]>("fudit:catalog", seedPrices);
    const mergedCatalog = seedPrices
      .map((seed) => ({
        ...seed,
        ...stored.find((item) => item.id === seed.id),
        stores: {
          ...seed.stores,
          ...stored.find((item) => item.id === seed.id)?.stores,
        },
      }))
      .concat(
        stored.filter(
          (item) => !seedPrices.some((seed) => seed.id === item.id),
        ),
      );
    setCatalog(mergedCatalog);
    const storedDietRecipesValue = load<unknown>("fudit:diet-recipes", []);
    const storedDietRecipes = Array.isArray(storedDietRecipesValue)
      ? (storedDietRecipesValue as Recipe[]).filter(
          (recipe) =>
            recipe &&
            typeof recipe.id === "string" &&
            Array.isArray(recipe.ingredients) &&
            Array.isArray(recipe.steps),
        )
      : [];
    const availableRecipes = [...storedDietRecipes, ...recipes];
    setDietRecipes(storedDietRecipes);
    const storedRetention = normalizeRetention(
      load<unknown>("fudit:plan-retention", "never"),
    );
    const legacyPlan = load<MealPlan | null>("fudit:plan", null);
    const legacySavedValue = load<unknown>("fudit:saved", []);
    const storedPlansValue = load<unknown>("fudit:plans", []);
    const legacySaved = Array.isArray(legacySavedValue)
      ? (legacySavedValue as MealPlan[])
      : [];
    const storedPlans = Array.isArray(storedPlansValue)
      ? (storedPlansValue as MealPlan[])
      : [];
    const migratedPlans = prunePlans(
      uniquePlans(
        storedPlans.length
          ? storedPlans
          : [legacyPlan, ...legacySaved].filter(
              (item): item is MealPlan => item !== null,
            ),
      ),
      storedRetention,
    );
    const storedShoppingValue = load<unknown>("fudit:shopping-by-plan", {});
    const storedShopping =
      storedShoppingValue &&
      typeof storedShoppingValue === "object" &&
      !Array.isArray(storedShoppingValue)
        ? (storedShoppingValue as Record<string, ShoppingItem[]>)
        : {};
    const legacyShoppingValue = load<unknown>("fudit:shopping", []);
    const legacyShopping = Array.isArray(legacyShoppingValue)
      ? (legacyShoppingValue as ShoppingItem[])
      : [];
    const hydratedShopping = { ...storedShopping };
    migratedPlans.forEach((item) => {
      if (!Array.isArray(hydratedShopping[item.id])) {
        hydratedShopping[item.id] =
          item.id === legacyPlan?.id && legacyShopping.length
            ? legacyShopping
            : aggregateShopping(
                item.meals
                  .map((meal) =>
                    availableRecipes.find(
                      (recipe) => recipe.id === meal.recipeId,
                    ),
                  )
                  .filter((recipe) => recipe !== undefined),
                mergedCatalog,
                item.store ?? defaultPrefs.store,
                item.people ?? defaultPrefs.people,
              );
      }
    });
    const storedActive = load("fudit:active-plan", "");
    setPlans(migratedPlans);
    setActivePlanId(
      migratedPlans.some((item) => item.id === storedActive)
        ? storedActive
        : (migratedPlans[0]?.id ?? ""),
    );
    setShoppingByPlan(hydratedShopping);
    setRetention(storedRetention);
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) {
      save("fudit:prefs", prefs);
      save("fudit:dark", dark);
      save("fudit:catalog", catalog);
      save("fudit:diet-recipes", dietRecipes);
      save("fudit:plans", plans);
      save("fudit:active-plan", activePlanId);
      save("fudit:shopping-by-plan", shoppingByPlan);
      save("fudit:plan-retention", retention);
    }
  }, [
    prefs,
    catalog,
    dietRecipes,
    plans,
    activePlanId,
    shoppingByPlan,
    retention,
    dark,
    ready,
  ]);
  useEffect(() => {
    if (!ready || retention === "never") return;
    const interval = window.setInterval(() => {
      setPlans((current) => {
        const remaining = prunePlans(current, retention);
        const ids = new Set(remaining.map((item) => item.id));
        setActivePlanId((active) =>
          ids.has(active) ? active : (remaining[0]?.id ?? ""),
        );
        setShoppingByPlan((shoppingState) =>
          Object.fromEntries(
            Object.entries(shoppingState).filter(([id]) => ids.has(id)),
          ),
        );
        return remaining;
      });
    }, 3_600_000);
    return () => window.clearInterval(interval);
  }, [ready, retention]);
  const allRecipes = [...dietRecipes, ...recipes];
  const plan =
    plans.find((item) => item.id === activePlanId) ?? plans[0] ?? null;
  const shopping = plan ? (shoppingByPlan[plan.id] ?? []) : [];
  const setShopping = (value: SetStateAction<ShoppingItem[]>) => {
    if (!plan) return;
    setShoppingByPlan((current) => {
      const activeShopping = current[plan.id] ?? [];
      const next = typeof value === "function" ? value(activeShopping) : value;
      return { ...current, [plan.id]: next };
    });
  };
  const selectPlan = (id: string) => setActivePlanId(id);
  const deletePlan = (id: string) => {
    const remaining = plans.filter((item) => item.id !== id);
    setPlans(remaining);
    setShoppingByPlan((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    if (activePlanId === id) setActivePlanId(remaining[0]?.id ?? "");
    setNotice("Piano eliminato.");
  };
  const changeRetention = (value: PlanRetention) => {
    const remaining = prunePlans(plans, value);
    setRetention(value);
    setPlans(remaining);
    if (!remaining.some((item) => item.id === activePlanId))
      setActivePlanId(remaining[0]?.id ?? "");
    const ids = new Set(remaining.map((item) => item.id));
    setShoppingByPlan((current) =>
      Object.fromEntries(Object.entries(current).filter(([id]) => ids.has(id))),
    );
  };
  const planStore = plan?.store ?? prefs.store;
  const addDietPlan = (result: BuiltDietPlan) => {
    setCatalog((current) => [
      ...current,
      ...result.newPrices.filter(
        (price) => !current.some((item) => item.id === price.id),
      ),
    ]);
    setDietRecipes((current) => [...result.recipes, ...current]);
    setPlans((current) => [result.plan, ...current]);
    setActivePlanId(result.plan.id);
    setShoppingByPlan((current) => ({
      ...current,
      [result.plan.id]: result.shopping,
    }));
    setNotice(
      `Dieta importata: € ${result.plan.total.toFixed(2)} per la settimana. ${result.recognizedPrices}/${result.totalIngredients} alimenti collegati al catalogo.`,
    );
    setTab("plan");
  };
  const recipePrice = (recipe: Recipe) => {
    if (!plan)
      return (
        <div className="recipe-price pending">
          <strong>—</strong>
          <small>genera un piano</small>
        </div>
      );
    const coverage = confirmedPriceCoverage(recipe, catalog, planStore);
    const cost = confirmedRecipeCost(recipe, catalog, planStore, prefs.people);
    if (cost === null)
      return (
        <div className="recipe-price pending">
          <strong>—</strong>
          <small>
            {coverage.confirmed}/{coverage.total} prezzi reali
          </small>
        </div>
      );
    return (
      <div className="recipe-price confirmed">
        <strong>€ {(cost / prefs.people).toFixed(2)}</strong>
        <small>/porzione · prezzi reali</small>
      </div>
    );
  };
  const generate = () => {
    if (prefs.people <= 0 || prefs.budget <= 0) {
      setNotice("Inserisci un budget e un numero di persone maggiori di zero.");
      return;
    }
    if (!prefs.meals.length) {
      setNotice("Seleziona almeno pranzo o cena.");
      return;
    }
    const p = createPlan(recipes, catalog, prefs);
    if (!p.meals.length) {
      setNotice(
        "Nessuna ricetta compatibile con le allergie e le preferenze inserite.",
      );
      return;
    }
    const nextShopping = aggregateShopping(
      p.meals
        .map((m) => recipes.find((r) => r.id === m.recipeId)!)
        .filter(Boolean),
      catalog,
      prefs.store,
      prefs.people,
    );
    setPlans((current) => [p, ...current]);
    setActivePlanId(p.id);
    setShoppingByPlan((current) => ({ ...current, [p.id]: nextShopping }));
    setNotice(
      p.overBudget
        ? "Budget superato: prova lo stile economici o riduci i pasti."
        : `Piano pronto con prezzi ${prefs.store} della settimana.`,
    );
    setTab("plan");
  };
  const regenerate = (day: number, slot: string) => {
    if (!plan) return;
    const used = new Set(
      plan.meals
        .filter((m) => m.day === day && m.slot !== slot)
        .map((m) => m.recipeId),
    );
    const candidates = recipes.filter(
      (r) =>
        !used.has(r.id) &&
        r.id !==
          plan.meals.find((m) => m.day === day && m.slot === slot)?.recipeId,
    );
    const next = createPlan(candidates, catalog, {
      ...prefs,
      store: planStore,
      people: plan.people ?? prefs.people,
    });
    const meal = next.meals[0];
    if (!meal) {
      setNotice("Non ci sono alternative compatibili per questo pasto.");
      return;
    }
    const meals = plan.meals.map((m) =>
      m.day === day && m.slot === slot
        ? { ...m, recipeId: meal.recipeId, cost: meal.cost }
        : m,
    );
    const total = roundMoney(meals.reduce((s, m) => s + m.cost, 0));
    const p = {
      ...plan,
      meals,
      total,
      overBudget: total > (plan.budget ?? prefs.budget),
    };
    setPlans((current) => current.map((item) => (item.id === p.id ? p : item)));
    setShopping(
      aggregateShopping(
        meals
          .map((m) => recipes.find((r) => r.id === m.recipeId)!)
          .filter(Boolean),
        catalog,
        planStore,
        plan.people ?? prefs.people,
      ),
    );
  };
  const toggle = (style: FoodStyle) =>
    setPrefs((p) => ({
      ...p,
      styles: p.styles.includes(style)
        ? p.styles.filter((x) => x !== style)
        : [...p.styles, style],
    }));
  const addShoppingItem = () => {
    setShopping((s) => [
      {
        id: crypto.randomUUID(),
        name: "Nuovo elemento",
        unit: "pz",
        quantity: 1,
        category: "Altro",
        estimatedCost: 0,
        manual: true,
      },
      ...s,
    ]);
    setNotice("Elemento aggiunto: puoi modificarlo direttamente nella lista.");
  };
  const addCatalogItem = () => {
    setCatalog((c) => [
      {
        id: crypto.randomUUID(),
        name: "Nuovo ingrediente",
        unit: "g",
        price: 1,
        per: 100,
        category: "Altro",
        allergens: [],
        nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        stores: { [planStore]: 1 },
      },
      ...c,
    ]);
    setNotice("Ingrediente aggiunto in cima al catalogo.");
  };
  const importReceipt = (rows: ReceiptRow[]) => {
    setCatalog((current) =>
      rows.reduce((next, row) => {
        const normalized = row.name.toLowerCase();
        const tokens = normalized
          .split(/\s+/)
          .filter((token) => token.length > 2);
        const match = next.find((item) => {
          const itemName = item.name.toLowerCase();
          return (
            itemName.includes(normalized) ||
            normalized.includes(itemName) ||
            tokens.some((token) => itemName.includes(token))
          );
        });
        return match
          ? next.map((item) =>
              item.id === match.id
                ? {
                    ...item,
                    stores: { ...item.stores, [planStore]: row.price },
                    confirmedStores: {
                      ...item.confirmedStores,
                      [planStore]: row.price > 0,
                    },
                    price: row.price,
                    category: categorizeFood(row.name, item.category),
                  }
                : item,
            )
          : [
              {
                id: crypto.randomUUID(),
                name: row.name,
                unit: "pz",
                price: row.price,
                per: 1,
                category: categorizeFood(row.name),
                allergens: [],
                nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 },
                stores: { [planStore]: row.price },
                confirmedStores: { [planStore]: row.price > 0 },
              },
              ...next,
            ];
      }, current),
    );
    setNotice(
      `${rows.length} righe dello scontrino importate nel catalogo ${planStore}.`,
    );
  };
  if (!ready)
    return (
      <main className="shell">
        <div className="card">Caricamento…</div>
      </main>
    );
  const Nav = () => (
    <nav className="nav">
      {[
        ["plan", CalendarDays, "Pianifica"],
        ["shop", ShoppingBasket, "Spesa"],
        ["recipes", ChefHat, "Ricette"],
        ["diet", FileHeart, "Dieta"],
        ["prices", CircleDollarSign, "Prezzi"],
        ["settings", Settings, "Impostazioni"],
      ].map(([id, Icon, label]) => (
        <button
          key={id as string}
          className={"tab " + (tab === id ? "active" : "")}
          onClick={() => setTab(id as string)}
        >
          <Icon size={18} />
          <br />
          {label as string}
        </button>
      ))}
    </nav>
  );
  return (
    <main className={"shell " + (dark ? "dark" : "")}>
      <header className="app-header">
        <div>
          <h1>Fudit</h1>
          <span className="muted">
            {tab === "plan"
              ? "La tua settimana"
              : tab === "shop"
                ? "Lista della spesa"
                : tab === "recipes"
                  ? `${allRecipes.length} ricette`
                  : tab === "diet"
                    ? "Importa dieta PDF"
                    : tab === "prices"
                      ? "Catalogo prezzi"
                      : "Preferenze e dati"}
          </span>
        </div>
        <div className="header-actions">
          <button
            className="icon-button"
            aria-label="Cambia tema"
            onClick={() => setDark((v) => !v)}
          >
            {dark ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          {tab === "plan" && (
            <button className="button" onClick={generate}>
              Genera piano
            </button>
          )}
        </div>
      </header>
      {notice && (
        <div className="notice">
          {notice}
          <button onClick={() => setNotice("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {tab === "plan" && (
        <>
          <PlanPicker
            plans={plans}
            activeId={plan?.id ?? ""}
            onSelect={selectPlan}
          />
          <section className="grid two plan-grid">
            <div className="card">
              <h2>Il tuo piano</h2>
              {!plan ? (
                <>
                  <p className="muted">
                    Scegli le preferenze e genera la settimana.
                  </p>
                  <button className="button" onClick={generate}>
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
                        {plan.overBudget ? "Da ottimizzare" : "In linea"}
                      </div>
                    </div>
                  </div>
                  {days.map((d, i) => (
                    <div className="day" key={d}>
                      <b>{d}</b>
                      {plan.meals
                        .filter((m) => m.day === i)
                        .map((m) => {
                          const r = allRecipes.find((x) => x.id === m.recipeId);
                          if (!r) return null;
                          return (
                            <div
                              key={`${m.slot}-${m.recipeId}`}
                              className="meal-row"
                            >
                              <span className="meal-title">
                                {m.slot} · {r.title}
                                <small className="meal-cost">
                                  € {m.cost.toFixed(2)}
                                </small>
                              </span>
                              {plan.source !== "diet-pdf" && (
                                <button
                                  className="meal-refresh"
                                  aria-label={`Rigenera ${m.slot} di ${d}`}
                                  onClick={() => regenerate(i, m.slot)}
                                >
                                  <RotateCcw size={13} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  ))}
                  <div className="autosave-note">Salvato automaticamente</div>
                </>
              )}
            </div>
            <div className="card preferences-card">
              <h2>Preferenze</h2>
              <label>Supermercato</label>
              <select
                value={prefs.store}
                onChange={(e) =>
                  setPrefs({ ...prefs, store: e.target.value as Store })
                }
              >
                {stores.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <div className="grid two compact-grid">
                <div>
                  <label>Budget settimanale (€)</label>
                  <input
                    aria-label="Budget settimanale (€)"
                    type="number"
                    min="0"
                    max="10000"
                    value={prefs.budget || ""}
                    onChange={(e) =>
                      setPrefs({
                        ...prefs,
                        budget:
                          e.target.value === ""
                            ? 0
                            : Math.min(
                                10000,
                                Math.max(0, +e.target.value || 0),
                              ),
                      })
                    }
                  />
                </div>
                <div>
                  <label>Persone</label>
                  <input
                    aria-label="Persone"
                    type="number"
                    min="0"
                    max="30"
                    value={prefs.people || ""}
                    onChange={(e) =>
                      setPrefs({
                        ...prefs,
                        people:
                          e.target.value === ""
                            ? 0
                            : Math.min(30, Math.max(0, +e.target.value || 0)),
                      })
                    }
                  />
                </div>
              </div>
              <fieldset>
                <legend>Pasti</legend>
                <div className="choice-row">
                  {["pranzo", "cena"].map((m) => (
                    <label key={m} className="pill meal-choice">
                      <input
                        className="check"
                        type="checkbox"
                        checked={prefs.meals.includes(m as "pranzo" | "cena")}
                        onChange={() =>
                          setPrefs((p) => ({
                            ...p,
                            meals: p.meals.includes(m as "pranzo" | "cena")
                              ? p.meals.filter((x) => x !== m)
                              : [...p.meals, m as "pranzo" | "cena"],
                          }))
                        }
                      />
                      <span>{m}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend>Stile</legend>
                <div className="choice-row">
                  {styles.map((s) => (
                    <button
                      type="button"
                      key={s}
                      className={
                        "pill style-choice " +
                        (prefs.styles.includes(s) ? "active" : "")
                      }
                      aria-pressed={prefs.styles.includes(s)}
                      onClick={() => toggle(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </fieldset>
              <label>Allergie / intolleranze (separate da virgola)</label>
              <input
                maxLength={300}
                value={prefs.allergies.join(", ")}
                onChange={(e) =>
                  setPrefs({
                    ...prefs,
                    allergies: e.target.value
                      .split(",")
                      .slice(0, 20)
                      .map((x) => x.trim().slice(0, 40))
                      .filter(Boolean),
                  })
                }
                placeholder="es. glutine, latte"
              />
            </div>
          </section>
        </>
      )}
      {tab === "shop" && (
        <section className="card shopping-card">
          {!plan ? (
            <p className="empty">
              Genera prima un piano alimentare: prezzi e lista saranno calcolati
              per il supermercato scelto.
            </p>
          ) : (
            <>
              <PlanPicker
                plans={plans}
                activeId={plan.id}
                onSelect={selectPlan}
                variant="list"
              />
              <div className="store-context">
                <ShoppingBasket size={22} />
                <div>
                  <span>Spesa stimata presso</span>
                  <strong>{planStore}</strong>
                  <small>Settimana del {plan.weekKey ?? getWeekKey()}</small>
                </div>
              </div>
              <div className="section-heading">
                <h2>Lista modificabile</h2>
                <button
                  data-testid="add-shopping"
                  className="button alt"
                  onClick={addShoppingItem}
                >
                  <Plus size={16} /> Aggiungi
                </button>
              </div>
              {[...new Set(shopping.map((i) => i.category))].map((cat) => (
                <div className="shop-group" key={cat}>
                  <h3>{cat}</h3>
                  {shopping
                    .filter((i) => i.category === cat)
                    .map((i) => (
                      <div
                        className={"shop-row " + (i.checked ? "done" : "")}
                        key={i.id}
                        onBlur={(event) => {
                          if (
                            event.currentTarget.contains(
                              event.relatedTarget as Node | null,
                            )
                          )
                            return;
                          setShopping((s) =>
                            s.map((x) =>
                              x.id === i.id
                                ? {
                                    ...x,
                                    category: categorizeFood(
                                      x.name,
                                      x.category,
                                    ),
                                  }
                                : x,
                            ),
                          );
                        }}
                      >
                        <input
                          aria-label={`Comprato ${i.name}`}
                          className="check"
                          type="checkbox"
                          checked={!!i.checked}
                          onChange={() =>
                            setShopping((s) =>
                              s.map((x) =>
                                x.id === i.id
                                  ? { ...x, checked: !x.checked }
                                  : x,
                              ),
                            )
                          }
                        />
                        <input
                          aria-label={`Nome ${i.name}`}
                          maxLength={80}
                          className="shop-name"
                          value={i.name}
                          onChange={(e) =>
                            setShopping((s) =>
                              s.map((x) =>
                                x.id === i.id
                                  ? {
                                      ...x,
                                      name: e.target.value.slice(0, 80),
                                    }
                                  : x,
                              ),
                            )
                          }
                        />
                        <input
                          aria-label={`Quantità ${i.name}`}
                          className="shop-qty"
                          type="number"
                          min="0"
                          max="10000"
                          step="0.001"
                          value={Number.isFinite(i.quantity) ? i.quantity : 0}
                          onChange={(e) =>
                            setShopping((s) =>
                              s.map((x) =>
                                x.id === i.id
                                  ? {
                                      ...x,
                                      quantity: Math.min(
                                        10000,
                                        Math.max(0, +e.target.value || 0),
                                      ),
                                    }
                                  : x,
                              ),
                            )
                          }
                        />
                        <span className="unit">{i.unit}</span>
                        <input
                          aria-label={`Prezzo ${i.name}`}
                          className="shop-price"
                          type="number"
                          min="0"
                          max="10000"
                          step="0.01"
                          value={
                            Number.isFinite(i.estimatedCost)
                              ? i.estimatedCost
                              : 0
                          }
                          onChange={(e) => {
                            const totalCost = roundMoney(
                              Math.min(
                                10000,
                                Math.max(0, +e.target.value || 0),
                              ),
                            );
                            setShopping((s) =>
                              s.map((x) =>
                                x.id === i.id
                                  ? {
                                      ...x,
                                      estimatedCost: totalCost,
                                    }
                                  : x,
                              ),
                            );
                            if (!i.manual && i.quantity > 0)
                              setCatalog((current) =>
                                current.map((item) =>
                                  item.id === i.id
                                    ? {
                                        ...item,
                                        stores: {
                                          ...item.stores,
                                          [planStore]: roundMoney(
                                            (totalCost * item.per) / i.quantity,
                                          ),
                                        },
                                        confirmedStores: {
                                          ...item.confirmedStores,
                                          [planStore]: totalCost > 0,
                                        },
                                      }
                                    : item,
                                ),
                              );
                          }}
                        />
                        <button
                          aria-label={`Elimina ${i.name}`}
                          className="row-delete"
                          onClick={() =>
                            setShopping((s) => s.filter((x) => x.id !== i.id))
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                </div>
              ))}
              <div className="list-footer">
                <strong>
                  €{" "}
                  {shopping.reduce((s, i) => s + i.estimatedCost, 0).toFixed(2)}
                </strong>
                <button
                  className="button alt"
                  onClick={async () => {
                    const t = shopping
                      .map(
                        (i) =>
                          `[${i.checked ? "x" : " "}] ${i.name}: ${i.quantity}${i.unit}`,
                      )
                      .join("\n");
                    try {
                      await navigator.clipboard.writeText(t);
                      setNotice("Lista copiata.");
                    } catch {
                      setNotice(
                        "Copia non disponibile: verifica i permessi del browser.",
                      );
                    }
                  }}
                >
                  <Copy size={16} /> Copia
                </button>
              </div>
              <ReceiptScanner onImport={importReceipt} />
            </>
          )}
        </section>
      )}
      {tab === "recipes" && (
        <>
          <div className="recipe-toolbar">
            <div>
              <b>Dosi per</b>
              <span className="muted">
                {" "}
                Ingredienti e costi si aggiornano subito
              </span>
            </div>
            <div className="people-control">
              <button
                onClick={() =>
                  setPrefs((p) => ({ ...p, people: Math.max(0, p.people - 1) }))
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
                onChange={(e) =>
                  setPrefs((p) => ({
                    ...p,
                    people:
                      e.target.value === ""
                        ? 0
                        : Math.min(30, Math.max(0, +e.target.value || 0)),
                  }))
                }
              />
              <button
                onClick={() =>
                  setPrefs((p) => ({ ...p, people: p.people + 1 }))
                }
              >
                +
              </button>
              <span>persone</span>
            </div>
          </div>
          <section className="grid two recipe-grid">
            {allRecipes.map((r) => (
              <article className="card recipe-card" key={r.id}>
                <div className="recipe-top">
                  <div>
                    <h2>{r.title}</h2>
                    <p className="muted">
                      {r.time} min · {r.difficulty}
                    </p>
                  </div>
                  {recipePrice(r)}
                </div>
                <div className="tag-row">
                  {r.tags.map((t) => (
                    <span className="pill" key={t}>
                      {t}
                    </span>
                  ))}
                </div>
                <h3>
                  Ingredienti <span>{prefs.people} persone</span>
                </h3>
                <div className="ingredients-list">
                  {scaleIngredients(
                    r.ingredients,
                    r.baseServings,
                    prefs.people,
                  ).map((i) => (
                    <div key={i.id}>
                      <span>{i.name}</span>
                      <b>
                        {i.quantity}
                        {i.unit}
                      </b>
                    </div>
                  ))}
                </div>
                <div className="recipe-separator">
                  <span>Procedimento</span>
                </div>
                <ol className="steps">
                  {r.steps.map((s, index) => (
                    <li key={s}>
                      <span>{index + 1}</span>
                      <p>{s}</p>
                    </li>
                  ))}
                </ol>
                <div className="nutrition">
                  <span>{r.nutrition.calories} kcal</span>
                  <span>P {r.nutrition.protein}g</span>
                  <span>C {r.nutrition.carbs}g</span>
                  <span>G {r.nutrition.fat}g</span>
                </div>
              </article>
            ))}
          </section>
        </>
      )}
      {tab === "diet" && (
        <DietImporter
          stores={stores}
          catalog={catalog}
          defaultStore={prefs.store}
          defaultPeople={prefs.people}
          defaultBudget={prefs.budget}
          onGenerated={addDietPlan}
        />
      )}
      {tab === "prices" && (
        <section className="card">
          {!plan ? (
            <p className="empty">
              Genera un piano per vedere il listino settimanale del supermercato
              selezionato.
            </p>
          ) : (
            <>
              <PlanPicker
                plans={plans}
                activeId={plan.id}
                onSelect={selectPlan}
                variant="list"
              />
              <div className="store-context">
                <CircleDollarSign size={22} />
                <div>
                  <span>Listino del piano</span>
                  <strong>{planStore}</strong>
                  <small>Settimana del {plan.weekKey ?? getWeekKey()}</small>
                </div>
              </div>
              <div className="section-heading">
                <div>
                  <h2>Prezzi ingredienti</h2>
                  <p className="muted">
                    I prezzi confermati manualmente o tramite scontrino sono
                    usati per il costo reale per porzione. Gli altri restano
                    valori dimostrativi.
                  </p>
                </div>
                <button
                  data-testid="add-catalog"
                  className="button alt"
                  onClick={addCatalogItem}
                >
                  <Plus size={16} /> Aggiungi
                </button>
              </div>
              {catalog.map((p) => (
                <div className="grid three catalog-row" key={p.id}>
                  <input
                    aria-label={"nome " + p.name}
                    maxLength={80}
                    value={p.name}
                    onChange={(e) =>
                      setCatalog((c) =>
                        c.map((x) =>
                          x.id === p.id
                            ? {
                                ...x,
                                name: e.target.value.slice(0, 80),
                              }
                            : x,
                        ),
                      )
                    }
                    onBlur={() =>
                      setCatalog((c) =>
                        c.map((x) =>
                          x.id === p.id
                            ? {
                                ...x,
                                category: categorizeFood(x.name, x.category),
                              }
                            : x,
                        ),
                      )
                    }
                  />
                  <span className="catalog-meta">
                    <span>{p.category}</span>
                    <small
                      className={
                        p.confirmedStores?.[planStore]
                          ? "price-confirmed"
                          : "price-demo"
                      }
                    >
                      {p.confirmedStores?.[planStore]
                        ? "Prezzo reale"
                        : "Dimostrativo"}
                    </small>
                  </span>
                  <input
                    aria-label={"prezzo " + p.name}
                    type="number"
                    min="0"
                    max="10000"
                    step="0.01"
                    value={storeUnitPrice(p, planStore)}
                    onChange={(e) =>
                      setCatalog((c) =>
                        c.map((x) =>
                          x.id === p.id
                            ? {
                                ...x,
                                stores: {
                                  ...x.stores,
                                  [planStore]: roundMoney(
                                    Math.min(
                                      10000,
                                      Math.max(0, +e.target.value || 0),
                                    ),
                                  ),
                                },
                                confirmedStores: {
                                  ...x.confirmedStores,
                                  [planStore]: +e.target.value > 0,
                                },
                              }
                            : x,
                        ),
                      )
                    }
                  />
                </div>
              ))}
            </>
          )}
        </section>
      )}
      {tab === "settings" && (
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Dati locali</h2>
          <p className="muted">
            I dati restano in questo browser. In futuro potrai collegare
            Supabase senza cambiare la logica dell’app.
          </p>
          <div className="settings-grid">
            <div>
              <label htmlFor="plan-retention">Eliminazione automatica</label>
              <select
                id="plan-retention"
                value={retention}
                onChange={(event) => {
                  const value = event.target.value;
                  changeRetention(
                    value === "never"
                      ? "never"
                      : (Number(value) as PlanRetention),
                  );
                }}
              >
                {retentionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="muted retention-help">
                La scadenza viene controllata all’apertura dell’app e durante
                l’utilizzo.
              </p>
            </div>
            <div>
              <h3 className="settings-title">Piani salvati ({plans.length})</h3>
              <div className="saved-plan-list">
                {plans.map((item) => (
                  <div className="saved-plan-row" key={item.id}>
                    <button
                      type="button"
                      className="saved-plan-open"
                      onClick={() => {
                        selectPlan(item.id);
                        setTab("plan");
                      }}
                    >
                      <strong>{item.store ?? "Altro"}</strong>
                      <span>{planDateLabel(item)}</span>
                    </button>
                    <button
                      type="button"
                      className="row-delete"
                      aria-label={`Elimina piano ${item.store ?? "Altro"} ${planDateLabel(item)}`}
                      onClick={() => deletePlan(item.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                {!plans.length && (
                  <p className="muted">Nessun piano archiviato.</p>
                )}
              </div>
            </div>
          </div>
          <button
            className="button alt reset-button"
            onClick={() => {
              localStorage.clear();
              setPrefs(defaultPrefs);
              setCatalog(seedPrices);
              setDietRecipes([]);
              setPlans([]);
              setActivePlanId("");
              setShoppingByPlan({});
              setRetention("never");
              setNotice("Dati locali ripristinati.");
            }}
          >
            <Trash2 size={16} /> Svuota e ripristina
          </button>
        </section>
      )}
      <Nav />
    </main>
  );
}
