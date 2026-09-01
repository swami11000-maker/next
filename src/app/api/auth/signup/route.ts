import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runQuery, runMutation, signToken, setAuthCookie, Retailer } from "@/lib/auth";

const signupSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Enter a valid email address" }),
  mobile: z
    .string()
    .min(10, { message: "Mobile number must be 10 digits" })
    .max(10, { message: "Mobile number must be 10 digits" })
    .regex(/^\d{10}$/, { message: "Enter a valid 10-digit mobile number" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = signupSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ message: result.error.issues[0].message }, { status: 400 });
    }

    const { name, email, mobile, password } = result.data;

    const existing = await runQuery<Retailer[]>(
      "SELECT id FROM retailer WHERE email = ? OR mobile = ? LIMIT 1",
      [email, mobile]
    );
    if (existing.length > 0) {
      return NextResponse.json(
        { message: "A user with this email or mobile already exists" },
        { status: 409 }
      );
    }


    const insertResult = await runMutation(
      "INSERT INTO retailer (name, mobile, email, password, status, balance, usertype) VALUES (?, ?, ?, ?, 'unpaid', 0, 'retailer')",
      [name, mobile, email ,password]
    );

    const userId = insertResult.insertId ?? null;

    const token = signToken({ id: userId, mobile, email, usertype: "retailer" });
  const response = NextResponse.json(
  {
    message: "Account created successfully",
  },
  {
    status: 201,
  }
);

setAuthCookie(response, token);

return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Signup error:", error);
    if (message.includes("Data too long")) {
      return NextResponse.json(
        { message: "Password field too small for a secure hash. Run: ALTER TABLE retailer MODIFY password VARCHAR(255);" },
        { status: 500 }
      );
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
