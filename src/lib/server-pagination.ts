import { pool } from '@/lib/server';
import type { RowDataPacket } from 'mysql2';

export interface QueryFilter {
  column: string;
  value: string | number | boolean | null | undefined;
  operator?: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN';
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  search?: string;
  searchColumns?: string[];
  filters?: QueryFilter[];
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  allowedSortColumns?: string[];
  defaultSortKey?: string;
  defaultSortDirection?: 'asc' | 'desc';
  /** Extra raw WHERE (without the word WHERE) e.g. "(status = 'active')" */
  baseWhere?: string;
  baseParams?: any[];
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export async function paginateQuery<T = RowDataPacket>(
  table: string,
  selectColumns: string,
  params: PaginationParams,
): Promise<PaginatedResult<T>> {
  const {
    page = 1,
    pageSize = 10,
    search,
    searchColumns = [],
    filters = [],
    sortKey,
    sortDirection = 'desc',
    allowedSortColumns = [],
    defaultSortKey = 'id',
    defaultSortDirection = 'desc',
    baseWhere,
    baseParams = [],
  } = params;

  const whereClauses: string[] = [];
  const whereParams: any[] = [];

  if (baseWhere) {
    whereClauses.push(`(${baseWhere})`);
    whereParams.push(...baseParams);
  }

  /* ------------------------------ SEARCH ------------------------------ */
  if (search && search.trim() && searchColumns.length) {
    const term = `%${search.trim()}%`;
    const orClauses = searchColumns.map((col) => `CAST(${col} AS CHAR) LIKE ?`);
    whereClauses.push(`(${orClauses.join(' OR ')})`);
    searchColumns.forEach(() => whereParams.push(term));
  }

  /* ------------------------------ FILTERS ----------------------------- */
  for (const f of filters) {
    if (f.value === undefined || f.value === null || f.value === '') continue;

    const op = f.operator || '=';

    if (op === 'IN' && Array.isArray(f.value)) {
      if (!f.value.length) continue;
      const placeholders = f.value.map(() => '?').join(', ');
      whereClauses.push(`${f.column} IN (${placeholders})`);
      whereParams.push(...f.value);
    } else {
      whereClauses.push(`${f.column} ${op} ?`);
      whereParams.push(f.value);
    }
  }

  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

  /* ------------------------------ SORT -------------------------------- */
  const safeSortKey = sortKey && allowedSortColumns.includes(sortKey) ? sortKey : defaultSortKey;
  const safeSortDir =
    (sortKey && allowedSortColumns.includes(sortKey) ? sortDirection : defaultSortDirection) ===
    'asc'
      ? 'ASC'
      : 'DESC';

  /* ------------------------------ COUNT ------------------------------- */
  const [countRows]: any = await pool.query(
    `SELECT COUNT(*) AS total FROM ${table} ${whereSql}`,
    whereParams,
  );
  const totalItems = Number(countRows?.[0]?.total || 0);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const offset = (currentPage - 1) * Number(pageSize);

  /* ------------------------------ DATA -------------------------------- */
  const dataSql = `
    SELECT ${selectColumns}
    FROM ${table}
    ${whereSql}
    ORDER BY ${safeSortKey} ${safeSortDir}
    LIMIT ? OFFSET ?
  `;

  const [rows] = await pool.query(dataSql, [...whereParams, Number(pageSize), Number(offset)]);

  return {
    data: rows as T[],
    pagination: {
      page: currentPage,
      pageSize: Number(pageSize),
      totalItems,
      totalPages,
    },
  };
}