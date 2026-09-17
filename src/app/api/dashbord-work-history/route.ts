import { getUserDeatail, runQuery, Retailer } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const user: Retailer | null = await getUserDeatail(request);

    if (!user) {
      return NextResponse.json(
        {
          message: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const [workHistoryRows, retailerRows] = await Promise.all([
      runQuery<any[]>(
        `
          SELECT
            id,
            order_id,
            user_mob,
            service_name,
            service_id,
            old_balance,
            charge,
            new_balance,
            document,
            tranfer_type,
            status,
            date_time,
            remark
          FROM workhistory
          WHERE user_mob = ?
          ORDER BY id DESC
          LIMIT 2
        `,
        [user.mobile],
      ),
      runQuery<any[]>(
        `
          SELECT balance
          FROM retailer
          WHERE id = ?
          LIMIT 1
        `,
        [user.id],
      ),
    ]);

    const currentBalance = retailerRows.length > 0 ? Number(retailerRows[0].balance ?? 0) : 0;

    return NextResponse.json(
      {
        success: true,
        message: "workhistory fetched successfully",
        data: workHistoryRows,
        current_balance: currentBalance,
      },
      {
        status: 200,
      },
    );
  } catch (err: any) {
    console.error("workhistory API Error:", err);

    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Failed to fetch workhistory",
      },
      {
        status: 500,
      },
    );
  }
}
