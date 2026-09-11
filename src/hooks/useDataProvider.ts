"use client";

import { RetailerData } from "@/lib/type";
import { apiFetch } from "@/lib/api-client";
import { useEffect, useState } from "react";

export const useDataProvider = () => {
  const [retailer, setRetailer] = useState<RetailerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const logout = async () => {
    try {
      await apiFetch("/api/auth/logout", {
        method: "POST",
      });
      setRetailer(null);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  useEffect(() => {
    let mounted = true;

    const getUser = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await apiFetch("/api/auth/user", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.message || "Failed to fetch user");
        }

        if (mounted) {
          setRetailer(data.user ?? data);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Something went wrong");

          setRetailer(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getUser();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    retailer,
    loading,
    error,
    logout,
  };
};