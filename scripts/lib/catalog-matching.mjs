export const catalogMatchers = [
  ["latte-cocco", /\blatte di cocco\b/],
  ["salsa-soia", /\bsalsa di soia\b/],
  ["anacardi", /\banacardi\b/],
  [
    "pasta",
    /\b(pasta|spaghetti|penne|fusilli|rigatoni|orecchiette|linguine|lasagne)\b/,
  ],
  ["riso", /\briso\b/],
  ["ceci", /\bceci\b/],
  ["lenticchie", /\blenticchie\b/],
  ["pollo", /\bpollo\b/],
  ["salmone", /\bsalmone\b/],
  ["uova", /\buova?\b/],
  ["tofu", /\btofu\b/],
  ["pomodori", /\b(passata di pomodoro|pomodor[oi]|pomodorini)\b/],
  ["zucchine", /\bzucchine?\b/],
  ["spinaci", /\bspinaci\b/],
  ["pane", /\bpane senza glutine\b/],
  ["yogurt", /\byogurt greco\b/],
  ["avena", /\b(fiocchi d avena|avena)\b/],
  ["avocado", /\bavocado\b/],
  ["bresaola", /\bbresaola\b/],
  ["tonno", /\btonno\b/],
  ["fagioli", /\bfagioli\b/],
  ["broccoli", /\bbroccoli?\b/],
  ["patate", /\bpatate\b/],
  ["tacchino", /\btacchino\b/],
  ["mozzarella", /\bmozzarell[ae]\b/],
  ["melanzane", /\bmelanzane?\b/],
  ["peperoni", /\bpeperoni?\b/],
  ["cipolle", /\bcipolle?\b/],
  ["carote", /\bcarote?\b/],
  ["piselli", /\bpiselli\b/],
  ["manzo", /\b(macinato di manzo|carne bovina|bovino|manzo)\b/],
  ["maiale", /\b(lonza di maiale|carne suina|suino|maiale)\b/],
  ["merluzzo", /\bmerluzzo\b/],
  ["ricotta", /\bricotta\b/],
  ["parmigiano", /\bparmigiano reggiano\b/],
  ["polenta", /\bpolenta\b/],
  ["farina", /\bfarina(?: di grano)?\b/],
  ["funghi", /\bfunghi\b/],
  ["zucca", /\bzucca\b/],
  ["olive", /\bolive\b/],
  ["latte", /\blatte(?: fresco| intero| parzialmente scremato)?\b/],
  ["burro", /\bburro\b/],
  ["zucchero", /\bzucchero\b/],
  ["limone", /\blimoni?\b/],
  ["arancia", /\barance?\b/],
  ["banane", /\bbanane?\b/],
  ["mele", /\bmele?\b/],
  ["pere", /\b(per[ae])\b/],
  ["fragole", /\b(fragola|fragole)\b/],
  ["cavolfiore", /\bcavolfiori?\b/],
  ["cavolo", /\bcavolo cappuccio\b/],
  ["confettura", /\bconfettura(?: extra)?\b/],
  ["gamberi", /\b(gamber[oi]|mazzancolle)\b/],
  ["kefir", /\bk[ée]fir\b/],
  ["mais", /\bmais\b/],
  ["quinoa", /\bquinoa\b/],
  ["miele", /\bmiele\b/],
  ["mascarpone", /\bmascarpone\b/],
  ["panna", /\bpanna fresca\b/],
  ["cioccolato-fondente", /\bcioccolato fondente\b/],
  ["nocciole", /\bnocciole\b/],
  ["mandorle", /\bmandorle\b/],
  ["melone", /\bmelone\b/],
  ["olio-oliva", /\bolio di oliva\b/],
  ["orata", /\borata\b/],
  ["prosciutto-cotto", /\bprosciutto cotto\b/],
  ["susine", /\bsusine?\b/],
  ["totano", /\btotani?\b/],
  ["uva", /\buva\b/],
  ["vitello", /\bvitello\b/],
];

export const exclusions = {
  avocado: /salsa|crema corpo/i,
  bresaola: /pizza|panino|insalata pronta/i,
  avena: /biscott|barrett|torta|bevanda/i,
  carote: /omogeneizz|succo|insalata pronta/i,
  confettura: /biscott|crostata|yogurt|torta/i,
  fagioli: /omogeneizz|zuppa pronta|insalata pronta/i,
  fragole: /mousse|confettur|yogurt|dessert|bevanda|succo|gelato|cremino/i,
  latte: /latte mio|crescita|neonat|detergente|corpo|solare|doccia|capelli/i,
  mais: /olio|cornetti|snack|patatine|popcorn|gallette|biscott|cracker/i,
  mandorle: /bevanda|latte|biscott|torta|crema|cioc|gelat|granola/i,
  manzo:
    /crocchett|cane|gatto|pet|mousse|fegato|hamburger|polpett|tartare|bresaola/i,
  maiale: /pancetta|wurstel|wudy|salsiccia|luganega|salame|prosciutto/i,
  merluzzo: /bastoncin|croccol/i,
  nocciole: /biscott|torta|crema|gelato|barrett|granola|frollin/i,
  olive: /pate|mix|crostin|ascolana|ripien/i,
  "olio-oliva":
    /sapone|corpo|capelli|pane|focaccia|tarall|tonno|sgombro|filetti/i,
  orata: /pronta|gratinata|burger/i,
  pane: /grattugiat|carasau|pancarr/i,
  pasta:
    /per pizza|fresca|salsicc|sfoglia|frolla|dentifric|filata|alle cime|piatti pronti|ripien|tortell|raviol|senza glutine/i,
  patate: /salsicc|crocchett|fritte|chips|gnocch|pur[eè]|pizza/i,
  piselli: /menta|vellutat|zuppa pronta|arancin/i,
  pollo:
    /nugget|crocchett|cane|gatto|pet|findus|spiedin|hamburger|polpett|wurstel|wudy|arrosto|cordon/i,
  salmone: /sushi|burger|insalata pronta|affumicat|olio/i,
  spinaci: /ravioli|torta|tortell|pizza|gnocch|vellutat|cotolett/i,
  tacchino: /arrosto|affettat|prosciutto|hamburger|wurstel|sofficette|tonnato/i,
  "prosciutto-cotto": /pizza|panino|insalata pronta|cubetti|wurstel|hamburger/i,
  totano: /insalata pronta|ripien|anelli pronti/i,
  tonno: /crocchett|cane|gatto|pet|olio/i,
  uva: /succo|bevanda|caramell|confettura/i,
  vitello: /hamburger|polpett|tartare|ripien|affettat|gastronomia/i,
  zucchine: /arrosti|omogeneizz|burger|polpett/i,
  zucca: /dolce|trolli|caramell|pane|burger|semi|crema corpo|vellutat/i,
  zucchero: /crema|senza zucchero|frollin|biscott|torta|caramell|bevanda/i,
  kefir: /bufala|formaggi|cuore di/i,
  ceci: /vongol|farinata|farina|snack|pasta|zuppa pronta/i,
  funghi: /tagliatell|risott|sugo|pasta|ripien/i,
  ricotta: /tortell|raviol|pasta|dolce|salata/i,
  peperoni: /pesto|sugo|crema/i,
};

export const normalize = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export function catalogIdFor(value) {
  const searchable = normalize(value);
  for (const [id, matcher] of catalogMatchers) {
    if (!matcher.test(searchable)) continue;
    if (exclusions[id]?.test(searchable)) continue;
    return id;
  }
  return null;
}
