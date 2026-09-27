import { NextRequest, NextResponse } from "next/server";
import { getUserDeatail } from "@/lib/auth";
import type { Retailer } from "@/lib/auth";
import { generateOrder } from "@/lib/utils";

const GATEWAY_BASE = (process.env.GATEWAY_URL || "https://pay.a1ejankari.com/api").replace(/\/+$/, "");
const GATEWAY_USER_TOKEN = process.env.GATEWAY_USER_TOKEN || "";
const ACTIVATION_FEE = 1;
const REDIRECT_URL = process.env.GATEWAY_REDIRECT_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function buildGatewayFormPayload(payload: Record<string, string>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(payload)) {
    if (value) params.set(key, value);
  }
  return params;
}

export async function POST(request: NextRequest) {
  try {
    const user: Retailer | null = await getUserDeatail(request);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (user.status !== "unpaid") {
      return NextResponse.json({ message: "Account is already active" }, { status: 400 });
    }

    const uniqueOrderId = generateOrder();
    const amount = ACTIVATION_FEE;
    const paymentType = "activation";

    const gatewayPayload = buildGatewayFormPayload({
      customer_mobile: String(user.mobile),
      user_token: GATEWAY_USER_TOKEN,
      amount: amount.toString(),
      order_id: uniqueOrderId.toString(),
      redirect_url: `${REDIRECT_URL}/auth/onbording?order_id=${uniqueOrderId}`,
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