import { NextRequest, NextResponse } from "next/server";
import { runQuery } from "@/lib/auth";
import { LL_EXAM_SAFE_COLUMNS } from "@/lib/auth";

const RETAILER_SELECT = LL_EXAM_SAFE_COLUMNS.join(", ");

export async function GET(request: NextRequest) {
  try {
    const status = request.nextUrl.searchParams.get("status");

    let sql = `SELECT ${RETAILER_SELECT} FROM \`ll-exam-request\``;
    const params: unknown[] = [];

    if (status) {
      sql += " WHERE status = ?";
      params.push(status);
    }

    sql += " ORDER BY id DESC";

    const rows = await runQuery<any[]>(sql, params as never);

    return NextResponse.json(rows);
  } catch (error) {
    console.error("List ll-exam-request error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
