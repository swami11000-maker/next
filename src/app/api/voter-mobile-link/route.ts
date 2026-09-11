import { NextRequest, NextResponse } from "next/server";
import { getServiceFee } from "@/lib/actions";
import { getUserDeatail, runTransaction, isServiceEnabled } from "@/lib/auth";
import type { Retailer } from "@/lib/auth";
import { generate7DigitNumber } from "@/lib/utils";
import { STATUS_SUCCESS } from "@/lib/statuses";

// -----------------------------------------------------
// Service Details
// -----------------------------------------------------

const SERVICE_NAME = "Voter Mobile Link";

// -----------------------------------------------------
// Third-Party API Response Type
// -----------------------------------------------------

interface VoterLinkResponse {
  status: string;
  message?: string;
  epic?: string;
  mobile?: string;
  ref_id?: string;
  application_no?: string;
  balance_left?: string;
}

// -----------------------------------------------------
// GET
// -----------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    // -------------------------------------------------
    // 1. Get Parameters
    // -------------------------------------------------

    const searchParams = request.nextUrl.searchParams;
    const epic = searchParams.get("epic")?.trim();
    const mobile = searchParams.get("mobile")?.trim();

    if (!epic || !mobile) {
      return NextResponse.json(
        { error: "Missing required parameters: epic and mobile" },
        { status: 400 }
      );
    }

    // Validate mobile is exactly 10 digits
    if (!/^\d{10}$/.test(mobile)) {
      return NextResponse.json(
        { error: "Mobile number must be exactly 10 digits" },
        { status: 400 }
      );
    }

    // -------------------------------------------------
    // 2. Get Logged-in Retailer
    // -------------------------------------------------

    const user: Retailer | null = await getUserDeatail(request);

    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!isServiceEnabled(user, "voter_mobile_link")) {
      return NextResponse.json(
        { message: "Voter Mobile Link service is not enabled for your account" },
        { status: 403 }
      );
    }

    // -------------------------------------------------
    // 3. Get API Key
    // -------------------------------------------------

    const apiKey = process.env.APIZONE_API_KEY;

    if (!apiKey) {
      console.error("APIZONE_API_KEY is missing");
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    // -------------------------------------------------
    // 4. Get API Base URL
    // -------------------------------------------------

    const apiBaseUrl = process.env.APIZONE_URL;

    if (!apiBaseUrl) {
      console.error("APIZONE_URL is missing");
      return NextResponse.json(
        { error: "API URL not configured" },
        { status: 500 }
      );
    }

    // -------------------------------------------------
    // 5. Get Retailer Balance + Service Fee
    // -------------------------------------------------

    const { balance: oldBalance, fee: charge } = await getServiceFee(
      user.id,
      "voter_mobile_link_fee"
    );

    // -------------------------------------------------
    // 6. Validate Charge
    // -------------------------------------------------

    if (!Number.isFinite(charge) || charge <= 0) {
      return NextResponse.json(
        { error: "Invalid voter mobile link service fee" },
        { status: 500 }
      );
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
        { status: 400 }
      );
    }

    // -------------------------------------------------
    // 8. Create External API URL
    // -------------------------------------------------

    const url = new URL(`${apiBaseUrl}/voter_link_instent`);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("epic", epic);
    url.searchParams.set("mobile", mobile);

    // -------------------------------------------------
    // 9. Call External API
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
      console.error("Voter link API HTTP error:", response.status);
      return NextResponse.json(
        { error: `External API error: ${response.status}` },
        {
          status:
            response.status >= 400 && response.status < 500
              ? response.status
              : 502,
        }
      );
    }

    // -------------------------------------------------
    // 11. Parse External API Response
    // -------------------------------------------------

    let data: VoterLinkResponse;

    try {
      data = await response.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid response from voter link API" },
        { status: 502 }
      );
    }

    // -------------------------------------------------
    // 12. Check Third-Party API Business Status
    // -------------------------------------------------

    if (data.status !== "200") {
      return NextResponse.json(
        {
          error: data.message || "Voter mobile link request failed",
          status: data.status,
        },
        {
          status: data.status === "404" ? 404 : 400,
        }
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
        [
          order_id,
          userMobStr,
          epic,
          SERVICE_NAME,
          STATUS_SUCCESS,
          oldBalance,
          charge,
          newBalance,
          "debit",
          null,
          now,
          data.ref_id || "",
        ]
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
        [
          order_id,
          userMobStr,
          SERVICE_NAME,
          oldBalance,
          charge,
          newBalance,
          "debit",
          STATUS_SUCCESS,
          now,
          data.ref_id || "",
        ]
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
        [charge, user.id, charge]
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
        message:
          data.message || "Voter mobile link request submitted successfully",
        order_id: transactionResult.order_id,
        id: Number(transactionResult.order_id),
        epic,
        mobile,
        charge,
        old_balance: oldBalance,
        new_balance: newBalance,
        ref_id: data.ref_id,
        application_no: data.application_no,
        data,
      },
      { status: 200 }
    );
  } catch (error: any) {
    // -------------------------------------------------
    // Error Log
    // -------------------------------------------------

    console.error("Voter mobile link API call failed:", error);

    // -------------------------------------------------
    // Insufficient Balance
    // -------------------------------------------------

    if (error?.message === "Insufficient balance") {
      return NextResponse.json(
        { message: "Insufficient balance" },
        { status: 400 }
      );
    }

    // -------------------------------------------------
    // Retailer Not Found
    // -------------------------------------------------

    if (error?.message === "Retailer account not found") {
      return NextResponse.json(
        { message: "Retailer account not found" },
        { status: 404 }
      );
    }

    // -------------------------------------------------
    // General Error
    // -------------------------------------------------

    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}