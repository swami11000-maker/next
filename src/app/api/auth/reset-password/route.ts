import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword, runQuery, runMutation, verifyResetToken, signResetToken, Retailer } from "@/lib/auth";
import { sendResetEmail } from "@/lib/mail";

const requestResetSchema = z.object({
  email: z.string().email({ message: "Enter a valid email address" }),
});

const confirmResetSchema = z.object({
  token: z.string().min(1, { message: "Reset token is required" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const actionResult = confirmResetSchema.safeParse(body);
    if (actionResult.success) {
      return handleConfirmReset(actionResult.data.token, actionResult.data.password);
    }

    const requestResult = requestResetSchema.safeParse(body);
    if (!requestResult.success) {
      return NextResponse.json(
        { message: requestResult.error.issues[0].message },
        { status: 400 }
      );
    }

    return handleRequestReset(requestResult.data.email, request);
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

async function handleRequestReset(email: string, request: NextRequest) {
  const rows = await runQuery<Retailer[]>(
    "SELECT id, email FROM retailer WHERE email = ? LIMIT 1",
    [email]
  );

  if (rows.length > 0) {
    const resetToken = signResetToken({ id: rows[0].id, email: rows[0].email });
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;
    const resetLink = `${baseUrl}/auth/reset-password?token=${resetToken}`;
    await sendResetEmail(email, resetLink);
  }

  return NextResponse.json({
    message: "If an account with that email exists, a reset link has been sent.",
  });
}

async function handleConfirmReset(token: string, password: string) {
  const payload = verifyResetToken(token);
  if (!payload) {
    return NextResponse.json({ message: "Invalid or expired reset token" }, { status: 401 });
  }

  const hashed = await hashPassword(password);

  const result = await runMutation(
    "UPDATE retailer SET password = ? WHERE id = ? LIMIT 1",
    [hashed, payload.id]
  );

  if (result.affectedRows === 0) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Password reset successfully" });
}
