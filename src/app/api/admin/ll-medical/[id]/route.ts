import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runQuery, runMutation, runTransaction, SqlParam, LL_MEDICAL_SAFE_COLUMNS } from "@/lib/auth";
import type { LlMedicalRequest } from "@/lib/auth";
import { STATUS_REFUND } from "@/lib/statuses";

const updateSchema = z.object({
  status: z.enum(["panding", "refund", "success"]).optional(),
  admin_upload_doc: z.string().optional(),
  resposive_date_time: z.string().optional(),
});

const RETAILER_SELECT = LL_MEDICAL_SAFE_COLUMNS.join(", ");
const SERVICE_NAME = "Learning Exam Medical";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rows = await runQuery<LlMedicalRequest[]>(
      `SELECT ${RETAILER_SELECT} FROM \`ll_medical\` WHERE id = ? LIMIT 1`,
      [Number(id)]
    );

    if (rows.length === 0) {
      return NextResponse.json({ message: "Request not found" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("Get ll_medical error:", error);
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
      "SELECT id, order_id, user_mob, status FROM `ll_medical` WHERE id = ? LIMIT 1",
      [Number(id)]
    );
    if (existing.length === 0) {
      return NextResponse.json({ message: "Request not found" }, { status: 404 });
    }

    const requestData = existing[0];
    const orderId = requestData.order_id;
    const userMob = requestData.user_mob;
    const currentStatus = requestData.status;
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");

    const updates: string[] = [];
    const values: SqlParam[] = [];

    if (result.data.status !== undefined) {
      updates.push("`status` = ?");
      values.push(result.data.status);
      updates.push("`resposive_date_time` = ?");
      values.push(now);
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

    const newStatus = result.data.status;
    const adminUploadDoc = result.data.admin_upload_doc;

    await runTransaction(async (conn) => {
      const updateValues = [...values, Number(id)];
      const sql = `UPDATE \`ll_medical\` SET ${updates.join(", ")} WHERE id = ? LIMIT 1`;
      await conn.query(sql, updateValues);

      if (newStatus !== undefined || adminUploadDoc !== undefined) {
        const whUpdates: string[] = [];
        const whValues: SqlParam[] = [];

        if (newStatus !== undefined) {
          whUpdates.push("`status` = ?");
          whValues.push(newStatus);
        }

        if (adminUploadDoc !== undefined) {
          whUpdates.push("`document` = ?");
          whValues.push(adminUploadDoc || null);
        }

        whUpdates.push("`date_time` = ?");
        whValues.push(now);

        await conn.query(
          `UPDATE \`workhistory\` SET ${whUpdates.join(", ")} WHERE \`order_id\` = ?`,
          [...whValues, orderId]
        );
      }

      if (newStatus === STATUS_REFUND && currentStatus !== STATUS_REFUND) {
        const charge = Number((await runQuery<any[]>("SELECT charge FROM `ll_medical` WHERE id = ? LIMIT 1", [Number(id)]))[0]?.charge ?? 0);

        if (charge > 0) {
          const retailerRows = await runQuery<{ id: number; balance: number }[]>(
            "SELECT id, balance FROM retailer WHERE id = ? LIMIT 1 FOR UPDATE",
            [Number(userMob)]
          );

          if (retailerRows.length > 0) {
            const retailer = retailerRows[0];
            const currentBalance = Number(retailer.balance);
            const newBalance = currentBalance + charge;

            await conn.query(
              "UPDATE retailer SET balance = ? WHERE id = ? LIMIT 1",
              [newBalance, retailer.id]
            );

            await conn.query(
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
                orderId,
                userMob,
                SERVICE_NAME,
                currentBalance,
                charge,
                newBalance,
                "credit",
                STATUS_REFUND,
                now,
                `Refund for ll_medical request #${id}`,
              ]
            );
          }
        }
      }
    });

    const updated = await runQuery<LlMedicalRequest[]>(
      `SELECT ${RETAILER_SELECT} FROM \`ll_medical\` WHERE id = ? LIMIT 1`,
      [Number(id)]
    );

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error("Update ll_medical error:", error);
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
      "SELECT id FROM `ll_medical` WHERE id = ? LIMIT 1",
      [Number(id)]
    );

    if (existing.length === 0) {
      return NextResponse.json({ message: "Request not found" }, { status: 404 });
    }

    await runMutation("DELETE FROM `ll_medical` WHERE id = ? LIMIT 1", [Number(id)]);

    return NextResponse.json({ message: "Request deleted successfully" });
  } catch (error) {
    console.error("Delete ll_medical error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
