"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import {
  motion, AnimatePresence, animate,
} from "framer-motion";
import {
  Loader2, CreditCard, Users, TrendingUp, TrendingDown,
  Calendar, DollarSign, BarChart3, ArrowUpRight,
  Sparkles, Activity, Wallet, CheckCircle2, XCircle, Clock,
  RefreshCw, Trophy, Zap, LineChart as LineChartIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api-client";

interface DashboardStats {
  summary: {
    total_transactions: number;
    total_amount: number;
    unique_users: number;
    successful_count: number;
    failed_count: number;
    pending_count: number;
  };
  daily: Array<{ date: string; amount: number; count: number }>;
  topUsers: Array<{ user_mob: string; user_name: string; total_amount: number; transaction_count: number }>;
  statusBreakdown: Array<{ status: string; count: number; amount: number }>;
}

type Period = "today" | "week" | "month" | "all";

/* ------------------ Animated Counter ------------------ */
function AnimatedNumber({
  value,
  format = (n: number) => n.toLocaleString("en-IN"),
  duration = 1.2,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const from = prevRef.current;
    const to = value || 0;
    const controls = animate(from, to, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(v),
      onComplete: () => (prevRef.current = to),
    });
    return () => controls.stop();
  }, [value, duration]);

  return <span>{format(display)}</span>;
}

