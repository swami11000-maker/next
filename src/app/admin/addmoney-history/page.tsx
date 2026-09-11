"use client";

import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { Loader2, Search, Filter, X, Calendar, ChevronLeft, ChevronRight, Download, CreditCard, ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch } from "@/lib/api-client";

interface Transaction {
  id: number;
  order_id: string;
  date_time: string;
  status: string;
  remark: string | null;
  new_balance: number | null;
  amount: number;
  type: "transition" | "gateway";
  gateway_amount: number | null;
  transition_charge: number | null;
  utr: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminAddMoneyHistory() {
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(searchQuery && { search: searchQuery }),
        ...(statusFilter && { status: statusFilter }),
        ...(typeFilter && { type: typeFilter }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
      });

      const response = await apiFetch(`/api/admin/payment/addmoney-history?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch history");
      }

      const data = await response.json();
      setTransactions(data.data || []);
      setPagination(data.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [pagination.page, searchQuery, statusFilter, typeFilter, dateFrom, dateTo]);

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

  const getStatusBadge = (status: string | null | undefined) => {
    if (!status) {
      return <Badge className="bg-gray-100 text-gray-700">—</Badge>;
    }
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

  const hasActiveFilters = searchQuery || statusFilter || typeFilter || dateFrom || dateTo;

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("");
    setTypeFilter("");
    setDateFrom("");
    setDateTo("");
  };

  const handleExport = () => {
    const params = new URLSearchParams({
      ...(searchQuery && { search: searchQuery }),
      ...(statusFilter && { status: statusFilter }),
      ...(typeFilter && { type: typeFilter }),
      ...(dateFrom && { dateFrom }),
      ...(dateTo && { dateTo }),
    });
    window.open(`/api/admin/payment/addmoney-history/export?${params.toString()}`, "_blank");
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">Add Money History (All Users)</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchHistory} className="gap-2">
            <Loader2 className="h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm bg-slate-50 dark:bg-slate-800/30">
        <CardContent className="pt-4 pb-2">
          <div className="space-y-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search Order ID, UTR, Remark..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value || "")}>
                <SelectTrigger className="w-[150px] h-10">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value || "")}>
                <SelectTrigger className="w-[150px] h-10">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="transition">Transition</SelectItem>
                  <SelectItem value="gateway">Gateway</SelectItem>
                </SelectContent>
              </Select>

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
              <TableHead className="text-left font-semibold text-slate-600 dark:text-slate-300">Remark</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                  {hasActiveFilters ? "No matching transactions" : "No add money transactions found"}
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((txn, index) => (
                <TableRow key={`${txn.type}-${txn.order_id}-${index}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <TableCell className="font-mono text-sm text-slate-700 dark:text-slate-300">{formatDate(txn.date_time)}</TableCell>
                  <TableCell className="font-mono text-sm text-slate-700 dark:text-slate-300">{txn.order_id}</TableCell>
                  <TableCell className="font-semibold text-slate-900 dark:text-white">₹{Number(txn.amount).toLocaleString("en-IN")}</TableCell>
                  <TableCell>{getStatusBadge(txn.status)}</TableCell>
                  <TableCell className="text-sm text-slate-600 dark:text-slate-400 capitalize">{txn.type}</TableCell>
                  <TableCell className="font-mono text-sm text-slate-700 dark:text-slate-300">
                    {txn.new_balance !== null && txn.new_balance !== undefined
                      ? `₹${Number(txn.new_balance).toLocaleString("en-IN")}`
                      : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    {txn.utr ? (
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
                  <TableCell className="text-sm text-slate-500 dark:text-slate-400 max-w-xs truncate">
                    {txn.remark || "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Card className="border-0 shadow-sm bg-slate-50 dark:bg-slate-800/30">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} transactions
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                  disabled={pagination.page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="flex items-center px-3 text-sm text-slate-700 dark:text-slate-300">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                  disabled={pagination.page === pagination.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}