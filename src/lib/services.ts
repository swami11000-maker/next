import type { Retailer } from "./auth";

export const SERVICE_PAIRS: { service: keyof Retailer; fee: keyof Retailer; label: string }[] = [
  { service: "2wheeler_puc", fee: "2wheeler_fee", label: "2 Wheeler PUC" },
  { service: "4wheeler_puc", fee: "4wheeler_fee", label: "4 Wheeler PUC" },
  { service: "voter_mobile_link", fee: "voter_mobile_link_fee", label: "Voter Mobile Link" },
  { service: "rc_mobile_update", fee: "rc_mo_update_fee", label: "RC Mobile Update" },
  { service: "ll_medical", fee: "ll_medical_fee", label: "LL Medical" },
  { service: "pan_find", fee: "pan_find_fee", label: "PAN Find" },
  { service: "pandetils", fee: "pandetils_fee", label: "PAN Detail" },
  { service: "dl_find", fee: "dl_find_fee", label: "DL Find" },
  { service: "dl_print", fee: "dl_print_fee", label: "DL Print" },
  { service: "dl_mo_update", fee: "dl_mo_update_fee", label: "DL Mobile Update" },
  { service: "ll_exam", fee: "ll_exam_fee", label: "LL Exam" },
];

export interface RetailerService {
  key: string;
  label: string;
  enabled: boolean;
  fee: number;
}

export interface RetailerRequest {
  id: number;
  vehicle_no: string;
  status: string;
  has_pdf: boolean;
  apply_date_time: string | null;
}

export interface RetailerServicesResponse {
  name: string;
  mobile: string;
  balance: number;
  status: string;
  services: RetailerService[];
  requests: RetailerRequest[];
  transactions: WorkHistory[];
}

export type WorkHistoryStatus = "success" | "failed" | "refund" | "panding" | "processing";
export type TransferType = "credit" | "debit";

export interface WorkHistory {
  id: number;
  order_id: string | null;
  user_mob: string | null;
  service_id: string | null;
  service_name: string | null;
  status: WorkHistoryStatus | null;
  old_balance: number | null;
  charge: number | null;
  new_balance: number | null;
  tranfer_type: TransferType | null;
  document: string | null;
  date_time: string | null;
  remark: string | null;
}

export interface TransitionsRow {
  id: number;
  order_id: string;
  user_mob: string;
  service_name: string;
  old_balance: number;
  charge: number;
  new_balance: number;
  tranfer_type: number;
  status: string;
  date_time: string;
  remark: number;
}
