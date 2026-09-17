import { NextRequest, NextResponse } from "next/server";
import { getAdminUser, runQuery } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getAdminUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
    const [
      retailerStats,
      serviceStats,
      recentTransactions,
      topRetailers,
    ] = await Promise.all([
      runQuery<any[]>(`
        SELECT
          COUNT(*) AS total_retailers,
          SUM(balance) AS total_balance,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_retailers,
          SUM(CASE WHEN status = 'unpaid' THEN 1 ELSE 0 END) AS unpaid_retailers,
          SUM(CASE WHEN status = 'panding' THEN 1 ELSE 0 END) AS pending_retailers
        FROM retailer
      `),
      runQuery<any[]>(`
        SELECT
          service_name,
          SUM(charge) AS total_charge,
          COUNT(*) AS total_transactions,
          SUM(CASE WHEN tranfer_type = 'credit' THEN charge ELSE 0 END) AS total_refund,
          SUM(CASE WHEN tranfer_type = 'debit' THEN charge ELSE 0 END) AS total_debit
        FROM transitions
        GROUP BY service_name
        ORDER BY total_charge DESC
      `),
      runQuery<any[]>(`
        SELECT
          id,
          order_id,
          user_mob,
          service_name,
          charge,
          tranfer_type,
          status,
          date_time
        FROM transitions
        ORDER BY date_time DESC
        LIMIT 20
      `),
      runQuery<any[]>(`
        SELECT
          id,
          name,
          mobile,
          email,
          status,
          balance
        FROM retailer
        ORDER BY balance DESC
        LIMIT 10
      `),
    ]);

    const stats = retailerStats[0] || {};

    return NextResponse.json({
      success: true,
      data: {
        retailers: {
          total: Number(stats.total_retailers || 0),
          active: Number(stats.active_retailers || 0),
          unpaid: Number(stats.unpaid_retailers || 0),
          pending: Number(stats.pending_retailers || 0),
          total_balance: Number(stats.total_balance || 0),
        },
        services: serviceStats.map((row) => ({
          name: row.service_name || "Unknown",
          totalCharge: Number(row.total_charge || 0),
          transactions: Number(row.total_transactions || 0),
          refund: Number(row.total_refund || 0),
          debit: Number(row.total_debit || 0),
        })),
        recentTransactions: recentTransactions.map((row) => ({
          id: row.id,
          order_id: row.order_id,
          user_mob: row.user_mob,
          service_name: row.service_name,
          charge: Number(row.charge || 0),
          tranfer_type: row.tranfer_type,
          status: row.status,
          date_time: row.date_time,
        })),
        topRetailers: topRetailers.map((row) => ({
          id: row.id,
          name: row.name,
          mobile: row.mobile,
          email: row.email,
          status: row.status,
          balance: Number(row.balance || 0),
        })),
      },
    });
  } catch (error: any) {
    console.error("Admin dashboard error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
