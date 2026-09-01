export const RETAILER_DATA_CHANGED = "retailer:dataChanged";

export function emitRetailerDataChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(RETAILER_DATA_CHANGED));
  }
}
