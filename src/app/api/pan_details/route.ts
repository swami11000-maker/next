import { NextRequest, NextResponse } from "next/server";
import { getServiceFee } from "@/lib/actions";
import { getUserDeatail, runTransaction, isServiceEnabled } from "@/lib/auth";
import type { Retailer } from "@/lib/auth";
import { generate7DigitNumber } from "@/lib/utils";
import { STATUS_SUCCESS } from "@/lib/statuses";

// -----------------------------------------------------
// Service Details
// -----------------------------------------------------

const SERVICE_NAME = "PAN Details";

// -----------------------------------------------------
// Third-Party API Response Type
// -----------------------------------------------------

interface PanApiResponse {
  status: string;
  pan_no?: string;
  name?: string;
  father?: string;
  dob?: string;
  gender?: string;
  application_no?: string;
  message?: string;
}

// -----------------------------------------------------
// GET
// -----------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    // -------------------------------------------------
    // 1. Get PAN Number
    // -------------------------------------------------

    const searchParams = request.nextUrl.searchParams;
    const panno = searchParams.get("panno")?.trim();

    if (!panno) {
      return NextResponse.json({ error: "Missing panno parameter" }, { status: 400 });
    }

    // -------------------------------------------------
    // 2. Get Logged-in Retailer
    // -------------------------------------------------

    const user: Retailer | null = await getUserDeatail(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // if (!isServiceEnabled(user, "pandetils")) {
    //   return NextResponse.json({ message: "PAN Details service is not enabled for your account" }, { status: 403 });
    // }

    // -------------------------------------------------
    // 3. Get API Key
    // -------------------------------------------------

    const apiKey = process.env.APIZONE_API_KEY;

    if (!apiKey) {
      console.error("APIZONE_API_KEY is missing");
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    // -------------------------------------------------
    // 4. Get API URL
    // -------------------------------------------------

    const apiBaseUrl = `${process.env.APIZONE_URL}/pan_details`;

    if (!apiBaseUrl) {
      console.error("APIZONE_URL is missing");
      return NextResponse.json({ error: "API URL not configured" }, { status: 500 });
    }

    // -------------------------------------------------
    // 5. Get Retailer Balance + PAN Fee
    // -------------------------------------------------

    const { balance: oldBalance, fee: charge } = await getServiceFee(user.id, "pandetils_fee");

    // -------------------------------------------------
    // 6. Validate Charge
    // -------------------------------------------------

    if (!Number.isFinite(charge) || charge <= 0) {
      return NextResponse.json({ error: "Invalid PAN service fee" }, { status: 500 });
    }

    // -------------------------------------------------
    // 7. Check Balance Before API Call
    // -------------------------------------------------

    if (oldBalance < charge) {
      return NextResponse.json(
        {
          message: "Insufficient balance",
          balance: oldBalance,
          required: charge,
        },
        { status: 400 },
      );
    }

    // -------------------------------------------------
    // 8. Create External API URL
    // -------------------------------------------------

    const url = new URL(apiBaseUrl);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("panno", panno);

    // -------------------------------------------------
    // 9. Call PAN External API
    // -------------------------------------------------

    const response = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    // -------------------------------------------------
    // 10. External API HTTP Error
    // -------------------------------------------------

    if (!response.ok) {
      console.error("PAN external API error:", response.status);
      return NextResponse.json(
        { error: `External API error: ${response.status}` },
        {
          status: response.status >= 400 && response.status < 500 ? response.status : 502,
        },
      );
    }

    // -------------------------------------------------
    // 11. Parse External API Response
    // -------------------------------------------------

    let data: PanApiResponse;

    try {
      data = await response.json();
    } catch {
      return NextResponse.json({ error: "Invalid response from PAN API" }, { status: 502 });
    }

    // -------------------------------------------------
    // 12. Check Third-Party API Business Status
    // -------------------------------------------------

    // IMPORTANT: status is a STRING ("200", "404"), not a number
    if (data.status !== "200") {
      return NextResponse.json(
        {
          error: data.message || "PAN lookup failed",
          status: data.status,
        },
        {
          // Return 404 if PAN not found, otherwise 400
          status: data.status === "404" ? 404 : 400,
        },
      );
    }

    // -------------------------------------------------
    // 13. Current Date/Time
    // -------------------------------------------------

    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    const userMobStr = String(user.mobile);

    // -------------------------------------------------
    // 14. Calculate New Balance
    // -------------------------------------------------

    const newBalance = oldBalance - charge;

    // -------------------------------------------------
    // 15. Database Transaction
    // -------------------------------------------------

    const transactionResult = await runTransaction<{
      order_id: string;
    }>(async (conn) => {
      // ---------------------------------------------
      // Generate UNIQUE 7 Digit Order ID
      // ---------------------------------------------

      const order_id = generate7DigitNumber();

      // ---------------------------------------------
      // Work History
      // ---------------------------------------------

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
        [order_id, userMobStr, data.pan_no, SERVICE_NAME, STATUS_SUCCESS, oldBalance, charge, newBalance, "debit", null, now, ""],
      );

      // ---------------------------------------------
      // Transaction History
      // ---------------------------------------------

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

      // ---------------------------------------------
      // Update Retailer Balance
      // Re-check balance inside transaction.
      // ---------------------------------------------

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

      // ---------------------------------------------
      // Balance Update Failed
      // ---------------------------------------------

      if (updateResult.affectedRows !== 1) {
        throw new Error("Insufficient balance");
      }

      // ---------------------------------------------
      // Return Order ID
      // ---------------------------------------------

      return { order_id };
    });

    // -------------------------------------------------
    // 16. Success Response
    // -------------------------------------------------

    return NextResponse.json(
      {
        message: "PAN details fetched successfully",
        order_id: transactionResult.order_id,
        id: Number(transactionResult.order_id),
        panno,
        charge,
        old_balance: oldBalance,
        new_balance: newBalance,
        data,
      },
      { status: 200 },
    );
  } catch (error: any) {
    // -------------------------------------------------
    // Error Log
    // -------------------------------------------------

    console.error("PAN API call failed:", error);

    // -------------------------------------------------
    // Insufficient Balance
    // -------------------------------------------------

    if (error?.message === "Insufficient balance") {
      return NextResponse.json({ message: "Insufficient balance" }, { status: 400 });
    }

    // -------------------------------------------------
    // Retailer Not Found
    // -------------------------------------------------

    if (error?.message === "Retailer account not found") {
      return NextResponse.json({ message: "Retailer account not found" }, { status: 404 });
    }

    // -------------------------------------------------
    // General Error
    // -------------------------------------------------

    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
