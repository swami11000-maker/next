import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runQuery, runMutation, runTransaction, SqlParam, LL_EXAM_SAFE_COLUMNS } from "@/lib/auth";
import type { LlExamRequest } from "@/lib/auth";
import { STATUS_REFUND, STATUS_SUCCESS } from "@/lib/statuses";

const updateSchema = z.object({
  status: z.enum(["panding", "refund", "success"]).optional(),
  admin_upload_doc: z.string().optional(),
  resposive_date_time: z.string().optional(),
});

const RETAILER_SELECT = LL_EXAM_SAFE_COLUMNS.join(", ");
const SERVICE_NAME = "LL Exam Request";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rows = await runQuery<LlExamRequest[]>(
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
      "SELECT id, order_id, user_mob, status FROM `ll-exam-request` WHERE id = ? LIMIT 1",
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
if(currentStatus === STATUS_REFUND){
   return NextResponse.json(
        { message: "Already Refunded " },
        { status: 404 },
      );
}
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
      const sql = `UPDATE \`ll-exam-request\` SET ${updates.join(", ")} WHERE id = ? LIMIT 1`;
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
        const [workHistoryRows] = await conn.query<any[]>(
          `
          SELECT charge, user_mob
          FROM \`workhistory\`
          WHERE \`order_id\` = ?
          LIMIT 1
          `,
          [orderId],
        );

        if (!Array.isArray(workHistoryRows) || workHistoryRows.length === 0) {
          throw new Error(`Work history not found for order: ${orderId}`);
        }

        const workHistory = workHistoryRows[0];
        const charge = Number(workHistory.charge);

        if (!Number.isFinite(charge) || charge <= 0) {
          throw new Error(`Invalid refund charge for order: ${orderId}`);
        }

        const retailerMobile = workHistory.user_mob;

        const [retailerRows] = await conn.query<any[]>(
          `
          SELECT id, balance
          FROM \`retailer\`
          WHERE \`mobile\` = ?
          LIMIT 1
          FOR UPDATE
          `,
          [retailerMobile],
        );

        if (!Array.isArray(retailerRows) || retailerRows.length === 0) {
          throw new Error(`Retailer not found for mobile: ${retailerMobile}`);
        }

        const retailer = retailerRows[0];

        let currentBalance = 0;
        if (
          retailer.balance !== null &&
          retailer.balance !== undefined &&
          retailer.balance !== ""
        ) {
          currentBalance = Number(retailer.balance);
        }

        if (!Number.isFinite(currentBalance)) {
          throw new Error(`Invalid retailer balance value: ${retailer.balance}`);
        }

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
            retailerMobile,
            SERVICE_NAME,
            currentBalance,
            charge,
            newBalance,
            "credit",
            STATUS_REFUND,
            now,
            `Refund for ll_exam_request #${id}`,
          ]
        );
      }
    });
  await runQuery(
  `
    UPDATE \`alerts\`
    SET \`status\` = ?
    WHERE \`order_id\` = ?
  `,
  [STATUS_SUCCESS, orderId]
);
    const updated = await runQuery<LlExamRequest[]>(
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
