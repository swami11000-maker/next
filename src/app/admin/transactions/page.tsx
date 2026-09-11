"use client";

import { useEffect, useState, useCallback } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";

interface HistoryItem {
  id: number;
  order_id: string;
  user_mob: string;
  service_name: string;
  old_balance: number;
  charge: number;
  new_balance: number;
  tranfer_type: string;
  status: string;
  date_time: string;
  remark: string;
}

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "panding", label: "Processing" },
  { value: "success", label: "Approved" },
  { value: "refund", label: "Refunded" },
];

const STATUS_COLORS: Record<string, string> = {
  panding: "bg-amber-100 text-amber-800",
  success: "bg-green-100 text-green-800",
  refund: "bg-red-100 text-red-800",
};

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, {
    headers: { "Content-Type": "application/json", ...options.headers },
    cache: "no-store",
    ...options,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error((json as { message?: string }).message || "Request failed");
  }
  return json as T;
}

export default function AdminTransactionsPage() {
  const [data, setData] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);

      const result = await api<HistoryItem[]>(`/api/admin/transitions?${params.toString()}`);
      setData(result);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Transactions</h1>
        <p className="text-slate-500 dark:text-gray-400">All retailer transaction records.</p>
      </div>

      <Card className="rounded-2xl border-slate-200 bg-white dark:border-[#ff3800]/20 dark:bg-black/60">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                className="pl-8"
                placeholder="Search service, order, remark..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-white/5">
                  <TableHead className="text-slate-700 dark:text-gray-300">Order ID</TableHead>
                  <TableHead className="text-slate-700 dark:text-gray-300">Service</TableHead>
                  <TableHead className="text-slate-700 dark:text-gray-300">User Mobile</TableHead>
                  <TableHead className="text-slate-700 dark:text-gray-300">Charge</TableHead>
                  <TableHead className="text-slate-700 dark:text-gray-300">Old Balance</TableHead>
                  <TableHead className="text-slate-700 dark:text-gray-300">New Balance</TableHead>
                  <TableHead className="text-slate-700 dark:text-gray-300">Type</TableHead>
                  <TableHead className="text-slate-700 dark:text-gray-300">Status</TableHead>
                  <TableHead className="text-slate-700 dark:text-gray-300">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                      No records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row) => (
                    <TableRow key={row.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                      <TableCell className="font-mono text-xs text-slate-900 dark:text-white">{row.order_id}</TableCell>
                      <TableCell className="text-slate-700 dark:text-gray-300">{row.service_name}</TableCell>
                      <TableCell className="text-slate-700 dark:text-gray-300">{row.user_mob}</TableCell>
                      <TableCell className="text-slate-700 dark:text-gray-300">₹{row.charge}</TableCell>
                      <TableCell className="text-slate-700 dark:text-gray-300">₹{row.old_balance}</TableCell>
                      <TableCell className="text-slate-700 dark:text-gray-300">₹{row.new_balance}</TableCell>
                      <TableCell className="text-slate-700 dark:text-gray-300 capitalize">{row.tranfer_type}</TableCell>
                      <TableCell>
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${STATUS_COLORS[row.status] || "bg-gray-100 text-gray-700"}`}>
                          {row.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-700 dark:text-gray-300">
                        {row.date_time ? new Date(row.date_time).toLocaleString("en-IN") : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
