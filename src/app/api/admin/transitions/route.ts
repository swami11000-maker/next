import { NextRequest, NextResponse } from "next/server";
import { getAdminUser, runQuery } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getAdminUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
    const { searchParams } = request.nextUrl;

    /* ---------------------------- Pagination ---------------------------- */
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limitRaw = parseInt(searchParams.get("limit") || "10", 10) || 10;
    const limit = Math.max(1, Math.min(500, limitRaw));
    const offset = (page - 1) * limit;

    /* ------------------------------ Filters ----------------------------- */
    const search = searchParams.get("search")?.trim() ?? "";
    const status = searchParams.get("status")?.trim() ?? "";

    /* --------------------------- Build WHERE ---------------------------- */
    let whereSql = `WHERE 1 = 1`;
    const params: (string | number)[] = [];

    if (search) {
      whereSql += ` AND (
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

    if (status && status !== "all") {
      whereSql += ` AND status = ?`;
      params.push(status);
    }

    /* ----------------------- Fetch paginated rows ----------------------- */
    const sql = `
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
      ${whereSql}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `;

    const rows = await runQuery<any[]>(sql, [
      ...params,
      limit,
      offset,
    ] as never);

    /* --------------------- Count total (same WHERE) --------------------- */
    const countRows = await runQuery<{ total: number }[]>(
      `SELECT COUNT(*) AS total FROM transitions ${whereSql}`,
      params as never,
    );

    const total = Number(countRows?.[0]?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return NextResponse.json(
      {
        data: rows,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Admin transitions error:", error);
    return NextResponse.json(
      { message: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
