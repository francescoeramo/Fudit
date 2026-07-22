import { planDateLabel } from "@/lib/plans";
import { MealPlan } from "@/lib/types";

export default function PlanPicker({
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
