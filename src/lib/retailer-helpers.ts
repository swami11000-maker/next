import type { RetailerData } from "./type";

export function isServiceEnabled(retailer: RetailerData | null | undefined, serviceFlag: string): boolean {
  if (!retailer) return false;
  return retailer[serviceFlag] === "yes";
}
