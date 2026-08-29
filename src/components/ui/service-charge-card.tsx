"use client";

import { IndianRupee } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ServiceChargeCardProps {
  charge: number | string;
  serviceName: string;
  label?: string;
  className?: string;
}

export function ServiceChargeCard({
  charge,
  serviceName,
  label = "Service Charge",
  className,
}: ServiceChargeCardProps) {
  return (
    <div
      className={cn(
        "w-full max-w-xs rounded-xl",
        "border border-[#ff3800]/20",
        "bg-white dark:bg-white/[0.03]",
        "p-3 shadow-sm",
        "transition-all duration-300",
        "hover:border-[#ff3800]/40",
        "hover:shadow-md hover:shadow-[#ff3800]/10",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#ff3800]/10">
            <IndianRupee className="h-4 w-4 text-[#ff3800]" />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 dark:text-gray-400">
              {label}
            </p>

            <p className="text-lg font-bold text-slate-900 dark:text-white">
              ₹{charge}
            </p>
          </div>
        </div>

        {/* Service */}
        <Badge
          variant="outline"
          className="shrink-0 border-[#ff3800]/20 bg-[#ff3800]/5 text-[#ff3800]"
        >
          {serviceName}
        </Badge>
      </div>
    </div>
  );
}