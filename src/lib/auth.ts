import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { RowDataPacket, ResultSetHeader, Connection } from "mysql2/promise";
import { pool } from "./server";

export interface Retailer {
  id: number;
  name: string;
  mobile: string;
  email: string;
  password: string;
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
  dl_mo_update: string;
  dl_mo_update_fee: number;
  ll_exam: string;
  ll_exam_fee: number;
  agri_pdf: string;
  agri_pdf_fee: number;
  rc_print: string;
  rc_print_fee: number;
  esharm_pdf: string;
  esharm_pdf_fee: number;
  esharm_mob_update: string;
  esharm_mob_update_fee: number;
  fees?: string;
}

export function isServiceEnabled(retailer: Retailer | null | undefined, serviceFlag: keyof Retailer): boolean {
  if (!retailer) return false;
  return retailer[serviceFlag] === "yes";
}

export interface JwtPayload {
  id: number;
  mobile: string;
  email: string;
  usertype: string;
}

export type SqlParam = string | number | boolean | null | Date | object;

export interface GatewayTransaction {
  id: number;
  order_id: string;
  user_id: number;
  user_mob: string;
  amount: number;
  payment_type: "activation" | "add_money";
  status: "pending" | "completed" | "failed" | "cancelled";
  txn_status: string | null;
  utr: string | null;
  payment_url: string | null;
  remark1: string | null;
  remark2: string | null;
  date_time: string;
  updated_at: string | null;
}

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export type RetailerSafe = Omit<Retailer, "password">;

export const RETAILER_SAFE_COLUMNS = [
  "id",
  "name",
  "mobile",
  "email",
  "status",
  "balance",
  "usertype",
  "`2wheeler_puc`",
  "`2wheeler_fee`",
  "`4wheeler_puc`",
  "`4wheeler_fee`",
  "voter_mobile_link",
  "voter_mobile_link_fee",
  "rc_mobile_update",
  "rc_mo_update_fee",
  "ll_medical",
  "ll_medical_fee",
  "pan_find",
  "pan_find_fee",
  "pandetils",
  "pandetils_fee",
  "dl_find",
  "dl_find_fee",
  "dl_print",
  "`dl_print_fee`",
  "dl_mo_update",
  "`dl_mo_update_fee`",
  "`ll_exam`",
  "`ll_exam_fee`",
  "agri_pdf",
  "agri_pdf_fee",
  "rc_print",
  "rc_print_fee",
  "esharm_pdf",
  "esharm_pdf_fee",
  "esharm_mob_update",
  "esharm_mob_update_fee",
];

const JWT_SECRET = "your_strong_jwt_secret_here";

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function signResetToken(payload: { id: number; email: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function verifyResetToken(token: string): { id: number; email: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: number; email: string };
  } catch {
    return null;
  }
}

