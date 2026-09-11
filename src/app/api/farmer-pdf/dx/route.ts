import { NextRequest, NextResponse } from "next/server";
import { getServiceFee } from "@/lib/actions";
import { getUserDeatail, runTransaction } from "@/lib/auth";
import type { Retailer } from "@/lib/auth";
import { generate7DigitNumber } from "@/lib/utils";
import { STATUS_SUCCESS } from "@/lib/statuses";

const SERVICE_NAME = "Farmer Agri PDF";
const SERVICE_ID = "agri_pdf";
interface FarmerAgriResponse {
  sampleCode: string;
  aadhaar?: string;
  fullname?: string;
  pdf?: string;
  status?: string | number;
  message?: string;
  error?: string;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const aadhaar = searchParams.get("aadhaar")?.trim();
    const state = searchParams.get("state")?.trim();

    if (!aadhaar || !state) {
      return NextResponse.json({ error: "Missing required parameters: aadhaar and state" }, { status: 400 });
    }

    if (!/^\d{12}$/.test(aadhaar)) {
      return NextResponse.json({ error: "Aadhaar number must be exactly 12 digits" }, { status: 400 });
    }

    if (!/^[A-Z]{2}$/.test(state)) {
      return NextResponse.json({ error: "State must be a valid 2-letter code (e.g. BR, UP, DL, MH)" }, { status: 400 });
    }

    const user: Retailer | null = await getUserDeatail(request);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.DARKXEN_KEY;
    if (!apiKey) {
      console.error("DARKXEN_KEY is missing");
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const apiBaseUrl = process.env.DARKXEN_URL;
    if (!apiBaseUrl) {
      console.error("DARKXEN_URL is missing");
      return NextResponse.json({ error: "API URL not configured" }, { status: 500 });
    }

    const { balance: oldBalance, fee: charge } = await getServiceFee(user.id, "agri_pdf_fee");

    if (!Number.isFinite(charge) || charge <= 0) {
      return NextResponse.json({ error: "Invalid Farmer Agri PDF service fee" }, { status: 500 });
    }

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

    const url = new URL(`${apiBaseUrl.replace(/\/$/, "")}/FARMER/agri_farmer_card_pdf_verification.php`);
    url.searchParams.set("apiKey", apiKey);
    url.searchParams.set("aadhar", aadhaar);
    url.searchParams.set("state", state);

    const response = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      console.error("Farmer Agri PDF API HTTP error:", response.status);
      return NextResponse.json(
        { error: `External API error: ${response.status}` },
        {
          status: response.status >= 400 && response.status < 500 ? response.status : 502,
        },
      );
    }

    let data: FarmerAgriResponse;
    try {
      data = await response.json();
    } catch {
      return NextResponse.json({ error: "Invalid response from Farmer Agri PDF API" }, { status: 502 });
    }

    const statusStr = String(data.status ?? "").trim();
    if (statusStr && statusStr !== "200") {
      return NextResponse.json(
        {
          error: data.message || data.error || "Farmer Agri PDF verification failed",
          status: data.status,
        },
        { status: statusStr === "404" ? 404 : 400 },
      );
    }

    if (!data.sampleCode || String(data.sampleCode).trim() === "") {
      return NextResponse.json(
        {
          error: data.message || data.error || "Farmer Agri PDF verification failed (no sampleCode returned)",
        },
        { status: 400 },
      );
    }

    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    const userMobStr = String(user.mobile);
    const newBalance = oldBalance - charge;
    const remark = data.fullname || data.aadhaar || aadhaar;

    const transactionResult = await runTransaction<{ order_id: string }>(async (conn) => {
      const order_id = generate7DigitNumber();

      await conn.query(
        `
            INSERT INTO \`workhistory\`
            (
              \`order_id\`, \`user_mob\`, \`service_id\`, \`service_name\`,
              \`status\`, \`old_balance\`, \`charge\`, \`new_balance\`,
              \`tranfer_type\`, \`document\`, \`date_time\`, \`remark\`
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
        [order_id, userMobStr, SERVICE_ID, SERVICE_NAME, STATUS_SUCCESS, oldBalance, charge, newBalance, "debit", data.pdf || null, now, remark],
      );

      await conn.query(
        `
            INSERT INTO \`transitions\`
            (
              \`order_id\`, \`user_mob\`, \`service_name\`,
              \`old_balance\`, \`charge\`, \`new_balance\`,
              \`tranfer_type\`, \`status\`, \`date_time\`, \`remark\`
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
        [order_id, userMobStr, SERVICE_NAME, oldBalance, charge, newBalance, "debit", STATUS_SUCCESS, now, remark],
      );

      const [updateResult] = await conn.query<any>(
        `
            UPDATE retailer
            SET balance = balance - ?
            WHERE id = ? AND balance >= ?
            LIMIT 1
          `,
        [charge, user.id, charge],
      );

      if (updateResult.affectedRows !== 1) {
        throw new Error("Insufficient balance");
      }

      return { order_id };
    });

    return NextResponse.json(
      {
        message: "Farmer Agri PDF verification successful",
        order_id: transactionResult.order_id,
        id: Number(transactionResult.order_id),
        aadhaar: data.aadhaar || aadhaar,
        state,
        charge,
        old_balance: oldBalance,
        new_balance: newBalance,
        sampleCode: data.sampleCode,
        fullname: data.fullname,
        pdf: data.pdf,
        data,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Farmer Agri PDF API call failed:", error);

    if (error?.message === "Insufficient balance") {
      return NextResponse.json({ message: "Insufficient balance" }, { status: 400 });
    }

    if (error?.message === "Retailer account not found") {
      return NextResponse.json({ message: "Retailer account not found" }, { status: 404 });
    }

    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
