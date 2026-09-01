"use client";

import * as React from "react";
import { ArrowDown, ArrowUpRight, Loader2, RefreshCw, Wallet, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RETAILER_DATA_CHANGED } from "@/lib/data-events";

interface Transaction {
  service_name: string;
  old_balance: number | string;
  charge: number | string;
  new_balance: number | string;
  tranfer_type: string;
  created_at?: string;
}

const API_URL = "/api/dashbord-transitions";

type FilterType = "all" | "credit" | "debit";

export const PriceSidebar = () => {
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [filtered, setFiltered] = React.useState<Transaction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<FilterType>("all");
  const [currentBalance, setCurrentBalance] = React.useState<number>(0);

  const fetchTransactions = React.useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(API_URL, {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || "Failed to fetch transactions");
      }

      const data = result?.data || [];
      setTransactions(data);
      setFiltered(data);
      setCurrentBalance(result?.current_balance != null ? Number(result.current_balance) : (data.length > 0 ? Number(data[0].new_balance || 0) : 0));
    } catch (err: any) {
      console.error("PriceSidebar Error:", err);
      setError(err?.message || "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  React.useEffect(() => {
    const handler = () => {
      fetchTransactions();
    };
    window.addEventListener(RETAILER_DATA_CHANGED, handler);
    return () => window.removeEventListener(RETAILER_DATA_CHANGED, handler);
  }, [fetchTransactions]);

  React.useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchTransactions();
      }
    };
    const handleFocus = () => {
      fetchTransactions();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleFocus);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchTransactions]);

  React.useEffect(() => {
    if (activeFilter === "all") {
      setFiltered(transactions);
    } else {
      setFiltered(transactions.filter((t) => getTransferType(t.tranfer_type) === activeFilter));
    }
  }, [activeFilter, transactions]);

  const formatAmount = (value: number | string) => {
    return `₹${Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getTransferType = (type: unknown) => {
    const value = String(type ?? "").toLowerCase();
    if (value.includes("credit") || value.includes("add") || value.includes("deposit")) {
      return "credit";
    }
    return "debit";
  };

  const totalCredit = React.useMemo(() => {
    return transactions.filter((t) => getTransferType(t.tranfer_type) === "credit").reduce((sum, t) => sum + Number(t.charge || 0), 0);
  }, [transactions]);

  const totalDebit = React.useMemo(() => {
    return transactions.filter((t) => getTransferType(t.tranfer_type) === "debit").reduce((sum, t) => sum + Number(t.charge || 0), 0);
  }, [transactions]);

  const filters: { label: string; value: FilterType }[] = [
    { label: "All", value: "all" },
    { label: "Credit", value: "credit" },
    { label: "Debit", value: "debit" },
  ];

  return (
    <Card className="w-full overflow-hidden border-zinc-200 dark:border-zinc-800 shadow-xl rounded-2xl">
      {/* Gradient Header */}
      <div className="bg-gradient-to-br from-black to-gray-700 p-5 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
              <Wallet className="h-5 w-5" />
            </div>
            <span className="font-semibold text-sm tracking-wide">Recent Transactions</span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={fetchTransactions} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="text-xs text-indigo-200">Current Balance</div>
        <div className="text-3xl font-bold mt-0.5">{formatAmount(currentBalance)}</div>

        <div className="flex items-center gap-4 mt-3 text-xs">
          <div className="flex items-center gap-1 text-emerald-300">
            <TrendingUp className="h-3 w-3" />
            <span>+{formatAmount(totalCredit)}</span>
          </div>
          <div className="flex items-center gap-1 text-rose-300">
            <TrendingDown className="h-3 w-3" />
            <span>-{formatAmount(totalDebit)}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 p-2 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setActiveFilter(f.value)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeFilter === f.value
                ? "bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <CardContent className="p-0">
        {loading ? (
          <div className="flex min-h-[180px] items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading transactions...
            </div>
          </div>
        ) : error ? (
          <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950 flex items-center justify-center mb-1">
              <TrendingDown className="h-6 w-6 text-red-500" />
            </div>
            <p className="text-sm text-destructive font-medium">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchTransactions}>
              Try Again
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex min-h-[180px] flex-col items-center justify-center px-4 text-center gap-2">
            <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <Wallet className="h-6 w-6 text-zinc-400" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">No transactions found</p>
            <p className="text-xs text-zinc-400">Transactions will appear here once available</p>
          </div>
        ) : (
          <div className="max-h-[700px] overflow-y-auto p-3 space-y-2">
            {filtered.map((transaction, index) => {
              const transferType = getTransferType(transaction.tranfer_type);
              const isCredit = transferType === "credit";

              return (
                <div
                  key={`${transaction.service_name}-${index}`}
                  className={`group flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-zinc-900 border transition-all duration-200 cursor-pointer ${
                    isCredit
                      ? "border-zinc-100 dark:border-zinc-800 hover:border-emerald-200 dark:hover:border-emerald-900 hover:shadow-md"
                      : "border-zinc-100 dark:border-zinc-800 hover:border-rose-200 dark:hover:border-rose-900 hover:shadow-md"
                  }`}
                >
                  {/* Icon with status dot */}
                  <div className="relative shrink-0">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isCredit ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400" : "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {isCredit ? <ArrowDown className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-zinc-950 ${isCredit ? "bg-emerald-500" : "bg-rose-500"}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Top row */}
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{transaction.service_name || "Transaction"}</p>
                      <span className={`text-sm font-bold shrink-0 ${isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                        {isCredit ? "+" : "-"}
                        {formatAmount(transaction.charge)}
                      </span>
                    </div>

                    {/* Type + time placeholder */}
                    <div className="flex items-center justify-between mt-0.5">
                      <Badge
                        variant="outline"
                        className={`text-[10px] h-5 px-1.5 ${
                          isCredit
                            ? "border-emerald-200 text-emerald-700 dark:border-emerald-900 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                            : "border-rose-200 text-rose-700 dark:border-rose-900 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30"
                        }`}
                      >
                        {transaction.tranfer_type || "-"}
                      </Badge>
                      {transaction.created_at && <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{new Date(transaction.created_at).toLocaleDateString("en-IN")}</span>}
                    </div>

                    {/* Balance flow */}
                    <div className="flex items-center gap-3 mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-zinc-400">Old</span>
                        <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">{formatAmount(transaction.old_balance)}</span>
                      </div>
                      <ChevronRight className="h-3 w-3 text-zinc-300" />
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-zinc-400">New</span>
                        <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">{formatAmount(transaction.new_balance)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      
    </Card>
  );
};
