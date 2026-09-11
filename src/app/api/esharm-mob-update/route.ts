import { NextRequest, NextResponse } from "next/server";
import { getServiceFee } from "@/lib/actions";
import { getUserDeatail, runTransaction, isServiceEnabled } from "@/lib/auth";
import type { Retailer } from "@/lib/auth";
import { generate7DigitNumber } from "@/lib/utils";
import { STATUS_SUCCESS } from "@/lib/statuses";

const SERVICE_NAME = "E-Sharm Mobile No Update";

interface MobileUpdateData {
  uid_no: string;
  uan_no: string;
  name: string;
  old_mobile: string;
  new_mobile: string;
}

interface MobileUpdateResponse {
  Status: string;
  StatusCode: number;
  application_no: string;
  message: string;
  data: MobileUpdateData;
  billable: boolean;
  transaction_id: string;
  success: boolean;
  NewBalance: number;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const uid = searchParams.get("uid")?.trim();
    const dob = searchParams.get("dob")?.trim();
    const mobile = searchParams.get("mobile")?.trim();

    if (!uid || !dob || !mobile) {
      return NextResponse.json({ error: "Missing required parameters: uid, dob and mobile" }, { status: 400 });
    }

    if (!/^\d{12}$/.test(uid)) {
      return NextResponse.json({ error: "UID must be exactly 12 digits" }, { status: 400 });
    }

    if (!/^\d{10}$/.test(mobile)) {
      return NextResponse.json({ error: "Mobile number must be exactly 10 digits" }, { status: 400 });
    }

    const user: Retailer | null = await getUserDeatail(request);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!isServiceEnabled(user, "esharm_mob_update")) {
      return NextResponse.json({ message: "E-Sharm Mobile Update service is not enabled for your account" }, { status: 403 });
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

    const { balance: oldBalance, fee: charge } = await getServiceFee(user.id, "esharm_mob_update_fee");

    if (!Number.isFinite(charge) || charge <= 0) {
      return NextResponse.json({ error: "Invalid E-Sharm mobile update service fee" }, { status: 500 });
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

    // Provider expects DD/MM/YYYY
    const providerDob = dob.includes("-") ? dob.replace(/-/g, "/") : dob;

    const base = apiBaseUrl.replace(/\/+$/, "");
    const url = new URL(`${base}/AADHAR/eshram_mobile_update.php`);
    url.searchParams.set("apiKey", apiKey);
    url.searchParams.set("uid", uid);
    url.searchParams.set("dob", providerDob);
    url.searchParams.set("mobile", mobile);

    const response = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    let apiData: MobileUpdateResponse;
    try {
      apiData = await response.json();
    } catch {
      if (!response.ok) {
        return NextResponse.json(
          { error: `External API error: ${response.status}` },
          {
            status: response.status >= 400 && response.status < 500 ? response.status : 502,
          },
        );
      }
      return NextResponse.json({ error: "Invalid response from E-Sharm API" }, { status: 502 });
    }

    // Provider returns: success: true, StatusCode: 100, Status: "Success"
    if (!response.ok || !apiData.success || apiData.StatusCode !== 100) {
      return NextResponse.json(
        {
          error: apiData.message || "E-Sharm mobile update request failed",
          status: apiData.Status,
          statusCode: apiData.StatusCode,
        },
        {
          status: apiData.StatusCode === 404 || apiData.StatusCode === 102 ? 404 : 400,
        },
      );
    }

    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    const userMobStr = String(user.mobile);
    const newBalance = oldBalance - charge;

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
        [order_id, userMobStr, uid, SERVICE_NAME, STATUS_SUCCESS, oldBalance, charge, newBalance, "debit", null, now, `${apiData.application_no} | TXN: ${apiData.transaction_id}`],
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
        [order_id, userMobStr, SERVICE_NAME, oldBalance, charge, newBalance, "debit", STATUS_SUCCESS, now, `${apiData.application_no} | TXN: ${apiData.transaction_id}`],
      );

      const [updateResult] = await conn.query<any>(`UPDATE retailer SET balance = balance - ? WHERE id = ? AND balance >= ? LIMIT 1`, [charge, user.id, charge]);

      if (updateResult.affectedRows !== 1) {
        throw new Error("Insufficient balance");
      }

      return { order_id };
    });

    return NextResponse.json(
      {
        message: apiData.message || "Mobile updated successfully",
        order_id: transactionResult.order_id,
        id: Number(transactionResult.order_id),
        uid,
        dob,
        mobile,
        charge,
        old_balance: oldBalance,
        new_balance: newBalance,
        name: apiData.data.name,
        uan_no: apiData.data.uan_no,
        uid_no: apiData.data.uid_no,
        old_mobile: apiData.data.old_mobile,
        new_mobile: apiData.data.new_mobile,
        application_no: apiData.application_no,
        transaction_id: apiData.transaction_id,
        status: apiData.Status,
        statusCode: apiData.StatusCode,
        data: apiData,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("E-Sharm Mobile Update API call failed:", error);

    if (error?.message === "Insufficient balance") {
      return NextResponse.json({ message: "Insufficient balance" }, { status: 400 });
    }

    if (error?.message === "Retailer account not found") {
      return NextResponse.json({ message: "Retailer account not found" }, { status: 404 });
    }

    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
