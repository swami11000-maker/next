import { NextRequest, NextResponse } from "next/server";
import { getUserDeatail, runQuery } from "@/lib/auth";
import type { Retailer } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user: Retailer | null = await getUserDeatail(request);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const transitions = await runQuery<any[]>(
      `
      SELECT 
        \`order_id\`,
        \`service_name\`,
        \`charge\`,
        \`new_balance\`,
        \`tranfer_type\`,
        \`status\`,
        \`date_time\`,
        \`remark\`
      FROM \`transitions\`
      WHERE \`user_mob\` = ? AND \`service_name\` = 'Add Money'
      ORDER BY \`date_time\` DESC
      `,
      [String(user.mobile)]
    );

    const gatewayTransactions = await runQuery<any[]>(
      `
      SELECT 
        \`order_id\`,
        \`amount\`,
        \`payment_type\`,
        \`status\`,
        \`txn_status\`,
        \`utr\`,
        \`date_time\`,
        \`remark1\`,
        \`remark2\`
      FROM \`gateway_transactions\`
      WHERE \`user_mob\` = ? AND \`payment_type\` = 'add_money'
      ORDER BY \`date_time\` DESC
      `,
      [String(user.mobile)]
    );

    return NextResponse.json({
      transitions,
      gateway_transactions: gatewayTransactions,
    });
  } catch (error: unknown) {
    console.error("Add money history error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}