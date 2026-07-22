"use client";

import { Dispatch, SetStateAction } from "react";
import { Copy, Plus, ShoppingBasket, Trash2 } from "lucide-react";
import PlanPicker from "@/components/plan-picker";
import ReceiptScanner, { ReceiptImportRow } from "@/components/receipt-scanner";
import {
  getWeekKey,
  packageQuantityFor,
  priceCoverageFor,
  roundMoney,
} from "@/lib/calculations";
import { categorizeFood } from "@/lib/food";
import { MealPlan, PriceItem, ShoppingItem, Store } from "@/lib/types";

export default function ShoppingSection({
  plan,
  plans,
  shopping,
  catalog,
  store,
  onSelectPlan,
  onAddItem,
  setShopping,
  setCatalog,
  onImportReceipt,
  onNotice,
}: {
  plan: MealPlan | null;
  plans: MealPlan[];
  shopping: ShoppingItem[];
  catalog: PriceItem[];
  store: Store;
  onSelectPlan: (id: string) => void;
  onAddItem: () => void;
  setShopping: Dispatch<SetStateAction<ShoppingItem[]>>;
  setCatalog: Dispatch<SetStateAction<PriceItem[]>>;
  onImportReceipt: (rows: ReceiptImportRow[]) => void;
  onNotice: (message: string) => void;
}) {
  if (!plan)
    return (
      <section className="card shopping-card">
        <p className="empty">
          Genera prima un piano alimentare: prezzi e lista saranno calcolati per
          il supermercato scelto.
        </p>
      </section>
    );

  const coverage = priceCoverageFor(shopping, catalog, store);
  return (
    <section className="card shopping-card">
      <PlanPicker
        plans={plans}
        activeId={plan.id}
        onSelect={onSelectPlan}
        variant="list"
      />
      <div className="store-context">
        <ShoppingBasket size={22} />
        <div>
          <span>Spesa stimata presso</span>
          <strong>{store}</strong>
          <small>Settimana del {plan.weekKey ?? getWeekKey()}</small>
        </div>
      </div>
      <div className="section-heading">
        <h2>Lista modificabile</h2>
        <button
          data-testid="add-shopping"
          className="button alt"
          onClick={onAddItem}
        >
          <Plus size={16} /> Aggiungi
        </button>
      </div>
      <div
        className="price-coverage compact"
        aria-label="Copertura prezzi spesa"
      >
        <span className="price-confirmed">{coverage.confirmed} confermati</span>
        <span className="price-estimated">{coverage.estimated} stimati</span>
        <span className="price-missing">{coverage.missing} mancanti</span>
      </div>
      {[...new Set(shopping.map((item) => item.category))].map((category) => (
        <div className="shop-group" key={category}>
          <h3>{category}</h3>
          {shopping
            .filter((item) => item.category === category)
            .map((item) => (
              <div
                className={`shop-row ${item.checked ? "done" : ""}`}
                key={item.id}
                onBlur={(event) => {
                  if (
                    event.currentTarget.contains(
                      event.relatedTarget as Node | null,
                    )
                  )
                    return;
                  setShopping((current) =>
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
                  );
                }}
              >
                <input
                  aria-label={`Comprato ${item.name}`}
                  className="check"
                  type="checkbox"
                  checked={Boolean(item.checked)}
                  onChange={() =>
                    setShopping((current) =>
                      current.map((currentItem) =>
                        currentItem.id === item.id
                          ? { ...currentItem, checked: !currentItem.checked }
                          : currentItem,
                      ),
                    )
                  }
                />
                <input
                  aria-label={`Nome ${item.name}`}
                  maxLength={80}
                  className="shop-name"
                  value={item.name}
                  onChange={(event) =>
                    setShopping((current) =>
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
                />
                <input
                  aria-label={`Quantità ${item.name}`}
                  className="shop-qty"
                  type="number"
                  min="0"
                  max="10000"
                  step="0.001"
                  value={Number.isFinite(item.quantity) ? item.quantity : 0}
                  onChange={(event) =>
                    setShopping((current) =>
                      current.map((currentItem) =>
                        currentItem.id === item.id
                          ? {
                              ...currentItem,
                              quantity: Math.min(
                                10000,
                                Math.max(0, +event.target.value || 0),
                              ),
                            }
                          : currentItem,
                      ),
                    )
                  }
                />
                <span className="unit">{item.unit}</span>
                <input
                  aria-label={`Prezzo ${item.name}`}
                  className="shop-price"
                  type="number"
                  min="0"
                  max="10000"
                  step="0.01"
                  value={
                    Number.isFinite(item.estimatedCost) ? item.estimatedCost : 0
                  }
                  onChange={(event) => {
                    const totalCost = roundMoney(
                      Math.min(10000, Math.max(0, +event.target.value || 0)),
                    );
                    setShopping((current) =>
                      current.map((currentItem) =>
                        currentItem.id === item.id
                          ? { ...currentItem, estimatedCost: totalCost }
                          : currentItem,
                      ),
                    );
                    if (!item.manual && item.quantity > 0) {
                      const importedAt = new Date().toISOString();
                      setCatalog((current) =>
                        current.map((catalogItem) =>
                          catalogItem.id === item.id
                            ? {
                                ...catalogItem,
                                stores: {
                                  ...catalogItem.stores,
                                  [store]: roundMoney(
                                    (totalCost *
                                      packageQuantityFor(catalogItem)) /
                                      item.quantity,
                                  ),
                                },
                                confirmedStores: {
                                  ...catalogItem.confirmedStores,
                                  [store]: totalCost > 0,
                                },
                                priceUpdatedAt: {
                                  ...catalogItem.priceUpdatedAt,
                                  [store]:
                                    totalCost > 0 ? importedAt : undefined,
                                },
                                priceSources: {
                                  ...catalogItem.priceSources,
                                  [store]:
                                    totalCost > 0
                                      ? {
                                          kind: "manual" as const,
                                          label: "Lista della spesa",
                                          importedAt,
                                        }
                                      : undefined,
                                },
                              }
                            : catalogItem,
                        ),
                      );
                    }
                  }}
                />
                <button
                  aria-label={`Elimina ${item.name}`}
                  className="row-delete"
                  onClick={() =>
                    setShopping((current) =>
                      current.filter(
                        (currentItem) => currentItem.id !== item.id,
                      ),
                    )
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
          {shopping
            .reduce((sum, item) => sum + item.estimatedCost, 0)
            .toFixed(2)}
        </strong>
        <button
          className="button alt"
          onClick={async () => {
            const text = shopping
              .map(
                (item) =>
                  `[${item.checked ? "x" : " "}] ${item.name}: ${item.quantity}${item.unit}`,
              )
              .join("\n");
            try {
              await navigator.clipboard.writeText(text);
              onNotice("Lista copiata.");
            } catch {
              onNotice(
                "Copia non disponibile: verifica i permessi del browser.",
              );
            }
          }}
        >
          <Copy size={16} /> Copia
        </button>
      </div>
      <ReceiptScanner catalog={catalog} onImport={onImportReceipt} />
    </section>
  );
}
