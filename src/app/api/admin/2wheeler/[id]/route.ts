import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runQuery, runMutation, SqlParam, TWOWHEELER_SAFE_COLUMNS } from "@/lib/auth";
import type { TwoWheelerRequest, TwoWheelerStatus } from "@/lib/auth";

const updateSchema = z.object({
  status: z.enum(["panding", "refund", "success"]).optional(),
  admin_upload_doc: z.string().optional(),
  resposive_date_time: z.string().optional(),
});

const RETAILER_SELECT = TWOWHEELER_SAFE_COLUMNS.join(", ");

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const rows = await runQuery<TwoWheelerRequest[]>(`SELECT ${RETAILER_SELECT} FROM \`2wheeler\` WHERE id = ? LIMIT 1`, [Number(id)]);

    if (rows.length === 0) {
      return NextResponse.json({ message: "Request not found" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("Get 2wheeler error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = updateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ message: result.error.issues[0].message }, { status: 400 });
    }

    const existing = await runQuery<{ id: number }[]>("SELECT id FROM `2wheeler` WHERE id = ? LIMIT 1", [Number(id)]);
    if (existing.length === 0) {
      return NextResponse.json({ message: "Request not found" }, { status: 404 });
    }

    const updates: string[] = [];
    const values: SqlParam[] = [];

    if (result.data.status !== undefined) {
      updates.push("`status` = ?");
      values.push(result.data.status as TwoWheelerStatus);
      updates.push("`resposive_date_time` = ?");
      values.push(new Date().toISOString().slice(0, 19).replace("T", " "));
    }

    if (result.data.admin_upload_doc !== undefined) {
      updates.push("`admin_upload_doc` = ?");
      values.push(result.data.admin_upload_doc);
    }

    if (result.data.resposive_date_time !== undefined) {
      if (!updates.includes("`resposive_date_time` = ?")) {
        updates.push("`resposive_date_time` = ?");
        values.push(result.data.resposive_date_time);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ message: "No fields to update" }, { status: 400 });
    }

    values.push(Number(id));

    const sql = `UPDATE \`2wheeler\` SET ${updates.join(", ")} WHERE id = ? LIMIT 1`;
    await runMutation(sql, values);

    const updated = await runQuery<TwoWheelerRequest[]>(`SELECT ${RETAILER_SELECT} FROM \`2wheeler\` WHERE id = ? LIMIT 1`, [Number(id)]);

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error("Update 2wheeler error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await runQuery<{ id: number }[]>("SELECT id FROM `2wheeler` WHERE id = ? LIMIT 1", [Number(id)]);

    if (existing.length === 0) {
      return NextResponse.json({ message: "Request not found" }, { status: 404 });
    }

    await runMutation("DELETE FROM `2wheeler` WHERE id = ? LIMIT 1", [Number(id)]);

    return NextResponse.json({ message: "Request deleted successfully" });
  } catch (error) {
    console.error("Delete 2wheeler error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
