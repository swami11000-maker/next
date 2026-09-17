import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser, runQuery } from '@/lib/auth';
import type { TwoWheelerRequest } from '@/lib/auth';
import { TWOWHEELER_SAFE_COLUMNS } from '@/lib/auth';

const RETAILER_SELECT = TWOWHEELER_SAFE_COLUMNS.join(', ');

export async function GET(request: NextRequest) {
  const user = await getAdminUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);

    /* ---------------------------- Pagination ---------------------------- */
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10', 10)));
    const offset = (page - 1) * limit;

    /* ------------------------------ Filters ----------------------------- */
    const status = (searchParams.get('status') || '').trim();
    const search = (searchParams.get('search') || '').trim();

    /* --------------------------- Build WHERE ---------------------------- */
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (status && status !== 'all') {
      conditions.push('status = ?');
      params.push(status);
    }

    if (search) {
      conditions.push('(vehicle_no LIKE ? OR user_mob LIKE ? OR service_mob LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    /* ----------------------- Fetch paginated rows ----------------------- */
    const sql = `
      SELECT ${RETAILER_SELECT}
      FROM \`4wheeler\`
      ${whereClause}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `;

    const rows = await runQuery<TwoWheelerRequest[]>(sql, [...params, limit, offset] as never);

    /* --------------------- Count total (same WHERE) --------------------- */
    const countRows = await runQuery<{ total: number }[]>(`SELECT COUNT(*) AS total FROM \`4wheeler\` ${whereClause}`, params as never);

    const total = Number(countRows?.[0]?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return NextResponse.json({
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('List 4wheeler error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
