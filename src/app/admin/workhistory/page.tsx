"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { formatIndianDateTime } from "@/lib/date-utils";

/* -------------------------------------------------------------------------- */
/*                                  TYPES                                     */
/* -------------------------------------------------------------------------- */

interface HistoryItem {
  id: number;
  order_id: string;
  user_mob: string;
  service_id?: string;
  service_name: string;
  status: string;
  old_balance: number;
  charge: number;
  new_balance: number;
  tranfer_type: string;
  document?: string;
  date_time: string;
  remark: string;
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

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "panding", label: "Processing" },
  { value: "success", label: "Approved" },
  { value: "refund", label: "Refunded" },
];

const STATUS_COLORS: Record<string, string> = {
  panding: "bg-amber-100 text-amber-800",
  success: "bg-green-100 text-green-800",
  refund: "bg-red-100 text-red-800",
};

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, {
    headers: { "Content-Type": "application/json", ...options.headers },
    cache: "no-store",
    ...options,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error((json as { message?: string }).message || "Request failed");
  }
  return json as T;
}

/* -------------------------------------------------------------------------- */
/*                              MAIN COMPONENT                                */
/* -------------------------------------------------------------------------- */

export default function AdminWorkHistoryPage() {
  const [data, setData] = useState<HistoryItem[]>([]);

  const [initialLoading, setInitialLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

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
    async (pageNumber: number = 1) => {
      try {
        setError(null);

        if (pageNumber === 1 && data.length === 0) {
          setInitialLoading(true);
        } else {
          setFetching(true);
        }

        const params = new URLSearchParams({
          page: String(pageNumber),
          limit: String(PAGE_SIZE),
        });

        if (debouncedSearch) params.set("search", debouncedSearch);
        if (status) params.set("status", status);

        const result = await api<{
          data: HistoryItem[];
          pagination: Pagination;
        }>(`/api/admin/workhistory?${params.toString()}`);

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
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to load");
        setData([]);
      } finally {
        setInitialLoading(false);
        setFetching(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [debouncedSearch, status],
  );

  /* ---------- Reset to page 1 whenever filters change ---------- */
  useEffect(() => {
    setPage(1);
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, status]);

  /* ---------- Fetch when page changes (Next / Prev) ---------- */
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
  /*                                  UI                                    */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Work History
          </h1>
          <p className="text-slate-500 dark:text-gray-400">
            All retailer work history records.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={fetching}
          className="w-fit gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${fetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card className="rounded-2xl border-slate-200 bg-white dark:border-[#ff3800]/20 dark:bg-black/60">
        <CardContent className="pt-6">
          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute top-2.5 left-2 h-4 w-4 text-slate-400" />
              <Input
                className="pl-8"
                placeholder="Search service, order, remark..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Results info */}
          <div className="mt-3 flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
            <span>
              Showing{" "}
              <strong className="text-slate-900 dark:text-white">
                {data.length}
              </strong>{" "}
              of{" "}
              <strong className="text-slate-900 dark:text-white">
                {pagination.total}
              </strong>{" "}
              records
              {fetching && (
                <span className="ml-2 inline-flex items-center gap-1 text-slate-500">
                  <Loader2 className="h-3 w-3 animate-spin" /> loading...
                </span>
              )}
            </span>
          </div>

          {/* Table */}
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-white/5">
                  <TableHead className="text-slate-700 dark:text-gray-300">
                    Order ID
                  </TableHead>
                  <TableHead className="text-slate-700 dark:text-gray-300">
                    Service
                  </TableHead>
                  <TableHead className="text-slate-700 dark:text-gray-300">
                    Service ID
                  </TableHead>
                  <TableHead className="text-slate-700 dark:text-gray-300">
                    User Mobile
                  </TableHead>
                  <TableHead className="text-slate-700 dark:text-gray-300">
                    Charge
                  </TableHead>
                  <TableHead className="text-slate-700 dark:text-gray-300">
                    Old Balance
                  </TableHead>
                  <TableHead className="text-slate-700 dark:text-gray-300">
                    New Balance
                  </TableHead>
                  <TableHead className="text-slate-700 dark:text-gray-300">
                    Type
                  </TableHead>
                  <TableHead className="text-slate-700 dark:text-gray-300">
                    Status
                  </TableHead>
                  <TableHead className="text-slate-700 dark:text-gray-300">
                    Date
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {initialLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="py-12 text-center text-slate-500"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="py-12 text-center text-red-500"
                    >
                      {error}
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="py-12 text-center text-slate-500"
                    >
                      No records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row) => (
                    <TableRow
                      key={row.id}
                      className="hover:bg-slate-50 dark:hover:bg-white/5"
                    >
                      <TableCell className="font-mono text-xs text-slate-900 dark:text-white">
                        {row.order_id}
                      </TableCell>
                      <TableCell className="text-slate-700 dark:text-gray-300">
                        {row.service_name}
                      </TableCell>
                      <TableCell className="text-slate-700 dark:text-gray-300">
                        {row.service_id ?? "-"}
                      </TableCell>
                      <TableCell className="text-slate-700 dark:text-gray-300">
                        {row.user_mob}
                      </TableCell>
                      <TableCell className="text-slate-700 dark:text-gray-300">
                        ₹{row.charge}
                      </TableCell>
                      <TableCell className="text-slate-700 dark:text-gray-300">
                        ₹{row.old_balance}
                      </TableCell>
                      <TableCell className="text-slate-700 dark:text-gray-300">
                        ₹{row.new_balance}
                      </TableCell>
                      <TableCell className="text-slate-700 capitalize dark:text-gray-300">
                        {row.tranfer_type}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            STATUS_COLORS[row.status] ||
                            "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {row.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-700 dark:text-gray-300">
                        {row.date_time
                          ? formatIndianDateTime(row.date_time)
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Footer */}
          {pagination.total > 0 && (
            <div className="mt-4 flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row dark:border-slate-700 dark:bg-slate-900/40">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Page{" "}
                <strong className="text-slate-900 dark:text-white">
                  {pagination.page}
                </strong>{" "}
                of{" "}
                <strong className="text-slate-900 dark:text-white">
                  {pagination.totalPages}
                </strong>
                {" · "}
                Total{" "}
                <strong className="text-slate-900 dark:text-white">
                  {pagination.total}
                </strong>{" "}
                records
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrev}
                  disabled={!pagination.hasPrevPage || fetching}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNext}
                  disabled={!pagination.hasNextPage || fetching}
                  className="gap-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}