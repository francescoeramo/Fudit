import { PriceItem } from "./types";
import {
  fetchRetailerPrices,
  mergeRetailerPrices,
  RetailerRemotePrice,
} from "./retailer-prices";

export type DesparRemotePrice = RetailerRemotePrice;
export const desparPriceSyncConfigured = true;

export const fetchDesparPrices = (signal?: AbortSignal) =>
  fetchRetailerPrices("despar_products", signal);

export const mergeDesparPrices = (
  catalog: PriceItem[],
  remotePrices: DesparRemotePrice[],
  now = new Date(),
) => mergeRetailerPrices(catalog, remotePrices, "Despar", now);
