import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getUserDeatail, runQuery, runTransaction, isServiceEnabled } from "@/lib/auth";

import type { Retailer } from "@/lib/auth";
import { STATUS_PENDING, STATUS_SUCCESS } from "@/lib/statuses";
import { generate7DigitNumber, getIndianDateTime, tgAlert } from "@/lib/utils";

// -----------------------------------------------------
// Validation Schema
// -----------------------------------------------------

const submitSchema = z.object({
  applicationNumber: z.string().min(1, "Application number is required").max(50, "Application number is too long"),

  dateOfBirth: z.string().min(1, "Date of birth is required"),

  password: z.string().min(1, "Password is required"),

  examPin: z.string().max(20, "Exam PIN is too long").optional().or(z.literal("")),

  state: z.string().min(1, "State is required"),

  examType: z.enum(["day-exam", "night-exam"], {
    message: "Please select exam type",
  }),
});

// -----------------------------------------------------
// Service Details
// -----------------------------------------------------

const SERVICE_ID = "ll_exam_request";
const SERVICE_NAME = "LL Exam Request";

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

    if (!isServiceEnabled(user, "ll_exam")) {
      return NextResponse.json({ message: "LL Exam Request service is not enabled for your account" }, { status: 403 });
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

    const { applicationNumber, dateOfBirth, password, examPin, state, examType } = result.data;

    // ---------------------------------------------------
    // 5. Current Date & Time
    // ---------------------------------------------------

    const now = getIndianDateTime();

    // ---------------------------------------------------
    // 6. Retailer Mobile
    //
    // Keep mobile number as STRING.
    // ---------------------------------------------------

    const userMobStr = String(user.mobile);

    // ---------------------------------------------------
    // 7. Exam Shift
    // ---------------------------------------------------

    const shift = examType === "day-exam" ? "day" : "night";

    // ---------------------------------------------------
    // 8. Get Latest Balance + LL Exam Fee
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
          \`ll_exam_fee\` AS fee
        FROM retailer
        WHERE id = ?
        LIMIT 1
      `,
      [user.id],
    );

    // ---------------------------------------------------
    // 9. Retailer Account Check
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
    // 10. Balance + Charge
    // ---------------------------------------------------

    const oldBalance = Number(feeRows[0].balance ?? 0);

    const charge = Number(feeRows[0].fee ?? 50);

    // ---------------------------------------------------
    // 11. Validate Service Fee
    // ---------------------------------------------------

    if (!Number.isFinite(charge) || charge <= 0) {
      return NextResponse.json(
        {
          message: "Invalid LL exam service fee",
        },
        {
          status: 500,
        },
      );
    }

    // ---------------------------------------------------
    // 12. Initial Balance Check
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
    // 13. Calculate New Balance
    // ---------------------------------------------------

    const newBalance = oldBalance - charge;

    // ---------------------------------------------------
    // 14. Database Transaction
    // ---------------------------------------------------

    const transactionResult = await runTransaction<{
      order_id: string;
    }>(async (conn) => {
      // -----------------------------------------------
      // 14.1 Generate 7 Digit Order ID
      // -----------------------------------------------

      const order_id = generate7DigitNumber();

      // -----------------------------------------------
      // 14.2 Insert LL Exam Request
      // -----------------------------------------------

      await conn.query(
        `
            INSERT INTO \`ll-exam-request\`
            (
              \`user_mob\`,
              \`order_id\`,
              \`application_no\`,
              \`password\`,
              \`dob\`,
              \`status\`,
              \`apply_date_time\`,
              \`pin\`,
              \`state\`,
              \`charge\`,
              \`shift\`,
              \`admin_upload_doc\`,
              \`resposive_date_time\`
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
        [userMobStr, order_id, applicationNumber, password, dateOfBirth, STATUS_PENDING, now, examPin || "", state, String(charge), shift, null, null],
      );

      // -----------------------------------------------
      // 14.3 Insert Work History
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
      // 14.4 Insert Transaction History
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
      // 14.5 Update Retailer Balance
      //
      // Re-check balance inside transaction to
      // prevent race conditions.
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
      // 14.6 Verify Balance Update
      // -----------------------------------------------

      if (updateResult.affectedRows !== 1) {
        throw new Error("Insufficient balance");
      }

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
await tgAlert(`
<b>🚗 LL Exam Request New Order</b>

<b>Order ID:</b> ${order_id}
<b>Vehicle No:</b> ${userMobStr}
<b>Customer Mobile:</b> ${STATUS_PENDING}
<b>Service:</b> 2 Wheeler PUC
<b>Amount:</b> ₹${charge}
<b>Status:</b> Pending
`);
      // -----------------------------------------------
      // 14.7 Return Order ID
      // -----------------------------------------------

      return {
        order_id,
      };
    });

    // ---------------------------------------------------
    // 15. Success Response
    // ---------------------------------------------------

    return NextResponse.json(
      {
        message: "LL exam request submitted successfully",

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
    // 16. Error Log
    // ---------------------------------------------------

    console.error("LL exam request error:", error);

    // ---------------------------------------------------
    // 17. Insufficient Balance
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
    // 18. General Error
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
