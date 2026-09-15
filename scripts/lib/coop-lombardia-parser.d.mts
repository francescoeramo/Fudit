export interface CoopOfferCard {
  name: string;
  details: string;
  price: number;
}

export function parseCoopOfferCards(fragment: unknown): CoopOfferCard[];

export interface CoopPackage {
  quantity: number;
  unit: "g" | "ml" | "pz";
}

export function parseCoopPackage(value: unknown): CoopPackage | null;
