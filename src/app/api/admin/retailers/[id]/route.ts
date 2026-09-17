import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser, hashPassword, runQuery, runMutation, SqlParam, RetailerSafe, RETAILER_SAFE_COLUMNS } from "@/lib/auth";

const updateSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }).optional(),
  mobile: z.string().optional(),
  email: z.string().email({ message: "Enter a valid email address" }).optional(),
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

const RETAILER_SELECT = RETAILER_SAFE_COLUMNS.join(", ");

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAdminUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const rows = await runQuery<RetailerSafe[]>(
      `SELECT ${RETAILER_SELECT} FROM retailer WHERE id = ? LIMIT 1`,
      [Number(id)]
    );

    if (rows.length === 0) {
      return NextResponse.json({ message: "Retailer not found" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("Get retailer error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAdminUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await request.json();
    const result = updateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ message: result.error.issues[0].message }, { status: 400 });
    }

    const updates: string[] = [];
    const values: SqlParam[] = [];

    for (const [col, val] of Object.entries(result.data)) {
      if (val === undefined || val === "") continue;
      if (col === "password") {
        updates.push("`password` = ?");
        values.push(await hashPassword(val as string));
      } else {
        updates.push(`\`${col}\` = ?`);
        values.push(val as SqlParam);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ message: "No fields to update" }, { status: 400 });
    }

    const existing = await runQuery<{ id: number }[]>(
      "SELECT id FROM retailer WHERE id = ? LIMIT 1",
      [Number(id)]
    );
    if (existing.length === 0) {
      return NextResponse.json({ message: "Retailer not found" }, { status: 404 });
    }

    values.push(Number(id));

    const sql = `UPDATE retailer SET ${updates.join(", ")} WHERE id = ? LIMIT 1`;
    await runMutation(sql, values);

    const updated = await runQuery<RetailerSafe[]>(
      `SELECT ${RETAILER_SELECT} FROM retailer WHERE id = ? LIMIT 1`,
      [Number(id)]
    );

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error("Update retailer error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAdminUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const existing = await runQuery<{ id: number }[]>(
      "SELECT id FROM retailer WHERE id = ? LIMIT 1",
      [Number(id)]
    );

    if (existing.length === 0) {
      return NextResponse.json({ message: "Retailer not found" }, { status: 404 });
    }

    await runMutation("DELETE FROM retailer WHERE id = ? LIMIT 1", [Number(id)]);

    return NextResponse.json({ message: "Retailer deleted successfully" });
  } catch (error) {
    console.error("Delete retailer error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
