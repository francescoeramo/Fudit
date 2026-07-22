# Fudit

Fudit è un pianificatore settimanale di pasti e spesa, gratuito e orientato alla privacy. Non richiede un account ed è pronto per il deploy su Vercel.

I prezzi inclusi inizialmente sono dati dimostrativi modificabili. Per MD, Fudit importa ogni settimana le offerte dal volantino ufficiale e distingue sempre valori confermati, stimati e mancanti.

## Funzionalità

- Generazione di piani settimanali entro un budget, con ottimizzazione globale della combinazione di ricette.
- Preferenze per supermercato, numero di persone, pasti, stile alimentare, allergie e intolleranze.
- Rigenerazione dei singoli pasti nel rispetto delle impostazioni originali del piano.
- Catalogo prezzi con quantità della confezione, prezzo al kg/litro, origine e data di aggiornamento.
- Aggiornamento automatico settimanale dei prezzi promozionali MD, con validità e area della fonte; prezzi manuali e da scontrino hanno sempre la priorità.
- Lista della spesa modificabile, raggruppata per categoria e collegata al piano selezionato.
- Ricerca e filtri per ricette e catalogo prezzi.
- Importazione di diete da PDF.
- Lettura OCR degli scontrini con correzione delle righe prima dell'importazione, suggerimenti di corrispondenza e segnalazione dei possibili duplicati.
- Backup JSON esportabile e importabile, dati versionati e migrazioni automatiche.
- Avvisi quando il browser non riesce a salvare o raggiunge il limite dello spazio locale.
- Conferme per eliminazione dei piani e cancellazione completa dei dati.
- Tema chiaro/scuro, navigazione da tastiera e layout mobile.

## Architettura

L'app usa Next.js e React. Le aree Pianificazione, Spesa, Ricette, Prezzi e Impostazioni sono componenti separati in `src/components/sections`; lo stato persistente è centralizzato nel reducer `src/hooks/use-fudit-store.ts`.

I dati dell'utente restano nel `localStorage` del browser. Il formato corrente è Fudit v4 e viene gestito da `src/lib/storage.ts`.

Il catalogo pubblico MD usa Supabase con Row Level Security: il browser può leggere soltanto i prezzi attivi. Importazioni, storico, esecuzioni e token del job non sono accessibili pubblicamente. La funzione `md-price-scraper` legge una sola volta a settimana il volantino pubblico MD Sud; Supabase Cron la esegue ogni martedì alle 04:00 UTC. Tutti i componenti usati rientrano nei piani gratuiti.

La sorgente iniziale è `m_sud_mac_nogas.html` (area Sud, macelleria, senza gastronomia). I prezzi promozionali possono variare per area e periodo: queste informazioni vengono mostrate accanto all'origine del prezzo.

## Avvio locale

Richiede Node.js e npm.

```bash
npm install
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

Il repository contiene già URL e chiave **publishable** del catalogo pubblico, che non è una credenziale segreta. Per collegare un altro progetto Supabase, copia `.env.example` in `.env.local` e imposta:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

## Verifiche

```bash
npm test
npm run test:ocr
npm run test:e2e
npm run lint
npm run build
```

I test end-to-end usano Playwright. Al primo utilizzo potrebbe essere necessario installare Chromium:

```bash
npx playwright install chromium
```

## Corpus OCR

Il repository include una raccolta riproducibile con due diete PDF e tre scontrini di difficoltà crescente, accompagnati dai risultati attesi:

- `output/pdf/ocr-fixtures`
- `tests/fixtures/ocr/receipts`

Per rigenerarla:

```bash
python3 -m pip install -r scripts/requirements-ocr.txt
npm run fixtures:ocr
```

## Deploy Vercel

Importa il repository nella dashboard Vercel scegliendo Next.js. Non sono necessarie variabili d'ambiente per il progetto Supabase pubblico incluso. Se usi un progetto diverso, aggiungi le due variabili indicate nella sezione precedente agli ambienti Production e Preview.

In alternativa, con la CLI:

```bash
npm i -g vercel
vercel
```

Quando il progetto Vercel è collegato al branch `main`, ogni push avvia automaticamente una nuova build e il relativo deploy.
