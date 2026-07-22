import { PriceItem } from "./types";
import {
  fetchRetailerPrices,
  mergeRetailerPrices,
  RetailerRemotePrice,
} from "./retailer-prices";

export type MdRemotePrice = RetailerRemotePrice;
export const mdPriceSyncConfigured = true;

export const fetchMdPrices = (signal?: AbortSignal) =>
  fetchRetailerPrices("md_products", signal);

export const mergeMdPrices = (
  catalog: PriceItem[],
  remotePrices: MdRemotePrice[],
  now = new Date(),
) => mergeRetailerPrices(catalog, remotePrices, "MD", now);
