"use client";

import * as React from "react";
import { ArrowDown, ArrowDownLeft, ArrowUpRight, Loader2, RefreshCw, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface Transaction {
  service_name: string;
  old_balance: number | string;
  charge: number | string;
  new_balance: number | string;
  tranfer_type: string;
}

const API_URL = "/api/dashbord-transitions";

export const PriceSidebar = () => {
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

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

      setTransactions(result?.data || []);
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

  return (
    <Card className="w-full overflow-hidden h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-4 w-4" />
            Recent Transactions
          </CardTitle>

          <p className="mt-1 text-xs text-muted-foreground">Latest 10 transactions</p>
        </div>

        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchTransactions} disabled={loading} title="Refresh">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>

      <Separator />

      <CardContent className="p-0">
        {loading ? (
          <div className="flex min-h-[180px] items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          </div>
        ) : error ? (
          <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 px-4 text-center">
            <p className="text-sm text-destructive">{error}</p>

            <Button variant="outline" size="sm" onClick={fetchTransactions}>
              Try Again
            </Button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex min-h-[180px] items-center justify-center px-4 text-center">
            <p className="text-sm text-muted-foreground">No transactions found.</p>
          </div>
        ) : (
          <div className="max-h-screen overflow-y-auto">
            {transactions.map((transaction, index) => {
              const transferType = getTransferType(transaction.tranfer_type);

              const isCredit = transferType === "credit";

              return (
                <React.Fragment key={`${transaction.service_name}-${index}`}>
                  <div className="group px-4 py-3 transition-colors hover:bg-muted/50">
                    {/* Top */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            isCredit ? "bg-green-100 text-green-600 dark:bg-green-950" : "bg-red-100 text-red-600 dark:bg-red-950"
                          }`}
                        >
                          {isCredit ? <ArrowDown className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{transaction.service_name || "Transaction"}</p>

                          <p className="text-[11px] text-muted-foreground">{transaction.tranfer_type || "-"}</p>
                        </div>
                      </div>

                      <Badge variant={isCredit ? "default" : "destructive"} className="shrink-0 text-[10px]">
                        {isCredit ? "Credit" : "Debit"}
                      </Badge>
                    </div>

                    {/* Amount */}
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Old Balance</p>

                        <p className="mt-0.5 font-medium">{formatAmount(transaction.old_balance)}</p>
                      </div>

                      <div>
                        <p className="text-muted-foreground">Charge</p>

                        <p className={`mt-0.5 font-medium ${isCredit ? "text-green-600" : "text-red-600"}`}>
                          {isCredit ? "+" : "-"}
                          {formatAmount(transaction.charge)}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-muted-foreground">New Balance</p>

                        <p className="mt-0.5 font-semibold">{formatAmount(transaction.new_balance)}</p>
                      </div>
                    </div>
                  </div>

                  {index < transactions.length - 1 && <Separator />}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
