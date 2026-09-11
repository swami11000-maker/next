import { NextRequest, NextResponse } from "next/server";
import { getUserDeatail, runMutation, runQuery } from "@/lib/auth";
import type { Retailer } from "@/lib/auth";
import { generateOrder } from "@/lib/utils";

const GATEWAY_BASE = (process.env.GATEWAY_URL || "https://pay.a1ejankari.com/api").replace(/\/+$/, "");
const GATEWAY_USER_TOKEN = process.env.GATEWAY_USER_TOKEN || "";
const REDIRECT_URL = "http://localhost:3000";

function buildGatewayFormPayload(payload: Record<string, string>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(payload)) {
    if (value) params.set(key, value);
  }
  return params;
}

export async function callCheckOrderStatus(orderId: string, request: Request) {
  const payload = buildGatewayFormPayload({
    user_token: GATEWAY_USER_TOKEN,
    order_id: orderId,
  });

  const gatewayResponse = await fetch(`${GATEWAY_BASE}/check-order-status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: payload.toString(),
    cache: "no-store",
  });

  const cb = await gatewayResponse.json();
  if (cb.status === "COMPLETED") {
    const users = await runQuery<Retailer[]>("SELECT balance,mobile ,lastaddmoneyid FROM retailer WHERE mobile = ? LIMIT 1", [cb.result.customer_mobile]);
    const user = users[0];
    if (!user || user.mobile !== cb.result.customer_mobile) {
      throw new Error("User not found");
    }
    if (user.lastaddmoneyid === orderId) {
      return NextResponse.redirect("http://localhost:3000/retailer");
    }
    await runMutation("UPDATE retailer SET balance = ? ,lastaddmoneyid = ? WHERE mobile = ? LIMIT 1", [Number(cb.result.amount) + Number(user.balance), orderId, cb.result.customer_mobile]);
    await runMutation(
      `
      INSERT INTO \`transitions\`
      (\`order_id\`, \`user_mob\`, \`service_name\`, \`old_balance\`, \`charge\`, \`new_balance\`, \`tranfer_type\`, \`status\`, \`date_time\`, \`remark\`)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [orderId, cb.result.customer_mobile, "Add Money", Number(user.balance), Number(cb.result.amount), Number(cb.result.amount) + Number(user.balance), "credit", "success", cb.result.date, "Add money to wallet"],
    );
    await runMutation(
      `
    INSERT INTO \`gateway_transactions\`
    (
      \`order_id\`,
      \`user_mob\`,
      \`amount\`,
      \`payment_type\`,
      \`status\`,
      \`txn_status\`,
      \`utr\`,
      \`remark1\`,
      \`remark2\`,
      \`date_time\`
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
      [
        orderId,
        cb.result.customer_mobile, // user_mob
        cb.result.amount, // amount
        "add_money", // payment_type
        cb.status, // status
        cb.result.txnStatus, // txn_status
        cb.result.utr, // utr
        cb.result.remark1, // remark1
        cb.result.remark2, // remark2
        cb.result.date, // date_time
      ],
    );
    return NextResponse.redirect("http://localhost:3000/retailer");
  } else {
    return "Your payment is still pending. Please check again later. contact to Admin";
  }
}
export async function GET(request: NextRequest) {
  try {
    const orderId = request.nextUrl.searchParams.get("order_id");

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          message: "Order ID is required",
        },
        { status: 400 },
      );
    }

    const result = await callCheckOrderStatus(orderId, request);

    return NextResponse.redirect("http://localhost:3000/retailer");
  } catch (error) {
    console.error("Payment status error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to check payment status",
      },
      { status: 500 },
    );
  }
}
export async function POST(request: NextRequest) {
  try {
    const user: Retailer | null = await getUserDeatail(request);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const uniqueOrderId = generateOrder();
    const { amount } = await request.json();
    const paymentType = "add_money";

    const gatewayPayload = buildGatewayFormPayload({
      customer_mobile: String(user.mobile),
      user_token: GATEWAY_USER_TOKEN,
      amount: amount.toString(),
      order_id: uniqueOrderId.toString(),
      redirect_url: `http://localhost:3000/api/payment/addmoney?order_id=${uniqueOrderId}`,
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/payment/callback`,
      remark1: `amount:${amount}, type:${paymentType}`,
      remark2: `user_id:${user.id}`,
    });

    const gatewayResponse = await fetch(`${GATEWAY_BASE}/create-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: gatewayPayload.toString(),
      cache: "no-store",
    });

    const result = await gatewayResponse.json();
    if (result.status && result.result.orderId) {
      return NextResponse.json({
        status: result.status,
        massage: result.message,
        paytm_link: result?.result?.payment_url,
      });
    }
    {
      return NextResponse.json({ message: "Failed to create order", status: false }, { status: 500 });
    }
  } catch (error: unknown) {
    console.error("Self activation error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
