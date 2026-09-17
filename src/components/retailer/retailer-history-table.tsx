'use client';

import * as React from 'react';

import { ChevronLeft, ChevronRight, Download, FileText, Loader2, RefreshCw, Search, X } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { DataTable, type ColumnDef } from '@/components/ui/data-table';

import { apiFetch } from '@/lib/api-client';
import { formatIndianDateTime } from '@/lib/date-utils';
import { TableError, TableLoading } from '../ui/table-loading';

/* -------------------------------------------------------------------------- */
/*                                  TYPES                                     */
/* -------------------------------------------------------------------------- */

interface WorkHistoryItem {
  id: number;
  order_id: string;
  user_mob: string;
  service_id: string;
  service_name: string;
  old_balance: number | string;
  charge: number | string;
  new_balance: number | string;
  tranfer_type: 'credit' | 'debit' | string;
  status: 'success' | 'failed' | 'refund' | 'panding' | 'processing' | string;
  document?: string | null;
  date_time: string;
  remark: string | null;
}

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

/* -------------------------------------------------------------------------- */
/*                              CONSTANTS                                     */
/* -------------------------------------------------------------------------- */

const API_URL = '/api/v2/work';
const PAGE_SIZE = 10;

// Match DB enum values exactly (lowercase)
const STATUS_OPTIONS = ['success', 'failed', 'refund', 'panding', 'processing'];
const TRANSFER_TYPE_OPTIONS = ['credit', 'debit'];

/* -------------------------------------------------------------------------- */
/*                          DOCUMENT DOWNLOAD HELPERS                         */
/* -------------------------------------------------------------------------- */

const cleanBase64 = (value: string) =>
  value
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\\:/g, ':')
    .replace(/\s+/g, '');

const isDataUrl = (value: string) => /^data:[^;]+;base64,/i.test(value);

const getMimeType = (value: string): string => {
  const cleaned = cleanBase64(value);

  const dataUrlMatch = cleaned.match(/^data:([^;]+);base64,/i);
  if (dataUrlMatch?.[1]) return dataUrlMatch[1].toLowerCase();

  if (cleaned.startsWith('JVBERi0') || cleaned.startsWith('JVBER')) return 'application/pdf';
  if (cleaned.startsWith('iVBORw0KGgo') || cleaned.startsWith('iVBOR')) return 'image/png';
  if (cleaned.startsWith('/9j/') || cleaned.startsWith('/9j')) return 'image/jpeg';
  if (cleaned.startsWith('R0lGOD')) return 'image/gif';
  if (cleaned.startsWith('UklGR')) return 'image/webp';
  if (cleaned.startsWith('PHN2Zy')) return 'image/svg+xml';
  if (cleaned.startsWith('UEsDB')) return 'application/zip';

  return 'application/octet-stream';
};

const getExtensionFromMime = (mime: string): string => {
  const mimeMap: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'application/zip': 'zip',
    'application/octet-stream': 'bin',
  };

  return mimeMap[mime.toLowerCase()] || 'bin';
};

const getFileName = (documentValue: string, item: WorkHistoryItem): string => {
  const mime = getMimeType(documentValue);
  const extension = getExtensionFromMime(mime);

  const orderId = String(item.order_id || `document-${item.id}`)
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-');

  return `${orderId}.${extension}`;
};

const base64ToBlob = (value: string, mimeType: string): Blob => {
  let base64 = cleanBase64(value);

  if (isDataUrl(base64)) {
    base64 = base64.split(',')[1] || '';
  }

  const byteCharacters = atob(base64);
  const sliceSize = 1024 * 1024;
  const byteArrays: ArrayBuffer[] = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Uint8Array(slice.length);

    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    const buffer = new ArrayBuffer(byteNumbers.length);
    new Uint8Array(buffer).set(byteNumbers);
    byteArrays.push(buffer);
  }

  return new Blob(byteArrays, { type: mimeType });
};

const downloadDocument = (item: WorkHistoryItem) => {
  try {
    const value = item.document;
    if (!value || !value.trim()) return;

    const cleaned = cleanBase64(value);
    if (!cleaned) return;

    const mimeType = getMimeType(cleaned);
    const fileName = getFileName(cleaned, item);

    const blob = isDataUrl(cleaned) ? base64ToBlob(cleaned.split(',')[1] || '', mimeType) : base64ToBlob(cleaned, mimeType);

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = fileName;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    console.error('Document download error:', error);
    alert('Unable to download this document. The document data may be invalid.');
  }
};

const getDocumentType = (value?: string | null) => {
  if (!value?.trim()) return null;

  const mime = getMimeType(value);

  if (mime === 'application/pdf') return 'PDF';
  if (mime.startsWith('image/')) return mime.replace('image/', '').toUpperCase();
  if (mime === 'application/zip') return 'ZIP';

  return 'FILE';
};

/* -------------------------------------------------------------------------- */
/*                              FORMATTERS                                    */
/* -------------------------------------------------------------------------- */

