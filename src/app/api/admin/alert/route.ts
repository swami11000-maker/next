import { getAdminUser, runQuery } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const user = await getAdminUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
    const sql = `
      SELECT *
      FROM \`alerts\`
      WHERE status = 'panding'
      ORDER BY id DESC
    `;

    const rows = await runQuery<any[]>(sql);

    return NextResponse.json(rows);
  } catch (error) {
    console.error("List alert error:", error);

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}