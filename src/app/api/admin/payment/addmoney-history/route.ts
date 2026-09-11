import { NextRequest, NextResponse } from "next/server";
import { runQuery, SqlParam } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const type = searchParams.get("type") || "";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "50"));
    const offset = (page - 1) * limit;

    const fetchTransitions = type !== "gateway";
    const fetchGateway = type !== "transition";

    // ---------- Transitions WHERE + params ----------
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

    // ---------- Gateway WHERE + params ----------
    let whereGateway = "WHERE gt.payment_type = 'add_money'";
    const gatewayParams: SqlParam[] = [];

    if (search) {
      const term = `%${search}%`;
      whereGateway +=
        " AND (gt.order_id LIKE ? OR gt.utr LIKE ? OR gt.remark1 LIKE ? OR gt.remark2 LIKE ?)";
      gatewayParams.push(term, term, term, term);
    }
    if (status) {
      // yahan gt.status use kiya hai, txn_status nahi
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

    // ---------- Total count ----------
    let total = 0;

    if (fetchTransitions) {
      const countSqlT = `SELECT COUNT(*) as total FROM \`transitions\` t ${whereTransitions}`;
      const countRowsT = await runQuery<{ total: number }[]>(
        countSqlT,
        transitionsParams
      );
      total += Number(countRowsT[0]?.total || 0);
    }

    if (fetchGateway) {
      const countSqlG = `SELECT COUNT(*) as total FROM \`gateway_transactions\` gt ${whereGateway}`;
      const countRowsG = await runQuery<{ total: number }[]>(
        countSqlG,
        gatewayParams
      );
      total += Number(countRowsG[0]?.total || 0);
    }

    // ---------- Fetch data ----------
    let allRows: any[] = [];

    if (fetchTransitions && fetchGateway) {
      // Dono tables ko UNION ALL karke combined pagination
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

        ORDER BY date_time DESC
        LIMIT ? OFFSET ?
      `;

      allRows = await runQuery<any[]>(unionSql, [
        ...transitionsParams,
        ...gatewayParams,
        limit,
        offset,
      ]);
    } else if (fetchTransitions) {
      const sql = `
        SELECT 
          t.id, t.order_id, t.date_time, t.status, t.remark, t.new_balance, t.charge,
          'transition' as type,
          NULL as utr
        FROM \`transitions\` t
        ${whereTransitions}
        ORDER BY t.date_time DESC
        LIMIT ? OFFSET ?
      `;
      allRows = await runQuery<any[]>(sql, [
        ...transitionsParams,
        limit,
        offset,
      ]);
    } else if (fetchGateway) {
      const sql = `
        SELECT 
          gt.id, gt.order_id, gt.date_time, gt.status, 
          CONCAT(gt.remark1, ' ', gt.remark2) as remark, NULL as new_balance, gt.amount as charge,
          'gateway' as type,
          gt.utr
        FROM \`gateway_transactions\` gt
        ${whereGateway}
        ORDER BY gt.date_time DESC
        LIMIT ? OFFSET ?
      `;
      allRows = await runQuery<any[]>(sql, [
        ...gatewayParams,
        limit,
        offset,
      ]);
    }

    return NextResponse.json({
      data: allRows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    console.error("Admin add money history error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}