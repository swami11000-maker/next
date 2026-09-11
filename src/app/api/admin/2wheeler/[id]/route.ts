import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runQuery, runMutation, runTransaction, SqlParam, TWOWHEELER_SAFE_COLUMNS } from "@/lib/auth";
import type { TwoWheelerRequest, TwoWheelerStatus } from "@/lib/auth";
import { STATUS_REFUND, STATUS_SUCCESS } from "@/lib/statuses";

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const result = updateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: result.error.issues[0].message },
        { status: 400 },
      );
    }

    // Check existing request
    const existing = await runQuery<any[]>(
      "SELECT id, order_id, user_mob, status FROM `2wheeler` WHERE id = ? LIMIT 1",
      [Number(id)],
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { message: "Request not found" },
        { status: 404 },
      );
    }


    const requestData = existing[0];

    const orderId = requestData.order_id;
    const userMob = requestData.user_mob;
    const currentStatus = requestData.status;
if(currentStatus === STATUS_REFUND){
   return NextResponse.json(
        { message: "Already Refunded " },
        { status: 404 },
      );
}
    const updates: string[] = [];
    const values: SqlParam[] = [];

    // Update status
    if (result.data.status !== undefined) {
      updates.push("`status` = ?");
      values.push(result.data.status as TwoWheelerStatus);

      updates.push("`resposive_date_time` = ?");
      values.push(
        new Date().toISOString().slice(0, 19).replace("T", " "),
      );
    }

    // Update admin document
    if (result.data.admin_upload_doc !== undefined) {
      updates.push("`admin_upload_doc` = ?");
      values.push(result.data.admin_upload_doc);
    }

    // Update response date time if explicitly provided
    if (result.data.resposive_date_time !== undefined) {
      if (!updates.includes("`resposive_date_time` = ?")) {
        updates.push("`resposive_date_time` = ?");
        values.push(result.data.resposive_date_time);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { message: "No fields to update" },
        { status: 400 },
      );
    }

    const newStatus = result.data.status;
    const adminUploadDoc = result.data.admin_upload_doc;

    const now = new Date()
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    await runTransaction(async (conn) => {
      /*
       * Update 2wheeler request
       */
      const updateValues = [...values, Number(id)];

      const sql = `
        UPDATE \`2wheeler\`
        SET ${updates.join(", ")}
        WHERE id = ?
        LIMIT 1
      `;

      await conn.query(sql, updateValues);

      /*
       * Update work history
       */
      if (
        newStatus !== undefined ||
        adminUploadDoc !== undefined
      ) {
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
          `
          UPDATE \`workhistory\`
          SET ${whUpdates.join(", ")}
          WHERE \`order_id\` = ?
          `,
          [...whValues, orderId],
        );
      }

      /*
       * Refund logic
       *
       * Only refund if:
       * 1. New status is refund
       * 2. Current status was not already refund
       */
      if (
        newStatus === STATUS_REFUND &&
        currentStatus !== STATUS_REFUND
      ) {
        /*
         * Get charge from workhistory
         *
         * mysql2 conn.query returns:
         * [rows, fields]
         *
         * Therefore we must destructure rows.
         */
        const [workHistoryRows] = await conn.query<any[]>(
          `
          SELECT charge, user_mob
          FROM \`workhistory\`
          WHERE \`order_id\` = ?
          LIMIT 1
          `,
          [orderId],
        );

        

        if (!Array.isArray(workHistoryRows)) {
          throw new Error(
            "Invalid workhistory query response",
          );
        }

        if (workHistoryRows.length === 0) {
          throw new Error(
            `Work history not found for order: ${orderId}`,
          );
        }

        const workHistory = workHistoryRows[0];


        /*
         * Validate charge
         */
        if (
          workHistory?.charge === null ||
          workHistory?.charge === undefined ||
          workHistory?.charge === ""
        ) {
          throw new Error(
            `Invalid refund charge for order: ${orderId}`,
          );
        }

        const charge = Number(workHistory.charge);

        if (!Number.isFinite(charge)) {
          throw new Error(
            `Invalid refund charge value: ${workHistory.charge}`,
          );
        }

        /*
         * Get retailer mobile from workhistory (retailer's mobile, not customer's)
         */
        const retailerMobile = workHistory.user_mob;

        /*
         * Lock retailer row and get balance
         */
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


        if (!Array.isArray(retailerRows)) {
          throw new Error(
            "Invalid retailer query response",
          );
        }

        if (retailerRows.length === 0) {
          throw new Error(
            `Retailer not found for mobile: ${retailerMobile}`,
          );
        }

        const retailer = retailerRows[0];


        /*
         * Validate retailer ID
         */
        if (
          retailer?.id === null ||
          retailer?.id === undefined ||
          retailer?.id === ""
        ) {
          throw new Error(
            `Invalid retailer ID for mobile: ${retailerMobile}`,
          );
        }

        /*
         * Balance can be null/undefined, treat as 0.
         *
         * But if it contains an invalid string, reject it.
         */
        let currentBalance = 0;

        if (
          retailer.balance !== null &&
          retailer.balance !== undefined &&
          retailer.balance !== ""
        ) {
          currentBalance = Number(retailer.balance);
        }

        if (!Number.isFinite(currentBalance)) {
          throw new Error(
            `Invalid retailer balance value: ${retailer.balance}`,
          );
        }

        /*
         * Calculate refund balance
         */
        const newBalance = currentBalance + charge;

        /*
         * Final safety check
         */
        if (!Number.isFinite(newBalance)) {
          throw new Error(
            `Invalid new balance calculation. Current: ${currentBalance}, Charge: ${charge}`,
          );
        }


        /*
         * Update retailer balance
         */
        await conn.query(
          `
          UPDATE \`retailer\`
          SET \`balance\` = ?
          WHERE \`id\` = ?
          `,
          [newBalance, retailer.id],
        );

        /*
         * Insert refund transaction
         */
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
            "2 Wheeler PUC",
            currentBalance,
            charge,
            newBalance,
            "credit",
            STATUS_REFUND,
            now,
            "Refund for order " + orderId,
          ],
        );
      }
    });

    /*
     * Get updated request
     */
    const updated = await runQuery<TwoWheelerRequest[]>(
      `
      SELECT ${RETAILER_SELECT}
      FROM \`2wheeler\`
      WHERE id = ?
      LIMIT 1
      `,
      [Number(id)],
    );

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error("Update 2wheeler error:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Internal server error",
      },
      { status: 500 },
    );
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
