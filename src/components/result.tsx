// components/pan-result-dialog.tsx
"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  X,
  User,
  CreditCard,
  Users,
  CalendarDays,
  FileText,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* =========================================================
   TYPES
========================================================= */

export interface PanSuccessResult {
  status: "200";
  pan_no: string;
  name: string;
  father?: string;
  fname?: string;
  dob: string;
  gender: string;
  application_no: string;
}

export interface PanErrorResult {
  status: "404" | string;
  message: string;
}

export type PanResult = PanSuccessResult | PanErrorResult;

interface PanResultDialogProps {
  open: boolean;
  result: PanResult | null;
  searchedPan?: string;
  onOpenChange: (open: boolean) => void;
  onSearchAgain?: () => void;
}

/* =========================================================
   HELPERS
========================================================= */

const formatDob = (dob?: string) => {
  if (!dob) return "Not Available";
  try {
    const date = new Date(`${dob}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dob;
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return dob;
  }
};

const formatGender = (gender?: string) => {
  if (!gender) return "Not Available";
  switch (gender.toUpperCase()) {
    case "M":
      return "Male";
    case "F":
      return "Female";
    case "T":
      return "Transgender";
    default:
      return gender;
  }
};

const isSuccess = (result: PanResult | null): result is PanSuccessResult => {
  return result !== null && result.status === "200" && "pan_no" in result;
};

const isError = (result: PanResult | null): result is PanErrorResult => {
  return result !== null && !isSuccess(result);
};

/* =========================================================
   DETAIL ITEM
========================================================= */

interface DetailItemProps {
  icon: React.ElementType;
  label: string;
  value?: string;
  breakAll?: boolean;
  delay?: number;
}

function DetailItem({
  icon: Icon,
  label,
  value,
  breakAll = false,
  delay = 0,
}: DetailItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={cn(
        "rounded-xl border p-4 transition-all duration-300",
        "border-orange-100 bg-orange-50/50",
        "hover:border-orange-300 hover:bg-orange-50"
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black">
          <Icon className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          {label}
        </span>
      </div>
      <p
        className={cn(
          "font-bold text-black",
          breakAll ? "break-all text-sm font-mono" : "text-base"
        )}
      >
        {value?.trim() || "Not Available"}
      </p>
    </motion.div>
  );
}

/* =========================================================
   SUCCESS CONTENT
========================================================= */

function SuccessContent({
  result,
  searchedPan,
}: {
  result: PanSuccessResult;
  searchedPan?: string;
}) {
  const panNumber = result.pan_no || searchedPan || "";
  const fatherName = result.fname?.trim() || result.father?.trim() || "";

  return (
    <div className="space-y-5">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className={cn(
          "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3",
          "rounded-2xl border border-orange-200 bg-orange-50 p-4"
        )}
      >
        <div>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-orange-600" />
            <h3 className="text-lg font-bold text-black">
              {result.name || "Name Not Available"}
            </h3>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            PAN:{" "}
            <span className="font-bold text-orange-600 tracking-wider">
              {panNumber || "Not Available"}
            </span>
          </p>
        </div>
        <Badge
          className={cn(
            "w-fit bg-orange-600 text-white border-0 px-3 py-1",
            "hover:bg-orange-700"
          )}
        >
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Verified
        </Badge>
      </motion.div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <DetailItem
          icon={CreditCard}
          label="PAN Number"
          value={panNumber}
          delay={0.2}
        />
        <DetailItem icon={User} label="Name" value={result.name} delay={0.25} />
        <DetailItem
          icon={Users}
          label="Father's Name"
          value={fatherName}
          delay={0.3}
        />
        <DetailItem
          icon={CalendarDays}
          label="Date of Birth"
          value={formatDob(result.dob)}
          delay={0.35}
        />
        <DetailItem
          icon={User}
          label="Gender"
          value={formatGender(result.gender)}
          delay={0.4}
        />
        <DetailItem
          icon={FileText}
          label="Application Number"
          value={result.application_no}
          breakAll
          delay={0.45}
        />
      </div>
    </div>
  );
}

/* =========================================================
   ERROR CONTENT
========================================================= */

function ErrorContent({ result }: { result: PanErrorResult }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-10 space-y-4"
    >
      <div className="h-16 w-16 rounded-full bg-black flex items-center justify-center">
        <XCircle className="h-8 w-8 text-white" />
      </div>
      <div className="text-center space-y-1">
        <h3 className="text-lg font-bold text-black">No Data Found</h3>
        <p className="text-sm text-gray-500 max-w-[280px]">
          {result.message || "The requested PAN details could not be retrieved."}
        </p>
      </div>
      <Badge
        variant="outline"
        className="border-black text-black bg-gray-50"
      >
        <ShieldAlert className="h-3 w-3 mr-1" />
        Status: {result.status}
      </Badge>
    </motion.div>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function PanResultDialog({
  open,
  result,
  searchedPan,
  onOpenChange,
  onSearchAgain,
}: PanResultDialogProps) {
  const success = isSuccess(result);
  const error = isError(result);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "sm:max-w-lg max-h-[90vh] overflow-hidden p-0 gap-0",
          "border-2 border-orange-600 bg-white shadow-2xl",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
          "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95"
        )}
      >
        {/* Top Orange Bar */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="h-1.5 w-full origin-left bg-orange-600"
        />

        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-0 space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ scale: 0, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, delay: 0.15 }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100"
              >
                {success ? (
                  <CheckCircle2 className="h-5 w-5 text-orange-600" />
                ) : (
                  <ShieldAlert className="h-5 w-5 text-black" />
                )}
              </motion.div>
              <div>
                <DialogTitle className="text-xl font-bold text-black">
                  {success ? "PAN Details Found" : "PAN Lookup Failed"}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500">
                  {success
                    ? "PAN verification successful"
                    : "Unable to retrieve PAN details"}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Separator className="bg-orange-200 my-4" />

        {/* Body */}
        <div className="px-6 overflow-y-auto max-h-[50vh]">
          <AnimatePresence mode="wait">
            {success && (
              <motion.div
                key="success"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <SuccessContent result={result} searchedPan={searchedPan} />
              </motion.div>
            )}

            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <ErrorContent result={result} />
              </motion.div>
            )}

            {!result && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center py-12 text-gray-400"
              >
                <p>No data to display</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Separator className="bg-orange-200" />

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50/50">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className={cn(
                "h-11 flex-1 rounded-xl border-black text-black",
                "hover:bg-gray-100 hover:text-black"
              )}
            >
              Close
            </Button>

            {onSearchAgain && (
              <Button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  setTimeout(onSearchAgain, 200);
                }}
                className={cn(
                  "h-11 flex-1 rounded-xl bg-orange-600 text-white",
                  "hover:bg-orange-700 shadow-lg shadow-orange-600/20"
                )}
              >
                Search Another PAN
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}