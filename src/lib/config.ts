import { FoodStyle, PlanRetention, Preferences, Store } from "./types";

export const stores: Store[] = [
  "Esselunga",
  "Lidl",
  "Eurospin",
  "Coop",
  "Conad",
  "Vivo",
  "Contè",
  "Despar",
  "Penny",
  "MD",
  "Altro",
];

export const foodStyles: FoodStyle[] = [
  "veloci",
  "economici",
  "high protein",
  "salutari",
  "classici italiani",
  "vegetariani",
  "vegani",
  "senza glutine",
  "senza lattosio",
];

export const weekDays = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

export const defaultPreferences: Preferences = {
  store: "Lidl",
  budget: 55,
  people: 2,
  meals: ["cena"],
  styles: ["veloci", "economici"],
  allergies: [],
};

export const retentionOptions: Array<{
  value: PlanRetention;
  label: string;
}> = [
  { value: 7, label: "Dopo 7 giorni" },
  { value: 15, label: "Dopo 15 giorni" },
  { value: 30, label: "Dopo 30 giorni" },
  { value: 60, label: "Dopo 60 giorni" },
  { value: "never", label: "Mai" },
];
