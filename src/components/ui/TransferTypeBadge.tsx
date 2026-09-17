"use client";

import { ArrowDownLeft, ArrowUpRight, Minus } from "lucide-react";

import { Badge } from "./badge";

interface TransferTypeBadgeProps {
  type?: string | null;
}

export function TransferTypeBadge({
  type,
}: TransferTypeBadgeProps) {
  const value = type?.toLowerCase().trim() ?? "";

  const config =
    value === "credit"
      ? {
          label: "Credit",
          icon: ArrowDownLeft,
          className:
            "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-100",
          iconClassName: "bg-emerald-100 text-emerald-600",
        }
      : value === "debit"
        ? {
            label: "Debit",
            icon: ArrowUpRight,
            className:
              "border-red-200 bg-red-50 text-red-700 shadow-sm shadow-red-100",
            iconClassName: "bg-red-100 text-red-600",
          }
        : {
            label: type || "-",
            icon: Minus,
            className:
              "border-slate-200 bg-slate-50 text-slate-600 shadow-sm shadow-slate-100",
            iconClassName: "bg-slate-100 text-slate-500",
          };

  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-semibold transition-all duration-200 hover:shadow-md ${config.className}`}
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full ${config.iconClassName}`}
      >
        <Icon className="h-3 w-3" strokeWidth={2.5} />
      </span>

      <span className="capitalize">{config.label}</span>
    </Badge>
  );
}