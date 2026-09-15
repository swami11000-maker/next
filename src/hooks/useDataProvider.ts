"use client";

import { RetailerData } from "@/lib/type";
import { apiFetch } from "@/lib/api-client";
import { createContext, useContext, useCallback, useEffect, useState } from "react";

interface DataProviderContextType {
  retailer: RetailerData | null;
  loading: boolean;
  error: string | null;
  logout: () => Promise<void>;
  refetch: () => void;
}

const DataProviderContext = createContext<DataProviderContextType | undefined>(
  undefined
);

export const useDataProvider = (): DataProviderContextType => {
  const ctx = useContext(DataProviderContext);
  if (!ctx) {
    throw new Error(
      "useDataProvider must be used within a DataProvider"
    );
  }
  return ctx;
};

export { DataProviderContext, type DataProviderContextType };
