import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser, runQuery, runMutation, SqlParam, RetailerSafe, RETAILER_SAFE_COLUMNS } from "@/lib/auth";


const RETAILER_SELECT = RETAILER_SAFE_COLUMNS.join(", ");

const retailerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  mobile: z.string().min(10),
  password: z.string().min(6).default("changeme"),
  usertype: z.string().default("retailer"),
  status: z.string().default("active"),
  balance: z.number().default(0),
});

export async function GET(request: NextRequest) {
  const user = await getAdminUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
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
  const user = await getAdminUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
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

    const columns = ["name", "email", "password", "usertype", "status", "mobile", "balance"];
    const values: SqlParam[] = [data.name, data.email, data.password, data.usertype, data.status, data.mobile, data.balance];
    const placeholders = columns.map(() => "?");

    const sql = `INSERT INTO retailer (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`;

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
