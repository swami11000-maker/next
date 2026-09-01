import { NextRequest, NextResponse } from "next/server";
import { runQuery } from "@/lib/auth";
import type { FourWheelerRequest } from "@/lib/auth";
import { FOURWHEELER_SAFE_COLUMNS } from "@/lib/auth";

const RETAILER_SELECT = FOURWHEELER_SAFE_COLUMNS.join(", ");

export async function GET(request: NextRequest) {
  try {
    const status = request.nextUrl.searchParams.get("status");

    let sql = `SELECT ${RETAILER_SELECT} FROM \`4wheeler\``;
    const params: unknown[] = [];

    if (status) {
      sql += " WHERE status = ?";
      params.push(status);
    }

    sql += " ORDER BY id DESC";

    const rows = await runQuery<FourWheelerRequest[]>(sql, params as never);

    return NextResponse.json(rows);
  } catch (error) {
    console.error("List 4wheeler error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
