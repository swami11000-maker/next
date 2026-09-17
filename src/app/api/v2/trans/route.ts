import { getUserDeatail, Retailer } from '@/lib/auth';
import { pool } from '@/lib/server';
import { NextRequest, NextResponse } from 'next/server';

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
    const status = (searchParams.get('status') || '').trim();
    const transfer = (searchParams.get('transfer') || '').trim();

    /* --------------------------- Build WHERE ---------------------------- */
    // Base condition: only this user's transactions
    const conditions: string[] = ['user_mob = ?'];
    const params: any[] = [user.mobile];

    // Search across multiple columns
    if (search) {
      conditions.push(`(
        order_id LIKE ? OR
        service_name LIKE ? OR
        user_mob LIKE ? OR
        tranfer_type LIKE ? OR
        status LIKE ? OR
        remark LIKE ?
      )`);
      const like = `%${search}%`;
      params.push(like, like, like, like, like, like);
    }

    // Status filter
    if (status && status.toLowerCase() !== 'all') {
      conditions.push('status = ?');
      params.push(status);
    }

    // Transfer type filter
    if (transfer && transfer.toLowerCase() !== 'all') {
      conditions.push('tranfer_type = ?');
      params.push(transfer);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    /* ----------------------- Fetch paginated rows ----------------------- */
    const sql = `
      SELECT 
        id,
        order_id,
        user_mob,
        service_name,
        old_balance,
        charge,
        new_balance,
        tranfer_type,
        status,
        date_time,
        remark
      FROM transitions
      ${whereClause}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query(sql, [...params, limit, offset]);

    /* --------------------- Count total (same WHERE) --------------------- */
    const [countResult]: any = await pool.query(
      `SELECT COUNT(*) AS total FROM transitions ${whereClause}`,
      params,
    );

    const total = countResult?.[0]?.total || 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return NextResponse.json(
      {
        success: true,
        message: 'Transactions fetched successfully',
        data: rows,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error('Transaction API Error:', err);

    return NextResponse.json(
      {
        success: false,
        message: err?.message || 'Failed to fetch transactions',
      },
      { status: 500 },
    );
  }
}