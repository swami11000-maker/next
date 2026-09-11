import { NextRequest, NextResponse } from "next/server";
import { getUserDeatail, runQuery, runMutation, runTransaction, isServiceEnabled } from "@/lib/auth";
import type { Retailer } from "@/lib/auth";
import { STATUS_SUCCESS, STATUS_PENDING } from "@/lib/statuses";
import { generate7DigitNumber } from "@/lib/utils";

const SERVICE_NAME = "RC Print";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const rcno = searchParams.get("rcno")?.trim();
    const cardColorType = searchParams.get("cardColorType")?.trim();
    const cardType = searchParams.get("cardType")?.trim();

    if (!rcno) {
      return NextResponse.json({ error: "Missing rcno parameter" }, { status: 400 });
    }

    const apiKey = process.env.APIZONE_API_KEY;
    const apiUrl = process.env.APIZONE_URL;
    if (!apiKey || !apiUrl) {
      return NextResponse.json({ error: "API configuration missing" }, { status: 500 });
    }

    const user: Retailer | null = await getUserDeatail(request);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!isServiceEnabled(user, "rc_print")) {
      return NextResponse.json({ message: "RC Print service is not enabled for your account" }, { status: 403 });
    }

    const feeRow = await runQuery<{ rc_print_fee: number; balance: number }[]>(`SELECT \`rc_print_fee\` AS fee, balance FROM retailer WHERE id = ? LIMIT 1`, [user.id]);

    if (feeRow.length === 0) {
      return NextResponse.json({ message: "Retailer account not found" }, { status: 404 });
    }

    const charge = Number(feeRow[0].rc_print_fee ?? 50);
    const oldBalance = Number(feeRow[0].balance ?? 0);

    if (!Number.isFinite(charge) || charge <= 0) {
      return NextResponse.json({ error: "Invalid RC print service fee" }, { status: 500 });
    }

    if (oldBalance < charge) {
      return NextResponse.json({ message: "Insufficient balance", balance: oldBalance, required: charge }, { status: 400 });
    }

    const cardtypeMap: Record<string, string> = { old: "1", new: "2" };
    const chiptypeMap: Record<string, string> = { "with-chip": "1", "without-chip": "2" };

    const url = new URL(`${apiUrl}/rc`);
    url.searchParams.append("api_key", apiKey);
    url.searchParams.append("rcno", rcno);
    if (cardColorType && cardtypeMap[cardColorType]) {
      url.searchParams.append("cardtype", cardtypeMap[cardColorType]);
    }
    if (cardType && chiptypeMap[cardType]) {
      url.searchParams.append("chiptype", chiptypeMap[cardType]);
    }

    const response = await fetch(url.toString());
    const data = await response.json();

    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    const userMobStr = String(user.mobile);
    const order_id = generate7DigitNumber();

    const transactionResult = await runTransaction<{ order_id: string; new_balance: number }>(async (conn) => {
      const [balanceRow] = await conn.query<any[]>(`SELECT balance FROM retailer WHERE id = ? LIMIT 1 FOR UPDATE`, [user.id]);

      const actualOldBalance = Number(balanceRow[0]?.balance ?? 0);
      if (actualOldBalance < charge) {
        throw new Error("Insufficient balance");
      }

      const newBalance = actualOldBalance - charge;

      await conn.query(`UPDATE retailer SET balance = balance - ? WHERE id = ? AND balance >= ? LIMIT 1`, [charge, user.id, charge]);

      const document = String(data?.pdf ?? "");

      await conn.query(
        `
          INSERT INTO \`workhistory\`
          (\`order_id\`, \`user_mob\`, \`service_id\`, \`service_name\`, \`status\`,
           \`old_balance\`, \`charge\`, \`new_balance\`, \`tranfer_type\`, \`document\`,
           \`date_time\`, \`remark\`)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [order_id, userMobStr, rcno, SERVICE_NAME, STATUS_SUCCESS, actualOldBalance, charge, newBalance, "debit", document, now, data?.application_no || ""],
      );

      await conn.query(
        `
          INSERT INTO \`transitions\`
          (\`order_id\`, \`user_mob\`, \`service_name\`, \`old_balance\`, \`charge\`,
           \`new_balance\`, \`tranfer_type\`, \`status\`, \`date_time\`, \`remark\`)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [order_id, userMobStr, SERVICE_NAME, actualOldBalance, charge, newBalance, "debit", STATUS_SUCCESS, now, data?.application_no || ""],
      );

      return { order_id, new_balance: newBalance };
    });

    if (String(data?.status) === "200" && data?.pdf) {
      return NextResponse.json({
        success: true,
        message: data.message || "RC verification successful",
        order_id: transactionResult.order_id,
        rcno: data.rcno || rcno,
        name: data.name,
        application_no: data.application_no,
        pdf: data.pdf,
        old_balance: oldBalance,
        new_balance: transactionResult.new_balance,
        charge,
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: data?.message || "RC verification failed",
        status: data?.status,
      },
      { status: 400 },
    );
  } catch (error: unknown) {
    console.error("RC Print API error:", error);
    if (error instanceof Error && error.message === "Insufficient balance") {
      return NextResponse.json({ message: "Insufficient balance" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
