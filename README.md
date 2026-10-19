# Fudit

Fudit è un pianificatore settimanale di pasti e spesa. Il motore locale è gratuito e non richiede un account. L’assistente Gemini opzionale usa una chiave personale Google AI Studio e invia al provider soltanto i dati descritti nelle Impostazioni.

I prezzi seed inclusi inizialmente sono dati dimostrativi modificabili. Fudit controlla ogni settimana le fonti pubbliche configurate e distingue sempre valori confermati, stimati e mancanti.

## Funzionalità

- Generazione di piani settimanali entro un budget, con ottimizzazione globale della combinazione di ricette.
- 242 ricette, comprese 62 proposte dolci e sei nuove ricette autunnali con dosi e passaggi specifici; quando ci sono abbastanza alternative, ogni piatto compare una sola volta nella settimana.
- Continuità intelligente: il nuovo piano evita le ricette della settimana precedente e penalizza piatti con ingredienti o famiglia troppo simili.
- Preferenze per supermercato, numero di persone, pasti, stile alimentare, allergie e intolleranze.
- Rigenerazione dei singoli pasti nel rispetto delle impostazioni originali del piano, con memoria delle alternative già mostrate.
- Controllo preventivo degli allergeni, inclusi sinonimi e allergeni impliciti negli ingredienti, e maggiore rotazione degli ingredienti durante la settimana.
- Catalogo prezzi con quantità della confezione, prezzo al kg/litro, origine e data di aggiornamento.
- Controllo automatico settimanale di ALDI, Carrefour, Esselunga, Lidl, Eurospin, Coop, Conad, Vivo, Contè, Penny e MD, più i cataloghi pubblici MD e Despar su Supabase. Ogni esecuzione registra quali fonti hanno risposto e quanti prodotti sono stati abbinati; prezzi manuali e da scontrino hanno sempre la priorità.
- Lista della spesa modificabile, raggruppata per categoria e collegata al piano selezionato.
- Ricerca e filtri per ricette e catalogo prezzi.
- Importazione di diete da PDF.
- Lettura OCR degli scontrini con ridimensionamento, aumento del contrasto, nitidezza e un secondo tentativo automatico quando la prima segmentazione non trova righe; nomi, prezzi e corrispondenze restano modificabili prima dell'importazione.
- Backup JSON esportabile e importabile, dati versionati e migrazioni automatiche.
- Avvisi quando il browser non riesce a salvare o raggiunge il limite dello spazio locale.
- Conferme per eliminazione dei piani e cancellazione completa dei dati.
- Tema chiaro/scuro, navigazione da tastiera e layout mobile.

## Architettura

L'app usa Next.js e React. Le aree Pianificazione, Spesa, Ricette, Prezzi e Impostazioni sono componenti separati in `src/components/sections`; lo stato persistente è centralizzato nel reducer `src/hooks/use-fudit-store.ts`.

I dati dell'utente restano nel `localStorage` del browser. Il formato corrente è Fudit v6 e viene gestito da `src/lib/storage.ts`.

I cataloghi pubblici MD e Despar usano Supabase con Row Level Security: il browser può leggere soltanto i prezzi attivi. Importazioni, storico, esecuzioni e token dei job non sono accessibili pubblicamente. Supabase Cron esegue l'importazione MD ogni martedì alle 04:00 UTC e quella Despar alle 04:30 UTC.

Le altre insegne vengono controllate ogni martedì alle 05:15 UTC dal workflow GitHub Actions `Update flyer prices`. Lo script `scripts/update-flyer-prices.mjs` legge le pagine prodotto strutturate oppure estrae il testo dai PDF; per i PDF senza testo usa Poppler e Tesseract OCR. Salva soltanto abbinamenti con confezione, prezzo e unità coerenti in `public/flyer-prices.json`. Se un sito non pubblica un volantino attivo, cambia struttura o non consente un'estrazione affidabile, Fudit mostra il prezzo come mancante invece di riutilizzare una stima come prezzo confermato. `Altro` resta intenzionalmente manuale perché non identifica un'insegna. La pipeline usa solo GitHub Actions, strumenti open source e il piano Supabase esistente, senza API o servizi OCR a pagamento.

La sorgente MD iniziale è `m_sud_mac_nogas.html` (area Sud, macelleria, senza gastronomia). Per Despar viene interrogato il catalogo ufficiale Despar a Casa del CAP 70037, Corato (BA), come riferimento del Centro-Sud. I prezzi possono variare per punto vendita, area e periodo: queste informazioni vengono mostrate accanto all'origine del prezzo e i valori automatici senza scadenza vengono declassati dopo 14 giorni.

