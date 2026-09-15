import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getUserDeatail, runQuery, runTransaction, isServiceEnabled } from "@/lib/auth";

import { STATUS_PENDING, STATUS_SUCCESS } from "@/lib/statuses";
import type { Retailer } from "@/lib/auth";

import { generate7DigitNumber, tgAlert } from "@/lib/utils";

const submitSchema = z.object({
  vehicle_no: z.string().min(4, {
    message: "Vehicle number is required",
  }),

  mobile_no: z.string().min(10, {
    message: "Mobile number is required",
  }),

  frontside: z.string().min(1, {
    message: "Front side photo is required",
  }),

  backside: z.string().min(1, {
    message: "Back side photo is required",
  }),
});

const SERVICE_NAME = "2 Wheeler PUC";

// -----------------------------------------------------
// POST API
// -----------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // ---------------------------------------------------
    // 1. Get Logged-in Retailer
    // ---------------------------------------------------

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

    // ---------------------------------------------------
    // 2. Check Service Enabled
    // ---------------------------------------------------

    if (!isServiceEnabled(user, "2wheeler_puc")) {
      return NextResponse.json(
        {
          message: "2 Wheeler PUC service is not enabled for your account",
        },
        {
          status: 403,
        },
      );
    }

    // ---------------------------------------------------
    // 3. Parse Request Body
    // ---------------------------------------------------

    const body = await request.json();

    // ---------------------------------------------------
    // 4. Validate Request
    // ---------------------------------------------------

    const result = submitSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          message: result.error.issues[0]?.message || "Invalid request",
        },
        {
          status: 400,
        },
      );
    }

    const { vehicle_no, mobile_no, frontside, backside } = result.data;

    // ---------------------------------------------------
    // 5. Current Date & Time
    // ---------------------------------------------------

    const now = new Date().toISOString().slice(0, 19).replace("T", " ");

    // ---------------------------------------------------
    // 6. Retailer Mobile
    // ---------------------------------------------------

    const userMobStr = String(user.mobile);

    // ---------------------------------------------------
    // 7. Database Transaction
    // ---------------------------------------------------

    const transactionResult = await runTransaction<{
      order_id: string;
      old_balance: number;
      new_balance: number;
      charge: number;
    }>(async (conn) => {
      // -------------------------------------------------
      // 7.1 Get Latest Balance + Service Fee
      //     FOR UPDATE locks this retailer row
      // -------------------------------------------------

      const [rows] = await conn.query<any[]>(
        `
          SELECT
            balance,
            \`2wheeler_fee\` AS fee
          FROM retailer
          WHERE id = ?
          LIMIT 1
          FOR UPDATE
        `,
        [user.id],
      );

      if (!rows || rows.length === 0) {
        throw new Error("Retailer account not found");
      }

      // -------------------------------------------------
      // 7.2 Get Balance
      // -------------------------------------------------

      const oldBalance = Number(rows[0].balance ?? 0);

      // -------------------------------------------------
      // 7.3 Get Service Charge
      // -------------------------------------------------

      const charge = Number(rows[0].fee ?? 50);

      if (!Number.isFinite(charge) || charge <= 0) {
        throw new Error("Invalid 2 wheeler service fee");
      }

      // -------------------------------------------------
      // 7.4 Check Balance
      // -------------------------------------------------

      if (oldBalance < charge) {
        throw new Error("Insufficient balance");
      }

      // -------------------------------------------------
      // 7.5 Calculate New Balance
      // -------------------------------------------------

      const newBalance = oldBalance - charge;

      // -------------------------------------------------
      // 7.6 Generate 7 Digit Order ID
      // -------------------------------------------------

      const order_id = generate7DigitNumber();

      // -------------------------------------------------
      // 7.7 Insert 2 Wheeler Order
      // -------------------------------------------------

      await conn.query(
        `
          INSERT INTO \`2wheeler\`
          (
            \`user_mob\`,
            \`order_id\`,
            \`vehicle_no\`,
            \`service_mob\`,
            \`frontside\`,
            \`backside\`,
            \`status\`,
            \`admin_upload_doc\`,
            \`apply_date_time\`,
            \`resposive_date_time\`
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [userMobStr, order_id, vehicle_no, mobile_no, frontside, backside, STATUS_PENDING, null, now, null],
      );

      // -------------------------------------------------
      // 7.8 Insert Work History
      // -------------------------------------------------

      await conn.query(
        `
          INSERT INTO \`workhistory\`
          (
            \`order_id\`,
            \`user_mob\`,
            \`service_id\`,
            \`service_name\`,
            \`status\`,
            \`old_balance\`,
            \`charge\`,
            \`new_balance\`,
            \`tranfer_type\`,
            \`document\`,
            \`date_time\`,
            \`remark\`
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [order_id, userMobStr, vehicle_no, SERVICE_NAME, STATUS_PENDING, oldBalance, charge, newBalance, "debit", null, now, SERVICE_NAME],
      );

      // -------------------------------------------------
      // 7.9 Insert Transaction History
      // -------------------------------------------------

      await conn.query(
        `
          INSERT INTO \`transitions\`
          (
            \`order_id\`,
            \`user_mob\`,
            \`service_name\`,
            \`old_balance\`,
            \`charge\`,
            \`new_balance\`,
            \`tranfer_type\`,
            \`status\`,
            \`date_time\`,
            \`remark\`
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [order_id, userMobStr, SERVICE_NAME, oldBalance, charge, newBalance, "debit", STATUS_SUCCESS, now, SERVICE_NAME],
      );

      // -------------------------------------------------
      // 7.10 Update Retailer Balance
      // -------------------------------------------------

      const [updateResult] = await conn.query<any>(
        `
          UPDATE retailer
          SET balance = balance - ?
          WHERE id = ?
            AND balance >= ?
          LIMIT 1
        `,
        [charge, user.id, charge],
      );

      // -------------------------------------------------
      // 7.11 Check Balance Update
      // -------------------------------------------------

      if (updateResult.affectedRows !== 1) {
        throw new Error("Insufficient balance");
      }

      // -------------------------------------------------
      // 7.12 Insert Alert
      // -------------------------------------------------

      await conn.query(
        `
          INSERT INTO \`alerts\`
          (
            \`order_id\`,
            \`user_mob\`,
            \`service_name\`,
            \`status\`
          )
          VALUES (?, ?, ?, ?)
        `,
        [order_id, userMobStr, SERVICE_NAME, STATUS_PENDING],
      );

      // -------------------------------------------------
      // 7.13 Return Transaction Data
      // -------------------------------------------------
      await tgAlert(`
<b>🚗 2 Wheeler PUC New Order</b>

<b>Order ID:</b> ${order_id}
<b>Vehicle No:</b> ${vehicle_no}
<b>Customer Mobile:</b> ${mobile_no}
<b>Service:</b> 2 Wheeler PUC
<b>Amount:</b> ₹${charge}
<b>Status:</b> Pending
`);
      return {
        order_id,
        old_balance: oldBalance,
        new_balance: newBalance,
        charge,
      };
    });

    // ---------------------------------------------------
    // 8. Success Response
    // ---------------------------------------------------

    return NextResponse.json(
      {
        message: "Request submitted successfully",

        id: Number(transactionResult.order_id),

        order_id: transactionResult.order_id,

        charge: transactionResult.charge,

        old_balance: transactionResult.old_balance,

        new_balance: transactionResult.new_balance,
      },
      {
        status: 201,
      },
    );
  } catch (error: any) {
    // ---------------------------------------------------
    // 9. Error Logging
    // ---------------------------------------------------

    console.error("2wheeler submit error:", error);

    // ---------------------------------------------------
    // 10. Insufficient Balance
    // ---------------------------------------------------

    if (error?.message === "Insufficient balance") {
      return NextResponse.json(
        {
          message: "Insufficient balance",
        },
        {
          status: 400,
        },
      );
    }

    // ---------------------------------------------------
    // 11. Retailer Account Not Found
    // ---------------------------------------------------

    if (error?.message === "Retailer account not found") {
      return NextResponse.json(
        {
          message: "Retailer account not found",
        },
        {
          status: 404,
        },
      );
    }

    // ---------------------------------------------------
    // 12. General Error
    // ---------------------------------------------------

    return NextResponse.json(
      {
        message: error?.message || "Internal server error",
      },
      {
        status: 500,
      },
    );
  }
}
