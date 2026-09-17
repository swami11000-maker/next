import { NextRequest, NextResponse } from "next/server";
import { runQuery, getUserDeatail } from "@/lib/auth";
import type { TwoWheelerRequest } from "@/lib/auth";

const SELECT_DOC = ["id", "`admin_upload_doc`", "`user_mob`", "`mobile_no`"].join(", ");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserDeatail(request);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const rows = await runQuery<TwoWheelerRequest[]>(
      `SELECT ${SELECT_DOC} FROM \`2wheeler\` WHERE id = ? LIMIT 1`,
      [Number(id)]
    );

    if (rows.length === 0) {
      return NextResponse.json({ message: "Request not found" }, { status: 404 });
    }

    if (String(rows[0].user_mob) !== String(user.mobile)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const doc = rows[0].admin_upload_doc;
    if (!doc) {
      return NextResponse.json(
        { message: "No document uploaded yet by admin" },
        { status: 404 }
      );
    }

    let mimeType = "application/pdf";
    let base64Data = doc;

    if (doc.startsWith("data:")) {
      const match = doc.match(/^data:([^;]+);base64,(.*)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      } else {
        base64Data = doc.split(",")[1] ?? doc;
      }
    }

    const buffer = Buffer.from(base64Data, "base64");

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="2wheeler-${rows[0].id}.pdf"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Download 2wheeler doc error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
