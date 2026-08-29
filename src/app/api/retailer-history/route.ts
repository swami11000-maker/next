import { NextRequest, NextResponse } from "next/server";
import { getUserDeatail, runQuery } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserDeatail(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userMobStr = String(user.mobile);
    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search")?.trim()?.toLowerCase() ?? "";
    const type = searchParams.get("type") ?? "work";

    const limit = Math.min(Number(searchParams.get("limit") ?? 100), 500);

    if (type === "transitions") {
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
        WHERE user_mob = ?
      `;
      const params: (string | number)[] = [userMobStr];

      if (search) {
        sql += ` AND (
          service_name LIKE ? OR
          tranfer_type LIKE ? OR
          status LIKE ? OR
          remark LIKE ? OR
          order_id LIKE ?
        )`;
        const like = `%${search}%`;
        params.push(like, like, like, like, like);
      }

      sql += ` ORDER BY date_time DESC LIMIT ?`;
      params.push(limit);

      const transitions = await runQuery<any[]>(sql, params as never);

      return NextResponse.json(
        {
          type: "transitions",
          data: transitions,
        },
        { status: 200 }
      );
    }

    let sql = `
      SELECT
        id,
        order_id,
        user_mob,
        service_id,
        service_name,
        status,
        old_balance,
        charge,
        new_balance,
        tranfer_type,
        document,
        date_time,
        remark
      FROM workhistory
      WHERE user_mob = ?
    `;
    const params: (string | number)[] = [userMobStr];

    if (search) {
      sql += ` AND (
        service_name LIKE ? OR
        service_id LIKE ? OR
        status LIKE ? OR
        remark LIKE ? OR
        order_id LIKE ?
      )`;
      const like = `%${search}%`;
      params.push(like, like, like, like, like);
    }

    sql += ` ORDER BY date_time DESC LIMIT ?`;
    params.push(limit);

    const workHistory = await runQuery<any[]>(sql, params as never);

    return NextResponse.json(
      {
        type: "work",
        data: workHistory,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Retailer history error:", error);

    return NextResponse.json(
      {
        message: error?.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
