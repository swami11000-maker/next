import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getUserDeatail, runQuery, runTransaction, isServiceEnabled } from "@/lib/auth";

import type { Retailer } from "@/lib/auth";
import { STATUS_PENDING, STATUS_SUCCESS } from "@/lib/statuses";
import { generate7DigitNumber } from "@/lib/utils";

// -----------------------------------------------------
// Validation Schema
// -----------------------------------------------------

const submitSchema = z.object({
  applicationId: z.string().min(1, "Application ID is required").max(50, "Application ID is too long"),

  state: z.string().min(1, "State is required"),

  dateOfBirth: z.string().min(1, "Date of birth is required"),
});

// -----------------------------------------------------
// Service Details
// -----------------------------------------------------

const SERVICE_ID = "ll_medical";
const SERVICE_NAME = "Learning Exam Medical";

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

    if (!isServiceEnabled(user, "ll_medical")) {
      return NextResponse.json(
        { message: "Learning Exam Medical service is not enabled for your account" },
        { status: 403 }
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

    // ---------------------------------------------------
    // 4. Get Validated Data
    // ---------------------------------------------------

    const { applicationId, state, dateOfBirth } = result.data;

    // ---------------------------------------------------
    // 5. Current Date & Time
    // ---------------------------------------------------

    const now = new Date().toISOString().slice(0, 19).replace("T", " ");

    // ---------------------------------------------------
    // 6. Retailer Mobile
    //
    // Keep mobile number as STRING.
    // ---------------------------------------------------

    const userMobStr = String(user.mobile);

    // ---------------------------------------------------
    // 7. Get Latest Balance + LL Medical Fee
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
          \`ll_medical_fee\` AS fee
        FROM retailer
        WHERE id = ?
        LIMIT 1
      `,
      [user.id],
    );

    // ---------------------------------------------------
    // 8. Retailer Account Check
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
    // 9. Balance + Charge
    // ---------------------------------------------------

    const oldBalance = Number(feeRows[0].balance ?? 0);

    const charge = Number(feeRows[0].fee ?? 50);

    // ---------------------------------------------------
    // 10. Validate Service Fee
    // ---------------------------------------------------

    if (!Number.isFinite(charge) || charge <= 0) {
      return NextResponse.json(
        {
          message: "Invalid LL medical service fee",
        },
        {
          status: 500,
        },
      );
    }

    // ---------------------------------------------------
    // 11. Initial Balance Check
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
    // 12. Calculate New Balance
    // ---------------------------------------------------

    const newBalance = oldBalance - charge;

    // ---------------------------------------------------
    // 13. Database Transaction
    // ---------------------------------------------------

    const transactionResult = await runTransaction<{
      order_id: string;
    }>(async (conn) => {
      // -----------------------------------------------
      // 13.1 Generate 7 Digit Order ID
      // -----------------------------------------------

      const order_id = generate7DigitNumber();

      // -----------------------------------------------
      // 13.2 Insert LL Medical Request
      // -----------------------------------------------

      await conn.query(
        `
            INSERT INTO \`ll_medical\`
            (
              \`user_mob\`,
              \`order_id\`,
              \`application_no\`,
              \`state\`,
              \`dob\`,
              \`charge\`,
              \`status\`,
              \`apply_date_time\`,
              \`admin_upload_doc\`,
              \`resposive_date_time\`
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
        [userMobStr, order_id, applicationId, state, dateOfBirth, String(charge), STATUS_PENDING, now, null, null],
      );

      // -----------------------------------------------
      // 13.3 Insert Work History
      // -----------------------------------------------

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

      // -----------------------------------------------
      // 13.4 Insert Transaction History
      // -----------------------------------------------

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

      // -----------------------------------------------
      // 13.5 Update Retailer Balance
      //
      // Re-check balance inside transaction to prevent
      // race conditions.
      // -----------------------------------------------

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

      // -----------------------------------------------
      // 13.6 Verify Balance Update
      // -----------------------------------------------

      if (updateResult.affectedRows !== 1) {
        throw new Error("Insufficient balance");
      }

      // -----------------------------------------------
      // 13.7 Return Order ID
      // -----------------------------------------------

      return {
        order_id,
      };
    });

    // ---------------------------------------------------
    // 14. Success Response
    // ---------------------------------------------------

    return NextResponse.json(
      {
        message: "Learning exam medical submitted successfully",

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
    // 15. Error Log
    // ---------------------------------------------------

    console.error("Learning exam medical error:", error);

    // ---------------------------------------------------
    // 16. Insufficient Balance
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
    // 17. General Error
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
