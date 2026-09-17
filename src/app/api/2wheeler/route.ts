import { NextRequest, NextResponse } from 'next/server';

import { getUserDeatail, runTransaction, isServiceEnabled } from '@/lib/auth';

import { STATUS_PENDING, STATUS_SUCCESS } from '@/lib/statuses';
import type { Retailer } from '@/lib/auth';

import { generate7DigitNumber, getIndianDateTime, tgAlert } from '@/lib/utils';
import { submitSchema } from '@/lib/validation';

const SERVICE_NAME = '2 Wheeler PUC';

export async function POST(request: NextRequest) {
  try {
    const user: Retailer | null = await getUserDeatail(request);

    if (!user) {
      return NextResponse.json(
        {
          message: 'Unauthorized',
        },
        {
          status: 401,
        },
      );
    }

    if (!isServiceEnabled(user, '2wheeler_puc')) {
      return NextResponse.json(
        {
          message: '2 Wheeler PUC service is not enabled for your account',
        },
        {
          status: 403,
        },
      );
    }
    const body = await request.json();
    const result = submitSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          message: result.error.issues[0]?.message || 'Invalid request',
        },
        {
          status: 400,
        },
      );
    }

    const { vehicle_no, mobile_no, frontside, backside } = result.data;

    const now = getIndianDateTime();
    const userMobStr = String(user.mobile);
    const transactionResult = await runTransaction<{
      order_id: string;
      old_balance: number;
      new_balance: number;
      charge: number;
    }>(async (conn) => {
      const [rows] = await conn.query<any[]>(
        `
          SELECT
            balance,
            \`2wheeler_fee\` AS fee
          FROM retailer
          WHERE id = ?
          LIMIT 1
          FOR UPDATE
        `,
        [user.id],
      );

      if (!rows || rows.length === 0) {
        throw new Error('Retailer account not found');
      }
      const oldBalance = Number(rows[0].balance ?? 0);

      const charge = Number(rows[0].fee ?? 50);

      if (!Number.isFinite(charge) || charge <= 0) {
        throw new Error('Invalid 2 wheeler service fee');
      }

      if (oldBalance < charge) {
        throw new Error('Insufficient balance');
      }
      const newBalance = oldBalance - charge;
      const order_id = generate7DigitNumber();
      await conn.query(
        `
          INSERT INTO \`2wheeler\`
          (
            \`user_mob\`,
            \`order_id\`,
            \`vehicle_no\`,
            \`service_mob\`,
            \`frontside\`,
            \`backside\`,
            \`status\`,
            \`admin_upload_doc\`,
            \`apply_date_time\`,
            \`resposive_date_time\`
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          userMobStr,
          order_id,
          vehicle_no,
          mobile_no,
          frontside,
          backside,
          STATUS_PENDING,
          null,
          now,
          null,
        ],
      );
      await conn.query(
        `
          INSERT INTO \`workhistory\`
          (
            \`order_id\`,
            \`user_mob\`,
            \`service_id\`,
            \`service_name\`,
            \`status\`,
            \`old_balance\`,
            \`charge\`,
            \`new_balance\`,
            \`tranfer_type\`,
            \`document\`,
            \`date_time\`,
            \`remark\`
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          order_id,
          userMobStr,
          vehicle_no,
          SERVICE_NAME,
          STATUS_PENDING,
          oldBalance,
          charge,
          newBalance,
          'debit',
          null,
          now,
          SERVICE_NAME,
        ],
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
          order_id,
          userMobStr,
          SERVICE_NAME,
          oldBalance,
          charge,
          newBalance,
          'debit',
          STATUS_SUCCESS,
          now,
          SERVICE_NAME,
        ],
      );
      const [updateResult] = await conn.query<any>(
        `
          UPDATE retailer
          SET balance = balance - ?
          WHERE id = ?
            AND balance >= ?
          LIMIT 1
        `,
        [charge, user.id, charge],
      );
      if (updateResult.affectedRows !== 1) {
        throw new Error('Insufficient balance');
      }
      await conn.query(
        `
          INSERT INTO \`alerts\`
          (
            \`order_id\`,
            \`user_mob\`,
            \`service_name\`,
            \`status\`
          )
          VALUES (?, ?, ?, ?)
        `,
        [order_id, userMobStr, SERVICE_NAME, STATUS_PENDING],
      );

      await tgAlert(`
      <b>🚗 2 Wheeler PUC New Order</b>

      <b>Order ID:</b> ${order_id}
      <b>Vehicle No:</b> ${vehicle_no}
      <b>Customer Mobile:</b> ${mobile_no}
      <b>Service:</b> 2 Wheeler PUC
      <b>Amount:</b> ₹${charge}
      <b>Status:</b> Pending
      `);
      return {
        order_id,
        old_balance: oldBalance,
        new_balance: newBalance,
        charge,
      };
    });
    return NextResponse.json(
      {
        message: 'Request submitted successfully',

        id: Number(transactionResult.order_id),

        order_id: transactionResult.order_id,

        charge: transactionResult.charge,

        old_balance: transactionResult.old_balance,

        new_balance: transactionResult.new_balance,
      },
      {
        status: 201,
      },
    );
  } catch (error: any) {
    console.error('2wheeler submit error:', error);
    if (error?.message === 'Insufficient balance') {
      return NextResponse.json(
        {
          message: 'Insufficient balance',
        },
        {
          status: 400,
        },
      );
    }
    if (error?.message === 'Retailer account not found') {
      return NextResponse.json(
        {
          message: 'Retailer account not found',
        },
        {
          status: 404,
        },
      );
    }
    return NextResponse.json(
      {
        message: error?.message || 'Internal server error',
      },
      {
        status: 500,
      },
    );
  }
}