const formatAmount = (value: number | string) => {
  const amount = Number(value || 0);
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (value: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return formatIndianDateTime(value, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

/* -------------------------------------------------------------------------- */
/*                              STATUS BADGE                                  */
/* -------------------------------------------------------------------------- */

function StatusBadge({ status }: { status?: string }) {
  const value = status?.toLowerCase() ?? '';

  const className =
    value === 'success' || value === 'completed'
      ? 'bg-green-100 text-green-800'
      : value === 'pending' || value === 'panding' || value === 'processing'
        ? 'bg-yellow-100 text-yellow-800'
        : value === 'failed' || value === 'cancelled'
          ? 'bg-red-100 text-red-800'
          : value === 'refund'
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-800';

  return <Badge className={className}>{status || 'Unknown'}</Badge>;
}

/* -------------------------------------------------------------------------- */
/*                              MAIN COMPONENT                                */
/* -------------------------------------------------------------------------- */

export const RetailerHistory = () => {
  const [data, setData] = React.useState<WorkHistoryItem[]>([]);

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

  /* ---------------------------------------------------------------------- */
  /*                     DEBOUNCE THE SEARCH INPUT                          */
  /* ---------------------------------------------------------------------- */

  React.useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  /* ---------------------------------------------------------------------- */
  /*                                  FETCH                                 */
  /* ---------------------------------------------------------------------- */

  const fetchHistory = React.useCallback(
    async (pageNumber: number = 1) => {
      try {
        setError('');

        if (pageNumber === 1 && data.length === 0) {
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

        const response = await apiFetch(`${API_URL}?${params.toString()}`, {
          method: 'GET',
          cache: 'no-store',
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.message || 'Failed to fetch history');
        }

        setData(result?.data || []);

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
        console.error('Retailer History Error:', err);
        setError(err?.message || 'Something went wrong while loading history');
      } finally {
        setInitialLoading(false);
        setFetching(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [debouncedSearch, statusFilter, transferFilter],
  );

  /* ---------- Reset to page 1 whenever filters change ---------- */
  React.useEffect(() => {
    setPage(1);
    fetchHistory(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, statusFilter, transferFilter]);

  /* ---------- Fetch when page changes (Next / Prev) ---------- */
  React.useEffect(() => {
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

  const clearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('all');
    setTransferFilter('all');
  };

  const hasFilters = search !== '' || statusFilter !== 'all' || transferFilter !== 'all';

  /* ---------------------------------------------------------------------- */
  /*                              COLUMNS                                   */
  /* ---------------------------------------------------------------------- */

  const columns = React.useMemo<ColumnDef<WorkHistoryItem>[]>(
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
        cell: (row) => (
          <div className="flex flex-col">
            <span className="font-medium whitespace-nowrap">{row.service_name || '-'}</span>
            {row.service_id && <span className="font-mono text-[10px] text-gray-500">{row.service_id}</span>}
          </div>
        ),
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
        cell: (row) => (
          <Badge variant="outline" className={row.tranfer_type?.toLowerCase() === 'credit' ? 'border-green-300 bg-green-50 text-green-700 capitalize' : 'border-red-300 bg-red-50 text-red-700 capitalize'}>
            {row.tranfer_type || '-'}
          </Badge>
        ),
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
        key: 'document',
        header: 'Document',
        headClassName: 'whitespace-nowrap',
        cell: (row) =>
          row.document ? (
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" onClick={() => downloadDocument(row)} className="gap-2 bg-black text-white hover:bg-gray-800">
                <Download className="h-4 w-4" />
                Download
              </Button>

              <Badge variant="outline" className="border-gray-300 bg-white text-xs whitespace-nowrap text-black">
                <FileText className="mr-1 h-3 w-3" />
                {getDocumentType(row.document)}
              </Badge>
            </div>
          ) : (
            <span className="text-sm text-gray-400">No document</span>
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
    <div className="w-full space-y-5 rounded-4xl bg-white p-4 text-black">
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Retailer History</h2>
          <p className="text-sm text-gray-600">View all your transaction history</p>
        </div>

        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={fetching} className="w-fit gap-2 border-gray-300 bg-white text-black hover:bg-gray-100">
          <RefreshCw className={`h-4 w-4 ${fetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* FILTERS */}
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order, service, mobile, status, remark..." className="border-gray-300 bg-white pl-9 text-black placeholder:text-gray-400 focus:border-gray-400 focus:ring-gray-400" />
        </div>

        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value || 'all')}>
          <SelectTrigger className="w-full border-gray-300 bg-white text-black md:w-[170px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-white text-black">
            <SelectItem value="all">All Status</SelectItem>
            {STATUS_OPTIONS.map((status) => (
              <SelectItem key={status} value={status} className="capitalize">
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={transferFilter} onValueChange={(value) => setTransferFilter(value || 'all')}>
          <SelectTrigger className="w-full border-gray-300 bg-white text-black md:w-[190px]">
            <SelectValue placeholder="Transfer Type" />
          </SelectTrigger>
          <SelectContent className="bg-white text-black">
            <SelectItem value="all">All Transfer Types</SelectItem>
            {TRANSFER_TYPE_OPTIONS.map((type) => (
              <SelectItem key={type} value={type} className="capitalize">
                {type}
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

      {/* RESULT COUNT */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          Showing <strong className="font-semibold text-black">{data.length}</strong> of <strong className="font-semibold text-black">{pagination.total}</strong> transactions
          {fetching && (
            <span className="ml-2 inline-flex items-center gap-1 text-gray-500">
              <Loader2 className="h-3 w-3 animate-spin" /> loading...
            </span>
          )}
        </span>
      </div>

      {/* TABLE — server-side already paginates, so pageSize = PAGE_SIZE */}
      <DataTable<WorkHistoryItem>
        data={data}
        columns={columns}
        getRowKey={(row) => row.id}
        pageSize={PAGE_SIZE}
        initialSortKey="date_time"
        initialSortDirection="desc"
        emptyState={
          <div className="flex flex-col items-center gap-2">
            <p className="font-medium">No work history found</p>
            <p className="text-sm text-gray-500">Try changing your search or filters.</p>
          </div>
        }
      />

      {/* SERVER-SIDE NEXT / PREVIOUS */}
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
