import { NextRequest, NextResponse } from 'next/server';
import { getUserDeatail, runQuery } from '@/lib/auth';
import type { Retailer } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user: Retailer | null = await getUserDeatail(request);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    /* ---------------------------- Pagination ---------------------------- */
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10', 10)));
    const offset = (page - 1) * limit;

    /* ------------------------------ Filters ----------------------------- */
    const search = (searchParams.get('search') || '').trim();
    const status = (searchParams.get('status') || '').trim().toLowerCase();
    const txnStatus = (searchParams.get('txn_status') || '').trim().toLowerCase();

    /* --------------------------- Build WHERE ---------------------------- */
    const conditions: string[] = ['`user_mob` = ?', "`payment_type` = 'add_money'"];
    const params: any[] = [String(user.mobile)];

    // Search across relevant columns
    if (search) {
      conditions.push(`(
        \`order_id\` LIKE ? OR
        \`utr\` LIKE ? OR
        \`amount\` LIKE ? OR
        \`remark1\` LIKE ? OR
        \`remark2\` LIKE ? OR
        \`status\` LIKE ? OR
        \`txn_status\` LIKE ?
      )`);
      const like = `%${search}%`;
      params.push(like, like, like, like, like, like, like);
    }

    // Status filter
    if (status && status !== 'all') {
      conditions.push('`status` = ?');
      params.push(status);
    }

    // Txn status filter
    if (txnStatus && txnStatus !== 'all') {
      conditions.push('`txn_status` = ?');
      params.push(txnStatus);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    /* ----------------------- Fetch paginated rows ----------------------- */
    const gatewayTransactions = await runQuery<any[]>(
      `
      SELECT 
        \`order_id\`,
        \`amount\`,
        \`payment_type\`,
        \`status\`,
        \`txn_status\`,
        \`utr\`,
        \`date_time\`,
        \`remark1\`,
        \`remark2\`
      FROM \`gateway_transactions\`
      ${whereClause}
      ORDER BY \`id\` DESC
      LIMIT ? OFFSET ?
      `,
      [...params, limit, offset],
    );

    /* --------------------- Count total (same WHERE) --------------------- */
    const countRows = await runQuery<any[]>(
      `
      SELECT COUNT(*) AS total
      FROM \`gateway_transactions\`
      ${whereClause}
      `,
      params,
    );

    const total = Number(countRows?.[0]?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return NextResponse.json({
      gateway_transactions: gatewayTransactions,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error: unknown) {
    console.error('Add money history error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