/* ------------------ Short Currency ------------------ */
function shortCurrency(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${Math.round(n)}`;
}

/* ------------------ SVG Area / Line Chart ------------------ */
function AreaTrendChart({
  data,
  labels,
  formatCurrency,
}: {
  data: number[];
  labels: string[];
  formatCurrency: (n: number) => string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (!data.length) {
    return (
      <div className="h-72 flex flex-col items-center justify-center text-slate-500">
        <LineChartIcon className="h-12 w-12 mb-3 opacity-20" />
        <p className="text-sm">No trend data</p>
      </div>
    );
  }

  const W = 900;
  const H = 280;
  const pad = { top: 24, right: 24, bottom: 40, left: 60 };
  const cW = W - pad.left - pad.right;
  const cH = H - pad.top - pad.bottom;

  const maxV = Math.max(...data, 1);
  const stepX = data.length > 1 ? cW / (data.length - 1) : 0;

  const points = data.map((v, i) => {
    const x = pad.left + i * stepX;
    const y = pad.top + cH - (v / maxV) * cH;
    return { x, y, v };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");

  const areaPath =
    `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${(pad.top + cH).toFixed(2)} ` +
    `L ${points[0].x.toFixed(2)} ${(pad.top + cH).toFixed(2)} Z`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="w-full h-72 relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff3800" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#ff3800" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ff3800" />
            <stop offset="100%" stopColor="#ff8c5a" />
          </linearGradient>
        </defs>

        {/* Grid */}
        {yTicks.map((t, i) => {
          const y = pad.top + t * cH;
          return (
            <g key={i}>
              <line
                x1={pad.left}
                x2={W - pad.right}
                y1={y}
                y2={y}
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-700"
                strokeOpacity="0.6"
                strokeDasharray="4 6"
              />
              <text
                x={pad.left - 10}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-400 text-[11px]"
              >
                {shortCurrency(maxV * (1 - t))}
              </text>
            </g>
          );
        })}

        {/* Area */}
        <motion.path
          d={areaPath}
          fill="url(#areaGrad)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
        />

        {/* Line */}
        <motion.path
          d={linePath}
          fill="none"
          stroke="url(#lineGrad)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.6, ease: "easeInOut" }}
        />

        {/* Dots + Hover zones */}
        {points.map((p, i) => (
          <g key={i}>
            <motion.circle
              cx={p.x}
              cy={p.y}
              r={hovered === i ? 7 : 4}
              fill="white"
              stroke="#ff3800"
              strokeWidth={2.5}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.9 + i * 0.04, type: "spring", stiffness: 200 }}
              style={{ filter: "drop-shadow(0 2px 4px rgba(255,56,0,0.35))" }}
            />
            {/* invisible hover zone */}
            <rect
              x={p.x - stepX / 2}
              y={pad.top}
              width={Math.max(stepX, 24)}
              height={cH}
              fill="transparent"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          </g>
        ))}

        {/* X-axis labels */}
        {points.map((p, i) => (
          <text
            key={`lbl-${i}`}
            x={p.x}
            y={H - 12}
            textAnchor="middle"
            className="fill-slate-500 text-[10px]"
          >
            {labels[i]}
          </text>
        ))}

        {/* Tooltip */}
        {hovered !== null && (
          <g transform={`translate(${points[hovered].x}, ${points[hovered].y})`}>
            <rect
              x={-60}
              y={-52}
              width={120}
              height={40}
              rx={8}
              className="fill-slate-900 dark:fill-slate-100"
              opacity={0.96}
            />
            <text
              x={0}
              y={-34}
              textAnchor="middle"
              className="fill-white dark:fill-slate-900 text-[11px] font-semibold"
            >
              {formatCurrency(data[hovered])}
            </text>
            <text
              x={0}
              y={-20}
              textAnchor="middle"
              className="fill-slate-300 dark:fill-slate-600 text-[10px]"
            >
              {labels[hovered]}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

/* ------------------ Motion Variants ------------------ */
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 120, damping: 18 },
  },
} as const;

const cardHover = {
  rest: { y: 0, scale: 1 },
  hover: {
    y: -6,
    scale: 1.02,
    transition: { type: "spring", stiffness: 300, damping: 20 },
  },
} as const;

export default function AdminAddMoneyDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("today");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStats = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      else setIsRefreshing(true);
      setError(null);

      const response = await apiFetch(
        `/api/admin/dashboard/addmoney-stats?period=${period}`,
        { method: "GET", cache: "no-store" }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP ${response.status}: Failed to fetch stats`
        );
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stats");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [period]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  const formatNumber = (num: number) =>
    new Intl.NumberFormat("en-IN").format(num);

  const getPeriodLabel = (p: Period) => {
    switch (p) {
      case "today": return "Today";
      case "week": return "This Week";
      case "month": return "This Month";
      case "all": return "All Time";
    }
  };

  /* ------------------ Loading ------------------ */
  if (isLoading && !stats) {
    return (
      <div className="space-y-6 p-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#ff3800] to-orange-400 flex items-center justify-center shadow-lg shadow-[#ff3800]/30">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
                Add Money Dashboard
              </h1>
              <p className="text-xs text-slate-500">Loading insights...</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="border-0 shadow-sm overflow-hidden relative">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                <CardContent className="py-10 flex justify-center">
                  <Loader2 className="h-7 w-7 animate-spin text-[#ff3800]" />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <Card className="border-0 shadow-lg border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="py-12 text-center">
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4"
            >
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </motion.div>
            <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-1">
              Failed to load dashboard
            </h3>
            <p className="text-sm text-red-600/80 dark:text-red-400/80 mb-4">{error}</p>
            <Button
              onClick={() => fetchStats()}
              className="bg-[#ff3800] hover:bg-[#e63200] text-white gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (!stats) return null;

  const { summary, daily, topUsers, statusBreakdown } = stats;
  const successRate =
    summary.total_transactions > 0
      ? (summary.successful_count / summary.total_transactions) * 100
      : 0;

  const chartLabels = daily.map((d) => {
    try {
      return new Date(d.date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      });
    } catch {
      return d.date;
    }
  });
  const chartData = daily.map((d) => d.amount);
  const maxAmount = Math.max(...chartData, 1);

  const summaryCards = [
    {
      title: "Total Amount",
      value: summary.total_amount,
      formatter: formatCurrency,
      icon: Wallet,
      gradient: "from-blue-500/10 via-blue-500/5 to-transparent",
      iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      border: "border-blue-200/50 dark:border-blue-900/50",
    },
    {
      title: "Transactions",
      value: summary.total_transactions,
      formatter: formatNumber,
      icon: CreditCard,
      gradient: "from-emerald-500/10 via-emerald-500/5 to-transparent",
      iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-200/50 dark:border-emerald-900/50",
    },
    {
      title: "Unique Users",
      value: summary.unique_users,
      formatter: formatNumber,
      icon: Users,
      gradient: "from-purple-500/10 via-purple-500/5 to-transparent",
      iconBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
      border: "border-purple-200/50 dark:border-purple-900/50",
    },
    {
      title: "Success Rate",
      value: successRate,
      formatter: (n: number) => `${n.toFixed(1)}%`,
      icon: TrendingUp,
      gradient: "from-orange-500/10 via-orange-500/5 to-transparent",
      iconBg: "bg-orange-500/10 text-[#ff3800]",
      border: "border-orange-200/50 dark:border-orange-900/50",
    },
  ];

  const statusCards = [
    {
      label: "Successful", value: summary.successful_count, icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10",
      ring: "ring-emerald-500/20", accent: "from-emerald-500 to-emerald-600",
    },
    {
      label: "Pending", value: summary.pending_count, icon: Clock,
      color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10",
      ring: "ring-amber-500/20", accent: "from-amber-500 to-amber-600",
    },
    {
      label: "Failed", value: summary.failed_count, icon: XCircle,
      color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10",
      ring: "ring-red-500/20", accent: "from-red-500 to-red-600",
    },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 p-1"
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ rotate: 15, scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="h-11 w-11 rounded-xl bg-gradient-to-br from-[#ff3800] to-orange-400 flex items-center justify-center shadow-lg shadow-[#ff3800]/30"
          >
            <Sparkles className="h-5 w-5 text-white" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
              Add Money Dashboard
            </h1>
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <Activity className="h-3 w-3" />
              {getPeriodLabel(period)} overview
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <SelectTrigger className="w-[170px] h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl text-black">
                <Calendar className="h-4 w-4 mr-2 text-[#ff3800]" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchStats(true)}
              disabled={isRefreshing}
              className="h-10 w-10 rounded-xl border-slate-200 dark:border-slate-800"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              variants={itemVariants}
              initial="rest"
              whileHover="hover"
              animate="rest"
            >
              <motion.div variants={cardHover}>
                <Card
                  className={`relative overflow-hidden border ${card.border} shadow-sm hover:shadow-xl transition-shadow duration-300 bg-white dark:bg-slate-900`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} pointer-events-none`} />
                  <CardContent className="p-5 relative">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          {card.title}
                        </p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                          <AnimatedNumber value={card.value} format={card.formatter} />
                        </p>
                      </div>
                      <motion.div
                        whileHover={{ rotate: 8, scale: 1.1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                        className={`p-2.5 rounded-xl ${card.iconBg}`}
                      >
                        <Icon className="h-5 w-5" />
                      </motion.div>
                    </div>
                    <motion.div
                      className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-[#ff3800] to-transparent"
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 1.2, delay: 0.3 + i * 0.1 }}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* Status Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statusCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              variants={itemVariants}
              whileHover={{ y: -4, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 relative overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <motion.div
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.4 + i * 0.1, type: "spring", stiffness: 200 }}
                      className={`p-2.5 rounded-xl ${s.bg} ring-2 ${s.ring}`}
                    >
                      <Icon className={`h-5 w-5 ${s.color}`} />
                    </motion.div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {s.label}
                      </p>
                      <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                        <AnimatedNumber value={s.value} format={formatNumber} />
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full bg-gradient-to-r ${s.accent} rounded-full`}
                      initial={{ width: 0 }}
                      animate={{
                        width: `${summary.total_transactions > 0 ? (s.value / summary.total_transactions) * 100 : 0}%`,
                      }}
                      transition={{ duration: 1, delay: 0.6 + i * 0.1 }}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* ------------------ NEW: Area Trend Chart ------------------ */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 overflow-hidden relative">
          {/* glow */}
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[#ff3800]/10 blur-3xl pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <motion.div
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                className="p-1.5 rounded-lg bg-[#ff3800]/10"
              >
                <LineChartIcon className="h-4 w-4 text-[#ff3800]" />
              </motion.div>
              Amount Trend
              <span className="text-xs font-normal text-slate-500 ml-1">
                · {getPeriodLabel(period)}
              </span>
            </CardTitle>
            {daily.length > 0 && (
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-[#ff3800]" /> Amount
                </span>
                <span className="flex items-center gap-1.5 text-slate-500">
                  Peak: <span className="font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(maxAmount)}</span>
                </span>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <AreaTrendChart
              data={chartData}
              labels={chartLabels}
              formatCurrency={formatCurrency}
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* ------------------ Daily Bar Chart (FIXED) ------------------ */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="p-1.5 rounded-lg bg-[#ff3800]/10"
              >
                <BarChart3 className="h-4 w-4 text-[#ff3800]" />
              </motion.div>
              Daily Add Money Trend
              <span className="text-xs font-normal text-slate-500 ml-1">
                · {getPeriodLabel(period)}
              </span>
            </CardTitle>
            {daily.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full"
              >
                <ArrowUpRight className="h-3 w-3" />
                {daily.length} day{daily.length > 1 ? "s" : ""}
              </motion.div>
            )}
          </CardHeader>
          <CardContent>
            {daily.length > 0 ? (
              /*
               * FIX EXPLANATION:
               * Pehle: parent column ki height auto thi → `height: X%` on inner bar
               * resolve nahi hota tha (0% => bar invisible).
               * Ab: outer column `h-full`, inner flex-1 gives bar zone,
               * bar `height: X%` us zone ka percentage leta hai. ✅
               */
              <div className="h-72 flex items-stretch justify-center gap-2 px-2 pt-6 pb-1">
                {daily.map((d, i) => {
                  const heightPct = Math.max((d.amount / maxAmount) * 100, 3);
                  return (
                    <div
                      key={d.date}
                      className="flex-1 max-w-[44px] h-full flex flex-col items-center group min-w-0"
                    >
                      {/* bar zone - flex-1 gives remaining space; bar height % works */}
                      <div className="flex-1 w-full flex flex-col justify-end items-center relative">
                        {/* Tooltip */}
                        <div className="absolute -top-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                          <div className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px] font-medium px-2 py-1 rounded-md shadow-lg">
                            {formatCurrency(d.amount)}
                            <div className="text-[9px] opacity-70">{d.count} txns</div>
                          </div>
                        </div>

                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${heightPct}%` }}
                          transition={{
                            delay: 0.3 + i * 0.05,
                            duration: 0.8,
                            type: "spring",
                            stiffness: 80,
                          }}
                          whileHover={{ scaleY: 1.03, filter: "brightness(1.1)" }}
                          className="w-full rounded-t-lg bg-gradient-to-t from-[#ff3800] via-[#ff5c2a] to-[#ff8c5a] shadow-lg shadow-[#ff3800]/20 cursor-pointer origin-bottom"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 mt-2 text-center w-full truncate font-medium">
                        {chartLabels[i]}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-72 flex flex-col items-center justify-center text-slate-500"
              >
                <BarChart3 className="h-12 w-12 mb-3 opacity-20" />
                <p className="text-sm">No data for selected period</p>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ------------------ Top Users & Status Breakdown ------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <motion.div
                  animate={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="p-1.5 rounded-lg bg-amber-500/10"
                >
                  <Trophy className="h-4 w-4 text-amber-500" />
                </motion.div>
                Top Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topUsers.length > 0 ? (
                <div className="space-y-2.5">
                  {topUsers.map((user, index) => (
                    <motion.div
                      key={user.user_mob}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.06 }}
                      whileHover={{ x: 4, scale: 1.01 }}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <motion.div
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.6 }}
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold text-sm ${
                            index === 0
                              ? "bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-md shadow-amber-500/30"
                              : index === 1
                              ? "bg-gradient-to-br from-slate-300 to-slate-400 text-white"
                              : index === 2
                              ? "bg-gradient-to-br from-orange-400 to-orange-500 text-white"
                              : "bg-[#ff3800]/10 text-[#ff3800]"
                          }`}
                        >
                          {index === 0 ? <Trophy className="h-4 w-4" /> : index + 1}
                        </motion.div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-slate-900 dark:text-white truncate">
                            {user.user_name || "Unknown"}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {user.user_mob}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="font-semibold text-sm text-slate-900 dark:text-white tabular-nums">
                          {formatCurrency(user.total_amount)}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {user.transaction_count} txns
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-500">
                  <Users className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No user data</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="p-1.5 rounded-lg bg-[#ff3800]/10">
                  <Zap className="h-4 w-4 text-[#ff3800]" />
                </div>
                Status Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statusBreakdown.length > 0 ? (
                <div className="space-y-3">
                  {statusBreakdown.map((s, i) => {
                    const pct =
                      summary.total_transactions > 0
                        ? (s.count / summary.total_transactions) * 100
                        : 0;
                    const isSuccess = s.status === "success" || s.status === "completed";
                    const isPending = s.status === "pending";
                    const color = isSuccess
                      ? "from-emerald-500 to-emerald-600"
                      : isPending
                      ? "from-amber-400 to-amber-500"
                      : "from-red-500 to-red-600";
                    const dotColor = isSuccess
                      ? "bg-emerald-500"
                      : isPending
                      ? "bg-amber-500"
                      : "bg-red-500";

                    return (
                      <motion.div
                        key={s.status}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 + i * 0.08 }}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${dotColor} shadow-sm`} />
                            <span className="font-medium text-sm text-slate-700 dark:text-slate-300 capitalize">
                              {s.status || "unknown"}
                            </span>
                          </div>
                          <span className="font-semibold text-sm text-slate-900 dark:text-white tabular-nums">
                            {formatNumber(s.count)}
                          </span>
                        </div>
                        <div className="h-2 bg-slate-200 dark:bg-slate-700/60 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 1, delay: 0.5 + i * 0.08, type: "spring", stiffness: 60 }}
                            className={`h-full bg-gradient-to-r ${color} rounded-full`}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-500 mt-1.5">
                          <span className="font-medium">{pct.toFixed(1)}%</span>
                          <span className="tabular-nums">{formatCurrency(s.amount)}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-500">
                  <Zap className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No status data</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Refresh Button */}
      <motion.div variants={itemVariants} className="flex justify-center pt-2">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={() => fetchStats(true)}
            disabled={isRefreshing}
            className="gap-2 rounded-xl bg-gradient-to-r from-[#ff3800] to-orange-500 hover:from-[#e63200] hover:to-orange-600 text-white shadow-lg shadow-[#ff3800]/30 px-6 h-11"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing..." : "Refresh Data"}
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}