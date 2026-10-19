import { PriceItem, Recipe } from "./types";

interface AutumnRecipe {
  id: string;
  title: string;
  time: number;
  ingredients: Array<[string, number]>;
  steps: string[];
}

const autumnRecipes: AutumnRecipe[] = [
  {
    id: "pasta-zucca-anacardi",
    title: "Pasta con crema di zucca e anacardi",
    time: 30,
    ingredients: [
      ["pasta", 180],
      ["zucca", 400],
      ["anacardi", 40],
      ["olio-oliva", 15],
    ],
    steps: [
      "Taglia la zucca pulita a cubetti di 2 cm. Mettila in padella con l’olio di oliva e 100 ml d’acqua, copri e cuoci a fuoco medio per 15 minuti, finché si schiaccia con una forchetta.",
      "Tosta gli anacardi in una padella asciutta per 3 minuti, mescolando spesso, poi tritali grossolanamente e tienine metà per servire.",
      "Cuoci la pasta secondo il tempo indicato sulla confezione. Prima di scolarla conserva una tazza d’acqua di cottura.",
      "Frulla la zucca con metà degli anacardi e 2 cucchiai d’acqua di cottura. Unisci la pasta e mescola a fuoco basso per un minuto, aggiungendo acqua solo se serve.",
      "Dividi in due piatti e completa con gli anacardi tenuti da parte. La crema deve aderire alla pasta senza raccogliersi liquida sul fondo.",
    ],
  },
  {
    id: "riso-lenticchie-zucca",
    title: "Riso con lenticchie rosse e zucca",
    time: 35,
    ingredients: [
      ["riso", 160],
      ["lenticchie", 100],
      ["zucca", 350],
      ["cipolle", 60],
      ["olio-oliva", 15],
    ],
    steps: [
      "Sciacqua riso e lenticchie rosse in due colini separati. Trita le cipolle e taglia la zucca pulita a cubetti piccoli.",
      "Scalda l’olio di oliva in una casseruola. Ammorbidisci le cipolle per 5 minuti a fuoco basso, poi aggiungi la zucca e 700 ml d’acqua calda.",
      "Quando l’acqua bolle aggiungi il riso. Dopo 5 minuti unisci le lenticchie rosse e mescola, mantenendo un bollore leggero.",
      "Cuoci ancora 12–15 minuti, verificando anche i tempi delle confezioni. Aggiungi acqua calda poco alla volta se il fondo si asciuga prima che il riso sia cotto.",
      "Spegni quando riso e lenticchie sono teneri e la zucca cremosa. Lascia riposare coperto per 3 minuti e dividi in due porzioni.",
    ],
  },
  {
    id: "ceci-cavolfiore-sesamo",
    title: "Ceci e cavolfiore al forno con sesamo",
    time: 40,
    ingredients: [
      ["ceci", 300],
      ["cavolfiore", 500],
      ["sesamo", 20],
      ["olio-oliva", 20],
    ],
    steps: [
      "Scalda il forno statico a 200 °C. Dividi il cavolfiore in cimette di dimensioni simili e asciugale dopo averle lavate.",
      "Scola i ceci già cotti, sciacquali e asciugali con un canovaccio pulito. Distribuiscili su una teglia con il cavolfiore.",
      "Condisci con l’olio di oliva e mescola. Stendi in un solo strato per permettere alle cimette di dorarsi.",
      "Inforna per 25–30 minuti, girando a metà cottura. Aggiungi i semi di sesamo negli ultimi 5 minuti, così non bruciano.",
      "Prova il cavolfiore con una forchetta: deve risultare tenero al centro e dorato ai bordi. Servi subito in due porzioni.",
    ],
  },
  {
    id: "merluzzo-zucca-olive",
    title: "Merluzzo in umido con zucca e olive",
    time: 30,
    ingredients: [
      ["merluzzo", 360],
      ["zucca", 350],
      ["pomodori", 200],
      ["olive", 50],
      ["olio-oliva", 15],
    ],
    steps: [
      "Se usi merluzzo surgelato scongelalo prima in frigorifero. Tampona i filetti e controlla che non ci siano lische.",
      "Taglia la zucca pulita a cubetti di 1 cm. Scalda l’olio di oliva in una padella larga e aggiungi zucca e 100 ml d’acqua.",
      "Copri e cuoci per 10 minuti a fuoco medio. Aggiungi i pomodori tagliati e le olive denocciolate, poi cuoci per altri 5 minuti.",
      "Appoggia il merluzzo sopra le verdure, copri e cuoci a fuoco dolce per 8–12 minuti secondo lo spessore, evitando di rigirarlo troppo.",
      "Controlla che il pesce raggiunga 63 °C al cuore e si separi in scaglie opache. Servi con il suo fondo di cottura, diviso in due piatti.",
    ],
  },
  {
    id: "pollo-funghi-riso-autunno",
    title: "Pollo ai funghi con riso",
    time: 35,
    ingredients: [
      ["pollo", 300],
      ["riso", 160],
      ["funghi", 300],
      ["olio-oliva", 20],
    ],
    steps: [
      "Porta a bollore una pentola d’acqua e cuoci il riso secondo la confezione. Scolalo appena tenero e tienilo coperto.",
      "Pulisci i funghi con carta umida e affettali. Taglia il pollo a bocconcini con un tagliere dedicato, poi lava utensili e mani.",
      "Scalda metà dell’olio di oliva e salta i funghi per 7–8 minuti, finché perdono acqua. Trasferiscili in un piatto.",
      "Versa l’olio rimanente nella stessa padella e rosola il pollo per 8–10 minuti. Unisci i funghi e 3 cucchiai d’acqua, poi completa per 3 minuti.",
      "Verifica che il pollo raggiunga 74 °C al cuore. Distribuisci il riso nei piatti e aggiungi pollo, funghi e fondo di cottura.",
    ],
  },
  {
    id: "tofu-broccoli-anacardi",
    title: "Tofu croccante con broccoli e anacardi",
    time: 25,
    ingredients: [
      ["tofu", 300],
      ["broccoli", 400],
      ["anacardi", 40],
      ["salsa-soia", 25],
      ["olio-oliva", 15],
    ],
    steps: [
      "Tampona il tofu con carta da cucina e taglialo a cubetti. Dividi i broccoli in cimette e cuocili al vapore per 6–7 minuti, lasciandoli sodi.",
      "Tosta gli anacardi in una padella asciutta per 3 minuti, mescolando spesso, poi trasferiscili in una ciotola.",
      "Scalda l’olio di oliva nella padella e aggiungi il tofu in un solo strato. Cuocilo per 8–10 minuti, girandolo quando forma una crosta dorata.",
      "Unisci i broccoli e la salsa di soia diluita con 2 cucchiai d’acqua. Salta per 2 minuti, finché il condimento riveste tofu e verdure.",
      "Completa con gli anacardi e dividi in due piatti. Servi subito per mantenere il contrasto fra tofu dorato e broccoli sodi.",
    ],
  },
];

