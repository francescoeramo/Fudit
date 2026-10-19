"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";

export const AI_ONBOARDING_KEY = "fudit:ai-onboarding:v1";

const titles = [
  "Benvenuto in Fudit",
  "Crea la tua chiave gratuita",
  "Attiva l’assistente",
  "Il tuo primo piano",
];

/** Mounted by Home only after client storage hydration. Never persists the key. */
export default function AiOnboarding({
  apiKey,
  onKeyChange,
  onComplete,
  forceOpen = false,
}: {
  apiKey: string;
  onKeyChange: (key: string) => void;
  onComplete: (destination: "plan" | "ideas") => void;
  forceOpen?: boolean;
}) {
  const [open, setOpen] = useState(() => {
    if (forceOpen) return true;
    try {
      return localStorage.getItem(AI_ONBOARDING_KEY) !== "done";
    } catch {
      return true;
    }
  });
  const [step, setStep] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  useEffect(() => {
    heading.current?.focus();
  }, [step]);

  const finish = (destination: "plan" | "ideas" = "plan") => {
    try {
      localStorage.setItem(AI_ONBOARDING_KEY, "done");
    } catch {
      /* The app remains usable when storage is blocked. */
    }
    setOpen(false);
    onComplete(destination);
  };
  if (!open) return null;

  return (
    <section className="card ai-onboarding" aria-labelledby={titleId}>
      <h2 id={titleId} ref={heading} tabIndex={-1}>
        {titles[step]}
      </h2>
      <p className="results-count" aria-live="polite">
        Passaggio {step + 1} di {titles.length}
      </p>
      {step === 0 && (
        <>
          <p>
            Organizza i pasti della settimana, trova ricette con quello che hai
            e prepara la lista della spesa.
          </p>
          <p>
            Puoi iniziare subito, senza account. L’assistente Gemini è
            facoltativo: per usarlo serve una chiave personale, cioè un codice
            che collega Fudit al tuo account Google.
          </p>
          <p className="muted">
            Questa guida ti accompagna nella configurazione. Puoi saltarla e
            riaprirla da Impostazioni → Assistente ricette.
          </p>
        </>
      )}
      {step === 1 && (
        <>
          <ol className="onboarding-instructions">
            <li>
              Apri{" "}
              <a
                href="https://aistudio.google.com/api-keys"
                target="_blank"
                rel="noreferrer"
              >
                Google AI Studio <ExternalLink size={14} aria-hidden="true" />
              </a>{" "}
              in una nuova scheda e accedi con il tuo account Google.
            </li>
            <li>
              Se è il primo accesso, leggi e accetta le condizioni di Google.
              Potresti trovare una chiave già creata nel progetto predefinito.
            </li>
            <li>
              Se non trovi una chiave, scegli <strong>Create API key</strong>{" "}
              (Crea chiave API). Dai un nome, per esempio “Fudit”, e scegli un
              nuovo progetto o il progetto gratuito predefinito.
            </li>
            <li>
              Controlla che il progetto sia nel piano <strong>Free</strong> e
              senza fatturazione attiva. Per questa configurazione non attivare
              “Set up billing”, non associare una carta e non scegliere un piano
              a pagamento.
            </li>
            <li>
              Copia la chiave con il pulsante di copia di Google, poi torna in
              questa scheda e premi “Avanti”. I nomi dei pulsanti possono
              cambiare con la lingua.
            </li>
          </ol>
          <p className="muted">
            Se il tuo account non offre il piano gratuito, continua con il
            motore locale di Fudit.{" "}
            <a
              href="https://ai.google.dev/gemini-api/docs/api-key"
              target="_blank"
              rel="noreferrer"
            >
              Guida ufficiale alle chiavi Gemini
            </a>
            .
          </p>
        </>
      )}
      {step === 2 && (
        <>
          <p>
            Incolla qui il codice copiato da Google. Non condividerlo con altre
            persone e non inviarlo in chat.
          </p>
          <label htmlFor="onboarding-gemini-key">
            La tua chiave API Gemini
          </label>
          <input
            id="onboarding-gemini-key"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={apiKey}
            onChange={(event) => onKeyChange(event.target.value)}
            placeholder="Incolla la chiave da Google AI Studio"
          />
          <p className="muted">
            La chiave resta solo in memoria: dopo un ricaricamento dovrai
            reinserirla nelle Impostazioni. Non finisce nei backup. Google
            riceverà la tua richiesta e le ricette candidate; nel piano gratuito
            può usarle per migliorare i suoi prodotti. Evita dati personali o
            sanitari.
          </p>
          <p className="muted">
            L’inserimento non verifica la chiave e non invia una richiesta a
            Google. Se la quota è esaurita o la chiave non funziona, puoi
            comunque usare il motore locale.
          </p>
        </>
      )}
      {step === 3 && (
        <>
          <ol className="onboarding-instructions">
            <li>
              In <strong>Pianifica</strong>, scegli supermercato, budget e
              numero di persone.
            </li>
            <li>
              Seleziona pasti, stile alimentare e allergie, poi premi{" "}
              <strong>Genera piano</strong>. Se hai inserito una chiave, Gemini
              aiuta a scegliere fra le ricette compatibili; Fudit controlla i
              vincoli.
            </li>
            <li>
              Apri <strong>Spesa</strong> per la lista collegata al piano. In{" "}
              <strong>Prezzi</strong>, controlla fonte, data e stato dei prezzi:
              non tutti gli alimenti hanno un prezzo confermato.
            </li>
            <li>
              In <strong>Idee</strong>, seleziona gli ingredienti disponibili e
              cerca una ricetta. Con la chiave puoi anche descrivere cosa vuoi
              cucinare e premere <strong>Chiedi a Gemini</strong>.
            </li>
          </ol>
          <p className="muted">
            Allergie e dosi vanno sempre controllate prima di cucinare. Puoi
            cambiare o rimuovere la chiave in Impostazioni → Assistente ricette.
          </p>
        </>
      )}
      <div className="onboarding-actions">
        {step > 0 && (
          <button
            type="button"
            className="button alt"
            onClick={() => setStep(step - 1)}
          >
            <ArrowLeft size={16} /> Indietro
          </button>
        )}
        {step < 3 ? (
          <button
            type="button"
            className="button"
            disabled={step === 2 && !apiKey.trim()}
            onClick={() => setStep(step + 1)}
          >
            {step === 0 ? "Configura l’assistente" : "Avanti"}
            <ArrowRight size={16} />
          </button>
        ) : (
          <>
            <button
              type="button"
              className="button"
              onClick={() => finish("plan")}
            >
              Vai a Pianifica
            </button>
            {apiKey.trim() && (
              <button
                type="button"
                className="button alt"
                onClick={() => finish("ideas")}
              >
                Prova un’idea con Gemini
              </button>
            )}
          </>
        )}
        {step < 3 && (
          <button
            type="button"
            className="button alt"
            onClick={() => {
              if (step === 0) onKeyChange("");
              finish();
            }}
          >
            {step === 0 ? "Continua senza AI" : "Salta per ora"}
          </button>
        )}
      </div>
    </section>
  );
}
