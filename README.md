# Fudit

Pianificatore pasti settimanale locale, gratuito e pronto per Vercel. I prezzi nel catalogo sono dati dimostrativi modificabili: l'app non effettua scraping né rileva prezzi reali.

## Avvio locale

```bash
npm install
npm run dev
```

Apri `http://localhost:3000`.

## Verifiche

```bash
npm run test
npm run lint
npm run build
```

## Deploy Vercel

```bash
npm i -g vercel
vercel
```

Oppure importa la repository dalla dashboard Vercel: framework Next.js, senza variabili d'ambiente necessarie. I dati sono nel `localStorage` del browser; Supabase può essere aggiunto in seguito sostituendo il modulo `src/lib/storage.ts`.
