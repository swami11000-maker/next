"use client";

import * as React from "react";
import {
  Loader2,
  RefreshCw,
  ArrowDown,
  ArrowUpRight,
  Download,
  FileText,
  AlertCircle,
  ClipboardList,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { RETAILER_DATA_CHANGED } from "@/lib/data-events";
import { apiFetch } from "@/lib/api-client";

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

const API_URL = "/api/dashbord-work-history";

export const Ltable = () => {
  const [data, setData] = React.useState<WorkHistory[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const fetchHistory = React.useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiFetch(API_URL, {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || "Failed to fetch work history");
      }

      setData(result?.data || []);
    } catch (err: any) {
      console.error("Work history error:", err);
      setError(err?.message || "Failed to load work history");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchHistory();

    const handleDataChanged = () => {
      fetchHistory();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchHistory();
      }
    };

    window.addEventListener(RETAILER_DATA_CHANGED, handleDataChanged);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener(RETAILER_DATA_CHANGED, handleDataChanged);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchHistory]);

  const handleDownload = (documentData: string | null, orderId: string) => {
    if (!documentData) return;

    if (documentData.startsWith("data:")) {
      const link = document.createElement("a");
      link.href = documentData;

      const mimeMatch = documentData.match(/data:([^;]+);base64/);
      const mimeType = mimeMatch ? mimeMatch[1] : "application/octet-stream";

      let extension = "file";
      if (mimeType.includes("pdf")) extension = "pdf";
      else if (mimeType.includes("png")) extension = "png";
      else if (mimeType.includes("jpg") || mimeType.includes("jpeg")) extension = "jpg";
      else if (mimeType.includes("gif")) extension = "gif";
      else if (mimeType.includes("webp")) extension = "webp";

      link.download = `${orderId}_document.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    if (documentData.startsWith("http")) {
      const link = document.createElement("a");
      link.href = documentData;
      link.download = `${orderId}_document`;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const link = document.createElement("a");
    link.href = `data:application/octet-stream;base64,${documentData}`;
    link.download = `${orderId}_document.bin`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatAmount = (value: number | string) => {
    return `₹${Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (value: string) => {
    if (!value) return { date: "-", time: "" };
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return { date: value, time: "" };
    return {
      date: date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      time: date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
    };
  };

  const getTransferType = (type: unknown) => {
    const value = String(type ?? "").toLowerCase();
    if (value.includes("credit") || value.includes("add") || value.includes("deposit")) {
      return "credit";
    }
    return "debit";
  };

  const getStatusConfig = (status: string) => {
    const s = status?.toLowerCase() || "";
    if (s.includes("complete") || s.includes("success")) {
      return {
        label: "Completed",
        bg: "bg-emerald-50 dark:bg-emerald-950/50",
        text: "text-emerald-700 dark:text-emerald-400",
        border: "border-emerald-200 dark:border-emerald-900",
        dot: "bg-emerald-500",
      };
    }
    if (s.includes("pending") || s.includes("process")) {
      return {
        label: "Pending",
        bg: "bg-amber-50 dark:bg-amber-950/50",
        text: "text-amber-700 dark:text-amber-400",
        border: "border-amber-200 dark:border-amber-900",
        dot: "bg-amber-500",
      };
    }
    if (s.includes("fail") || s.includes("error") || s.includes("reject")) {
      return {
        label: "Failed",
        bg: "bg-red-50 dark:bg-red-950/50",
        text: "text-red-700 dark:text-red-400",
        border: "border-red-200 dark:border-red-900",
        dot: "bg-red-500",
      };
    }
    return {
      label: status || "-",
      bg: "bg-zinc-50 dark:bg-zinc-900",
      text: "text-zinc-700 dark:text-zinc-400",
      border: "border-zinc-200 dark:border-zinc-800",
      dot: "bg-zinc-400",
    };
  };

  const displayData = data.slice(0, 2);

  if (loading) {
    return (
      <div className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-lg bg-white dark:bg-zinc-950 overflow-hidden">
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">Loading history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-lg bg-white dark:bg-zinc-950 overflow-hidden">
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 px-4">
          <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-red-500" />
          </div>
          <p className="text-sm text-destructive font-medium text-center">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchHistory}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-lg bg-white dark:bg-zinc-950 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-indigo-600" />
            Work History
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">Latest 2 transactions</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={fetchHistory}
          disabled={loading}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60">
              <th className="text-left px-6 py-3.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                Order ID
              </th>
              <th className="text-left px-6 py-3.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                Service
              </th>
              <th className="text-left px-6 py-3.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                Type
              </th>
              <th className="text-left px-6 py-3.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                Status
              </th>
              <th className="text-right px-6 py-3.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                Charge
              </th>
              <th className="text-right px-6 py-3.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                Balance
              </th>
              <th className="text-left px-6 py-3.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                Date
              </th>
              <th className="text-center px-6 py-3.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                Document
              </th>
            </tr>
          </thead>
          <tbody>
            {displayData.length === 0 ? (
              <tr>
                <td colSpan={8} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                      <ClipboardList className="h-5 w-5 text-zinc-400" />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">
                      No transactions found
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              displayData.map((item) => {
                const transferType = getTransferType(item.tranfer_type);
                const isCredit = transferType === "credit";
                const statusConfig = getStatusConfig(item.status);
                const dateObj = formatDate(item.date_time);
                const hasDoc = !!item.document;

                return (
                  <tr
                    key={item.id}
                    className="border-b border-zinc-50 dark:border-zinc-800/60 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md">
                        {item.order_id || "-"}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {item.service_name || "-"}
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        ID: {item.service_id}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                          isCredit
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900"
                            : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border-rose-200 dark:border-rose-900"
                        }`}
                      >
                        {isCredit ? (
                          <ArrowDown className="h-3 w-3" />
                        ) : (
                          <ArrowUpRight className="h-3 w-3" />
                        )}
                        {item.tranfer_type || "-"}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                        {statusConfig.label}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <span
                        className={`text-sm font-bold ${
                          isCredit
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {isCredit ? "+" : "-"}
                        {formatAmount(item.charge)}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        {formatAmount(item.new_balance)}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <p className="text-xs text-zinc-700 dark:text-zinc-300">
                        {dateObj.date}
                      </p>
                      <p className="text-[11px] text-zinc-400">{dateObj.time}</p>
                    </td>

                    <td className="px-6 py-4 text-center">
                      {hasDoc ? (
                        <button
                          onClick={() => handleDownload(item.document, item.order_id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-950/60 transition-colors border border-indigo-200 dark:border-indigo-900 cursor-pointer"
                          title="Download Document"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </button>
                      ) : (
                        <span className="text-xs text-zinc-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
