import { getUserDeatail, Retailer } from "@/lib/auth";
import { pool } from "@/lib/server";
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
      WHERE user_mob = ?
      ORDER BY date_time DESC
    `;

    const [rows] = await pool.query(sql, [user.mobile]);

    return NextResponse.json(
      {
        success: true,
        message: "Transactions fetched successfully",
        data: rows,
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