export function createAutumnRecipes(catalog: PriceItem[]): Recipe[] {
  return autumnRecipes.map((spec) => {
    const ingredients = spec.ingredients.map(([id, quantity]) => {
      const item = catalog.find((p) => p.id === id);
      if (!item) throw new Error(`Ingrediente non trovato: ${id}`);
      return {
        id,
        name: item.name,
        quantity,
        unit: item.unit,
        category: item.category,
        allergens: item.allergens,
      };
    });
    const allergens = [...new Set(ingredients.flatMap((i) => i.allergens))];
    const animal = ingredients.some((i) =>
      ["pollo", "merluzzo"].includes(i.id),
    );
    const tags: Recipe["tags"] = [];
    if (!animal) tags.push("vegetariani", "vegani");
    if (!allergens.includes("glutine")) tags.push("senza glutine");
    if (!allergens.includes("latte")) tags.push("senza lattosio");
    if (spec.time <= 30) tags.push("veloci");
    const nutrition = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    for (const [id, quantity] of spec.ingredients) {
      const item = catalog.find((p) => p.id === id)!;
      for (const key of Object.keys(nutrition) as Array<keyof typeof nutrition>)
        nutrition[key] += (item.nutrition[key] * quantity) / 200;
    }
    for (const key of Object.keys(nutrition) as Array<keyof typeof nutrition>)
      nutrition[key] = Math.round(nutrition[key]);
    return {
      ...spec,
      id: `autunno-${spec.id}`,
      ingredients,
      steps: [
        `Pesa gli ingredienti per due porzioni: ${ingredients.map((i) => `${i.name} ${i.quantity} ${i.unit}`).join(", ")}.`,
        ...spec.steps,
      ],
      nutrition,
      allergens,
      tags,
      difficulty: "Facile",
      baseServings: 2,
      course:
        spec.title.startsWith("Pasta") || spec.title.startsWith("Riso")
          ? "Primo"
          : "Secondo",
      origin: "seed",
    };
  });
}
