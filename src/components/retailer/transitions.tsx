'use client';

import * as React from 'react';

import { ChevronLeft, ChevronRight, Loader2, RefreshCw, Search, X } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { DataTable, type ColumnDef } from '@/components/ui/data-table';

import { apiFetch } from '@/lib/api-client';
import { Pagination, Transition } from '@/lib/type';
import { formatDate } from '@/lib/utils';
import { StatusBadge } from '../ui/statusbagde';
import { TransferTypeBadge } from '../ui/TransferTypeBadge';
import { TableError, TableLoading } from '../ui/table-loading';

const API_URL = '/api/v2/trans';
const PAGE_SIZE = 10;

const STATUS_OPTIONS = ['Success', 'Pending', 'Failed'];
const TRANSFER_TYPE_OPTIONS = ['Credit', 'Debit'];



const formatAmount = (value: number | string) => {
  const amount = Number(value || 0);
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const Transitions = () => {
  const [transitions, setTransitions] = React.useState<Transition[]>([]);

  const [initialLoading, setInitialLoading] = React.useState(true);
  const [fetching, setFetching] = React.useState(false);
  const [error, setError] = React.useState('');

  // server-side pagination
  const [page, setPage] = React.useState(1);
  const [pagination, setPagination] = React.useState<Pagination>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // filters
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [transferFilter, setTransferFilter] = React.useState('all');

  React.useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchTransitions = React.useCallback(
    async (pageNumber: number = 1) => {
      try {
        setError('');

        if (pageNumber === 1 && transitions.length === 0) {
          setInitialLoading(true);
        } else {
          setFetching(true);
        }

        const params = new URLSearchParams({
          page: String(pageNumber),
          limit: String(PAGE_SIZE),
        });

        if (debouncedSearch) params.set('search', debouncedSearch);
        if (statusFilter !== 'all') params.set('status', statusFilter);
        if (transferFilter !== 'all') params.set('transfer', transferFilter);

        const res = await apiFetch(`${API_URL}?${params.toString()}`, {
          method: 'GET',
          cache: 'no-store',
        });

        const result = await res.json();

        if (!res.ok) throw new Error(result?.message || 'Failed to fetch transitions');

        setTransitions(result?.data || []);

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
      } catch (err: any) {
        console.error('Transitions fetch error:', err);
        setError(err?.message || 'Something went wrong');
      } finally {
        setInitialLoading(false);
        setFetching(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [debouncedSearch, statusFilter, transferFilter],
  );

  React.useEffect(() => {
    setPage(1);
    fetchTransitions(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, statusFilter, transferFilter]);

  React.useEffect(() => {
    fetchTransitions(page);
  }, [page]);

  const handleNext = () => {
    if (!pagination.hasNextPage || fetching) return;
    setPage((p) => p + 1);
  };

  const handlePrev = () => {
    if (!pagination.hasPrevPage || fetching) return;
    setPage((p) => Math.max(1, p - 1));
  };

  const handleRefresh = () => {
    fetchTransitions(page);
  };

  const clearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('all');
    setTransferFilter('all');
  };

  const hasFilters = search !== '' || statusFilter !== 'all' || transferFilter !== 'all';

  const columns = React.useMemo<ColumnDef<Transition>[]>(
    () => [
      {
        key: 'user_mob',
        header: 'Mobile',
        cell: (row) => <span className="whitespace-nowrap">{row.user_mob || '-'}</span>,
      },
      {
        key: 'service_name',
        header: 'Service',
        sortable: true,
        sortValue: (row) => row.service_name,
        cell: (row) => <span className="font-medium whitespace-nowrap">{row.service_name || '-'}</span>,
      },
      {
        key: 'old_balance',
        header: 'Old Balance',
        sortable: true,
        sortValue: (row) => Number(row.old_balance || 0),
        cell: (row) => <span className="whitespace-nowrap">{formatAmount(row.old_balance)}</span>,
      },
      {
        key: 'charge',
        header: 'Charge',
        sortable: true,
        sortValue: (row) => Number(row.charge || 0),
        cell: (row) => <span className="font-medium whitespace-nowrap text-red-600">-{formatAmount(row.charge)}</span>,
      },
      {
        key: 'new_balance',
        header: 'New Balance',
        sortable: true,
        sortValue: (row) => Number(row.new_balance || 0),
        cell: (row) => <span className="font-medium whitespace-nowrap">{formatAmount(row.new_balance)}</span>,
      },
      {
        key: 'tranfer_type',
        header: 'Transfer Type',
        sortable: true,
        sortValue: (row) => row.tranfer_type,
        cell: (row) => <TransferTypeBadge type={row.tranfer_type} />,
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        sortValue: (row) => row.status,
        cell: (row) => <StatusBadge status={row.status} />,
      },
      {
        key: 'date_time',
        header: 'Date & Time',
        sortable: true,
        sortValue: (row) => new Date(row.date_time).getTime() || 0,
        cell: (row) => <span className="text-sm whitespace-nowrap">{formatDate(row.date_time)}</span>,
      },
      {
        key: 'remark',
        header: 'Remark',
        cell: (row) => <div className="max-w-[250px] truncate">{row.remark || '-'}</div>,
      },
    ],
    [],
  );

  if (initialLoading) {
    return <TableLoading message="Loading transactions..." />;
  }
  if (error) {
    return <TableError error={error} onRetry={() => fetchTransitions(page)} />;
  }

  return (
    <div className="h-auto w-full space-y-5 rounded-2xl bg-white p-4 text-black">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Transaction History</h2>
          <p className="text-sm text-gray-600">View and manage all your transactions</p>
        </div>

        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={fetching} className="w-fit gap-2 border-gray-300 bg-white text-black hover:bg-gray-100">
          <RefreshCw className={`h-4 w-4 ${fetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input placeholder="Search order, service, mobile, status, remark..." value={search} onChange={(e) => setSearch(e.target.value)} className="border-gray-300 bg-white pl-9 text-black placeholder:text-gray-400 focus:border-gray-400 focus:ring-gray-400" />
        </div>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || 'all')}>
          <SelectTrigger className="w-full border-gray-300 bg-white text-black md:w-[170px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-white text-black">
            <SelectItem value="all">All Status</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={transferFilter} onValueChange={(v) => setTransferFilter(v || 'all')}>
          <SelectTrigger className="w-full border-gray-300 bg-white text-black md:w-[180px]">
            <SelectValue placeholder="Transfer Type" />
          </SelectTrigger>
          <SelectContent className="bg-white text-black">
            <SelectItem value="all">All Transfer Types</SelectItem>
            {TRANSFER_TYPE_OPTIONS.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="icon" onClick={clearFilters} title="Clear filters" className="text-gray-500 hover:bg-gray-100 hover:text-black">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          Showing <strong className="font-semibold text-black">{transitions.length}</strong> of <strong className="font-semibold text-black">{pagination.total}</strong> transactions
          {fetching && (
            <span className="ml-2 inline-flex items-center gap-1 text-gray-500">
              <Loader2 className="h-3 w-3 animate-spin" /> loading...
            </span>
          )}
        </span>
      </div>

      <DataTable<Transition>
        data={transitions}
        columns={columns}
        getRowKey={(row) => row.id}
        pageSize={PAGE_SIZE}
        initialSortKey="date_time"
        initialSortDirection="desc"
        emptyState={
          <div className="flex flex-col items-center justify-center gap-2">
            <p className="font-medium">No transactions found</p>
            <p className="text-sm text-gray-500">Try changing your search or filters.</p>
          </div>
        }
      />

      <div className="flex flex-col items-center justify-between gap-3 pt-1 sm:flex-row">
        <p className="text-sm text-gray-600">
          Page <strong className="text-black">{pagination.page}</strong> of <strong className="text-black">{pagination.totalPages}</strong>
          {' · '}
          Total <strong className="text-black">{pagination.total}</strong> records
        </p>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrev} disabled={!pagination.hasPrevPage || fetching} className="gap-1 border-gray-300 bg-white text-black hover:bg-gray-100 disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <Button variant="outline" onClick={handleNext} disabled={!pagination.hasNextPage || fetching} className="gap-1 border-gray-300 bg-white text-black hover:bg-gray-100 disabled:opacity-40">
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
