import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  runQuery,
  runMutation,
  Retailer,
} from "@/lib/auth";
import crypto from "crypto";
import { sendResetPasswordEmail } from "@/lib/mail";

const requestResetSchema = z.object({
  email: z.string().email({ message: "Enter a valid email address" }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const result = requestResetSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: result.error.issues[0].message },
        { status: 400 }
      );
    }

    return handlePasswordReset(result.data.email);
  } catch (error) {
    console.error("Reset password error:", error);

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handlePasswordReset(email: string) {
  const rows = await runQuery<Retailer[]>(
    "SELECT id, email FROM retailer WHERE email = ? LIMIT 1",
    [email]
  );

  if (rows.length === 0) {
    return NextResponse.json({
      message:
        "If an account with that email exists, a new password has been sent.",
    });
  }

  const retailer = rows[0];

  const temporaryPassword = crypto
    .randomBytes(6)
    .toString("base64url")
    .slice(0, 10);

  const result = await runMutation(
    "UPDATE retailer SET password = ? WHERE id = ? LIMIT 1",
    [temporaryPassword, retailer.id]
  );

  if (result.affectedRows === 0) {
    return NextResponse.json(
      { message: "User not found" },
      { status: 404 }
    );
  }

  await sendResetPasswordEmail(
    retailer.email,
    temporaryPassword
  );

  return NextResponse.json({
    message: "A new password has been sent to your email.",
  });
}
