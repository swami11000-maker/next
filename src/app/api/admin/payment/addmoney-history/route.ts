import { NextRequest, NextResponse } from "next/server";
import { getAdminUser, runQuery, SqlParam } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getAdminUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
    const searchParams = request.nextUrl.searchParams;

    /* ---------------------------- Inputs ---------------------------- */
    const search = (searchParams.get("search") || "").trim();
    const status = (searchParams.get("status") || "").trim();
    const type = (searchParams.get("type") || "").trim();
    const dateFrom = (searchParams.get("dateFrom") || "").trim();
    const dateTo = (searchParams.get("dateTo") || "").trim();

    /* ---------------------------- Pagination ---------------------------- */
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limitRaw = parseInt(searchParams.get("limit") || "10", 10) || 10;
    const limit = Math.max(1, Math.min(100, limitRaw));
    const offset = (page - 1) * limit;

    const fetchTransitions = type !== "gateway";
    const fetchGateway = type !== "transition";

    /* ------------------------------------------------------------------ */
    /*                        TRANSITIONS WHERE                           */
    /* ------------------------------------------------------------------ */
    let whereTransitions = "WHERE t.service_name = 'Add Money'";
    const transitionsParams: SqlParam[] = [];

    if (search) {
      const term = `%${search}%`;
      whereTransitions += " AND (t.order_id LIKE ? OR t.remark LIKE ?)";
      transitionsParams.push(term, term);
    }
    if (status) {
      whereTransitions += " AND t.status = ?";
      transitionsParams.push(status);
    }
    if (dateFrom) {
      whereTransitions += " AND t.date_time >= ?";
      transitionsParams.push(dateFrom);
    }
    if (dateTo) {
      whereTransitions += " AND t.date_time <= ?";
      transitionsParams.push(dateTo + " 23:59:59");
    }

    /* ------------------------------------------------------------------ */
    /*                          GATEWAY WHERE                             */
    /* ------------------------------------------------------------------ */
    let whereGateway = "WHERE gt.payment_type = 'add_money'";
    const gatewayParams: SqlParam[] = [];

    if (search) {
      const term = `%${search}%`;
      whereGateway +=
        " AND (gt.order_id LIKE ? OR gt.utr LIKE ? OR gt.remark1 LIKE ? OR gt.remark2 LIKE ?)";
      gatewayParams.push(term, term, term, term);
    }
    if (status) {
      whereGateway += " AND gt.status = ?";
      gatewayParams.push(status);
    }
    if (dateFrom) {
      whereGateway += " AND gt.date_time >= ?";
      gatewayParams.push(dateFrom);
    }
    if (dateTo) {
      whereGateway += " AND gt.date_time <= ?";
      gatewayParams.push(dateTo + " 23:59:59");
    }

    /* ------------------------------------------------------------------ */
    /*                          TOTAL COUNT                               */
    /* ------------------------------------------------------------------ */
    let total = 0;

    if (fetchTransitions) {
      const countSqlT = `SELECT COUNT(*) as total FROM \`transitions\` t ${whereTransitions}`;
      const countRowsT = await runQuery<{ total: number }[]>(
        countSqlT,
        transitionsParams,
      );
      total += Number(countRowsT[0]?.total || 0);
    }

    if (fetchGateway) {
      const countSqlG = `SELECT COUNT(*) as total FROM \`gateway_transactions\` gt ${whereGateway}`;
      const countRowsG = await runQuery<{ total: number }[]>(
        countSqlG,
        gatewayParams,
      );
      total += Number(countRowsG[0]?.total || 0);
    }

    /* ------------------------------------------------------------------ */
    /*                          FETCH DATA                                */
    /* ------------------------------------------------------------------ */
    // ⚠️ LIMIT/OFFSET are inlined as integers (already parsed + clamped)
    //    because MySQL prepared statements reject `LIMIT ?` with strings.
    let allRows: any[] = [];

    if (fetchTransitions && fetchGateway) {
      const unionSql = `
        SELECT 
          t.id, t.order_id, t.date_time, t.status, t.remark, t.new_balance, t.charge,
          'transition' as type,
          NULL as utr
        FROM \`transitions\` t
        ${whereTransitions}

        UNION ALL

        SELECT 
          gt.id, gt.order_id, gt.date_time, gt.status, 
          CONCAT(gt.remark1, ' ', gt.remark2) as remark, NULL as new_balance, gt.amount as charge,
          'gateway' as type,
          gt.utr
        FROM \`gateway_transactions\` gt
        ${whereGateway}

        ORDER BY id DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      allRows = await runQuery<any[]>(unionSql, [
        ...transitionsParams,
        ...gatewayParams,
      ]);
    } else if (fetchTransitions) {
      const sql = `
        SELECT 
          t.id, t.order_id, t.date_time, t.status, t.remark, t.new_balance, t.charge,
          'transition' as type,
          NULL as utr
        FROM \`transitions\` t
        ${whereTransitions}
        ORDER BY t.id DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      allRows = await runQuery<any[]>(sql, [...transitionsParams]);
    } else if (fetchGateway) {
      const sql = `
        SELECT 
          gt.id, gt.order_id, gt.date_time, gt.status, 
          CONCAT(gt.remark1, ' ', gt.remark2) as remark, NULL as new_balance, gt.amount as charge,
          'gateway' as type,
          gt.utr
        FROM \`gateway_transactions\` gt
        ${whereGateway}
        ORDER BY gt.id DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      allRows = await runQuery<any[]>(sql, [...gatewayParams]);
    }

    /* ------------------------------------------------------------------ */
    /*                          PAGINATION META                           */
    /* ------------------------------------------------------------------ */
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return NextResponse.json({
      data: allRows,
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
    console.error("Admin add money history error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
