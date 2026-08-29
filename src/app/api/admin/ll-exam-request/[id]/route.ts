import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runQuery, runMutation, SqlParam } from "@/lib/auth";
import { LL_EXAM_SAFE_COLUMNS } from "@/lib/auth";
import { STATUS_REFUND } from "@/lib/statuses";

const updateSchema = z.object({
  status: z.enum(["panding", "refund", "success"]).optional(),
  admin_upload_doc: z.string().optional(),
  resposive_date_time: z.string().optional(),
});

const RETAILER_SELECT = LL_EXAM_SAFE_COLUMNS.join(", ");
const SERVICE_ID = "ll_exam_request";
const SERVICE_NAME = "LL Exam Request";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rows = await runQuery<any[]>(
      `SELECT ${RETAILER_SELECT} FROM \`ll-exam-request\` WHERE id = ? LIMIT 1`,
      [Number(id)]
    );

    if (rows.length === 0) {
      return NextResponse.json({ message: "Request not found" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("Get ll-exam-request error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = updateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ message: result.error.issues[0].message }, { status: 400 });
    }

    const existing = await runQuery<any[]>(
      "SELECT id, user_mob, charge, status FROM `ll-exam-request` WHERE id = ? LIMIT 1",
      [Number(id)]
    );
    if (existing.length === 0) {
      return NextResponse.json({ message: "Request not found" }, { status: 404 });
    }

    const requestData = existing[0];
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");

    const updates: string[] = [];
    const values: SqlParam[] = [];

    if (result.data.status !== undefined) {
      updates.push("`status` = ?");
      values.push(result.data.status);
      updates.push("`resposive_date_time` = ?");
      values.push(now);

      if (result.data.status === STATUS_REFUND && requestData.status !== STATUS_REFUND) {
        const charge = Number(requestData.charge ?? 0);

        if (charge > 0) {
          const retailerRows = await runQuery<{ id: number; balance: number }[]>(
            "SELECT id, balance FROM retailer WHERE id = ? LIMIT 1 FOR UPDATE",
            [Number(requestData.user_mob)]
          );

          if (retailerRows.length > 0) {
            const newBalance = Number(retailerRows[0].balance ?? 0) + charge;

            await runMutation(
              "UPDATE retailer SET balance = ? WHERE id = ? LIMIT 1",
              [newBalance, retailerRows[0].id]
            );

            await runMutation(
              `
                INSERT INTO \`transitions\`
                (
                  \`order_id\`,
                  \`user_mob\`,
                  \`service_name\`,
                  \`old_balance\`,
                  \`charge\`,
                  \`new_balance\`,
                  \`tranfer_type\`,
                  \`status\`,
                  \`date_time\`,
                  \`remark\`
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `,
              [
                String(id),
                String(requestData.user_mob),
                SERVICE_NAME,
                Number(retailerRows[0].balance ?? 0),
                charge,
                newBalance,
                "credit",
                STATUS_REFUND,
                now,
                `Refund for ll_exam_request #${id}`,
              ]
            );
          }
        }
      }
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

    const sql = `UPDATE \`ll-exam-request\` SET ${updates.join(", ")} WHERE id = ? LIMIT 1`;
    await runMutation(sql, values);

    const updated = await runQuery<any[]>(
      `SELECT ${RETAILER_SELECT} FROM \`ll-exam-request\` WHERE id = ? LIMIT 1`,
      [Number(id)]
    );

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error("Update ll-exam-request error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await runQuery<{ id: number }[]>(
      "SELECT id FROM `ll-exam-request` WHERE id = ? LIMIT 1",
      [Number(id)]
    );

    if (existing.length === 0) {
      return NextResponse.json({ message: "Request not found" }, { status: 404 });
    }

    await runMutation("DELETE FROM `ll-exam-request` WHERE id = ? LIMIT 1", [Number(id)]);

    return NextResponse.json({ message: "Request deleted successfully" });
  } catch (error) {
    console.error("Delete ll-exam-request error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
