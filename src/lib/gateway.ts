import { NextResponse } from "next/server";
import { runMutation, runQuery } from "@/lib/auth";
import type { Retailer } from "@/lib/auth";

const GATEWAY_BASE = (process.env.GATEWAY_URL || "https://pay.a1ejankari.com/api").replace(/\/+$/, "");
const GATEWAY_USER_TOKEN = process.env.GATEWAY_USER_TOKEN || "";
const REDIRECT_URL = process.env.GATEWAY_REDIRECT_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function buildGatewayFormPayload(payload: Record<string, string>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(payload)) {
    if (value) params.set(key, value);
  }
  return params;
}

export async function callCheckOrderStatus(orderId: string) {
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
    await runMutation("UPDATE retailer SET status = 'active' WHERE mobile = ? LIMIT 1", [cb.result.customer_mobile]);
    await runMutation(
      `
      INSERT INTO \`transitions\`
      (\`order_id\`, \`user_mob\`, \`service_name\`, \`old_balance\`, \`charge\`, \`new_balance\`, \`tranfer_type\`, \`status\`, \`date_time\`, \`remark\`)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [orderId, cb.result.remark2, "User ACtivation Free", 0, 0, 0, "debit", "success", cb.result.date, "Account activation fee"],
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
        cb.result.customer_mobile,
        cb.result.amount,
        "activation",
        cb.status,
        cb.result.txnStatus,
        cb.result.utr,
        cb.result.remark1,
        cb.result.remark2,
        cb.result.date,
      ],
    );
    return NextResponse.redirect("/retailer");
  } else {
    return "Your payment is still pending. Please check again later. contact to Admin";
  }
}

export async function callAddmoneyOrderStatus(orderId: string, request: Request) {
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
    const users = await runQuery<Retailer[]>("SELECT balance, mobile, lastaddmoneyid FROM retailer WHERE mobile = ? LIMIT 1", [cb.result.customer_mobile]);
    const user = users[0];
    if (!user || user.mobile !== cb.result.customer_mobile) {
      throw new Error("User not found");
    }
    if (user.lastaddmoneyid === orderId) {
      return NextResponse.redirect(`${REDIRECT_URL}/retailer`);
    }
    await runMutation("UPDATE retailer SET balance = ?, lastaddmoneyid = ? WHERE mobile = ? LIMIT 1", [
      Number(cb.result.amount) + Number(user.balance),
      orderId,
      cb.result.customer_mobile,
    ]);
    await runMutation(
      `
      INSERT INTO \`transitions\`
      (\`order_id\`, \`user_mob\`, \`service_name\`, \`old_balance\`, \`charge\`, \`new_balance\`, \`tranfer_type\`, \`status\`, \`date_time\`, \`remark\`)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        orderId,
        cb.result.customer_mobile,
        "Add Money",
        Number(user.balance),
        Number(cb.result.amount),
        Number(cb.result.amount) + Number(user.balance),
        "credit",
        "success",
        cb.result.date,
        "Add money to wallet",
      ],
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
        cb.result.customer_mobile,
        cb.result.amount,
        "add_money",
        cb.status,
        cb.result.txnStatus,
        cb.result.utr,
        cb.result.remark1,
        cb.result.remark2,
        cb.result.date,
      ],
    );
    return NextResponse.redirect(`${REDIRECT_URL}/retailer`);
  } else {
    return "Your payment is still pending. Please check again later. contact to Admin";
  }
}