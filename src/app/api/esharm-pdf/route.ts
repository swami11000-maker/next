import { NextRequest, NextResponse } from "next/server";

import { getServiceFee } from "@/lib/actions";
import { getUserDeatail, runTransaction, isServiceEnabled } from "@/lib/auth";
import type { Retailer } from "@/lib/auth";
import { generate7DigitNumber, getIndianDateTime } from "@/lib/utils";
import { STATUS_SUCCESS } from "@/lib/statuses";

export interface EshramPdfResponse {
  StatusCode?: number;
  Status?: string | number;
  application_no?: string;
  message: string;
  data?: EshramPdfData;
}

export interface EshramPdfData {
  uid_no: string;
  name: string;
  dob: string;
  gender: string;
  uan: string;
  address: string;
  pdf: string;
}

const SERVICE_NAME = "E-Sharm PDF Download";
const SERVICE_FEE_KEY = "esharm_pdf_fee";

export async function GET(request: NextRequest) {
  try {
    // --------------------------------------------------
    // 1. Get Parameters
    // --------------------------------------------------
    const searchParams = request.nextUrl.searchParams;
    const aadhaar_no = searchParams.get("aadhaar_no")?.trim();
    const dob = searchParams.get("dob")?.trim();

    if (!aadhaar_no || !dob) {
      return NextResponse.json(
        { error: "Missing required parameters: aadhaar_no and dob" },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // 2. Validate Aadhaar
    // --------------------------------------------------
    if (!/^\d{12}$/.test(aadhaar_no)) {
      return NextResponse.json(
        { error: "Aadhaar number must be exactly 12 digits" },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // 3. Validate DOB
    // --------------------------------------------------
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) {
      return NextResponse.json(
        { error: "DOB must be in DD/MM/YYYY format" },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // 4. Get Logged-in Retailer
    // --------------------------------------------------
    const user: Retailer | null = await getUserDeatail(request);
    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 },
      );
    }

    if (!isServiceEnabled(user, "esharm_pdf")) {
      return NextResponse.json({ message: "E-Sharm PDF service is not enabled for your account" }, { status: 403 });
    }

    // --------------------------------------------------
    // 5. Get API Key
    // --------------------------------------------------
    const apiKey = process.env.DARKXEN_KEY;
    if (!apiKey) {
      console.error("DARKXEN_KEY is missing");
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 },
      );
    }

    // --------------------------------------------------
    // 6. Get API Base URL
    // --------------------------------------------------
    const apiBaseUrl = `${process.env.DARKXEN_URL}/AADHAR/`;
    if (!apiBaseUrl) {
      console.error("DARKXEN_URL is missing");
      return NextResponse.json(
        { error: "API URL not configured" },
        { status: 500 },
      );
    }

    // --------------------------------------------------
    // 7. Get Service Fee
    // --------------------------------------------------
    const serviceFeeData = await getServiceFee(user.id, SERVICE_FEE_KEY);
    const charge = Number(serviceFeeData.fee);
    const oldBalanceFromService = Number(serviceFeeData.balance);

    if (!Number.isFinite(charge) || charge <= 0) {
      return NextResponse.json(
        { error: "Invalid E-Sharm PDF service fee" },
        { status: 500 },
      );
    }

    if (!Number.isFinite(oldBalanceFromService) || oldBalanceFromService < 0) {
      return NextResponse.json(
        { error: "Unable to determine retailer balance" },
        { status: 500 },
      );
    }

    // --------------------------------------------------
    // 8. Initial Balance Check
    // --------------------------------------------------
    if (oldBalanceFromService < charge) {
      return NextResponse.json(
        {
          message: "Insufficient balance",
          balance: oldBalanceFromService,
          required: charge,
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // 9. Create External API URL
    // --------------------------------------------------
    const baseUrl = apiBaseUrl.endsWith("/") ? apiBaseUrl : `${apiBaseUrl}/`;
    const base = `${baseUrl}uid_eshram_pdf_verification.php`;
    const url = `${base}?apiKey=${encodeURIComponent(apiKey)}&aadhaar_no=${encodeURIComponent(aadhaar_no)}&dob=${dob}`;


    // --------------------------------------------------
    // 10. Call External API
    // --------------------------------------------------
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    // --------------------------------------------------
    // 11. Read Response
    // --------------------------------------------------
    const responseText = await response.text();
    let data: EshramPdfResponse;

    try {
      data = JSON.parse(responseText);
    } catch {
      console.error(
        "E-Sharm API returned non-JSON response:",
        responseText.slice(0, 500),
      );
      return NextResponse.json(
        { error: "Invalid response from E-Sharm API" },
        { status: 502 },
      );
    }

    // --------------------------------------------------
    // 12. Validate API Status (NEW - pehle balance deduct nahi hoga)
    // --------------------------------------------------
    const isSuccess =
      data.Status === "Success" ||
      data.Status === 100 ||
      data.StatusCode === 100;

    if (!isSuccess) {
      return NextResponse.json(
        {
          success: false,
          message: data.message || "E-Sharm API request failed",
          status: data.Status,
          statusCode: data.StatusCode,
        },
        { status: 400 },
      );
    }

    if (!data.data) {
      return NextResponse.json(
        { error: "E-Sharm API response missing data object" },
        { status: 502 },
      );
    }

    // --------------------------------------------------
    // 13. Prepare Transaction Data
    // --------------------------------------------------
    const now = getIndianDateTime();
    const userMobStr = String(user.mobile);

    // --------------------------------------------------
    // 14. Database Transaction
    // --------------------------------------------------
    const transactionResult = await runTransaction<{
      order_id: string;
      old_balance: number;
      new_balance: number;
    }>(async (conn) => {
      // Lock retailer row
      const [rows] = await conn.query<any[]>(
        `SELECT balance FROM retailer WHERE id = ? LIMIT 1 FOR UPDATE`,
        [user.id],
      );

      if (!rows || rows.length === 0) {
        throw new Error("Retailer account not found");
      }

      const actualOldBalance = Number(rows[0].balance);
      if (!Number.isFinite(actualOldBalance)) {
        throw new Error("Invalid retailer balance");
      }

      // Check balance inside transaction
      if (actualOldBalance < charge) {
        throw new Error("Insufficient balance");
      }

      const newBalance = actualOldBalance - charge;
      const order_id = generate7DigitNumber();

      // ------------------------------------------------
      // Work History
      // ------------------------------------------------
      await conn.query(
        `
          INSERT INTO \`workhistory\`
          (
            \`order_id\`, \`user_mob\`, \`service_id\`, \`service_name\`, \`status\`,
            \`old_balance\`, \`charge\`, \`new_balance\`, \`tranfer_type\`, \`document\`,
            \`date_time\`, \`remark\`
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          order_id,
          userMobStr,
          aadhaar_no,
          SERVICE_NAME,
          STATUS_SUCCESS,
          actualOldBalance,
          charge,
          newBalance,
          "debit",
          data.data?.pdf ?? "", // Fixed: nested data.data?.pdf
          now,
          data.application_no || "",
        ],
      );

      // ------------------------------------------------
      // Transaction History
      // ------------------------------------------------
      await conn.query(
        `
          INSERT INTO \`transitions\`
          (
            \`order_id\`, \`user_mob\`, \`service_name\`, \`old_balance\`, \`charge\`,
            \`new_balance\`, \`tranfer_type\`, \`status\`, \`date_time\`, \`remark\`
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          order_id,
          userMobStr,
          SERVICE_NAME,
          actualOldBalance,
          charge,
          newBalance,
          "debit",
          STATUS_SUCCESS,
          now,
          data.application_no || "",
        ],
      );

      // ------------------------------------------------
      // Update Retailer Balance
      // ------------------------------------------------
      const [updateResult] = await conn.query<any>(
        `UPDATE retailer SET balance = balance - ? WHERE id = ? AND balance >= ? LIMIT 1`,
        [charge, user.id, charge],
      );

      if (updateResult.affectedRows !== 1) {
        throw new Error("Insufficient balance");
      }

      return {
        order_id,
        old_balance: actualOldBalance,
        new_balance: newBalance,
      };
    });

    // --------------------------------------------------
    // 15. Success Response
    // --------------------------------------------------
    const responsePayload = {
      success: true,
      message: data.message || "E-Sharm PDF generated successfully",
      order_id: transactionResult.order_id,
      id: Number(transactionResult.order_id),
      aadhaar_no,
      dob,
      charge,
      old_balance: transactionResult.old_balance,
      new_balance: transactionResult.new_balance,
      name: data.data?.name,         // Fixed: nested data.data?.name
      application_no: data.application_no,
      pdf: data.data?.pdf,           // Fixed: nested data.data?.pdf
      data: data.data,               // Fixed: ab sirf nested data object jayega
      // api_response: data,            // Optional: poora raw response alag se
    };


    return NextResponse.json(
      responsePayload,
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("E-Sharm PDF API call failed:", error);

    if (error instanceof Error && error.message === "Insufficient balance") {
      return NextResponse.json(
        { message: "Insufficient balance" },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "Retailer account not found") {
      return NextResponse.json(
        { message: "Retailer account not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}