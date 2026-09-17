'use client';

import { useEffect, useState, useCallback } from 'react';
import { FileText, Loader2, Search, Trash2, Upload, RefreshCw, Image as ImageIcon, PhoneCall, ChevronLeft, ChevronRight } from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table';

import type { TwoWheelerRequest, TwoWheelerStatus } from '@/lib/auth';
import { apiFetch } from '@/lib/api-client';
import { useAlerts } from '@/hooks/use-alert';
import { formatIndianDateTime } from '@/lib/date-utils';
import { STATUS_COLORS, STATUS_OPTIONS } from '@/lib/constate';
import { ImagePreview } from '@/components/ui/table-loading';
import { Pagination } from '@/lib/type';

const PAGE_SIZE = 10;

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

export default function AdminTwoWheelerPage() {
  const [requests, setRequests] = useState<TwoWheelerRequest[]>([]);
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
          data: TwoWheelerRequest[];
          pagination: Pagination;
        }>(`/api/admin/4wheeler?${params.toString()}`);

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

  async function changeStatus(row: TwoWheelerRequest, status: string) {
    if (row.status === status) return;

    const oldStatus = row.status;
    setUpdatingStatusId(row.id);

    // Optimistic UI update
    setRequests((prev) => prev.map((item) => (item.id === row.id ? { ...item, status: status as TwoWheelerStatus } : item)));

    try {
      await api(`/api/admin/4wheeler/${row.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      await refreshAlerts();
    } catch (err) {
      // Rollback on failure
      setRequests((prev) => prev.map((item) => (item.id === row.id ? { ...item, status: oldStatus } : item)));
      alert((err as Error).message);
    } finally {
      setUpdatingStatusId(null);
    }
  }

  async function uploadPdf(row: TwoWheelerRequest, file: File | null) {
    if (!file) return;
    setUploadingId(row.id);

    try {
      const base64 = await fileToBase64(file);
      await api(`/api/admin/4wheeler/${row.id}`, {
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
      await api(`/api/admin/4wheeler/${id}`, { method: 'DELETE' });

      // Remove from UI
      setRequests((prev) => prev.filter((item) => item.id !== id));

      // Update pagination count locally (so footer is accurate)
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

      // If we emptied the page and are not on page 1, go back a page
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
            <h1 className="text-xl font-bold tracking-tight text-black">4 Wheeler Requests</h1>
            <p className="mt-1 text-sm text-gray-500">Manage all 4-wheeler PUC requests submitted by retailers.</p>
          </div>
        </div>

        <Button size="sm" onClick={handleRefresh} disabled={fetching} className="gap-2 bg-orange-600 text-white hover:bg-orange-700">
          <RefreshCw className={`h-4 w-4 ${fetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        {/* Search */}
        <div className="relative w-full lg:w-80">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-black" />
          <Input className="h-10 rounded-xl border-gray-300 bg-white pl-9 text-black placeholder:text-gray-400 focus-visible:border-orange-600 focus-visible:ring-orange-600/20" placeholder="Search vehicle / mobile..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-1 rounded-xl border border-gray-200 bg-white p-1">
          <button type="button" className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${!filter ? 'bg-orange-600 text-white shadow-sm' : 'text-black hover:bg-orange-50'}`} onClick={() => setFilter('')}>
            All
          </button>

          <button type="button" className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${filter === 'panding' ? 'bg-orange-600 text-white shadow-sm' : 'text-black hover:bg-orange-50'}`} onClick={() => setFilter('panding')}>
            Processing
          </button>

          <button type="button" className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${filter === 'success' ? 'bg-orange-600 text-white shadow-sm' : 'text-black hover:bg-orange-50'}`} onClick={() => setFilter('success')}>
            Approved
          </button>

          <button type="button" className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${filter === 'refund' ? 'bg-orange-600 text-white shadow-sm' : 'text-black hover:bg-orange-50'}`} onClick={() => setFilter('refund')}>
            Refunded
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* Table Info */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="text-sm text-black">
            Showing <span className="font-bold text-orange-600">{requests.length}</span> of <span className="font-bold text-orange-600">{pagination.total}</span> requests
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
                <TableHead className="font-bold whitespace-nowrap text-black">Retailer Mob</TableHead>
                <TableHead className="font-bold whitespace-nowrap text-black">Vehicle No</TableHead>
                <TableHead className="font-bold whitespace-nowrap text-black">Mobile</TableHead>
                <TableHead className="font-bold whitespace-nowrap text-black">Status</TableHead>
                <TableHead className="font-bold whitespace-nowrap text-black">Photos</TableHead>
                <TableHead className="font-bold whitespace-nowrap text-black">Admin PDF</TableHead>
                <TableHead className="font-bold whitespace-nowrap text-black">Applied</TableHead>
                <TableHead className="text-right font-bold text-black">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {/* Full Loading */}
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                        <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
                      </div>
                      <div>
                        <p className="font-bold text-black">Loading requests...</p>
                        <p className="mt-1 text-xs text-gray-500">Please wait while we fetch the latest data.</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                /* Empty State */
                <TableRow>
                  <TableCell colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                        <Search className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-bold text-black">No requests found</p>
                        <p className="mt-1 text-xs text-gray-500">Try changing your search or filter.</p>
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
                    <TableRow key={row.id} className={`border-gray-200 text-black transition-colors hover:bg-orange-50/40 ${isUpdating || isUploading || isDeleting ? 'opacity-60' : ''}`}>
                      <TableCell>
                        <span className="my-auto inline-flex rounded-lg border border-orange-200 bg-white px-2.5 py-1 font-mono text-xs font-bold text-blue-600">
                          <PhoneCall className="mr-2 p-1" />
                          {row.user_mob}
                        </span>
                      </TableCell>

                      {/* Vehicle Number */}
                      <TableCell>
                        <span className="inline-flex rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1 font-mono text-xs font-bold text-orange-600">{row.vehicle_no}</span>
                      </TableCell>

                      {/* Mobile */}
                      <TableCell className="font-medium whitespace-nowrap text-black">{row.service_mob ? String(row.service_mob) : '-'}</TableCell>

                      {/* Status */}
                      <TableCell>
                        <div className="relative inline-flex items-center">
                          {isUpdating && <Loader2 className="pointer-events-none absolute left-2 z-10 h-3.5 w-3.5 animate-spin text-orange-600" />}
                          <select
                            className={`min-w-[125px] cursor-pointer appearance-none rounded-lg border px-3 py-2 text-xs font-bold transition outline-none disabled:cursor-not-allowed ${isUpdating ? 'pl-7' : ''} ${STATUS_COLORS[row.status] ?? 'border-gray-300 bg-white text-black'}`}
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

                      {/* Photos */}
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <ImagePreview src={row.frontside} label="Front" />
                          <ImagePreview src={row.backside} label="Back" />
                        </div>
                      </TableCell>

                      {/* Admin PDF */}
                      <TableCell>
                        {row.admin_upload_doc ? (
                          <a
                            href={`/api/4wheeler/${row.id}/download`}
                            target="_blank"
                            rel="noreferrer"
                            className={`${buttonVariants({
                              variant: 'outline',
                              size: 'sm',
                            })} h-9 gap-2 rounded-lg border-orange-200 bg-white text-black hover:bg-orange-50 hover:text-orange-600`}
                          >
                            <FileText className="h-4 w-4 text-orange-600" />
                            View PDF
                          </a>
                        ) : (
                          <label className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-orange-200 bg-white px-3 text-xs font-semibold text-black transition hover:bg-orange-50 hover:text-orange-600 ${isUploading ? 'cursor-not-allowed opacity-60' : ''}`}>
                            <input
                              type="file"
                              accept="application/pdf"
                              className="hidden"
                              disabled={isUploading}
                              onChange={(e) => {
                                const file = e.target.files?.[0] ?? null;
                                if (file) uploadPdf(row, file);
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
                                Upload PDF
                              </>
                            )}
                          </label>
                        )}
                      </TableCell>

                      {/* Applied Date */}
                      <TableCell className="text-xs whitespace-nowrap text-gray-500">{row.apply_date_time ? formatIndianDateTime(row.apply_date_time) : '-'}</TableCell>

                      {/* Delete */}
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" className="h-9 w-9 rounded-lg border-orange-200 bg-white p-0 text-orange-600 hover:bg-orange-600 hover:text-white" title="Delete request" disabled={isDeleting} onClick={() => deleteRequest(row.id)}>
                          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Server-side Next / Previous */}
        {pagination.total > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-200 bg-white px-5 py-3 sm:flex-row">
            <p className="text-sm text-gray-600">
              Page <strong className="text-black">{pagination.page}</strong> of <strong className="text-black">{pagination.totalPages}</strong>
              {' · '}
              Total <strong className="text-black">{pagination.total}</strong> records
            </p>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrev} disabled={!pagination.hasPrevPage || fetching} className="gap-1 border-orange-200 bg-white text-black hover:bg-orange-50 hover:text-orange-600 disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <Button variant="outline" size="sm" onClick={handleNext} disabled={!pagination.hasNextPage || fetching} className="gap-1 border-orange-200 bg-white text-black hover:bg-orange-50 hover:text-orange-600 disabled:opacity-40">
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

/* -------------------------------------------------------------------------- */
/*                             IMAGE PREVIEW                                  */
/* -------------------------------------------------------------------------- */
