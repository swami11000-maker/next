import { NextRequest, NextResponse } from "next/server";
import {
  getUserDeatail,
  runQuery,
  runTransaction,
  isServiceEnabled,
} from "@/lib/auth";
import type { Retailer } from "@/lib/auth";
import { STATUS_SUCCESS } from "@/lib/statuses";
import {
  generate7DigitNumber,
  getIndianDateTime,
} from "@/lib/utils";

const SERVICE_NAME = "RC Print";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const rcno = searchParams.get("rcNumber")?.trim();
    const cardColorType = searchParams.get("cardColorType")?.trim();
    const cardType = searchParams.get("cardType")?.trim();

    if (!rcno) {
      return NextResponse.json(
        { error: "Missing rcno parameter" },
        { status: 400 },
      );
    }

    const apiKey = process.env.APIZONE_API_KEY;
    const apiUrl = process.env.APIZONE_URL;

    if (!apiKey || !apiUrl) {
      return NextResponse.json(
        { error: "API configuration missing" },
        { status: 500 },
      );
    }

    // --------------------------------------------------
    // AUTH
    // --------------------------------------------------

    const user: Retailer | null = await getUserDeatail(request);

    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 },
      );
    }

    // --------------------------------------------------
    // SERVICE CHECK
    // --------------------------------------------------

    if (!isServiceEnabled(user, "rc_print")) {
      return NextResponse.json(
        {
          message:
            "RC Print service is not enabled for your account",
        },
        { status: 403 },
      );
    }

    // --------------------------------------------------
    // GET CURRENT FEE + BALANCE
    // --------------------------------------------------

    const feeRow = await runQuery<
      { fee: number; balance: number }[]
    >(
      `
        SELECT
          rc_print_fee AS fee,
          balance
        FROM retailer
        WHERE id = ?
        LIMIT 1
      `,
      [user.id],
    );

    if (feeRow.length === 0) {
      return NextResponse.json(
        { message: "Retailer account not found" },
        { status: 404 },
      );
    }

    const charge = Number(feeRow[0].fee ?? 50);
    const oldBalance = Number(feeRow[0].balance ?? 0);

    if (!Number.isFinite(charge) || charge <= 0) {
      return NextResponse.json(
        { error: "Invalid RC print service fee" },
        { status: 500 },
      );
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

    // --------------------------------------------------
    // APIZONE REQUEST
    // --------------------------------------------------

    const cardtypeMap: Record<string, string> = {
      old: "1",
      new: "2",
    };

    const chiptypeMap: Record<string, string> = {
      "with-chip": "1",
      "without-chip": "2",
    };

    const url = new URL(`${apiUrl}/rc`);

    url.searchParams.append("api_key", apiKey);
    url.searchParams.append("rcno", rcno);

    if (cardColorType && cardtypeMap[cardColorType]) {
      url.searchParams.append(
        "cardtype",
        cardtypeMap[cardColorType],
      );
    }

    if (cardType && chiptypeMap[cardType]) {
      url.searchParams.append(
        "chiptype",
        chiptypeMap[cardType],
      );
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: "RC provider request failed",
        },
        { status: 502 },
      );
    }

    const data = await response.json();

    // --------------------------------------------------
    // SUCCESS
    // --------------------------------------------------

    if (String(data?.status) === "200" && data?.pdf) {
      const now = getIndianDateTime();
      const userMobStr = String(user.mobile);
      const order_id = generate7DigitNumber();

      const transactionResult = await runTransaction<{
        order_id: string;
        old_balance: number;
        new_balance: number;
      }>(async (conn) => {
        // Lock retailer balance row
        const [balanceRow] = await conn.query<any[]>(
          `
            SELECT balance
            FROM retailer
            WHERE id = ?
            LIMIT 1
            FOR UPDATE
          `,
          [user.id],
        );

        if (!balanceRow?.length) {
          throw new Error("Retailer account not found");
        }

        const actualOldBalance = Number(
          balanceRow[0]?.balance ?? 0,
        );

        // Re-check balance inside transaction
        if (actualOldBalance < charge) {
          throw new Error("Insufficient balance");
        }

        const newBalance = actualOldBalance - charge;

        // Deduct balance
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

        if (updateResult?.affectedRows !== 1) {
          throw new Error("Insufficient balance");
        }

        const document = String(data?.pdf ?? "");
        const remark = String(data?.application_no ?? "");

        // ------------------------------------------------
        // WORK HISTORY
        // ------------------------------------------------

        await conn.query(
          `
            INSERT INTO workhistory
            (
              order_id,
              user_mob,
              service_id,
              service_name,
              status,
              old_balance,
              charge,
              new_balance,
              tranfer_type,
              document,
              date_time,
              remark
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            order_id,
            userMobStr,
            rcno,
            SERVICE_NAME,
            STATUS_SUCCESS,
            actualOldBalance,
            charge,
            newBalance,
            "debit",
            document,
            now,
            remark,
          ],
        );

        // ------------------------------------------------
        // TRANSACTION HISTORY
        // ------------------------------------------------

        await conn.query(
          `
            INSERT INTO transitions
            (
              order_id,
              user_mob,
              service_name,
              old_balance,
              charge,
              new_balance,
              tranfer_type,
              status,
              date_time,
              remark
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
            remark,
          ],
        );

        return {
          order_id,
          old_balance: actualOldBalance,
          new_balance: newBalance,
        };
      });

      // --------------------------------------------------
      // SUCCESS RESPONSE
      // --------------------------------------------------

      return NextResponse.json({
        success: true,
        message:
          data.message || "RC verification successful",

        order_id: transactionResult.order_id,

        rcno: data.rcno || rcno,
        name: data.name,
        application_no: data.application_no,

        pdf: data.pdf,

        old_balance: transactionResult.old_balance,
        new_balance: transactionResult.new_balance,

        charge,
      });
    }

    // --------------------------------------------------
    // PROVIDER FAILURE
    // --------------------------------------------------

    return NextResponse.json(
      {
        success: false,
        message:
          data?.message || "RC verification failed",
        status: data?.status,
      },
      { status: 400 },
    );
  } catch (error: unknown) {
    console.error("RC Print API error:", error);

    if (
      error instanceof Error &&
      error.message === "Insufficient balance"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Insufficient balance",
        },
        { status: 400 },
      );
    }

    if (
      error instanceof Error &&
      error.message === "Retailer account not found"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Retailer account not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}
