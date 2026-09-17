'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  FileText,
  Loader2,
  Search,
  Trash2,
  Upload,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from '@/components/ui/table';

import type { LlExamRequest, LlExamStatus } from '@/lib/auth';
import { apiFetch } from '@/lib/api-client';
import { useAlerts } from '@/hooks/use-alert';
import { formatIndianDateTime } from '@/lib/date-utils';

const PAGE_SIZE = 10;

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'panding', label: 'Processing' },
  { value: 'success', label: 'Approved' },
  { value: 'refund', label: 'Refunded' },
];

const STATUS_COLORS: Record<string, string> = {
  panding: 'border-slate-300 bg-slate-100 text-slate-700',
  success: 'border-green-300 bg-green-100 text-green-700',
  refund: 'border-red-300 bg-red-100 text-red-700',
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    cache: 'no-store',
    ...options,
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error((json as { message?: string }).message || 'Request failed');
  }

  return json as T;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AdminLlExamRequestPage() {
  const [requests, setRequests] = useState<LlExamRequest[]>([]);
  const { refreshAlerts } = useAlerts();

  const [loading, setLoading] = useState<boolean>(true);
  const [fetching, setFetching] = useState<boolean>(false);

  const [filter, setFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  const [page, setPage] = useState<number>(1);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  /* ---------------------------------------------------------------------- */
  /*                     DEBOUNCE SEARCH INPUT                              */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  /* ---------------------------------------------------------------------- */
  /*                                  LOAD                                  */
  /* ---------------------------------------------------------------------- */

  const load = useCallback(
    async (pageNumber: number = 1, showLoading = true) => {
      if (showLoading && requests.length === 0) {
        setLoading(true);
      } else {
        setFetching(true);
      }

      try {
        const params = new URLSearchParams({
          page: String(pageNumber),
          limit: String(PAGE_SIZE),
        });

        if (filter) params.set('status', filter);
        if (debouncedSearch) params.set('search', debouncedSearch);

        const result = await api<{
          data: LlExamRequest[];
          pagination: Pagination;
        }>(`/api/admin/ll-exam-request?${params.toString()}`);

        setRequests(result?.data || []);
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
      } catch (error) {
        console.error(error);
        setRequests([]);
      } finally {
        setLoading(false);
        setFetching(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filter, debouncedSearch],
  );

  /* Reset to page 1 + fetch whenever filters change */
  useEffect(() => {
    setPage(1);
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, debouncedSearch]);

  /* Fetch when page changes (Next / Prev) */
  useEffect(() => {
    load(page);
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
    load(page);
  };

  /* ---------------------------------------------------------------------- */
  /*                             ACTIONS                                    */
  /* ---------------------------------------------------------------------- */

  async function changeStatus(row: LlExamRequest, status: string) {
    if (row.status === status) return;

    const oldStatus = row.status;
    setUpdatingStatusId(row.id);

    // Optimistic update
    setRequests((prev) =>
      prev.map((item) =>
        item.id === row.id
          ? { ...item, status: status as LlExamStatus }
          : item,
      ),
    );

    try {
      await api(`/api/admin/ll-exam-request/${row.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      await refreshAlerts();
    } catch (err) {
      // Rollback
      setRequests((prev) =>
        prev.map((item) =>
          item.id === row.id ? { ...item, status: oldStatus } : item,
        ),
      );
      alert((err as Error).message);
    } finally {
      setUpdatingStatusId(null);
    }
  }

  async function uploadDoc(row: LlExamRequest, file: File | null) {
    if (!file) return;

    setUploadingId(row.id);

    try {
      const base64 = await fileToBase64(file);

      await api(`/api/admin/ll-exam-request/${row.id}`, {
        method: 'PUT',
        body: JSON.stringify({ admin_upload_doc: base64 }),
      });

      await load(page, false);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setUploadingId(null);
    }
  }

  async function deleteRequest(id: number) {
    const confirmed = confirm('Are you sure you want to delete this request?');
    if (!confirmed) return;

    setDeletingId(id);

    try {
      await api(`/api/admin/ll-exam-request/${id}`, { method: 'DELETE' });

      // Remove row from UI
      setRequests((prev) => prev.filter((item) => item.id !== id));

      // Update local pagination count
      setPagination((prev) => {
        const newTotal = Math.max(0, prev.total - 1);
        const newTotalPages = Math.max(1, Math.ceil(newTotal / prev.limit));
        return {
          ...prev,
          total: newTotal,
          totalPages: newTotalPages,
          hasNextPage: prev.page < newTotalPages,
          hasPrevPage: prev.page > 1,
        };
      });

      // If last item on page was deleted and not on page 1, go back
      if (requests.length === 1 && page > 1) {
        setPage((p) => p - 1);
      }
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setDeletingId(null);
    }
  }

  /* ---------------------------------------------------------------------- */
  /*                                  UI                                    */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="min-h-screen space-y-5 bg-white p-1 text-black">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
            <FileText className="h-5 w-5" />
          </div>

          <div>
            <h1 className="text-xl font-bold tracking-tight text-black">
              LL Exam Requests
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage all learning licence exam requests.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={handleRefresh}
          disabled={fetching}
          className="gap-2 bg-orange-600 text-white hover:bg-orange-700"
        >
          <RefreshCw className={`h-4 w-4 ${fetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:w-80">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-black" />
          <Input
            className="h-10 rounded-xl border-gray-300 bg-white pl-9 text-black placeholder:text-gray-400 focus-visible:border-orange-600 focus-visible:ring-orange-600/20"
            placeholder="Search application / mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-1 rounded-xl border border-gray-200 bg-white p-1">
          <button
            type="button"
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              !filter
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-black hover:bg-orange-50'
            }`}
            onClick={() => setFilter('')}
          >
            All
          </button>

          <button
            type="button"
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              filter === 'panding'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-black hover:bg-slate-50'
            }`}
            onClick={() => setFilter('panding')}
          >
            Processing
          </button>

          <button
            type="button"
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              filter === 'success'
                ? 'bg-green-700 text-white shadow-sm'
                : 'text-black hover:bg-green-50'
            }`}
            onClick={() => setFilter('success')}
          >
            Approved
          </button>

          <button
            type="button"
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              filter === 'refund'
                ? 'bg-red-700 text-white shadow-sm'
                : 'text-black hover:bg-red-50'
            }`}
            onClick={() => setFilter('refund')}
          >
            Refunded
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="text-sm text-black">
            Showing{' '}
            <span className="font-bold text-orange-600">{requests.length}</span> of{' '}
            <span className="font-bold text-orange-600">{pagination.total}</span>{' '}
            requests
            {fetching && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-orange-600">
                <Loader2 className="h-3 w-3 animate-spin" /> loading...
              </span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-200 bg-orange-50 hover:bg-orange-50">
                <TableHead className="font-bold whitespace-nowrap text-black">
                  Application No
                </TableHead>
                <TableHead className="font-bold whitespace-nowrap text-black">
                  User Mobile
                </TableHead>
                <TableHead className="font-bold whitespace-nowrap text-black">
                  State
                </TableHead>
                <TableHead className="font-bold whitespace-nowrap text-black">
                  DOB
                </TableHead>
                <TableHead className="font-bold whitespace-nowrap text-black">
                  Shift
                </TableHead>
                <TableHead className="font-bold whitespace-nowrap text-black">
                  Charge
                </TableHead>
                <TableHead className="font-bold whitespace-nowrap text-black">
                  Password
                </TableHead>
                <TableHead className="font-bold whitespace-nowrap text-black">
                  Status
                </TableHead>
                <TableHead className="font-bold whitespace-nowrap text-black">
                  Admin Document
                </TableHead>
                <TableHead className="font-bold whitespace-nowrap text-black">
                  Applied
                </TableHead>
                <TableHead className="text-right font-bold text-black">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                        <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
                      </div>
                      <div>
                        <p className="font-bold text-black">Loading requests...</p>
                        <p className="mt-1 text-xs text-gray-500">
                          Please wait while we fetch the latest data.
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                        <Search className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-bold text-black">No requests found</p>
                        <p className="mt-1 text-xs text-gray-500">
                          Try changing your search or filter.
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((row) => {
                  const isUpdating = updatingStatusId === row.id;
                  const isUploading = uploadingId === row.id;
                  const isDeleting = deletingId === row.id;

                  return (
                    <TableRow
                      key={row.id}
                      className={`border-gray-200 text-black transition-colors hover:bg-orange-50/40 ${
                        isUpdating || isUploading || isDeleting ? 'opacity-60' : ''
                      }`}
                    >
                      <TableCell>
                        <span className="inline-flex rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1 font-mono text-xs font-bold text-orange-600">
                          {row.application_no}
                        </span>
                      </TableCell>

                      <TableCell className="font-medium whitespace-nowrap text-black">
                        {row.user_mob ? String(row.user_mob) : '-'}
                      </TableCell>

                      <TableCell className="whitespace-nowrap text-black">
                        {row.state || '-'}
                      </TableCell>

                      <TableCell className="whitespace-nowrap text-black">
                        {row.dob || '-'}
                      </TableCell>

                      <TableCell className="text-black capitalize">
                        {row.shift || '-'}
                      </TableCell>

                      <TableCell className="font-bold text-black">
                        ₹{row.charge}
                      </TableCell>

                      <TableCell className="px-2 font-bold text-black">
                        {row.password}
                      </TableCell>

                      <TableCell>
                        <div className="relative inline-flex items-center">
                          {isUpdating && (
                            <Loader2 className="pointer-events-none absolute left-2 z-10 h-3.5 w-3.5 animate-spin text-orange-600" />
                          )}
                          <select
                            className={`min-w-[125px] cursor-pointer appearance-none rounded-lg border px-3 py-2 text-xs font-bold transition outline-none disabled:cursor-not-allowed ${
                              isUpdating ? 'pl-7' : ''
                            } ${
                              STATUS_COLORS[row.status] ??
                              'border-gray-300 bg-white text-black'
                            }`}
                            value={row.status}
                            disabled={isUpdating}
                            onChange={(e) => changeStatus(row, e.target.value)}
                          >
                            {STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </TableCell>

                      <TableCell>
                        {row.admin_upload_doc ? (
                          <a
                            href={`/api/admin/ll-exam-request/${row.id}/download`}
                            target="_blank"
                            rel="noreferrer"
                            className={`${buttonVariants({
                              variant: 'outline',
                              size: 'sm',
                            })} h-9 gap-2 rounded-lg border-orange-200 bg-white text-black hover:bg-orange-50 hover:text-orange-600`}
                          >
                            <FileText className="h-4 w-4 text-orange-600" />
                            View
                          </a>
                        ) : (
                          <label
                            className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-orange-200 bg-white px-3 text-xs font-semibold text-black transition hover:bg-orange-50 hover:text-orange-600 ${
                              isUploading ? 'cursor-not-allowed opacity-60' : ''
                            }`}
                          >
                            <input
                              type="file"
                              accept="application/pdf,image/*"
                              className="hidden"
                              disabled={isUploading}
                              onChange={(e) => {
                                const file = e.target.files?.[0] ?? null;
                                if (file) uploadDoc(row, file);
                                e.target.value = '';
                              }}
                            />
                            {isUploading ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4 text-orange-600" />
                                Upload
                              </>
                            )}
                          </label>
                        )}
                      </TableCell>

                      <TableCell className="text-xs whitespace-nowrap text-gray-500">
                        {row.apply_date_time
                          ? formatIndianDateTime(row.apply_date_time)
                          : '-'}
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 w-9 rounded-lg border-orange-200 bg-white p-0 text-orange-600 hover:bg-orange-600 hover:text-white"
                          title="Delete request"
                          disabled={isDeleting}
                          onClick={() => deleteRequest(row.id)}
                        >
                          {isDeleting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        {pagination.total > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-200 bg-white px-5 py-3 sm:flex-row">
            <p className="text-sm text-gray-600">
              Page <strong className="text-black">{pagination.page}</strong> of{' '}
              <strong className="text-black">{pagination.totalPages}</strong>
              {' · '}
              Total <strong className="text-black">{pagination.total}</strong> records
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                disabled={!pagination.hasPrevPage || fetching}
                className="gap-1 border-orange-200 bg-white text-black hover:bg-orange-50 hover:text-orange-600 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                disabled={!pagination.hasNextPage || fetching}
                className="gap-1 border-orange-200 bg-white text-black hover:bg-orange-50 hover:text-orange-600 disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}