Per Coop, la pipeline usa i volantini pubblici Coop Lombardia associati al punto vendita Milano Palmanova, via Privata Benadir 5. Ogni settimana segue i volantini attivi dalla pagina del negozio e importa soltanto offerte con prodotto, confezione, prezzo e unità coerenti. Gestisce anche multipack, prodotti venduti al kg o all'etto e scarta piatti pronti o prodotti trasformati che non rappresentano l'ingrediente base. I conteggi correnti, la data del controllo e gli errori delle fonti sono in `public/flyer-prices.json` e nella sezione Prezzi.

Nel controllo del 15 settembre 2026 CoopShop pubblicava nomi e confezioni, ma richiedeva l’accesso a un account protetto da reCAPTCHA per i prezzi. Questa integrazione continua a usare i volantini pubblici; non importa prezzi ordinari Coop e non aggira protezioni. I prezzi ordinari possono essere confermati manualmente o da scontrino.

Le nuove fonti, provate il 19 ottobre 2026, sono le schede pubbliche ALDI delle offerte della settimana e tre categorie del catalogo online Carrefour: pasta/riso/farina, uova/latte/latticini e frutta/verdura. Ogni rilevazione conserva il collegamento al prodotto. Per ALDI il riferimento è l’offerta pubblicata in Italia; per Carrefour è il catalogo senza negozio selezionato, quindi non un listino di Milano Benadir. Disponibilità e prezzi effettivi vanno verificati nel proprio negozio. Le offerte future o scadute sono escluse; senza scadenza esplicita il prezzo perde la conferma dopo 14 giorni. Per Penny si usa la confezione dichiarata, mai il peso lordo di trasporto. I parser hanno test riproducibili senza rete.

Nella sezione Idee una ricetta è candidata quando contiene almeno uno degli ingredienti scelti. I risultati sono ordinati per numero di ingredienti scelti presenti nella ricetta; a parità vengono preferite le ricette con meno ingredienti complessivi, poi quelle più rapide e infine il titolo. Portata, stili alimentari vincolanti e allergie impostate continuano a escludere le ricette non compatibili.

## Assistente AI opzionale

Alla prima apertura un tutorial facoltativo spiega Fudit, accompagna alla creazione di una chiave personale Google AI Studio e mostra come generare un piano e usare Idee. “Continua senza AI” permette di iniziare subito. Il completamento o il salto della guida viene ricordato solo nel browser; la guida è riapribile da Impostazioni → Assistente ricette → Riapri il tutorial guidato. Se lo storage è bloccato, l’app funziona comunque ma la guida può ricomparire al prossimo caricamento. La chiave non viene salvata insieme alla preferenza del tutorial.

In Impostazioni → Assistente ricette puoi inserire una chiave Gemini. Il modello configurato è `gemini-3.5-flash-lite`, presente nel [piano gratuito API Google](https://ai.google.dev/gemini-api/docs/pricing) verificato il 19 ottobre 2026. Per evitare addebiti usa un progetto senza fatturazione abilitata: l’app non può verificare il piano associato alla chiave. Quote e disponibilità dipendono dall’account; non viene attivato alcun provider alternativo a pagamento.

La chiave vive solo nello stato React fino al ricaricamento: non viene scritta in localStorage, backup, URL o log. Il browser chiama direttamente l’API Google tramite HTTPS e header `x-goog-api-key`. Non serve una chiave condivisa sul server. Configura le restrizioni della chiave sul provider per l’API Gemini e per il dominio su cui usi Fudit.

In Idee, “Chiedi a Gemini” invia la richiesta scritta e al massimo 100 ricette già filtrate (ID, titolo, minuti e nomi degli ingredienti). Nel piano, il modello propone preferenze fra ricette compatibili: il planner locale conserva il controllo di allergie, stili, varietà e budget. Le ricette importate da PDF non vengono inviate automaticamente. Il modello può restituire solo ID presenti nel catalogo candidato; prezzi, dosi e nutrizione non vengono generati dall’AI. In assenza di chiave o con quota esaurita, il motore locale rimane disponibile.

Il piano gratuito Google può usare input e output per migliorare i suoi prodotti: evita di scrivere dati sanitari o personali nella richiesta. La nuova integrazione è coperta da risposte simulate nei test; la generazione live richiede una chiave personale e non è stata verificata senza di essa.

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
