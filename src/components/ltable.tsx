"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface WorkHistory {
  id: number;
  order_id: string;
  user_mob: string;
  service_name: string;
  service_id: string | number;
  old_balance: number | string;
  charge: number | string;
  new_balance: number | string;
  document: string | null;
  tranfer_type: string;
  status: string;
  date_time: string;
  remark: string | null;
}

export const Ltable = () => {
  const [data, setData] = React.useState<WorkHistory[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);

        const response = await fetch("/api/dashbord-work-history", {
          method: "GET",
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.message || "Failed to fetch work history");
        }

        setData(result?.data || []);
      } catch (error) {
        console.error("Work history error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const formatAmount = (value: number | string) => {
    return `₹${Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (value: string) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[180px] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading history...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-xl border">
      <Table>
        <TableCaption>Your recent transactions.</TableCaption>

        <TableHeader>
          <TableRow>
            <TableHead>Order ID</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Transfer Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Charge</TableHead>
            <TableHead>Balance</TableHead>
            <TableHead>Date & Time</TableHead>
            <TableHead>Remark</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">
                No transaction history found.
              </TableCell>
            </TableRow>
          ) : (
            data.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.order_id || "-"}</TableCell>

                <TableCell>{item.service_name || "-"}</TableCell>

                <TableCell>{item.tranfer_type || "-"}</TableCell>

                <TableCell>{item.status || "-"}</TableCell>

                <TableCell className="font-medium">{formatAmount(item.charge)}</TableCell>

                <TableCell>{formatAmount(item.new_balance)}</TableCell>

                <TableCell className="whitespace-nowrap">{formatDate(item.date_time)}</TableCell>

                <TableCell className="max-w-[200px] truncate">{item.remark || "-"}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
