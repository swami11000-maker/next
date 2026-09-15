"use client";

import { useCallback, useEffect, useState } from "react";

export interface AlertItem {
  id: number;
  order_id?: string;
  service_name?: string;
  user_name?: string;
  status?: string;
  created_at?: string;
  [key: string]: unknown;
}

interface UseAlertsReturn {
  alerts: AlertItem[];
  loading: boolean;
  error: string | null;
  refreshAlerts: () => Promise<void>;
}

export function useAlerts(): UseAlertsReturn {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAlert = useCallback(async () => {
    try {
      setError(null);

      const res = await fetch("/api/admin/alert", {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch alerts");
      }

      const data = await res.json();

      setAlerts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Alert fetch error:", error);

      setAlerts([]);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to fetch alerts"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getAlert();
  }, [getAlert]);

  return {
    alerts,
    loading,
    error,
    refreshAlerts: getAlert,
  };
}