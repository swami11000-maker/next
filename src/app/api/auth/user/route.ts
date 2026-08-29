import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";

  export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Password intentionally excluded by getUserFromRequest()
    return NextResponse.json(user);
  }catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
