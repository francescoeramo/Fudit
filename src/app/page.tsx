"use client";
import { type SetStateAction } from "react";
import { AlertTriangle, Moon, Sun, X } from "lucide-react";
import {
  aggregateShopping,
  priceCoverageFor,
  roundMoney,
} from "@/lib/calculations";
import { categorizeFood } from "@/lib/food";
import DietImporter from "@/components/diet-importer";
import AppNav from "@/components/app-nav";
import PlanSection from "@/components/sections/plan-section";
import ShoppingSection from "@/components/sections/shopping-section";
import RecipesSection from "@/components/sections/recipes-section";
import PricesSection from "@/components/sections/prices-section";
import SettingsSection from "@/components/sections/settings-section";
import { BuiltDietPlan } from "@/lib/diet";
import { createPlan } from "@/lib/planner";
import { prunePlans } from "@/lib/plans";
import { recipes, seedPrices } from "@/lib/seed";
import {
  AppStorageData,
  clearAppStorage,
  createBackup,
  parseBackup,
} from "@/lib/storage";
import { FoodStyle, PlanRetention, ShoppingItem } from "@/lib/types";
import { ReceiptImportRow } from "@/components/receipt-scanner";
import { defaultPreferences, stores } from "@/lib/config";
import { useFuditStore } from "@/hooks/use-fudit-store";

