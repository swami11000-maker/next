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

    const [transitionRows, retailerRows] = await Promise.all([
      runQuery<any[]>(
        `
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
          ORDER BY date_time DESC
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
        message: "Transactions fetched successfully",
        data: transitionRows,
        current_balance: currentBalance,
      },
      {
        status: 200,
      },
    );
  } catch (err: any) {
    console.error("Transaction API Error:", err);

    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Failed to fetch transactions",
      },
      {
        status: 500,
      },
    );
  }
}
