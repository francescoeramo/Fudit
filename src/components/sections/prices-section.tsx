"use client";

import { Dispatch, SetStateAction, useMemo, useState } from "react";
import { CircleDollarSign, Plus } from "lucide-react";
import PlanPicker from "@/components/plan-picker";
import {
  getWeekKey,
  packageQuantityFor,
  PriceStatus,
  priceStatusFor,
  referencePriceFor,
  roundMoney,
  storeUnitPrice,
} from "@/lib/calculations";
import { categorizeFood } from "@/lib/food";
import { MealPlan, PriceItem, Store } from "@/lib/types";

const formatDate = (value?: string) => {
  if (!value || !Number.isFinite(new Date(value).getTime()))
    return "Nessun aggiornamento confermato";
  return `Aggiornato ${new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value))}`;
};

export default function PricesSection({
  plan,
  plans,
  catalog,
  store,
  onSelectPlan,
  onAddItem,
  setCatalog,
  mdPriceError,
}: {
  plan: MealPlan | null;
  plans: MealPlan[];
  catalog: PriceItem[];
  store: Store;
  onSelectPlan: (id: string) => void;
  onAddItem: () => void;
  setCatalog: Dispatch<SetStateAction<PriceItem[]>>;
  mdPriceError: string;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PriceStatus | "all">("all");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return catalog.filter(
      (item) =>
        (!needle ||
          item.name.toLowerCase().includes(needle) ||
          item.category.toLowerCase().includes(needle)) &&
        (statusFilter === "all" ||
          priceStatusFor(item, store) === statusFilter),
    );
  }, [catalog, query, statusFilter, store]);

  if (!plan)
    return (
      <section className="card">
        <p className="empty">
          Genera un piano per vedere il listino del supermercato selezionato.
        </p>
      </section>
    );

  return (
    <section className="card">
      <PlanPicker
        plans={plans}
        activeId={plan.id}
        onSelect={onSelectPlan}
        variant="list"
      />
      <div className="store-context">
        <CircleDollarSign size={22} />
        <div>
          <span>Listino del piano</span>
          <strong>{store}</strong>
          <small>Settimana del {plan.weekKey ?? getWeekKey()}</small>
        </div>
      </div>
      {store === "MD" && (
        <p className={mdPriceError ? "price-missing" : "muted"} role="status">
          {mdPriceError
            ? `Prezzi MD automatici non disponibili: ${mdPriceError}`
            : "I prezzi MD provengono dal volantino ufficiale Sud e vengono aggiornati ogni martedì. Prezzi manuali e da scontrino hanno la priorità."}
        </p>
      )}
      <div className="section-heading">
        <div>
          <h2>Prezzi ingredienti</h2>
          <p className="muted">
            Origine e data permettono di distinguere prezzi manuali, OCR e
            stime.
          </p>
        </div>
        <button
          data-testid="add-catalog"
          className="button alt"
          onClick={onAddItem}
        >
          <Plus size={16} /> Aggiungi
        </button>
      </div>
      <div className="search-controls catalog-search">
        <input
          type="search"
          aria-label="Cerca nel catalogo"
          placeholder="Cerca alimento o categoria"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          aria-label="Filtra catalogo per stato prezzo"
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as PriceStatus | "all")
          }
        >
          <option value="all">Tutti i prezzi</option>
          <option value="confirmed">Confermati</option>
          <option value="estimated">Stimati</option>
          <option value="missing">Mancanti</option>
        </select>
      </div>
      <p className="results-count" aria-live="polite">
        {filtered.length} alimenti trovati
      </p>
      <div className="price-legend">
        <span className="price-confirmed">Confermato</span>
        <span className="price-estimated">Stimato</span>
        <span className="price-missing">Mancante</span>
      </div>
      {filtered.map((item) => {
        const status = priceStatusFor(item, store);
        const source = item.priceSources?.[store];
        const statusLabel =
          status === "confirmed"
            ? "Confermato"
            : status === "estimated"
              ? "Stimato"
              : "Mancante";
        return (
          <div className="grid three catalog-row" key={item.id}>
            <input
              aria-label={`nome ${item.name}`}
              maxLength={80}
              value={item.name}
              onChange={(event) =>
                setCatalog((current) =>
                  current.map((currentItem) =>
                    currentItem.id === item.id
                      ? {
                          ...currentItem,
                          name: event.target.value.slice(0, 80),
                        }
                      : currentItem,
                  ),
                )
              }
              onBlur={() =>
                setCatalog((current) =>
                  current.map((currentItem) =>
                    currentItem.id === item.id
                      ? {
                          ...currentItem,
                          category: categorizeFood(
                            currentItem.name,
                            currentItem.category,
                          ),
                        }
                      : currentItem,
                  ),
                )
              }
            />
            <span className="catalog-meta">
              <span>{item.category}</span>
              <small className={`price-${status}`}>{statusLabel}</small>
            </span>
            <div className="catalog-price-editor">
              <label>
                Confezione ({item.unit})
                <input
                  aria-label={`quantità confezione ${item.name}`}
                  type="number"
                  min="0.001"
                  max="100000"
                  step="0.001"
                  value={packageQuantityFor(item, store)}
                  onChange={(event) => {
                    const quantity = Math.min(
                      100000,
                      Math.max(0.001, +event.target.value || 0.001),
                    );
                    setCatalog((current) =>
                      current.map((currentItem) =>
                        currentItem.id === item.id
                          ? {
                              ...currentItem,
                              per: quantity,
                              packageQuantity: quantity,
                              packageQuantities: {
                                ...currentItem.packageQuantities,
                                [store]: quantity,
                              },
                            }
                          : currentItem,
                      ),
                    );
                  }}
                />
              </label>
              <label>
                Prezzo confezione (€)
                <input
                  aria-label={`prezzo ${item.name}`}
                  type="number"
                  min="0"
                  max="10000"
                  step="0.01"
                  value={
                    status === "missing" ? "" : storeUnitPrice(item, store)
                  }
                  onChange={(event) => {
                    const value = roundMoney(
                      Math.min(10000, Math.max(0, +event.target.value || 0)),
                    );
                    const importedAt = new Date().toISOString();
                    setCatalog((current) =>
                      current.map((currentItem) =>
                        currentItem.id === item.id
                          ? {
                              ...currentItem,
                              stores: { ...currentItem.stores, [store]: value },
                              confirmedStores: {
                                ...currentItem.confirmedStores,
                                [store]: value > 0,
                              },
                              priceUpdatedAt: {
                                ...currentItem.priceUpdatedAt,
                                [store]: value > 0 ? importedAt : undefined,
                              },
                              priceSources: {
                                ...currentItem.priceSources,
                                [store]:
                                  value > 0
                                    ? {
                                        kind: "manual" as const,
                                        label: "Catalogo prezzi",
                                        importedAt,
                                      }
                                    : undefined,
                              },
                            }
                          : currentItem,
                      ),
                    );
                  }}
                />
              </label>
              <div className="catalog-reference-price">
                <strong>
                  € {referencePriceFor(item, store).toFixed(2)} /
                  {item.unit === "g" ? "kg" : item.unit === "ml" ? "l" : "pz"}
                </strong>
                <small>{formatDate(item.priceUpdatedAt?.[store])}</small>
                <small>
                  Origine: {source?.kind ?? "stima iniziale"}
                  {source?.label ? ` · ${source.label}` : ""}
                </small>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
