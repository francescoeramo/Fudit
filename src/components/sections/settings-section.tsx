"use client";

import { useState } from "react";
import { Download, Trash2, Upload } from "lucide-react";
import ConfirmDialog from "@/components/confirm-dialog";
import { retentionOptions } from "@/lib/config";
import { planDateLabel } from "@/lib/plans";
import { MealPlan, PlanRetention } from "@/lib/types";

export default function SettingsSection({
  plans,
  retention,
  onRetentionChange,
  onOpenPlan,
  onDeletePlan,
  onExport,
  onImport,
  onReset,
}: {
  plans: MealPlan[];
  retention: PlanRetention;
  onRetentionChange: (value: PlanRetention) => void;
  onOpenPlan: (id: string) => void;
  onDeletePlan: (id: string) => void;
  onExport: () => void;
  onImport: (file: File) => Promise<void>;
  onReset: () => void;
}) {
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const planToDelete = plans.find((plan) => plan.id === pendingDelete);
  return (
    <section className="card">
      <h2>Dati locali</h2>
      <p className="muted">
        I dati restano in questo browser e usano il formato Fudit v3. Esporta
        periodicamente un backup per poterli ripristinare.
      </p>
      <div className="backup-actions">
        <button className="button" onClick={onExport}>
          <Download size={16} /> Esporta backup
        </button>
        <label className="button alt backup-import">
          <Upload size={16} /> Importa backup
          <input
            aria-label="Importa backup Fudit"
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onImport(file);
              event.target.value = "";
            }}
          />
        </label>
      </div>
      <div className="settings-grid">
        <div>
          <label htmlFor="plan-retention">Eliminazione automatica</label>
          <select
            id="plan-retention"
            value={retention}
            onChange={(event) =>
              onRetentionChange(
                event.target.value === "never"
                  ? "never"
                  : (Number(event.target.value) as PlanRetention),
              )
            }
          >
            {retentionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="muted retention-help">
            La scadenza viene controllata all’apertura e durante l’utilizzo.
          </p>
        </div>
        <div>
          <h3 className="settings-title">Piani salvati ({plans.length})</h3>
          <div className="saved-plan-list">
            {plans.map((plan) => (
              <div className="saved-plan-row" key={plan.id}>
                <button
                  type="button"
                  className="saved-plan-open"
                  onClick={() => onOpenPlan(plan.id)}
                >
                  <strong>{plan.store ?? "Altro"}</strong>
                  <span>{planDateLabel(plan)}</span>
                </button>
                <button
                  type="button"
                  className="row-delete"
                  aria-label={`Elimina piano ${plan.store ?? "Altro"} ${planDateLabel(plan)}`}
                  onClick={() => setPendingDelete(plan.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {!plans.length && <p className="muted">Nessun piano archiviato.</p>}
          </div>
        </div>
      </div>
      <button
        className="button alt reset-button"
        onClick={() => setResetOpen(true)}
      >
        <Trash2 size={16} /> Svuota e ripristina
      </button>
      <ConfirmDialog
        open={Boolean(planToDelete)}
        title="Eliminare questo piano?"
        description="Il piano e la relativa lista della spesa verranno rimossi. L’operazione non può essere annullata."
        confirmLabel="Elimina piano"
        destructive
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) onDeletePlan(pendingDelete);
          setPendingDelete(null);
        }}
      />
      <ConfirmDialog
        open={resetOpen}
        title="Cancellare tutti i dati Fudit?"
        description="Piani, prezzi, preferenze e liste verranno eliminati da questo browser. Esporta prima un backup se vuoi conservarli."
        confirmLabel="Cancella tutto"
        destructive
        onCancel={() => setResetOpen(false)}
        onConfirm={() => {
          onReset();
          setResetOpen(false);
        }}
      />
    </section>
  );
}
