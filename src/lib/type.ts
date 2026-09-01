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