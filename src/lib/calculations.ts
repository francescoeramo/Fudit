import { Ingredient, PriceItem, Recipe, ShoppingItem, Store } from "./types";
export const scaleIngredients = (ingredients: Ingredient[], base: number, people: number) => ingredients.map(i => ({...i, quantity: Math.round(i.quantity * people / base * 10) / 10}));
export const priceFor = (item: Ingredient, catalog: PriceItem[], store: Store) => { const p=catalog.find(x=>x.id===item.id); if(!p) return 0; return item.quantity / p.per * (p.stores[store] ?? p.price); };
export const recipeCost = (recipe: Recipe, catalog: PriceItem[], store: Store, people: number) => scaleIngredients(recipe.ingredients,recipe.baseServings,people).reduce((s,i)=>s+priceFor(i,catalog,store),0);
export const aggregateShopping = (recipes: Recipe[], catalog: PriceItem[], store: Store, people: number): ShoppingItem[] => {
 const all=recipes.flatMap(r=>scaleIngredients(r.ingredients,r.baseServings,people)); const map=new Map<string,ShoppingItem>();
 all.forEach(i=>{const prior=map.get(i.id); map.set(i.id,{...i,quantity:(prior?.quantity??0)+i.quantity,estimatedCost:0,checked:prior?.checked});});
 return [...map.values()].map(i=>({...i,quantity:Math.round(i.quantity*10)/10,estimatedCost:priceFor(i,catalog,store)}));
};
export const nutritionFor = (recipe: Recipe, people: number) => ({...recipe.nutrition,calories:Math.round(recipe.nutrition.calories*people),protein:Math.round(recipe.nutrition.protein*people),carbs:Math.round(recipe.nutrition.carbs*people),fat:Math.round(recipe.nutrition.fat*people)});
