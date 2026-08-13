import { Ingredient, Recipe } from "./types";

const formatQuantity = (ingredient: Ingredient) =>
  `${ingredient.quantity}${ingredient.unit}`;

const ingredientList = (ingredients: Ingredient[]) =>
  ingredients
    .map((ingredient) => `${ingredient.name} (${formatQuantity(ingredient)})`)
    .join(", ");

const sentence = (value: string) => {
  const trimmed = value.trim().replace(/[.]+$/, "");
  return trimmed ? `${trimmed[0].toUpperCase()}${trimmed.slice(1)}.` : "";
};

const preciseSavoryInstruction = (step: string) => {
  const clean = sentence(step);
  const normalized = step.toLocaleLowerCase("it");
  if (/cuoc|less|boll/.test(normalized))
    return `${clean} Mantieni una cottura regolare e controlla dopo 10 minuti: cereali e pasta devono essere cotti ma non sfatti, mentre gli ortaggi devono risultare teneri.`;
  if (/rosol|salt|padella/.test(normalized))
    return `${clean} Usa una padella ben calda, mescola ogni 30–40 secondi e prosegui per 6–8 minuti, finché la superficie è dorata e l'interno ben cotto.`;
  if (/forno|inforn/.test(normalized))
    return `${clean} Cuoci nel forno già caldo a 190 °C, sul ripiano centrale, controllando la doratura dopo 20 minuti.`;
  if (/frull|schiacci|crem/.test(normalized))
    return `${clean} Lavora il composto finché diventa uniforme, fermandoti una volta per raccogliere ciò che resta sui bordi.`;
  if (/unisc|aggiung|mescol|mantec/.test(normalized))
    return `${clean} Mescola dal basso verso l'alto per 1–2 minuti, così gli ingredienti si distribuiscono senza rompersi.`;
  return `${clean} Esegui questo passaggio con cura e verifica che consistenza e temperatura siano uniformi prima di continuare.`;
};

export const buildSavorySteps = (
  recipe: Pick<Recipe, "title" | "ingredients" | "steps" | "time">,
) => {
  const ingredientIds = new Set(
    recipe.ingredients.map((ingredient) => ingredient.id),
  );
  const doneness: string[] = [];
  if (["pollo", "tacchino"].some((id) => ingredientIds.has(id)))
    doneness.push("pollo e tacchino devono raggiungere 74 °C al cuore");
  if (
    ["salmone", "tonno", "merluzzo", "gamberi"].some((id) =>
      ingredientIds.has(id),
    )
  )
    doneness.push(
      "pesce e crostacei devono raggiungere 63 °C e risultare opachi",
    );
  if (["manzo", "maiale"].some((id) => ingredientIds.has(id)))
    doneness.push("la carne macinata deve raggiungere 71 °C al cuore");
  if (ingredientIds.has("uova"))
    doneness.push("l'albume deve essere completamente rappreso");
  const preparation = `Prepara la postazione e pesa tutti gli ingredienti: ${ingredientList(recipe.ingredients)}. Lava gli ortaggi, asciugali e tagliali in pezzi uniformi; separa gli alimenti crudi da quelli già pronti.`;
  const heat = `Organizza le cotture per “${recipe.title}”: scalda pentola, padella o forno prima di iniziare e tieni gli ingredienti già pesati a portata di mano. Il tempo complessivo previsto è circa ${recipe.time} minuti.`;
  const detailedCore = recipe.steps
    .map(preciseSavoryInstruction)
    .filter(Boolean)
    .slice(0, 5);
  const finish = `Completa la ricetta solo quando ogni componente è cotto in modo uniforme${doneness.length ? `: ${doneness.join("; ")}` : ""}. I legumi devono risultare morbidi e gli ortaggi cotti ma ancora riconoscibili. Lascia riposare 2 minuti, poi distribuisci nelle porzioni previste e servi.`;
  return [preparation, heat, ...detailedCore, finish];
};

