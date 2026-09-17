import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getUserDeatail, runQuery, runTransaction, isServiceEnabled } from '@/lib/auth';

import type { Retailer } from '@/lib/auth';
import { STATUS_PENDING, STATUS_SUCCESS } from '@/lib/statuses';
import { generate7DigitNumber, getIndianDateTime, tgAlert } from '@/lib/utils';
import { submitSchema } from '@/lib/validation';

const SERVICE_ID = '4wheeler_puc';
const SERVICE_NAME = '4 Wheeler PUC';

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
    if (!isServiceEnabled(user, '4wheeler_puc')) {
      return NextResponse.json(
        {
          message: '4 Wheeler PUC service is not enabled for your account',
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

    const feeRows = await runQuery<
      {
        balance: number;
        fee: number;
      }[]
    >(
      `
        SELECT
          balance,
          \`4wheeler_fee\` AS fee
        FROM retailer
        WHERE id = ?
        LIMIT 1
      `,
      [user.id],
    );

    if (feeRows.length === 0) {
      return NextResponse.json(
        {
          message: 'Retailer account not found',
        },
        {
          status: 404,
        },
      );
    }

    const oldBalance = Number(feeRows[0].balance ?? 0);

    const charge = Number(feeRows[0].fee ?? 50);

    if (!Number.isFinite(charge) || charge <= 0) {
      return NextResponse.json(
        {
          message: 'Invalid 4 wheeler service fee',
        },
        {
          status: 500,
        },
      );
    }

    if (oldBalance < charge) {
      return NextResponse.json(
        {
          message: 'Insufficient balance',
          balance: oldBalance,
          required: charge,
        },
        {
          status: 400,
        },
      );
    }

    const newBalance = oldBalance - charge;

    const transactionResult = await runTransaction<{
      order_id: string;
    }>(async (conn) => {
      const order_id = generate7DigitNumber();

      await conn.query(
        `
          INSERT INTO \`4wheeler\`
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
          SERVICE_ID,
          SERVICE_NAME,
          'panding',
          oldBalance,
          charge,
          newBalance,
          'debit',
          null,
          now,
          '',
        ],
      );
      await conn.query(
        `
          INSERT INTO \`transitions\`
          (
            \`order_id\`,
            \`user_mob\`,
            \`service_name\`,
            \`old\_balance\`,
            \`charge\`,
            \`new\_balance\`,
            \`tranfer\_type\`,
            \`status\`,
            \`date\_time\`,
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
          '',
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
<b>🚗 4 Wheeler PUC New Order</b>

<b>Order ID:</b> ${order_id}
<b>Vehicle No:</b> ${vehicle_no}
<b>Customer Mobile:</b> ${mobile_no}
<b>Service:</b> 2 Wheeler PUC
<b>Amount:</b> ₹${charge}
<b>Status:</b> Pending
`);
      return {
        order_id,
      };
    });

    return NextResponse.json(
      {
        message: '4 Wheeler request submitted successfully',

        id: Number(transactionResult.order_id),

        order_id: transactionResult.order_id,

        charge,

        old_balance: oldBalance,

        new_balance: newBalance,
      },
      {
        status: 201,
      },
    );
  } catch (error: any) {
    console.error('4wheeler submit error:', error);
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
