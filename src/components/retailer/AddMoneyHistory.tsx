"use client";

import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { Loader2, Download, CreditCard, ArrowUpRight, Search, Filter, X, Calendar } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch } from "@/lib/api-client";

interface Transition {
  order_id: string;
  service_name: string;
  charge: number;
  new_balance: number;
  tranfer_type: string;
  status: string;
  date_time: string;
  remark: string;
}

interface GatewayTransaction {
  order_id: string;
  amount: number;
  payment_type: string;
  status: string;
  txn_status: string;
  utr: string | null;
  date_time: string;
  remark1: string | null;
  remark2: string | null;
}

interface AddMoneyHistoryResponse {
  transitions: Transition[];
  gateway_transactions: GatewayTransaction[];
}

type UnifiedTransaction = 
  | ({ type: "transition" } & Transition)
  | ({ type: "gateway" } & GatewayTransaction);

type StatusFilter = "all" | "success" | "failed" | "pending";
type TypeFilter = "all" | "transition" | "gateway";

export const AddMoneyHistory = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [gatewayTransactions, setGatewayTransactions] = useState<GatewayTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      const response = await apiFetch("/api/payment/addmoney/history", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch history");
      }

      const data: AddMoneyHistoryResponse = await response.json();
      setTransitions(data.transitions || []);
      setGatewayTransactions(data.gateway_transactions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "success" || statusLower === "completed") {
      return <Badge className="bg-green-100 text-green-700 border-green-200">{status}</Badge>;
    }
    if (statusLower === "failed") {
      return <Badge className="bg-red-100 text-red-700 border-red-200">{status}</Badge>;
    }
    if (statusLower === "pending") {
      return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">{status}</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-700">{status}</Badge>;
  };

  const getTxnStatus = (txn: UnifiedTransaction): string => {
    if (txn.type === "transition") return txn.status;
    return txn.txn_status || txn.status;
  };

  const getTxnAmount = (txn: UnifiedTransaction): number => {
    return txn.type === "transition" ? txn.charge : txn.amount;
  };

  const filteredTransactions = useMemo(() => {
    return [...transitions.map((t) => ({ ...t, type: "transition" as const })),
      ...gatewayTransactions.map((g) => ({ ...g, type: "gateway" as const }))]
      .filter((txn) => {
        // Search query filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const orderMatch = txn.order_id.toLowerCase().includes(query);
          const utrMatch = txn.type === "gateway" && txn.utr?.toLowerCase().includes(query);
          const remarkMatch = txn.type === "transition" 
            ? txn.remark?.toLowerCase().includes(query)
            : (txn.remark1?.toLowerCase().includes(query) || txn.remark2?.toLowerCase().includes(query));
          if (!orderMatch && !utrMatch && !remarkMatch) return false;
        }

        // Status filter
        if (statusFilter !== "all") {
          const txnStatus = getTxnStatus(txn).toLowerCase();
          if (txnStatus !== statusFilter) return false;
        }

        // Type filter
        if (typeFilter !== "all" && txn.type !== typeFilter) return false;

        // Date range filter
        if (dateFrom) {
          const txnDate = new Date(txn.date_time).getTime();
          const fromDate = new Date(dateFrom).getTime();
          if (txnDate < fromDate) return false;
        }
        if (dateTo) {
          const txnDate = new Date(txn.date_time).getTime();
          const toDate = new Date(dateTo + "T23:59:59").getTime();
          if (txnDate > toDate) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime());
  }, [transitions, gatewayTransactions, searchQuery, statusFilter, typeFilter, dateFrom, dateTo]);

  const hasActiveFilters = searchQuery || statusFilter !== "all" || typeFilter !== "all" || dateFrom || dateTo;

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setTypeFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#ff3800] mx-auto mb-3" />
          <p className="text-slate-500">Loading add money history...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-0 shadow-sm border-red-200">
        <CardContent className="py-8 text-center text-red-600">
          <p>{error}</p>
          <Button variant="outline" onClick={fetchHistory} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (filteredTransactions.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-12 text-center">
          <CreditCard className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">
            {hasActiveFilters ? "No matching transactions" : "No Add Money History"}
          </h3>
          <p className="text-slate-500">
            {hasActiveFilters ? "Try adjusting your filters" : "Your add money transactions will appear here"}
          </p>
          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters} className="mt-4 gap-2">
              <X className="h-4 w-4" />
              Clear Filters
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">Add Money History</CardTitle>
        <Button variant="outline" onClick={fetchHistory} className="gap-2">
          <Loader2 className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm bg-slate-50 dark:bg-slate-800/30">
        <CardContent className="pt-4 pb-2">
          <div className="space-y-4">
            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search Order ID, UTR, Remark..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
            </div>

            {/* Filter row */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                <SelectTrigger className="w-[150px] h-10">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>

              {/* Type Filter */}
              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as TypeFilter)}>
                <SelectTrigger className="w-[150px] h-10">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="transition">Transition</SelectItem>
                  <SelectItem value="gateway">Gateway</SelectItem>
                </SelectContent>
              </Select>

              {/* Date From */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="pl-10 h-10 w-[160px]"
                  placeholder="From"
                />
              </div>

              {/* Date To */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="pl-10 h-10 w-[160px]"
                  placeholder="To"
                />
              </div>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-slate-600 dark:text-slate-400 hover:text-red-600">
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 dark:bg-slate-800/50">
              <TableHead className="text-left font-semibold text-slate-600 dark:text-slate-300">Date</TableHead>
              <TableHead className="text-left font-semibold text-slate-600 dark:text-slate-300">Order ID</TableHead>
              <TableHead className="text-left font-semibold text-slate-600 dark:text-slate-300">Amount</TableHead>
              <TableHead className="text-left font-semibold text-slate-600 dark:text-slate-300">Status</TableHead>
              <TableHead className="text-left font-semibold text-slate-600 dark:text-slate-300">Type</TableHead>
              <TableHead className="text-left font-semibold text-slate-600 dark:text-slate-300">Balance</TableHead>
              <TableHead className="text-left font-semibold text-slate-600 dark:text-slate-300">UTR</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.map((txn, index) => (
              <TableRow key={`${txn.type}-${txn.order_id}-${index}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <TableCell className="font-mono text-sm text-slate-700 dark:text-slate-300">{formatDate(txn.date_time)}</TableCell>
                <TableCell className="font-mono text-sm text-slate-700 dark:text-slate-300">{txn.order_id}</TableCell>
                <TableCell className="font-semibold text-slate-900 dark:text-white">₹{Number(getTxnAmount(txn)).toLocaleString("en-IN")}</TableCell>
                <TableCell>{getStatusBadge(getTxnStatus(txn))}</TableCell>
                <TableCell className="text-sm text-slate-600 dark:text-slate-400 capitalize">{txn.type}</TableCell>
                <TableCell className="font-mono text-sm text-slate-700 dark:text-slate-300">
                  {txn.type === "transition" && txn.new_balance !== undefined
                    ? `₹${Number(txn.new_balance).toLocaleString("en-IN")}`
                    : "—"}
                </TableCell>
                <TableCell className="font-mono text-xs text-slate-500 dark:text-slate-400">
                  {txn.type === "gateway" && txn.utr ? (
                    <>
                      {txn.utr}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-1 h-6 w-6 p-0"
                        onClick={() => navigator.clipboard.writeText(txn.utr!)}
                        title="Copy UTR"
                      >
                        <ArrowUpRight className="h-3 w-3" />
                      </Button>
                    </>
                  ) : (
                    "—"
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Footer */}
      <Card className="border-0 shadow-sm bg-slate-50 dark:bg-slate-800/30">
        <CardContent className="pt-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
            Showing {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};