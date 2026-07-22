export type Store =
  | "Esselunga"
  | "Lidl"
  | "Eurospin"
  | "Coop"
  | "Conad"
  | "Vivo"
  | "Contè"
  | "Despar"
  | "Penny"
  | "MD"
  | "Altro";
export type Category =
  | "Frutta e verdura"
  | "Carne e pesce"
  | "Latticini"
  | "Dispensa"
  | "Surgelati"
  | "Altro";
export type MealSlot = "colazione" | "spuntino" | "pranzo" | "merenda" | "cena";
export type FoodStyle =
  | "veloci"
  | "economici"
  | "high protein"
  | "salutari"
  | "classici italiani"
  | "vegetariani"
  | "vegani"
  | "senza glutine"
  | "senza lattosio";
export interface Nutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}
export interface Ingredient {
  id: string;
  name: string;
  unit: "g" | "ml" | "pz";
  quantity: number;
  category: Category;
  allergens?: string[];
}
export interface PriceItem {
  id: string;
  name: string;
  unit: Ingredient["unit"];
  price: number;
  per: number;
  category: Category;
  allergens: string[];
  nutrition: Nutrition;
  stores: Partial<Record<Store, number>>;
  confirmedStores?: Partial<Record<Store, boolean>>;
  /** Quantità contenuta nella confezione. `per` resta per compatibilità. */
  packageQuantity?: number;
  priceUpdatedAt?: Partial<Record<Store, string>>;
  priceSources?: Partial<Record<Store, PriceSource>>;
}
export interface PriceSource {
  kind: "manual" | "receipt-ocr" | "diet-pdf" | "seed";
  label?: string;
  importedAt: string;
}
export interface Recipe {
  id: string;
  title: string;
  time: number;
  difficulty: "Facile" | "Media";
  ingredients: Ingredient[];
  steps: string[];
  nutrition: Nutrition;
  tags: FoodStyle[];
  allergens: string[];
  baseServings: number;
}
export interface Preferences {
  store: Store;
  budget: number;
  people: number;
  meals: MealSlot[];
  styles: FoodStyle[];
  allergies: string[];
}
export interface PlannedMeal {
  day: number;
  slot: MealSlot;
  recipeId: string;
  cost: number;
}
export interface MealPlan {
  id: string;
  createdAt: string;
  meals: PlannedMeal[];
  total: number;
  overBudget: boolean;
  store?: Store;
  people?: number;
  budget?: number;
  weekKey?: string;
  source?: "generated" | "diet-pdf";
  name?: string;
  /** Snapshot delle preferenze usate per creare il piano. */
  preferences?: Preferences;
}

export type PlanRetention = 7 | 15 | 30 | 60 | "never";
export interface ShoppingItem extends Ingredient {
  estimatedCost: number;
  priceStatus?: "confirmed" | "estimated" | "missing";
  priceUpdatedAt?: string;
  checked?: boolean;
  manual?: boolean;
}
