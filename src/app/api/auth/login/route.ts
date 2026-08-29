import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { comparePassword, runQuery, signToken, setAuthCookie, Retailer } from "@/lib/auth";

const loginSchema = z
  .object({
    identifier: z.string().optional(),
    mobile: z.string().optional(),
    email: z.string().optional(),
    password: z.string().min(6, { message: "Password is required" }),
  })
  .refine((data) => data.identifier || data.mobile || data.email, {
    message: "Mobile or email is required",
  });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ message: result.error.issues[0].message }, { status: 400 });
    }

    const identifier = result.data.identifier || result.data.mobile || result.data.email!;
    const { password } = result.data;

    const rows = await runQuery<Retailer[]>("SELECT id, name, mobile, email, password, status, balance, usertype FROM retailer WHERE mobile = ? OR email = ? LIMIT 1", [identifier, identifier]);

    const user = rows[0];
    if (!user) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }

    // const isBcrypt = /^\$2[aby]?\$\d{2}\$[./A-Za-z0-9]{53}$/.test(user.password);
    const valid = password === user.password;
    if (!valid) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }

    const token = signToken({
      id: user.id,
      mobile: user.mobile,
      email: user.email,
      usertype: user.usertype,
    });

    const response = NextResponse.json({
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        mobile: user.mobile,
        email: user.email,
        status: user.status,
        balance: user.balance,
        usertype: user.usertype,
      },
    });

    setAuthCookie(response, token);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Login error:", error);
    if (message.includes("Data too long")) {
      return NextResponse.json({ message: "Password field too small for a secure hash. Run: ALTER TABLE retailer MODIFY password VARCHAR(255);" }, { status: 500 });
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