export function setAuthCookie(response: NextResponse, token: string): void {
  response.cookies.set("auth-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearAuthCookie(response: NextResponse): void {
  response.cookies.set("auth-token", "", { maxAge: 0, path: "/" });
}
export async function getUserFromRequest(request: NextRequest): Promise<Retailer | null> {
  try {
    const token = request.cookies.get("auth-token")?.value;

    if (!token) return null;

    const payload = verifyToken(token);

    if (!payload?.id) return null;

    const rows = await runQuery<Retailer[]>(
      `
      SELECT
        id,
        name,
        mobile,
        email,
        status,
        balance,
        usertype,

        2wheeler_puc,
        2wheeler_fee,

        4wheeler_puc,
        4wheeler_fee,

        voter_mobile_link,
        voter_mobile_link_fee,

        rc_mobile_update,
        rc_mo_update_fee,

        ll_medical,
        ll_medical_fee,

        pan_find,
        pan_find_fee,

        pandetils,
        pandetils_fee,

        dl_find,
        dl_find_fee,

        dl_print,
        dl_print_fee,

        dl_mo_update,
        dl_mo_update_fee,

        ll_exam,
        ll_exam_fee,
        rc_print,
        rc_print_fee,
        agri_pdf,
        agri_pdf_fee,
        esharm_pdf,
        esharm_pdf_fee,
        esharm_mob_update,
        esharm_mob_update_fee

      FROM retailer
      WHERE id = ?
        AND status = 'active'
      LIMIT 1
      `,
      [payload.id],
    );

    return rows[0] ?? null;
  } catch (error) {
    console.error("getUserFromRequest error:", error);
    return null;
  }
}

export async function runQuery<T = RowDataPacket[]>(sql: string, params: SqlParam[] = []): Promise<T> {
  const [rows] = await pool.query(sql, params as SqlParam[]);
  return rows as unknown as T;
}

export async function runMutation(sql: string, params: SqlParam[] = []): Promise<ResultSetHeader> {
  const [result] = await pool.query(sql, params as SqlParam[]);
  return result as unknown as ResultSetHeader;
}

export async function runTransaction<T>(fn: (conn: Connection) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export type TwoWheelerStatus = "panding" | "refund" | "success";

export interface TwoWheelerRequest {
  id: number;
  user_mob: number | null;
  order_id: number;
  vehicle_no: string;
  mobile_no: string;
  frontside: string;
  backside: string;
  status: TwoWheelerStatus;
  admin_upload_doc: string | null;
  apply_date_time: string | null;
  resposive_date_time: string | null;
}

export const TWOWHEELER_SAFE_COLUMNS = [
  "id",
  "`user_mob`",
  "`order_id`",
  "`vehicle_no`",
  "`mobile_no`",
  "frontside",
  "backside",
  "status",
  "`admin_upload_doc`",
  "`apply_date_time`",
  "`resposive_date_time`",
];

export type FourWheelerStatus = "panding" | "refund" | "success";

export interface FourWheelerRequest {
  id: number;
  user_mob: number | null;
  order_id: number;
  vehicle_no: string;
  mobile_no: string;
  frontside: string;
  backside: string;
  status: FourWheelerStatus;
  admin_upload_doc: string | null;
  apply_date_time: string | null;
  resposive_date_time: string | null;
}

export const FOURWHEELER_SAFE_COLUMNS = [
  "id",
  "`user_mob`",
  "`order_id`",
  "`vehicle_no`",
  "`mobile_no`",
  "frontside",
  "backside",
  "status",
  "`admin_upload_doc`",
  "`apply_date_time`",
  "`resposive_date_time`",
];

export type LlMedicalStatus = "panding" | "refund" | "success";

export interface LlMedicalRequest {
  id: number;
  user_mob: number | null;
  order_id: string;
  application_no: string;
  state: string;
  dob: string;
  charge: string;
  status: LlMedicalStatus;
  apply_date_time: string | null;
  admin_upload_doc: string | null;
  resposive_date_time: string | null;
}

export const LL_MEDICAL_SAFE_COLUMNS = [
  "id",
  "`user_mob`",
  "`order_id`",
  "`application_no`",
  "`state`",
  "`dob`",
  "`charge`",
  "`status`",
  "`apply_date_time`",
  "`admin_upload_doc`",
  "`resposive_date_time`",
];

export type LlExamStatus = "panding" | "refund" | "success";

export interface LlExamRequest {
  id: number;
  user_mob: number | null;
  order_id: string;
  application_no: string;
  password: string;
  dob: string;
  status: LlExamStatus;
  apply_date_time: string | null;
  pin: string;
  state: string;
  charge: string;
  shift: string;
  admin_upload_doc: string | null;
  resposive_date_time: string | null;
}

export const LL_EXAM_SAFE_COLUMNS = [
  "id",
  "`user_mob`",
  "`order_id`",
  "`application_no`",
  "`password`",
  "`dob`",
  "`status`",
  "`apply_date_time`",
  "`pin`",
  "`state`",
  "`charge`",
  "`shift`",
  "`admin_upload_doc`",
  "`resposive_date_time`",
];
export async function getUserDeatail(request: NextRequest): Promise<Retailer | null> {
  try {
    const token = request.cookies.get("auth-token")?.value;

    if (!token) return null;

    const payload = verifyToken(token);

    if (!payload?.id) return null;

    const rows = await runQuery<Retailer[]>(
      `
      SELECT
        id,
        name,
        mobile,
        email,
        status,
        balance
      FROM retailer
      WHERE id = ?
      LIMIT 1
      `,
      [payload.id],
    );

    return rows[0] ?? null;
  } catch (error) {
    console.error("getUserDeatail error:", error);
    return null;
  }
}
