import { NextRequest, NextResponse } from "next/server";
import { runQuery } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search")?.trim()?.toLowerCase() ?? "";
    const status = searchParams.get("status")?.trim() ?? "";
    const limit = Math.min(Number(searchParams.get("limit") ?? 100), 500);

    let sql = `
      SELECT
        id,
        order_id,
        user_mob,
        service_name,
        old_balance,
        charge,
        new_balance,
        tranfer_type,
        status,
        date_time,
        remark
      FROM transitions
      WHERE 1 = 1
    `;
    const params: (string | number)[] = [];

    if (search) {
      sql += ` AND (
        service_name LIKE ? OR
        status LIKE ? OR
        remark LIKE ? OR
        order_id LIKE ? OR
        user_mob LIKE ? OR
        tranfer_type LIKE ?
      )`;
      const like = `%${search}%`;
      params.push(like, like, like, like, like, like);
    }

    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY date_time DESC LIMIT ?`;
    params.push(limit);

    const rows = await runQuery<any[]>(sql, params as never);

    return NextResponse.json(rows, { status: 200 });
  } catch (error: any) {
    console.error("Admin transitions error:", error);
    return NextResponse.json({ message: error?.message || "Internal server error" }, { status: 500 });
  }
}
