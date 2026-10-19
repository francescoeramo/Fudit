export interface PublicOffer {
  name: string;
  details: string;
  price: number;
  sourceUrl: string;
  isPromotion?: boolean;
  validFrom?: string | null;
}
export function parseCarrefourCards(html: string): PublicOffer[];
export function parseAldiCards(html: string, today: string): PublicOffer[];
