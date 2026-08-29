import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getUserDeatail, runQuery, runTransaction } from "@/lib/auth";

import { STATUS_SUCCESS } from "@/lib/statuses";
import type { Retailer } from "@/lib/auth";

import { generate7DigitNumber } from "@/lib/utils";

// -----------------------------------------------------
// Validation Schema
// -----------------------------------------------------

const submitSchema = z.object({
  vehicle_no: z.string().min(4, { message: "Vehicle number is required" }),

  mobile_no: z.string().min(10, { message: "Mobile number is required" }),

  frontside: z.string().min(1, { message: "Front side photo is required" }),

  backside: z.string().min(1, { message: "Back side photo is required" }),
});

const SERVICE_ID = "2wheeler_puc";
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
    // 2. Parse Request Body
    // ---------------------------------------------------

    const body = await request.json();

    // ---------------------------------------------------
    // 3. Validate Request
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
    // 4. Current Date & Time
    // ---------------------------------------------------

    const now = new Date().toISOString().slice(0, 19).replace("T", " ");

    // ---------------------------------------------------
    // 5. Retailer Mobile
    //
    // Keep mobile as STRING.
    // Do not convert mobile number to Number because
    // leading zero can be lost.
    // ---------------------------------------------------

    const userMobStr = String(user.mobile);

    // ---------------------------------------------------
    // 6. Get Latest Balance + Service Fee
    // ---------------------------------------------------

    const feeRows = await runQuery<
      {
        balance: number;
        fee: number;
      }[]
    >(
      `
        SELECT
          balance,
          \`2wheeler_fee\` AS fee
        FROM retailer
        WHERE id = ?
        LIMIT 1
      `,
      [user.id],
    );

    // ---------------------------------------------------
    // 7. Check Retailer Account
    // ---------------------------------------------------

    if (feeRows.length === 0) {
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
    // 8. Balance + Charge
    // ---------------------------------------------------

    const oldBalance = Number(feeRows[0].balance ?? 0);

    const charge = Number(feeRows[0].fee ?? 50);

    // ---------------------------------------------------
    // 9. Validate Service Fee
    // ---------------------------------------------------

    if (!Number.isFinite(charge) || charge <= 0) {
      return NextResponse.json(
        {
          message: "Invalid 2 wheeler service fee",
        },
        {
          status: 500,
        },
      );
    }

    // ---------------------------------------------------
    // 10. Initial Balance Check
    // ---------------------------------------------------

    if (oldBalance < charge) {
      return NextResponse.json(
        {
          message: "Insufficient balance",
          balance: oldBalance,
          required: charge,
        },
        {
          status: 400,
        },
      );
    }

    // ---------------------------------------------------
    // 11. Calculate New Balance
    // ---------------------------------------------------

    const newBalance = oldBalance - charge;

    // ---------------------------------------------------
    // 12. Database Transaction
    // ---------------------------------------------------

    const transactionResult = await runTransaction<{
      order_id: string;
    }>(async (conn) => {
      // -------------------------------------------------
      // 12.1 Generate 7 Digit Order ID
      // -------------------------------------------------

      const order_id = generate7DigitNumber();

      // -------------------------------------------------
      // 12.2 Insert 2 Wheeler Order
      // -------------------------------------------------

      await conn.query(
        `
          INSERT INTO \`2wheeler\`
          (
            \`user_mob\`,
            \`order_id\`,
            \`vehicle_no\`,
            \`mobile_no\`,
            \`frontside\`,
            \`backside\`,
            \`status\`,
            \`admin_upload_doc\`,
            \`apply_date_time\`,
            \`resposive_date_time\`
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [userMobStr, order_id, vehicle_no, mobile_no, frontside, backside, STATUS_SUCCESS, null, now, null],
      );

      // -------------------------------------------------
      // 12.3 Insert Work History
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
        [order_id, userMobStr, SERVICE_ID, SERVICE_NAME, STATUS_SUCCESS, oldBalance, charge, newBalance, "debit", null, now, ""],
      );

      // -------------------------------------------------
      // 12.4 Insert Transaction History
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
        [order_id, userMobStr, SERVICE_NAME, oldBalance, charge, newBalance, "debit", STATUS_SUCCESS, now, ""],
      );

      // -------------------------------------------------
      // 12.5 Update Retailer Balance
      //
      // Re-check balance inside transaction to prevent
      // two simultaneous requests from over-deducting.
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
      // 12.6 Check Balance Update
      // -------------------------------------------------

      if (updateResult.affectedRows !== 1) {
        throw new Error("Insufficient balance");
      }

      // -------------------------------------------------
      // 12.7 Return Order ID
      // -------------------------------------------------

      return {
        order_id,
      };
    });

    // ---------------------------------------------------
    // 13. Success Response
    // ---------------------------------------------------

    return NextResponse.json(
      {
        message: "Request submitted successfully",

        id: Number(transactionResult.order_id),

        order_id: transactionResult.order_id,

        charge,

        old_balance: oldBalance,

        new_balance: newBalance,
      },
      {
        status: 201,
      },
    );
  } catch (error: any) {
    // ---------------------------------------------------
    // 14. Error Logging
    // ---------------------------------------------------

    console.error("2wheeler submit error:", error);

    // ---------------------------------------------------
    // 15. Insufficient Balance Error
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
    // 16. General Error
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
