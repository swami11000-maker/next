import { NextRequest, NextResponse } from "next/server";
import { getAdminUser, runQuery, SqlParam } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getAdminUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "all";

    const now = new Date();
    const toSql = (d: Date) =>
      d.toISOString().slice(0, 19).replace("T", " ");

    const todayStart = toSql(
      new Date(now.getFullYear(), now.getMonth(), now.getDate())
    );
    const weekStart = toSql(
      new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    );
    const monthStart = toSql(
      new Date(now.getFullYear(), now.getMonth(), 1)
    );

    let dateFrom: string | null = null;
    if (period === "today") dateFrom = todayStart;
    else if (period === "week") dateFrom = weekStart;
    else if (period === "month") dateFrom = monthStart;

    // Aliased filters (transitions as t, gateway as gt)
    const tFilter = dateFrom ? " AND t.date_time >= ?" : "";
    const gFilter = dateFrom ? " AND gt.date_time >= ?" : "";
    // Bare filters (inside UNION subqueries without alias)
    const tFilterBare = dateFrom ? " AND date_time >= ?" : "";
    const gFilterBare = dateFrom ? " AND date_time >= ?" : "";

    const dateParams: SqlParam[] = dateFrom ? [dateFrom] : [];

    // ---------------- Summary ----------------
    const [transSummary, gateSummary, uniqueUsersRows] = await Promise.all([
      runQuery<any[]>(
        `SELECT
           COUNT(*) AS total_transactions,
           COALESCE(SUM(t.charge), 0) AS total_amount,
           SUM(CASE WHEN LOWER(t.status) IN ('success','completed') THEN 1 ELSE 0 END) AS successful_count,
           SUM(CASE WHEN LOWER(t.status) = 'failed'  THEN 1 ELSE 0 END) AS failed_count,
           SUM(CASE WHEN LOWER(t.status) = 'pending' THEN 1 ELSE 0 END) AS pending_count
         FROM \`transitions\` t
         WHERE t.service_name = 'Add Money'${tFilter}`,
        dateParams
      ),
      runQuery<any[]>(
        `SELECT
           COUNT(*) AS total_transactions,
           COALESCE(SUM(gt.amount), 0) AS total_amount,
           SUM(CASE WHEN LOWER(gt.txn_status) IN ('success','completed') THEN 1 ELSE 0 END) AS successful_count,
           SUM(CASE WHEN LOWER(gt.txn_status) = 'failed'  THEN 1 ELSE 0 END) AS failed_count,
           SUM(CASE WHEN LOWER(gt.txn_status) = 'pending' THEN 1 ELSE 0 END) AS pending_count
         FROM \`gateway_transactions\` gt
         WHERE gt.payment_type = 'add_money'${gFilter}`,
        dateParams
      ),
      // Unique users across BOTH tables (deduped)
      runQuery<any[]>(
        `SELECT COUNT(DISTINCT user_mob) AS unique_users FROM (
           SELECT user_mob FROM \`transitions\`
           WHERE service_name = 'Add Money'${tFilterBare}
           UNION
           SELECT user_mob FROM \`gateway_transactions\`
           WHERE payment_type = 'add_money'${gFilterBare}
         ) u`,
        dateFrom ? [dateFrom, dateFrom] : []
      ),
    ]);

    const t = transSummary[0] || {};
    const g = gateSummary[0] || {};

    const summary = {
      total_transactions:
        Number(t.total_transactions || 0) + Number(g.total_transactions || 0),
      total_amount:
        Number(t.total_amount || 0) + Number(g.total_amount || 0),
      unique_users: Number(uniqueUsersRows[0]?.unique_users || 0),
      successful_count:
        Number(t.successful_count || 0) + Number(g.successful_count || 0),
      failed_count:
        Number(t.failed_count || 0) + Number(g.failed_count || 0),
      pending_count:
        Number(t.pending_count || 0) + Number(g.pending_count || 0),
    };

    // ---------------- Daily breakdown ----------------
    const daily = await runQuery<any[]>(
      `SELECT date, SUM(amount) AS amount, SUM(cnt) AS \`count\`
       FROM (
         SELECT DATE(t.date_time) AS date, t.charge AS amount, 1 AS cnt
         FROM \`transitions\` t
         WHERE t.service_name = 'Add Money'${tFilter}
         UNION ALL
         SELECT DATE(gt.date_time) AS date, gt.amount AS amount, 1 AS cnt
         FROM \`gateway_transactions\` gt
         WHERE gt.payment_type = 'add_money'${gFilter}
       ) x
       GROUP BY date
       ORDER BY date ASC`,
      dateFrom ? [dateFrom, dateFrom] : []
    );

    // ---------------- Top users ----------------
    const topUsers = await runQuery<any[]>(
      `SELECT u.user_mob,
              r.name AS user_name,
              SUM(u.amount) AS amount,
              COUNT(*) AS \`count\`
       FROM (
         SELECT t.user_mob, t.charge AS amount
         FROM \`transitions\` t
         WHERE t.service_name = 'Add Money'${tFilter}
         UNION ALL
         SELECT gt.user_mob, gt.amount AS amount
         FROM \`gateway_transactions\` gt
         WHERE gt.payment_type = 'add_money'${gFilter}
       ) u
       LEFT JOIN \`retailer\` r ON r.mobile = u.user_mob
       GROUP BY u.user_mob, r.name
       ORDER BY amount DESC
       LIMIT 10`,
      dateFrom ? [dateFrom, dateFrom] : []
    );

    // ---------------- Status breakdown ----------------
    const statusBreakdown = await runQuery<any[]>(
      `SELECT status,
              COUNT(*) AS \`count\`,
              SUM(amount) AS amount
       FROM (
         SELECT LOWER(t.status) AS status, t.charge AS amount
         FROM \`transitions\` t
         WHERE t.service_name = 'Add Money'${tFilter}
         UNION ALL
         SELECT LOWER(gt.txn_status) AS status, gt.amount AS amount
         FROM \`gateway_transactions\` gt
         WHERE gt.payment_type = 'add_money'${gFilter}
       ) x
       GROUP BY status`,
      dateFrom ? [dateFrom, dateFrom] : []
    );

    return NextResponse.json({
      summary,
      daily,
      topUsers,
      statusBreakdown,
    });
  } catch (error: unknown) {
    console.error("Admin add money dashboard error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const stack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      {
        message,
        stack: process.env.NODE_ENV === "development" ? stack : undefined,
      },
      { status: 500 }
    );
  }
}