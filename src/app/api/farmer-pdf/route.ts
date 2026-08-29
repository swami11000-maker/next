import { NextRequest, NextResponse } from "next/server";
import { getServiceFee } from "@/lib/actions";
import { getUserDeatail, runTransaction } from "@/lib/auth";
import type { Retailer } from "@/lib/auth";
import { generate7DigitNumber } from "@/lib/utils";
import { STATUS_SUCCESS } from "@/lib/statuses";

// -----------------------------------------------------
// Service Details
// -----------------------------------------------------

const SERVICE_NAME = "Farmer Agri PDF";

// -----------------------------------------------------
// Third-Party API Response Type
// -----------------------------------------------------

interface FarmerAgriResponse {
  status: string;
  message?: string;
  data_mode?: string;
  source?: string;
  billable?: string;
  aadhaar?: string;
  name?: string;
  application_no?: string;
  amount?: string;
  balance_left?: string;
  pdf?: string;
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
    const aadhaar = searchParams.get("aadhaar")?.trim();
    const state = searchParams.get("state")?.trim();

    if (!aadhaar || !state) {
      return NextResponse.json(
        { error: "Missing required parameters: aadhaar and state" },
        { status: 400 }
      );
    }

    // Validate Aadhaar: exactly 12 digits
    if (!/^\d{12}$/.test(aadhaar)) {
      return NextResponse.json(
        { error: "Aadhaar number must be exactly 12 digits" },
        { status: 400 }
      );
    }

    // Validate State: 2-letter uppercase code
    if (!/^[A-Z]{2}$/.test(state)) {
      return NextResponse.json(
        { error: "State must be a valid 2-letter code (e.g. BR, UP, DL, MH)" },
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
      "agri_pdf_fee"
    );

    // -------------------------------------------------
    // 6. Validate Charge
    // -------------------------------------------------

    if (!Number.isFinite(charge) || charge <= 0) {
      return NextResponse.json(
        { error: "Invalid Farmer Agri PDF service fee" },
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

    const url = new URL(`${apiBaseUrl}/farmer`);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("aadhaar", aadhaar);
    url.searchParams.set("state", state);

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
      console.error("Farmer Agri PDF API HTTP error:", response.status);
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

    let data: FarmerAgriResponse;

    try {
      data = await response.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid response from Farmer Agri PDF API" },
        { status: 502 }
      );
    }

    // -------------------------------------------------
    // 12. Check Third-Party API Business Status
    // -------------------------------------------------

    if (data.status !== "200") {
      return NextResponse.json(
        {
          error: data.message || "Farmer Agri PDF verification failed",
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
          aadhaar,
          SERVICE_NAME,
          STATUS_SUCCESS,
          oldBalance,
          charge,
          newBalance,
          "debit",
          data.pdf || null,
          now,
          data.application_no || "",
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
          data.application_no || "",
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
        message: data.message || "Agristack verification successful",
        order_id: transactionResult.order_id,
        id: Number(transactionResult.order_id),
        aadhaar,
        state,
        charge,
        old_balance: oldBalance,
        new_balance: newBalance,
        name: data.name,
        application_no: data.application_no,
        billable: data.billable,
        amount: data.amount,
        pdf: data.pdf,
        data,
      },
      { status: 200 }
    );
  } catch (error: any) {
    // -------------------------------------------------
    // Error Log
    // -------------------------------------------------

    console.error("Farmer Agri PDF API call failed:", error);

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