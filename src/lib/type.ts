export interface RetailerData {
  id: number;
  name: string;
  mobile: string;
  email: string;
  status: string;
  balance: number;
  usertype: string;

  "2wheeler_puc": string;
  "2wheeler_fee": number;

  "4wheeler_puc": string;
  "4wheeler_fee": number;

  voter_mobile_link: string;
  voter_mobile_link_fee: number;

  rc_mobile_update: string;
  rc_mo_update_fee: number;

  ll_medical: string;
  ll_medical_fee: number;

  pan_find: string;
  pan_find_fee: number;

  pandetils: string;
  pandetils_fee: number;

  dl_find: string;
  dl_find_fee: number;

  dl_print: string;
  dl_print_fee: number;

  rc_print: string;
  rc_print_fee: number;

  dl_mo_update: string;
  dl_mo_update_fee: number;

  ll_exam: string;
  ll_exam_fee: number;

  agri_pdf: string;
  agri_pdf_fee: number;

  esharm_pdf: string;
  esharm_pdf_fee: number;

  esharm_mob_update: string;
  esharm_mob_update_fee: number;

  [key: string]: unknown;
}


export interface Transition {
  id: number;
  order_id: string;
  user_mob: string;
  service_name: string;
  old_balance: number | string;
  charge: number | string;
  new_balance: number | string;
  tranfer_type: string;
  status: string;
  date_time: string;
  remark: string | null;
}

export type SortDirection = 'asc' | 'desc';

export interface ColumnDef<T> {
  /** Unique column key */
  key: string;
  /** Header label (string or node) */
  header: React.ReactNode;
  /** Value used for sorting. Required when `sortable` is true */
  sortValue?: (row: T) => string | number | null | undefined;
  /** Custom cell renderer */
  cell?: (row: T) => React.ReactNode;
  /** Enable sorting on this column */
  sortable?: boolean;
  /** Extra classes for header cell */
  headClassName?: string;
  /** Extra classes for body cell */
  cellClassName?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  getRowKey: (row: T, index: number) => React.Key;
  /** Records per page (default: 10) */
  pageSize?: number;
  initialSortKey?: string;
  initialSortDirection?: SortDirection;
  emptyState?: React.ReactNode;
  className?: string;
}

/* -------------------------------------------------------------------------- */
/*                                PAGINATION                                  */
/* -------------------------------------------------------------------------- */

export interface TablePaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}
export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};