'use client';

import * as React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight, LoaderCircle } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTransition, useCallback } from 'react';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DataTableProps, SortDirection } from '@/lib/type';

/* -------------------------------------------------------------------------- */
/*                                SORT ICON                                   */
/* -------------------------------------------------------------------------- */

function SortIcon({ column, activeKey, direction }: { column: string; activeKey?: string; direction: SortDirection }) {
  if (activeKey !== column) {
    return <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-40" />;
  }

  return direction === 'asc' ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />;
}

/* -------------------------------------------------------------------------- */
/*                                DATA TABLE                                  */
/* -------------------------------------------------------------------------- */

export function DataTable<T>({ data, columns, getRowKey, pageSize = 10, initialSortKey, initialSortDirection = 'desc', emptyState, className }: DataTableProps<T>) {
  const [sortKey, setSortKey] = React.useState<string | undefined>(initialSortKey);
  const [sortDirection, setSortDirection] = React.useState<SortDirection>(initialSortDirection);
  const [page, setPage] = React.useState(1);

  /* Reset to first page whenever the data set changes (e.g. filters/search) */
  const prevDataRef = React.useRef(data);
  React.useEffect(() => {
    if (prevDataRef.current !== data) {
      prevDataRef.current = data;
      setPage(1);
    }
  }, [data]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  /* ------------------------------------------------------------------ */
  /*                              SORTING                               */
  /* ------------------------------------------------------------------ */

  const sortedData = React.useMemo(() => {
    if (!sortKey) return data;

    const column = columns.find((c) => c.key === sortKey);

    if (!column?.sortValue) return data;

    const getValue = column.sortValue;

    return [...data].sort((a, b) => {
      const rawA = getValue(a);
      const rawB = getValue(b);

      const valueA = rawA ?? '';
      const valueB = rawB ?? '';

      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
      }

      const strA = String(valueA).toLowerCase();
      const strB = String(valueB).toLowerCase();

      if (strA < strB) return sortDirection === 'asc' ? -1 : 1;
      if (strA > strB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, columns, sortKey, sortDirection]);

  /* ------------------------------------------------------------------ */
  /*                             PAGINATION                             */
  /* ------------------------------------------------------------------ */

  const totalItems = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedData = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  /* ------------------------------------------------------------------ */
  /*                                UI                                  */
  /* ------------------------------------------------------------------ */

  return (
    <div className={cn('w-full space-y-4', className)}>
      <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col.key} className={cn('text-black', col.headClassName)}>
                    {col.sortable ? (
                      <button type="button" onClick={() => handleSort(col.key)} className="flex items-center font-medium whitespace-nowrap hover:text-black">
                        {col.header}
                        <SortIcon column={col.key} activeKey={sortKey} direction={sortDirection} />
                      </button>
                    ) : (
                      <span className="font-medium whitespace-nowrap">{col.header}</span>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center text-black">
                    {emptyState ?? (
                      <div className="flex flex-col items-center gap-2">
                        <p className="font-medium">No records found</p>
                        <p className="text-sm text-gray-500">Try changing your search or filters.</p>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row, index) => (
                  <TableRow key={getRowKey(row, index)} className="border-b border-gray-100 transition-colors hover:bg-gray-50">
                    {columns.map((col) => (
                      <TableCell key={col.key} className={cn('text-black', col.cellClassName)}>
                        {col.cell ? col.cell(row) : null}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                         SERVER-SIDE DATA TABLE                              */
/* -------------------------------------------------------------------------- */

export type { ColumnDef, SortDirection } from '@/lib/type';

export interface ServerColumnDef<T> {
  key: string;
  header: string | React.ReactNode;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface ServerToolbarProps {
  searchPlaceholder?: string;
  searchDebounce?: number;
  onSearch?: (value: string) => void;
  filters?: Array<{ key: string; label: string; options: Array<{ value: string; label: string }> }>;
  activeFilters?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  children?: React.ReactNode;
}

export interface DataTableServerProps<T> {
  data: T[];
  columns: ServerColumnDef<T>[];
  getRowKey: (row: T, index: number) => React.Key;
  total: number;
  pageSize?: number;
  initialPage?: number;
  searchPlaceholder?: string;
  searchDebounce?: number;
  onPageChange?: (page: number) => void;
  onSearch?: (value: string) => void;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  toolbar?: (props: ServerToolbarProps) => React.ReactNode;
  toolbarActions?: React.ReactNode;
  loading?: boolean;
  error?: React.ReactNode;
  emptyState?: React.ReactNode;
  className?: string;
}

function DataTableServer<T,>({
  data,
  columns,
  getRowKey,
  total,
  pageSize = 10,
  initialPage = 1,
  searchPlaceholder = 'Search...',
  searchDebounce = 400,
  onPageChange,
  onSearch,
  onSort,
  toolbar,
  toolbarActions,
  loading = false,
  error,
  emptyState,
  className,
}: DataTableServerProps<T>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentPage = Number(searchParams.get('page') ?? initialPage);
  const sortBy = searchParams.get('sort') ?? '';
  const sortDir = (searchParams.get('dir') ?? 'desc') as 'asc' | 'desc';

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const updateURL = useCallback(
    (updates: Record<string, string | undefined>) => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        for (const [key, value] of Object.entries(updates)) {
          if (value === undefined || value === '') {
            params.delete(key);
          } else {
            params.set(key, value);
          }
        }
        if (!params.has('page')) {
          params.set('page', String(initialPage));
        }
        router.push(`?${params.toString()}`, { scroll: false });
      });
    },
    [router, searchParams, initialPage],
  );

  const handlePageChange = (newPage: number) => {
    if (newPage < 1) newPage = 1;
    if (newPage > totalPages) newPage = totalPages;
    updateURL({ page: String(newPage) });
    onPageChange?.(newPage);
  };

  const handleSort = (key: string) => {
    const newDir = sortBy === key && sortDir === 'asc' ? 'desc' : 'asc';
    updateURL({ sort: key, dir: newDir, page: undefined });
    onSort?.(key, newDir);
  };

   const handleSearch = (value: string) => {
     updateURL({ search: value, page: undefined });
     onSearch?.(value);
   };

  const sortedColumns = [...columns];

  return (
    <div className={cn('space-y-4', className)}>
      {toolbar && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {toolbar({ searchPlaceholder, searchDebounce, onSearch: handleSearch, onFilterChange: (k, v) => updateURL({ [k]: v, page: undefined }) })}
          {toolbarActions}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                {sortedColumns.map((col) => (
                  <TableHead key={col.key} className={cn('text-black', col.className)}>
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(col.key)}
                        className="flex items-center gap-1 font-medium hover:text-black"
                      >
                        {col.header}
                        {sortBy === col.key && (
                          <ChevronDown
                            className={cn('h-3 w-3 transition-transform', sortDir === 'asc' && 'rotate-180')}
                          />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading || isPending ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-500">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Loading...
                    </div>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center">
                    {typeof error === 'string' ? <p className="text-red-500">{error}</p> : error}
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center text-gray-500">
                    {emptyState ?? (
                      <p className="font-medium">No records found</p>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row, index) => (
                  <TableRow key={getRowKey(row, index)} className="border-b border-gray-100 hover:bg-gray-50">
                    {sortedColumns.map((col) => (
                      <TableCell key={col.key} className="text-black">
                         {col.cell ? col.cell(row) : String(row[col.key as keyof T] ?? '')}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Showing {Math.min((currentPage - 1) * pageSize + 1, total)}-{Math.min(currentPage * pageSize, total)} of {total}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1 || loading || isPending}
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => Math.abs(p - currentPage) <= 2 || p === 1 || p === totalPages)
            .map((p, i, arr) => {
              const showEllipsis = i > 0 && arr[i - 1] !== p - 1;
              return (
                <React.Fragment key={p}>
                  {showEllipsis && (
                    <span className="px-1 text-gray-400">...</span>
                  )}
                  <Button
                    variant={p === currentPage ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePageChange(p)}
                    disabled={loading || isPending}
                  >
                    {p}
                  </Button>
                </React.Fragment>
              );
            })}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || loading || isPending}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export { DataTableServer };
