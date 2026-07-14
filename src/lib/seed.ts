import { PriceItem, Recipe } from "./types";

const n = (calories: number, protein: number, carbs: number, fat: number) => ({ calories, protein, carbs, fat });
export const seedPrices: PriceItem[] = [
 {id:"pasta",name:"Pasta integrale",unit:"g",price:1.35,per:500,category:"Dispensa",allergens:["glutine"],nutrition:n(350,13,68,2),stores:{Esselunga:1.55,Lidl:1.19,Eurospin:1.09,Coop:1.59,Conad:1.49}},
 {id:"riso",name:"Riso basmati",unit:"g",price:2.2,per:500,category:"Dispensa",allergens:[],nutrition:n(350,7,78,1),stores:{Esselunga:2.35,Lidl:1.89,Eurospin:1.75,Coop:2.39,Conad:2.2}},
 {id:"ceci",name:"Ceci in barattolo",unit:"g",price:0.85,per:240,category:"Dispensa",allergens:[],nutrition:n(120,6,18,2),stores:{Esselunga:0.95,Lidl:0.75,Eurospin:0.69,Coop:0.99,Conad:0.89}},
 {id:"lenticchie",name:"Lenticchie rosse",unit:"g",price:1.75,per:400,category:"Dispensa",allergens:[],nutrition:n(330,25,50,1),stores:{Esselunga:1.99,Lidl:1.55,Eurospin:1.39,Coop:2.05,Conad:1.85}},
 {id:"pollo",name:"Petto di pollo",unit:"g",price:4.9,per:500,category:"Carne e pesce",allergens:[],nutrition:n(110,23,0,2),stores:{Esselunga:5.7,Lidl:4.5,Eurospin:4.2,Coop:5.9,Conad:5.2}},
 {id:"salmone",name:"Salmone",unit:"g",price:6.9,per:400,category:"Carne e pesce",allergens:["pesce"],nutrition:n(200,20,0,13),stores:{Esselunga:7.5,Lidl:6.4,Eurospin:6.1,Coop:7.8,Conad:7.1}},
 {id:"uova",name:"Uova",unit:"pz",price:2.45,per:6,category:"Carne e pesce",allergens:["uova"],nutrition:n(140,13,1,10),stores:{Esselunga:2.7,Lidl:2.1,Eurospin:1.95,Coop:2.8,Conad:2.55}},
 {id:"tofu",name:"Tofu naturale",unit:"g",price:2.29,per:200,category:"Frutta e verdura",allergens:["soia"],nutrition:n(120,14,2,7),stores:{Esselunga:2.49,Lidl:1.99,Coop:2.69,Conad:2.39}},
 {id:"pomodori",name:"Passata di pomodoro",unit:"g",price:0.89,per:700,category:"Dispensa",allergens:[],nutrition:n(30,1,5,0),stores:{Esselunga:1.09,Lidl:0.75,Eurospin:0.65,Coop:1.15,Conad:0.95}},
 {id:"zucchine",name:"Zucchine",unit:"g",price:1.99,per:500,category:"Frutta e verdura",allergens:[],nutrition:n(17,1,3,0),stores:{Esselunga:2.19,Lidl:1.69,Eurospin:1.49,Coop:2.29,Conad:2.05}},
 {id:"spinaci",name:"Spinaci surgelati",unit:"g",price:1.49,per:450,category:"Surgelati",allergens:[],nutrition:n(25,3,2,0),stores:{Esselunga:1.75,Lidl:1.25,Eurospin:1.19,Coop:1.79,Conad:1.55}},
 {id:"pane",name:"Pane senza glutine",unit:"g",price:3.1,per:300,category:"Dispensa",allergens:[],nutrition:n(240,4,45,4),stores:{Esselunga:3.29,Coop:3.35,Conad:3.2}},
 {id:"yogurt",name:"Yogurt greco",unit:"g",price:1.79,per:500,category:"Latticini",allergens:["latte"],nutrition:n(70,9,4,2),stores:{Esselunga:1.99,Lidl:1.49,Eurospin:1.39,Coop:2.1,Conad:1.85}},
 {id:"avena",name:"Fiocchi d'avena",unit:"g",price:1.39,per:500,category:"Dispensa",allergens:["glutine"],nutrition:n(370,13,60,7),stores:{Esselunga:1.59,Lidl:1.15,Eurospin:0.99,Coop:1.69,Conad:1.45}}
];
const ing = (id:string, quantity:number, unit:"g"|"ml"|"pz"="g") => { const p=seedPrices.find(x=>x.id===id)!; return {id,name:p.name,quantity,unit,category:p.category,allergens:p.allergens}; };
export const recipes: Recipe[] = [
 {id:"pasta-ceci",title:"Pasta cremosa ai ceci",time:22,difficulty:"Facile",ingredients:[ing("pasta",180),ing("ceci",240),ing("pomodori",250)],steps:["Cuoci la pasta in acqua salata.","Scalda ceci e passata con poca acqua.","Frulla una parte dei ceci e manteca la pasta."],nutrition:n(520,20,88,8),tags:["economici","classici italiani","vegetariani"],allergens:["glutine"],baseServings:2},
 {id:"pollo-riso",title:"Pollo, riso e zucchine",time:28,difficulty:"Facile",ingredients:[ing("pollo",300),ing("riso",180),ing("zucchine",300)],steps:["Lessare il riso.","Rosolare il pollo a bocconcini.","Saltare le zucchine e unire tutto."],nutrition:n(510,40,61,10),tags:["high protein","salutari","senza lattosio"],allergens:[],baseServings:2},
 {id:"dahl",title:"Dahl veloce di lenticchie",time:25,difficulty:"Facile",ingredients:[ing("lenticchie",180),ing("riso",160),ing("spinaci",200)],steps:["Sciacquare le lenticchie.","Cuocerle con acqua per 15 minuti.","Unire spinaci e servire con riso."],nutrition:n(490,25,80,5),tags:["veloci","economici","vegani","senza glutine","senza lattosio"],allergens:[],baseServings:2},
 {id:"tofu-zucchine",title:"Tofu dorato con zucchine",time:20,difficulty:"Facile",ingredients:[ing("tofu",300),ing("riso",170),ing("zucchine",350)],steps:["Cuoci il riso.","Rosola il tofu a cubetti.","Aggiungi zucchine sottili e servi."],nutrition:n(460,25,65,13),tags:["veloci","vegani","salutari","senza glutine","senza lattosio"],allergens:["soia"],baseServings:2},
 {id:"salmone-spinaci",title:"Salmone con spinaci e riso",time:25,difficulty:"Media",ingredients:[ing("salmone",280),ing("riso",170),ing("spinaci",250)],steps:["Cuoci il riso.","Cuoci il salmone in padella 4 minuti per lato.","Salta gli spinaci e componi il piatto."],nutrition:n(590,38,62,22),tags:["high protein","salutari","senza glutine","senza lattosio"],allergens:["pesce"],baseServings:2},
 {id:"uova-pomodoro",title:"Uova al pomodoro con pane",time:18,difficulty:"Facile",ingredients:[ing("uova",4,"pz"),ing("pomodori",300),ing("pane",160)],steps:["Scalda la passata.","Apri le uova nel sugo e copri.","Servi quando l'albume è cotto con pane tostato."],nutrition:n(430,23,42,17),tags:["veloci","economici","vegetariani","senza glutine"],allergens:["uova"],baseServings:2}
];
