"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CreditCard,
  RefreshCw,
  Store,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { formatIndianDateTime } from "@/lib/date-utils";

interface DashboardData {
  retailers: {
    total: number;
    active: number;
    unpaid: number;
    pending: number;
    total_balance: number;
  };
  services: {
    name: string;
    totalCharge: number;
    transactions: number;
    refund: number;
    debit: number;
  }[];
  recentTransactions: {
    id: number;
    order_id: string;
    user_mob: string;
    service_name: string;
    charge: number;
    tranfer_type: string;
    status: string;
    date_time: string;
  }[];
  topRetailers: {
    id: number;
    name: string;
    mobile: string;
    email: string;
    status: string;
    balance: number;
  }[];
}

const COLORS = ["#ff3800", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#6366f1"];

const STATUS_COLORS: Record<string, string> = {
  panding: "bg-amber-100 text-amber-800",
  success: "bg-green-100 text-green-800",
  refund: "bg-red-100 text-red-800",
};

export default function AdminDashboard() {
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch("/api/admin/dashboard", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch dashboard data");
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (value: number) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
  const formatDate = (value: string) => {
    if (!value) return "-";
    return formatIndianDateTime(value, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const pieData =
    data?.services.map((s) => ({
      name: s.name,
      value: Number(s.totalCharge || 0),
    })) || [];

  const barData =
    data?.services.map((s) => ({
      name: s.name,
      debit: Number(s.debit || 0),
      refund: Number(s.refund || 0),
    })) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-[#ff3800]" />
          <p className="text-sm text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <p className="text-sm text-red-500">{error || "No data available"}</p>
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const statsCards = [
    {
      title: "Total Retailers",
      value: data.retailers.total,
      icon: Store,
      gradient: "from-orange-500 to-red-500",
      footer: `${data.retailers.active} active`,
    },
    {
      title: "Total Balance",
      value: formatCurrency(data.retailers.total_balance),
      icon: Wallet,
      gradient: "from-green-500 to-emerald-500",
      footer: "Across all retailers",
    },
    {
      title: "Active Retailers",
      value: data.retailers.active,
      icon: Users,
      gradient: "from-blue-500 to-cyan-500",
      footer: `${data.retailers.unpaid} unpaid`,
    },
    {
      title: "Total Transactions",
      value: data.services.reduce((sum, s) => sum + s.transactions, 0),
      icon: Activity,
      gradient: "from-purple-500 to-pink-500",
      footer: "All services",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-slate-500 dark:text-gray-400 mt-1">Real-time overview of retailers, balances, and services</p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="border-0 shadow-lg rounded-2xl dark:bg-black/60 overflow-hidden">
              <div className={`h-1 w-full bg-gradient-to-r ${stat.gradient}`} />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider">{stat.title}</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stat.value}</p>
                    <p className="text-xs text-slate-400 mt-1">{stat.footer}</p>
                  </div>
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                    <stat.icon className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Service-wise Balance Usage */}
        <Card className="border-0 shadow-lg rounded-2xl dark:bg-black/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
              <BarChart3 className="h-4 w-4 text-[#ff3800]" />
              Service-wise Balance Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                  <XAxis dataKey="name" className="text-xs" tick={{ fill: "#64748b" }} />
                  <YAxis className="text-xs" tick={{ fill: "#64748b" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                    formatter={(value: unknown) => formatCurrency(Number(value || 0))}
                  />
                  <Bar dataKey="debit" fill="#ff3800" radius={[4, 4, 0, 0]} name="Debit" />
                  <Bar dataKey="refund" fill="#10b981" radius={[4, 4, 0, 0]} name="Refund" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Service-wise Distribution */}
        <Card className="border-0 shadow-lg rounded-2xl dark:bg-black/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
              <TrendingUp className="h-4 w-4 text-[#ff3800]" />
              Revenue Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                    formatter={(value: unknown) => formatCurrency(Number(value || 0))}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Top Retailers */}
        <Card className="border-0 shadow-lg rounded-2xl dark:bg-black/60">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
              <CreditCard className="h-4 w-4 text-[#ff3800]" />
              Top Retailers by Balance
            </CardTitle>
            <Link href="/admin/retailers">
              <Button variant="ghost" size="sm" className="text-xs">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100 dark:border-slate-800">
                    <TableHead className="text-[11px] font-semibold text-slate-500 uppercase">Retailer</TableHead>
                    <TableHead className="text-[11px] font-semibold text-slate-500 uppercase">Mobile</TableHead>
                    <TableHead className="text-[11px] font-semibold text-slate-500 uppercase">Status</TableHead>
                    <TableHead className="text-right text-[11px] font-semibold text-slate-500 uppercase">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topRetailers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-slate-500 text-sm">
                        No retailers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.topRetailers.map((retailer) => (
                      <TableRow key={retailer.id} className="border-slate-50 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{retailer.name}</p>
                            <p className="text-[11px] text-slate-400">{retailer.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 dark:text-slate-400">{retailer.mobile}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[retailer.status] || "bg-slate-100 text-slate-800"}`}>
                            {retailer.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {formatCurrency(retailer.balance)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="border-0 shadow-lg rounded-2xl dark:bg-black/60">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
              <Activity className="h-4 w-4 text-[#ff3800]" />
              Recent Transactions
            </CardTitle>
            <Link href="/admin/transitions">
              <Button variant="ghost" size="sm" className="text-xs">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100 dark:border-slate-800">
                    <TableHead className="text-[11px] font-semibold text-slate-500 uppercase">Order ID</TableHead>
                    <TableHead className="text-[11px] font-semibold text-slate-500 uppercase">Service</TableHead>
                    <TableHead className="text-[11px] font-semibold text-slate-500 uppercase">Type</TableHead>
                    <TableHead className="text-right text-[11px] font-semibold text-slate-500 uppercase">Charge</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-slate-500 text-sm">
                        No transactions yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.recentTransactions.map((txn) => (
                      <TableRow key={txn.id} className="border-slate-50 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                        <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-400">{txn.order_id}</TableCell>
                        <TableCell className="text-sm text-slate-900 dark:text-slate-100">{txn.service_name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {txn.tranfer_type === "credit" ? (
                              <ArrowDownRight className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <ArrowUpRight className="h-3 w-3 text-rose-500" />
                            )}
                            <span className="text-xs text-slate-600 dark:text-slate-400">{txn.tranfer_type}</span>
                          </div>
                        </TableCell>
                        <TableCell className={`text-right text-sm font-semibold ${txn.tranfer_type === "credit" ? "text-emerald-600" : "text-rose-600"}`}>
                          {txn.tranfer_type === "credit" ? "+" : "-"}
                          {formatCurrency(txn.charge)}
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

      {/* Service Stats */}
      <Card className="border-0 shadow-lg rounded-2xl dark:bg-black/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
            <BarChart3 className="h-4 w-4 text-[#ff3800]" />
            Service Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.services.map((service, index) => (
              <motion.div
                key={service.name}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50"
              >
                <p className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider">{service.name}</p>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400">Total Charge</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(service.totalCharge)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400">Transactions</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{service.transactions}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400">Debit</span>
                    <span className="font-semibold text-rose-600">{formatCurrency(service.debit)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400">Refund</span>
                    <span className="font-semibold text-emerald-600">{formatCurrency(service.refund)}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
