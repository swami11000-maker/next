import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword, runQuery, runMutation, SqlParam, RetailerSafe, RETAILER_SAFE_COLUMNS } from "@/lib/auth";

const retailerSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  mobile: z
    .string()
    .min(10, { message: "Mobile must be 10 digits" })
    .max(12, { message: "Mobile too long" }),
  email: z.string().email({ message: "Enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }).optional(),
  status: z.enum(["active", "unpaid", "panding", ""]).optional(),
  balance: z.number().int().min(0).optional(),
  usertype: z.enum(["superAdmin", "retailer", "", ""]).optional(),
  "2wheeler_puc": z.enum(["yes", "no", ""]).optional(),
  "2wheeler_fee": z.number().int().min(0).optional(),
  "4wheeler_puc": z.enum(["yes", "no", ""]).optional(),
  "4wheeler_fee": z.number().int().min(0).optional(),
  voter_mobile_link: z.enum(["yes", "no"]).optional(),
  voter_mobile_link_fee: z.number().int().min(0).optional(),
  rc_mobile_update: z.enum(["yes", "no"]).optional(),
  rc_mo_update_fee: z.number().int().min(0).optional(),
  ll_medical: z.enum(["yes", "no"]).optional(),
  ll_medical_fee: z.number().int().min(0).optional(),
  pan_find: z.enum(["yes", "no"]).optional(),
  pan_find_fee: z.number().int().min(0).optional(),
  pandetils: z.enum(["yes", "no"]).optional(),
  pandetils_fee: z.number().int().min(0).optional(),
  dl_find: z.enum(["yes", "no"]).optional(),
  dl_find_fee: z.number().int().min(0).optional(),
  dl_print: z.enum(["yes", "no"]).optional(),
  dl_print_fee: z.number().int().min(0).optional(),
  dl_mo_update: z.enum(["yes", "no"]).optional(),
  dl_mo_update_fee: z.number().int().min(0).optional(),
  ll_exam: z.enum(["yes", "no"]).optional(),
  ll_exam_fee: z.number().int().min(0).optional(),
  agri_pdf: z.enum(["yes", "no", ""]).optional(),
  agri_pdf_fee: z.number().int().min(0).optional(),
  rc_print: z.enum(["yes", "no", ""]).optional(),
  rc_print_fee: z.number().int().min(0).optional(),
  esharm_pdf: z.enum(["yes", "no", ""]).optional(),
  esharm_pdf_fee: z.number().int().min(0).optional(),
  esharm_mob_update: z.enum(["yes", "no", ""]).optional(),
  esharm_mob_update_fee: z.number().int().min(0).optional(),
});

const ALL_COLUMNS = [
  "name", "mobile", "email", "password", "status", "balance", "usertype",
  "2wheeler_puc", "2wheeler_fee", "4wheeler_puc", "4wheeler_fee",
  "voter_mobile_link", "voter_mobile_link_fee", "rc_mobile_update", "rc_mo_update_fee",
  "ll_medical", "ll_medical_fee", "pan_find", "pan_find_fee", "pandetils", "pandetils_fee",
  "dl_find", "dl_find_fee", "dl_print", "dl_print_fee", "dl_mo_update", "dl_mo_update_fee",
  "ll_exam", "ll_exam_fee", "agri_pdf", "agri_pdf_fee", "rc_print", "rc_print_fee",
  "esharm_pdf", "esharm_pdf_fee", "esharm_mob_update", "esharm_mob_update_fee",
];

const RETAILER_SELECT = RETAILER_SAFE_COLUMNS.join(", ");

export async function GET() {
  try {
    const rows = await runQuery<RetailerSafe[]>(
      `SELECT ${RETAILER_SELECT} FROM retailer ORDER BY id DESC`,
      []
    );
    return NextResponse.json(rows);
  } catch (error) {
    console.error("List retailers error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = retailerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ message: result.error.issues[0].message }, { status: 400 });
    }

    const data = result.data;

    const existing = await runQuery<{ id: number }[]>(
      "SELECT id FROM retailer WHERE email = ? OR mobile = ? LIMIT 1",
      [data.email, data.mobile]
    );
    if (existing.length > 0) {
      return NextResponse.json(
        { message: "A retailer with this email or mobile already exists" },
        { status: 409 }
      );
    }

    const hashed = data.password ? await hashPassword(data.password) : await hashPassword("changeme");

    const values: SqlParam[] = [];
    const placeholders: string[] = [];
    const columns: string[] = [];

    for (const col of ALL_COLUMNS) {
      columns.push(col);
      placeholders.push("?");
      if (col === "password") {
        values.push(hashed);
      } else if (col === "usertype") {
        values.push((data as Record<string, unknown>).usertype ?? "retailer");
      } else if (col === "balance") {
        values.push(Number((data as Record<string, unknown>).balance ?? 0));
      } else {
        values.push((data as Record<string, unknown>)[col] ?? null);
      }
    }

    const sql = `INSERT INTO retailer (${columns.map((c) => `\`${c}\``).join(", ")}) VALUES (${placeholders.join(", ")})`;

    const insertResult = await runMutation(sql, values);
    return NextResponse.json(
      { message: "Retailer created successfully", userId: insertResult.insertId },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create retailer error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