const idsFor = (ingredients: Ingredient[], ids: string[]) =>
  ingredients
    .filter((ingredient) => ids.includes(ingredient.id))
    .map((ingredient) => ingredient.name)
    .join(", ");

export const buildDessertSteps = ({
  title,
  kind,
  ingredients,
}: {
  title: string;
  kind: string;
  ingredients: Ingredient[];
}) => {
  const dry = idsFor(ingredients, [
    "farina",
    "farina-riso",
    "avena",
    "cacao",
    "amido-mais",
    "lievito-dolci",
    "zucchero",
  ]);
  const wet = idsFor(ingredients, [
    "uova",
    "burro",
    "latte",
    "yogurt",
    "ricotta",
    "mascarpone",
    "panna",
    "miele",
  ]);
  const additions = ingredients
    .filter(
      (ingredient) =>
        ![
          "farina",
          "farina-riso",
          "avena",
          "cacao",
          "amido-mais",
          "lievito-dolci",
          "zucchero",
          "uova",
          "burro",
          "latte",
          "yogurt",
          "ricotta",
          "mascarpone",
          "panna",
          "miele",
        ].includes(ingredient.id),
    )
    .map((ingredient) => ingredient.name)
    .join(", ");
  const prepare = `Pesa con precisione tutti gli ingredienti per “${title}”: ${ingredientList(ingredients)}. Porta gli ingredienti refrigerati a temperatura ambiente per 15 minuti e prepara stampo, carta forno o coppette prima di mescolare.`;

  if (/sorbetto|gelato/.test(title.toLocaleLowerCase("it")))
    return [
      prepare,
      `Lava e prepara la frutta prevista (${additions || "frutta"}); elimina semi, piccioli o scorze amare e riducila in pezzi piccoli e regolari.`,
      `Lavora ${dry || "gli ingredienti secchi"} con la frutta fino a sciogliere completamente i cristalli. Frulla per 60–90 secondi: il composto deve essere liscio, senza pezzi visibili.`,
      "Versa in un contenitore basso, copri e congela per almeno 4 ore. Nelle prime 3 ore mescola energicamente ogni 45 minuti per rompere i cristalli di ghiaccio.",
      "Lascia il contenitore a temperatura ambiente per 8–10 minuti, mescola ancora e servi quando il composto è cremoso ma mantiene la forma.",
    ];

  if (/tiramisù/.test(title.toLocaleLowerCase("it")))
    return [
      prepare,
      `Monta ${idsFor(ingredients, ["uova"])} con ${idsFor(ingredients, ["zucchero"])} in una ciotola resistente al calore e porta il composto a 71 °C a bagnomaria, mescolando continuamente; mantieni la temperatura per almeno 15 secondi e lascia intiepidire.`,
      `Incorpora ${idsFor(ingredients, ["mascarpone", "panna"])} alla montata ormai tiepida. Prepara ${idsFor(ingredients, ["caffe", "fragole", "cacao"])} separatamente e bagna ${idsFor(ingredients, ["biscotti-secchi"])} per un solo secondo per lato.`,
      "Alterna uno strato compatto di biscotti e uno uniforme di crema; livella ogni strato con una spatola senza schiacciare.",
      "Copri e lascia rassodare in frigorifero per almeno 4 ore, meglio 8. Conserva a 4 °C e servi freddo.",
    ];

  if (/crostata/.test(kind))
    return [
      prepare,
      `Mescola ${dry} in una ciotola. Incorpora ${wet} rapidamente con la punta delle dita, senza scaldare troppo l'impasto.`,
      "Compatta l'impasto senza lavorarlo a lungo, avvolgilo e fallo riposare in frigorifero per 30 minuti; deve diventare sodo ma ancora stendibile.",
      `Stendi a 4–5 mm, rivesti lo stampo e distribuisci ${additions || "la farcitura"} in uno strato uniforme, lasciando libero circa 1 cm dal bordo.`,
      "Cuoci nel forno statico già caldo a 175 °C per 35–40 minuti. Sforna quando bordi e fondo sono dorati; lascia raffreddare completamente prima di tagliare.",
    ];

  if (/biscotti/.test(kind))
    return [
      prepare,
      `Mescola e setaccia ${dry}. Lavora a parte ${wet || "gli ingredienti umidi"} per 2–3 minuti, fino a ottenere una crema uniforme.`,
      `Unisci i due composti in due volte e incorpora ${additions || "gli ingredienti rimanenti"}. Fermati appena non restano zone asciutte, poi fai riposare l'impasto 20 minuti in frigorifero.`,
      "Forma biscotti dello stesso peso, distanziali di almeno 3 cm sulla teglia e appiattiscili leggermente per favorire una cottura omogenea.",
      "Cuoci nel forno statico già caldo a 175 °C per 12–15 minuti. I bordi devono essere dorati e il centro ancora leggermente morbido; raffredda 10 minuti sulla teglia e poi su una gratella.",
    ];

  if (
    /panna cotta|budino|crema catalana|crème caramel/.test(
      title.toLocaleLowerCase("it"),
    )
  )
    return [
      prepare,
      `Mescola ${dry || "gli ingredienti secchi"} in una casseruola e incorpora ${wet || "gli ingredienti liquidi"} poco alla volta con una frusta, fino a eliminare ogni grumo.`,
      `Aggiungi ${additions || "gli ingredienti rimanenti"} e cuoci a calore medio-basso, mescolando continuamente sul fondo e sui bordi, fino a raggiungere 82–85 °C.`,
      "Prosegui per 2 minuti a calore minimo: la crema deve velare il dorso di un cucchiaio senza separarsi. Distribuisci subito in stampi o coppette puliti.",
      "Lascia intiepidire 20 minuti, copri e trasferisci in frigorifero per almeno 4 ore. Servi solo quando il centro è completamente rassodato.",
    ];

  const isColdDessert =
    /freddo|cucchiaio|dolcetti/.test(kind) ||
    (/merendina/.test(kind) &&
      /bounty|barrette|tipo kinder/.test(title.toLocaleLowerCase("it")));
  if (isColdDessert)
    return [
      prepare,
      `Lavora ${wet || "gli ingredienti cremosi"} per 3 minuti, finché il composto è liscio. Aggiungi gradualmente ${dry || "gli ingredienti secchi"}, continuando a mescolare per evitare grumi.`,
      `Prepara ${additions || "gli ingredienti rimanenti"} e incorporali in modo uniforme. Se è previsto cioccolato, scioglilo lentamente senza superare 50 °C.`,
      "Distribuisci il composto in porzioni uguali, elimina le bolle battendo delicatamente il contenitore sul piano e copri a contatto.",
      "Lascia rassodare in frigorifero per almeno 3 ore. Prima di servire controlla che il centro sia stabile e mantieni il dolce refrigerato.",
    ];

  const bakingMinutes = /tortini|muffin|cupcake/.test(kind) ? "18–22" : "35–45";
  return [
    prepare,
    `Setaccia e mescola ${dry || "gli ingredienti secchi"}. In una seconda ciotola lavora ${wet || "gli ingredienti umidi"} per 3 minuti, fino a ottenere un composto chiaro e omogeneo.`,
    `Incorpora i secchi negli umidi in tre volte, con movimenti dal basso verso l'alto. Aggiungi ${additions || "gli ingredienti rimanenti"} per ultimo e fermati appena l'impasto è uniforme.`,
    "Versa nello stampo preparato senza superare i due terzi dell'altezza; livella la superficie e batti una volta lo stampo per eliminare le bolle più grandi.",
    `Cuoci nel forno statico già caldo a 175 °C per ${bakingMinutes} minuti. Controlla al centro con uno stecchino: deve uscire asciutto o con poche briciole umide, mai con impasto liquido.`,
    "Lascia riposare 10 minuti nello stampo, poi sforma su una gratella e attendi il completo raffreddamento prima di tagliare o decorare.",
  ];
};
