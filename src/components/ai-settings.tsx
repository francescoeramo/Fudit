"use client";

import { AI_MODEL } from "@/lib/ai";

export default function AiSettings({
  apiKey,
  onChange,
  onOpenTutorial,
}: {
  apiKey: string;
  onChange: (key: string) => void;
  onOpenTutorial?: () => void;
}) {
  return (
    <div className="ai-settings">
      <h2>Assistente ricette</h2>
      {onOpenTutorial && (
        <button type="button" className="button alt" onClick={onOpenTutorial}>
          Riapri il tutorial guidato
        </button>
      )}
      <p className="muted">
        Gemini ordina ricette compatibili con le tue scelte e aiuta a variare il
        piano. Il motore locale funziona anche senza chiave.
      </p>
      <label htmlFor="gemini-key">Chiave API Gemini · {AI_MODEL}</label>
      <div className="ai-key-row">
        <input
          id="gemini-key"
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={apiKey}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Incolla la tua chiave API"
        />
        <button
          className="button alt"
          type="button"
          disabled={!apiKey}
          onClick={() => onChange("")}
        >
          Rimuovi chiave
        </button>
      </div>
      <p className="muted">
        La chiave resta solo in memoria fino al ricaricamento. Le richieste
        partono dal browser verso Google e contengono i nomi delle ricette
        candidate e la tua richiesta; diete e scontrini non vengono inviati
        automaticamente.
      </p>
      <p className="muted">
        Usa un progetto Google AI Studio senza fatturazione abilitata per
        restare nel piano gratuito. Le quote dipendono dal tuo account; nel
        piano gratuito Google può usare i dati per migliorare i suoi prodotti.
        Limita la chiave all’API Gemini e al dominio dell’app.
      </p>
      <a
        href="https://aistudio.google.com/api-keys"
        target="_blank"
        rel="noreferrer"
      >
        Gestisci la chiave in Google AI Studio
      </a>
    </div>
  );
}
