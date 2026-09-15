import { NextRequest, NextResponse } from "next/server";
import { runQuery } from "@/lib/auth";
import type { FourWheelerRequest } from "@/lib/auth";

const SELECT_DOC = ["id", "`admin_upload_doc`", "`vehicle_no`", "`mobile_no`"].join(", ");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(params)
    const rows = await runQuery<FourWheelerRequest[]>(
      `SELECT ${SELECT_DOC} FROM \`4wheeler\` WHERE id = ? LIMIT 1`,
      [Number(id)]
    );
console.log(rows)
    if (rows.length === 0) {
      return NextResponse.json({ message: "Request not found" }, { status: 404 });
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
        "Content-Disposition": `attachment; filename="4wheeler-${rows[0].id}.pdf"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Download 4wheeler doc error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