export default function Home() {
  const {
    tab,
    ready,
    dark,
    prefs,
    catalog,
    dietRecipes,
    plans,
    activePlanId,
    shoppingByPlan,
    retention,
    notice,
    storageError,
    generationStatus,
    setTab,
    setDark,
    setPrefs,
    setCatalog,
    setDietRecipes,
    setPlans,
    setActivePlanId,
    setShoppingByPlan,
    setRetention,
    setNotice,
    setStorageError,
    setGenerationStatus,
    storageDefaults,
    applyStoredData,
  } = useFuditStore();
  const allRecipes = [...dietRecipes, ...recipes];
  const plan =
    plans.find((item) => item.id === activePlanId) ?? plans[0] ?? null;
  const shopping = plan ? (shoppingByPlan[plan.id] ?? []) : [];
  const planRecipes = plan
    ? plan.meals
        .map((meal) => allRecipes.find((recipe) => recipe.id === meal.recipeId))
        .filter((recipe) => recipe !== undefined)
    : [];
  const planPriceCoverage = priceCoverageFor(
    planRecipes.flatMap((recipe) => recipe.ingredients),
    catalog,
    plan?.store ?? prefs.store,
  );
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
  const generate = () => {
    if (prefs.people <= 0 || prefs.budget <= 0) {
      setGenerationStatus("error");
      setNotice("Inserisci un budget e un numero di persone maggiori di zero.");
      return;
    }
    if (!prefs.meals.length) {
      setGenerationStatus("error");
      setNotice("Seleziona almeno pranzo o cena.");
      return;
    }
    setGenerationStatus("generating");
    setNotice("Analizzo ricette, prezzi e vincoli per costruire la settimana…");
    window.setTimeout(() => {
      const p = createPlan(recipes, catalog, prefs);
      if (!p.meals.length) {
        setGenerationStatus("error");
        setNotice(
          "Nessuna ricetta compatibile con le allergie e le preferenze inserite.",
        );
        return;
      }
      const nextShopping = aggregateShopping(
        p.meals
          .map((meal) => recipes.find((recipe) => recipe.id === meal.recipeId)!)
          .filter(Boolean),
        catalog,
        prefs.store,
        prefs.people,
      );
      setPlans((current) => [p, ...current]);
      setActivePlanId(p.id);
      setShoppingByPlan((current) => ({ ...current, [p.id]: nextShopping }));
      setGenerationStatus("success");
      setNotice(
        p.overBudget
          ? "Piano creato, ma il budget è stato superato: prova lo stile economici o riduci i pasti."
          : `Piano creato e ottimizzato entro il budget. La lista della spesa per ${prefs.store} è pronta.`,
      );
      setTab("plan");
    }, 40);
  };
  const regenerate = (day: number, slot: string) => {
    if (!plan) return;
    const planPreferences = plan.preferences ?? {
      ...prefs,
      store: planStore,
      people: plan.people ?? prefs.people,
      budget: plan.budget ?? prefs.budget,
    };
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
      ...planPreferences,
      meals: [slot as "pranzo" | "cena"],
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
      overBudget: total > planPreferences.budget,
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
        price: 0,
        per: 100,
        packageQuantity: 100,
        category: "Altro",
        allergens: [],
        nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        stores: {},
      },
      ...c,
    ]);
    setNotice("Ingrediente aggiunto in cima al catalogo.");
  };
  const importReceipt = (rows: ReceiptImportRow[]) => {
    setCatalog((current) =>
      rows.reduce((next, row) => {
        const match = next.find((item) => item.id === row.matchedItemId);
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
                    priceUpdatedAt: {
                      ...item.priceUpdatedAt,
                      [planStore]: row.importedAt,
                    },
                    priceSources: {
                      ...item.priceSources,
                      [planStore]: {
                        kind: "receipt-ocr" as const,
                        label: row.sourceLabel,
                        importedAt: row.importedAt,
                      },
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
                packageQuantity: 1,
                category: categorizeFood(row.name),
                allergens: [],
                nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 },
                stores: { [planStore]: row.price },
                confirmedStores: { [planStore]: row.price > 0 },
                priceUpdatedAt: { [planStore]: row.importedAt },
                priceSources: {
                  [planStore]: {
                    kind: "receipt-ocr" as const,
                    label: row.sourceLabel,
                    importedAt: row.importedAt,
                  },
                },
              },
              ...next,
            ];
      }, current),
    );
    setNotice(
      `${rows.length} righe dello scontrino importate nel catalogo ${planStore}.`,
    );
  };

  const currentStorageData = (): AppStorageData => ({
    prefs,
    dark,
    catalog,
    dietRecipes,
    plans,
    activePlanId,
    shoppingByPlan,
    retention,
  });

  const exportBackup = () => {
    const url = URL.createObjectURL(
      new Blob([createBackup(currentStorageData())], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `fudit-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice("Backup esportato.");
  };

  const importBackup = async (file: File) => {
    try {
      const imported = parseBackup(await file.text(), storageDefaults());
      applyStoredData(imported);
      setStorageError("");
      setNotice("Backup importato e migrato alla versione corrente.");
    } catch (reason) {
      setNotice(
        reason instanceof Error
          ? `Importazione non riuscita: ${reason.message}`
          : "Importazione non riuscita.",
      );
    }
  };
  if (!ready)
    return (
      <main className="shell">
        <div className="card">Caricamento…</div>
      </main>
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
            onClick={() => setDark((value) => !value)}
          >
            {dark ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          {tab === "plan" && (
            <button
              className="button"
              onClick={generate}
              disabled={generationStatus === "generating"}
            >
              {generationStatus === "generating"
                ? "Creo il piano…"
                : "Genera piano"}
            </button>
          )}
        </div>
      </header>
      {notice && (
        <div className="notice" role="status" aria-live="polite">
          {notice}
          <button aria-label="Chiudi messaggio" onClick={() => setNotice("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {storageError && (
        <div className="storage-error" role="alert">
          <AlertTriangle size={18} />
          <div>
            <strong>Modifiche non salvate</strong>
            <span>{storageError}</span>
          </div>
        </div>
      )}
      {tab === "plan" && (
        <PlanSection
          plans={plans}
          plan={plan}
          recipes={allRecipes}
          prefs={prefs}
          coverage={planPriceCoverage}
          generationStatus={generationStatus}
          onGenerate={generate}
          onSelectPlan={selectPlan}
          onRegenerate={regenerate}
          setPrefs={setPrefs}
          onToggleStyle={toggle}
        />
      )}
      {tab === "shop" && (
        <ShoppingSection
          plan={plan}
          plans={plans}
          shopping={shopping}
          catalog={catalog}
          store={planStore}
          onSelectPlan={selectPlan}
          onAddItem={addShoppingItem}
          setShopping={setShopping}
          setCatalog={setCatalog}
          onImportReceipt={importReceipt}
          onNotice={setNotice}
        />
      )}
      {tab === "recipes" && (
        <RecipesSection
          recipes={allRecipes}
          plan={plan}
          catalog={catalog}
          prefs={prefs}
          setPrefs={setPrefs}
        />
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
        <PricesSection
          plan={plan}
          plans={plans}
          catalog={catalog}
          store={planStore}
          onSelectPlan={selectPlan}
          onAddItem={addCatalogItem}
          setCatalog={setCatalog}
        />
      )}
      {tab === "settings" && (
        <SettingsSection
          plans={plans}
          retention={retention}
          onRetentionChange={changeRetention}
          onOpenPlan={(id) => {
            selectPlan(id);
            setTab("plan");
          }}
          onDeletePlan={deletePlan}
          onExport={exportBackup}
          onImport={importBackup}
          onReset={() => {
            clearAppStorage();
            setPrefs(defaultPreferences);
            setCatalog(seedPrices);
            setDietRecipes([]);
            setPlans([]);
            setActivePlanId("");
            setShoppingByPlan({});
            setRetention("never");
            setStorageError("");
            setNotice("Dati locali ripristinati.");
          }}
        />
      )}
      <AppNav active={tab} onChange={setTab} />
    </main>
  );
}
