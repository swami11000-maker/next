'use client';

import * as React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Loader2, CreditCard, ArrowUpRight, Search, X, Calendar, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable, type ColumnDef } from '@/components/ui/data-table';

import { apiFetch } from '@/lib/api-client';
import { formatIndianDateTime } from '@/lib/date-utils';
import { TableError, TableLoading } from '../ui/table-loading';

/* -------------------------------------------------------------------------- */
/*                                  TYPES                                     */
/* -------------------------------------------------------------------------- */

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

type UnifiedTransaction = { type: 'gateway' } & GatewayTransaction;

type StatusFilter = 'all' | 'success' | 'failed' | 'pending';
type TypeFilter = 'all' | 'gateway';

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

const PAGE_SIZE = 10;

/* -------------------------------------------------------------------------- */
/*                              MAIN COMPONENT                                */
/* -------------------------------------------------------------------------- */

export const AddMoneyHistory = () => {
  const [data, setData] = useState<UnifiedTransaction[]>([]);

  const [initialLoading, setInitialLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // server-side pagination
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  /* ---------------------------------------------------------------------- */
  /*                     DEBOUNCE THE SEARCH INPUT                          */
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

        if (pageNumber === 1 && data.length === 0) {
          setInitialLoading(true);
        } else {
          setFetching(true);
        }

        // Build query params for API
        const params = new URLSearchParams({
          page: String(pageNumber),
          limit: String(PAGE_SIZE),
        });

        if (debouncedSearch) params.set('search', debouncedSearch);
        if (statusFilter !== 'all') params.set('status', statusFilter);
        if (typeFilter !== 'all') params.set('type', typeFilter);
        if (dateFrom) params.set('date_from', dateFrom);
        if (dateTo) params.set('date_to', dateTo);

        const response = await apiFetch(`/api/payment/addmoney/history?${params.toString()}`, { method: 'GET', cache: 'no-store' });

        if (!response.ok) throw new Error('Failed to fetch history');

        const result: any = await response.json();

        // 🔍 Debug log
        console.log('Add money history response:', result);

        // Robust parsing
        let list: GatewayTransaction[] = [];
        if (Array.isArray(result)) {
          list = result;
        } else if (Array.isArray(result?.gateway_transactions)) {
          list = result.gateway_transactions;
        } else if (Array.isArray(result?.data)) {
          list = result.data;
        }

        const unified: UnifiedTransaction[] = list.map((g) => ({
          ...g,
          type: 'gateway' as const,
        }));

        setData(unified);

        // Pagination
        setPagination(
          result?.pagination || {
            page: pageNumber,
            limit: PAGE_SIZE,
            total: unified.length,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          },
        );
      } catch (err) {
        console.error('Add money history fetch error:', err);
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
  /*                              PAGINATION                                */
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
  /*                              FORMATTERS                                */
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

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase() ?? '';
    if (s === 'success' || s === 'completed') return <Badge className="border-green-200 bg-green-100 text-green-700">{status}</Badge>;
    if (s === 'failed') return <Badge className="border-red-200 bg-red-100 text-red-700">{status}</Badge>;
    if (s === 'pending' || s === 'panding') return <Badge className="border-yellow-200 bg-yellow-100 text-yellow-700">{status}</Badge>;
    return <Badge className="bg-gray-100 text-gray-700">{status}</Badge>;
  };

  const getTxnStatus = (txn: UnifiedTransaction): string => txn.txn_status || txn.status;

  const getTxnAmount = (txn: UnifiedTransaction): number => Number(txn.amount || 0);

  /* ---------------------------------------------------------------------- */
  /*                                FILTERS                                 */
  /* ---------------------------------------------------------------------- */

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || dateFrom || dateTo;

  const clearFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setStatusFilter('all');
    setTypeFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  /* ---------------------------------------------------------------------- */
  /*                              COLUMNS                                   */
  /* ---------------------------------------------------------------------- */

  const columns = useMemo<ColumnDef<UnifiedTransaction>[]>(
    () => [
      {
        key: 'date_time',
        header: 'Date',
        sortable: true,
        sortValue: (row) => new Date(row.date_time).getTime() || 0,
        cell: (row) => <span className="font-mono text-sm whitespace-nowrap text-slate-700 dark:text-slate-300">{formatDate(row.date_time)}</span>,
      },
      {
        key: 'order_id',
        header: 'Order ID',
        sortable: true,
        sortValue: (row) => row.order_id,
        cell: (row) => <span className="font-mono text-sm whitespace-nowrap text-slate-700 dark:text-slate-300">{row.order_id || '-'}</span>,
      },
      {
        key: 'amount',
        header: 'Amount',
        sortable: true,
        sortValue: (row) => getTxnAmount(row),
        cell: (row) => <span className="font-semibold whitespace-nowrap text-slate-900 dark:text-white">₹{getTxnAmount(row).toLocaleString('en-IN')}</span>,
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        sortValue: (row) => getTxnStatus(row),
        cell: (row) => getStatusBadge(getTxnStatus(row)),
      },
      {
        key: 'type',
        header: 'Type',
        sortable: true,
        sortValue: (row) => row.type,
        cell: (row) => <span className="text-sm text-slate-600 capitalize dark:text-slate-400">{row.type}</span>,
      },
      {
        key: 'utr',
        header: 'UTR',
        cell: (row) => (
          <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
            {row.utr ? (
              <span className="inline-flex items-center">
                {row.utr}
                <Button variant="ghost" size="icon" className="ml-1 h-6 w-6 p-0" onClick={() => navigator.clipboard.writeText(row.utr!)} title="Copy UTR">
                  <ArrowUpRight className="h-3 w-3" />
                </Button>
              </span>
            ) : (
              '—'
            )}
          </span>
        ),
      },
    ],
    [],
  );
 if (initialLoading) {
     return <TableLoading message="Loading ..." />;
   }
   if (error) {
     return <TableError error={error} onRetry={() => fetchHistory(page)} />;
   }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">Add Money History</CardTitle>
        <Button variant="outline" onClick={handleRefresh} disabled={fetching} className="gap-2">
          <RefreshCw className={`h-4 w-4 text-2xl text-black ${fetching ? 'animate-spin' : ''}`} />
          <span className='text-black'>Refresh</span>
        </Button>
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
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="h-10 w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
                <SelectTrigger className="h-10 w-[150px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
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

      {/* Results count */}
      <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
        <span>
          Showing <strong className="text-slate-900 dark:text-white">{data.length}</strong> of <strong className="text-slate-900 dark:text-white">{pagination.total}</strong> transaction{pagination.total !== 1 ? 's' : ''}
          {fetching && (
            <span className="ml-2 inline-flex items-center gap-1 text-slate-500">
              <Loader2 className="h-3 w-3 animate-spin" /> loading...
            </span>
          )}
        </span>
      </div>

      {/* DataTable — server already paginates, so pageSize = PAGE_SIZE */}
      <DataTable<UnifiedTransaction>
        data={data}
        columns={columns}
        getRowKey={(row, index) => `${row.order_id}-${index}`}
        pageSize={PAGE_SIZE}
        initialSortKey="date_time"
        initialSortDirection="desc"
        className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
        emptyState={
          <div className="flex flex-col items-center gap-3 py-6">
            <CreditCard className="h-12 w-12 text-slate-300" />
            <div>
              <p className="text-base font-medium text-slate-900 dark:text-white">{hasActiveFilters ? 'No matching transactions' : 'No Add Money History'}</p>
              <p className="mt-1 text-sm text-slate-500">{hasActiveFilters ? 'Try adjusting your filters' : 'Your add money transactions will appear here'}</p>
            </div>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters} className="mt-2 gap-2">
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>
        }
      />

      {/* ✅ Server-side Next / Previous buttons */}
      <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Page <strong className="text-slate-900 dark:text-white">{pagination.page}</strong> of <strong className="text-slate-900 dark:text-white">{pagination.totalPages}</strong>
          {' · '}
          Total <strong className="text-slate-900 dark:text-white">{pagination.total}</strong> records
        </p>

        <div className="flex items-center gap-2 text-2xl text-slate-600 dark:text-slate-400">
          <Button variant="outline" size="sm" onClick={handlePrev} disabled={!pagination.hasPrevPage || fetching} className="gap-1">
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <Button variant="outline" size="sm" onClick={handleNext} disabled={!pagination.hasNextPage || fetching} className="gap-1">
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
