'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Loader2, Search, X, Calendar, ChevronLeft, ChevronRight, Download, ArrowUpRight, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiFetch } from '@/lib/api-client';
import { formatIndianDateTime } from '@/lib/date-utils';

/* -------------------------------------------------------------------------- */
/*                                  TYPES                                     */
/* -------------------------------------------------------------------------- */

interface Transaction {
  id: number;
  order_id: string;
  date_time: string;
  status: string;
  remark: string | null;
  new_balance: number | null;
  amount: number;
  charge?: number;
  type: 'transition' | 'gateway';
  utr: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

const PAGE_SIZE = 10;

/* -------------------------------------------------------------------------- */
/*                              MAIN COMPONENT                                */
/* -------------------------------------------------------------------------- */

export default function AdminAddMoneyHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [initialLoading, setInitialLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // pagination
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // filters
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  /* ---------------------------------------------------------------------- */
  /*                       DEBOUNCE SEARCH INPUT                            */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  /* ---------------------------------------------------------------------- */
  /*                                  FETCH                                 */
  /* ---------------------------------------------------------------------- */

  const fetchHistory = useCallback(
    async (pageNumber: number = 1) => {
      try {
        setError(null);

        if (pageNumber === 1 && transactions.length === 0) {
          setInitialLoading(true);
        } else {
          setFetching(true);
        }

        const params = new URLSearchParams({
          page: String(pageNumber),
          limit: String(PAGE_SIZE),
        });

        if (debouncedSearch) params.set('search', debouncedSearch);
        if (statusFilter) params.set('status', statusFilter);
        if (typeFilter) params.set('type', typeFilter);
        if (dateFrom) params.set('dateFrom', dateFrom);
        if (dateTo) params.set('dateTo', dateTo);

        const response = await apiFetch(`/api/admin/payment/addmoney-history?${params.toString()}`, { method: 'GET', cache: 'no-store' });

        if (!response.ok) {
          throw new Error('Failed to fetch history');
        }

        const result = await response.json();

        setTransactions(result?.data || []);

        setPagination(
          result?.pagination || {
            page: pageNumber,
            limit: PAGE_SIZE,
            total: result?.data?.length || 0,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          },
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load history');
      } finally {
        setInitialLoading(false);
        setFetching(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [debouncedSearch, statusFilter, typeFilter, dateFrom, dateTo],
  );

  /* ---------- Reset to page 1 whenever filters change ---------- */
  useEffect(() => {
    setPage(1);
    fetchHistory(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, statusFilter, typeFilter, dateFrom, dateTo]);

  /* ---------- Fetch when page changes (Next / Prev) ---------- */
  useEffect(() => {
    fetchHistory(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  /* ---------------------------------------------------------------------- */
  /*                             PAGINATION                                 */
  /* ---------------------------------------------------------------------- */

  const handleNext = () => {
    if (!pagination.hasNextPage || fetching) return;
    setPage((p) => p + 1);
  };

  const handlePrev = () => {
    if (!pagination.hasPrevPage || fetching) return;
    setPage((p) => Math.max(1, p - 1));
  };

  const handleRefresh = () => {
    fetchHistory(page);
  };

  /* ---------------------------------------------------------------------- */
  /*                             FORMATTERS                                 */
  /* ---------------------------------------------------------------------- */

  const formatDate = (dateStr: string) => {
    try {
      return formatIndianDateTime(dateStr, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: string | null | undefined) => {
    if (!status) return <Badge className="bg-gray-100 text-gray-700">—</Badge>;
    const s = status.toLowerCase();
    if (s === 'success' || s === 'completed') return <Badge className="border-green-200 bg-green-100 text-green-700">{status}</Badge>;
    if (s === 'failed') return <Badge className="border-red-200 bg-red-100 text-red-700">{status}</Badge>;
    if (s === 'pending' || s === 'panding') return <Badge className="border-yellow-200 bg-yellow-100 text-yellow-700">{status}</Badge>;
    return <Badge className="bg-gray-100 text-gray-700">{status}</Badge>;
  };

  /* ---------------------------------------------------------------------- */
  /*                                FILTERS                                 */
  /* ---------------------------------------------------------------------- */

  const hasActiveFilters = searchQuery || statusFilter || typeFilter || dateFrom || dateTo;

  const clearFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setStatusFilter('');
    setTypeFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const handleExport = () => {
    const params = new URLSearchParams({
      ...(debouncedSearch && { search: debouncedSearch }),
      ...(statusFilter && { status: statusFilter }),
      ...(typeFilter && { type: typeFilter }),
      ...(dateFrom && { dateFrom }),
      ...(dateTo && { dateTo }),
    });
    window.open(`/api/admin/payment/addmoney-history/export?${params.toString()}`, '_blank');
  };

  /* ---------------------------------------------------------------------- */
  /*                              LOADING                                   */
  /* ---------------------------------------------------------------------- */

  if (initialLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-12 text-center">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-[#ff3800]" />
          <p className="text-slate-500">Loading add money history...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-0 border-red-200 shadow-sm">
        <CardContent className="py-8 text-center text-red-600">
          <p>{error}</p>
          <Button variant="outline" onClick={() => fetchHistory(page)} className="mt-4 gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  /* ---------------------------------------------------------------------- */
  /*                                  UI                                    */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">Add Money History (All Users)</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={fetching} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${fetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-0 bg-slate-50 shadow-sm dark:bg-slate-800/30">
        <CardContent className="pt-4 pb-2">
          <div className="space-y-4">
            <div className="relative max-w-md">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input placeholder="Search Order ID, UTR, Remark..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-10 pl-10" />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value || '')}>
                <SelectTrigger className="h-10 w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value || '')}>
                <SelectTrigger className="h-10 w-[150px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="transition">Transition</SelectItem>
                  <SelectItem value="gateway">Gateway</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative">
                <Calendar className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-10 w-[160px] pl-10" />
              </div>

              <div className="relative">
                <Calendar className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-10 w-[160px] pl-10" />
              </div>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-slate-600 hover:text-red-600 dark:text-slate-400">
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results info */}
      <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
        <span>
          Showing <strong className="text-slate-900 dark:text-white">{transactions.length}</strong> of <strong className="text-slate-900 dark:text-white">{pagination.total}</strong> transactions
          {fetching && (
            <span className="ml-2 inline-flex items-center gap-1 text-slate-500">
              <Loader2 className="h-3 w-3 animate-spin" /> loading...
            </span>
          )}
        </span>
      </div>

      {/* Table */}
      <Card className="overflow-hidden border-0 shadow-sm">
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
                <TableCell colSpan={8} className="py-8 text-center text-slate-500">
                  {hasActiveFilters ? 'No matching transactions' : 'No add money transactions found'}
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((txn, index) => (
                <TableRow key={`${txn.type}-${txn.order_id}-${index}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <TableCell className="font-mono text-sm whitespace-nowrap text-slate-700 dark:text-slate-300">{formatDate(txn.date_time)}</TableCell>
                  <TableCell className="font-mono text-sm whitespace-nowrap text-slate-700 dark:text-slate-300">{txn.order_id}</TableCell>
                  <TableCell className="font-semibold whitespace-nowrap text-slate-900 dark:text-white">₹{Number(txn.amount || 0).toLocaleString('en-IN')}</TableCell>
                  <TableCell>{getStatusBadge(txn.status)}</TableCell>
                  <TableCell className="text-sm text-slate-600 capitalize dark:text-slate-400">{txn.type}</TableCell>
                  <TableCell className="font-mono text-sm whitespace-nowrap text-slate-700 dark:text-slate-300">{txn.new_balance !== null && txn.new_balance !== undefined ? `₹${Number(txn.new_balance).toLocaleString('en-IN')}` : '—'}</TableCell>
                  <TableCell className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    {txn.utr ? (
                      <>
                        {txn.utr}
                        <Button variant="ghost" size="icon" className="ml-1 h-6 w-6 p-0" onClick={() => navigator.clipboard.writeText(txn.utr!)} title="Copy UTR">
                          <ArrowUpRight className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-slate-500 dark:text-slate-400">{txn.remark || '—'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination footer — always visible when total > 0 */}
      {pagination.total > 0 && (
        <Card className="border-0 bg-slate-50 shadow-sm dark:bg-slate-800/30">
          <CardContent className="py-4">
            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Showing <strong className="text-slate-900 dark:text-white">{(pagination.page - 1) * pagination.limit + 1}</strong> to <strong className="text-slate-900 dark:text-white">{Math.min(pagination.page * pagination.limit, pagination.total)}</strong> of{' '}
                <strong className="text-slate-900 dark:text-white">{pagination.total}</strong> transactions
              </p>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrev} disabled={!pagination.hasPrevPage || fetching} className="gap-1">
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <span className="px-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  Page {pagination.page} of {pagination.totalPages}
                </span>

                <Button variant="outline" size="sm" onClick={handleNext} disabled={!pagination.hasNextPage || fetching} className="gap-1">
                  Next
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
