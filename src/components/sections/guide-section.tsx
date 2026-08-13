import { BookOpen, ChefHat, CircleDollarSign, Lightbulb, ShoppingBasket } from "lucide-react";

const steps = [
  [CircleDollarSign, "1. Controlla i prezzi", "Apri Prezzi, scegli il supermercato e aggiorna i valori che conosci. Fudit distingue prezzi confermati, stimati e mancanti."],
  [ChefHat, "2. Imposta il piano", "In Pianifica scegli budget, persone, pranzo e/o cena, stili ed eventuali allergie. Attiva dolci se vuoi tre proposte settimanali."],
  [ShoppingBasket, "3. Genera e fai la spesa", "Premi Genera piano. Il piano, i tre eventuali dolci e la lista della spesa vengono salvati automaticamente insieme."],
  [Lightbulb, "4. Usa ciò che hai", "In Idee spunta o scrivi gli ingredienti disponibili, filtra le portate se vuoi e apri un suggerimento. Modificando le porzioni, le dosi cambiano subito."],
] as const;

export default function GuideSection() {
  return (
    <section className="guide">
      <div className="card guide-intro">
        <BookOpen size={28} />
        <div>
          <h2>Guida semplice a Fudit</h2>
          <p className="muted">Dalla configurazione alla spesa, senza perdere i dati già salvati.</p>
        </div>
      </div>
      <div className="grid two">
        {steps.map(([Icon, title, text]) => (
          <article className="card guide-step" key={title}>
            <Icon size={22} />
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </div>
      <article className="card guide-details">
        <h2>Come leggere e correggere un piano</h2>
        <ul>
          <li>Il costo è proporzionato alle persone e ai prezzi del supermercato selezionato.</li>
          <li>Il pulsante circolare accanto a un pasto lo sostituisce senza riproporre subito le alternative già viste.</li>
          <li>I dolci compaiono in un riquadro separato sotto la settimana: sono tre ricette, ma fanno parte dello stesso piano salvato.</li>
          <li>In Ricette puoi cercare per nome o ingrediente e filtrare Primo, Secondo, Contorno o Dolce.</li>
          <li>Le ricette personali si aggiungono da Ricette e restano nei backup locali.</li>
        </ul>
      </article>
      <article className="card guide-details">
        <h2>Dati, backup e privacy</h2>
        <p>Fudit salva preferenze, piani e ricette personali nel browser. In Impostazioni puoi esportare un backup JSON, importarlo su un altro dispositivo, scegliere la conservazione dei piani o cancellare solo i dati di Fudit.</p>
        <p><strong>Consiglio:</strong> esporta un backup dopo aver inserito molti prezzi o ricette personali. Un cambio browser o la pulizia dei dati del sito può rimuovere il salvataggio locale.</p>
      </article>
    </section>
  );
}
