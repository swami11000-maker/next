"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Loader2, AlertCircle, ArrowRight, RefreshCcw, CreditCard,
  CheckCircle2, FileDown, Receipt, BadgeCheck, User, MapPin, Database,
  IndianRupee, FileText, PaletteIcon, Server, Info, Hash, FileWarning, Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { useDataProvider } from "@/hooks/useDataProvider";
import { ServiceChargeCard } from "../ui/service-charge-card";
import { cn } from "@/lib/utils";
import { emitRetailerDataChanged } from "@/lib/data-events";
import { indianStates } from "@/lib/constate";
import { apiFetch } from "@/lib/api-client";

/* =========================================================
   ZOD SCHEMA
========================================================= */

const formSchema = z.object({
  aadhaar: z
    .string()
    .length(12, { message: "Aadhaar number must be exactly 12 digits" })
    .regex(/^\d{12}$/, { message: "Enter a valid 12-digit Aadhaar number" }),
  state: z
    .string()
    .length(2, { message: "Select a valid state" })
    .regex(/^[A-Z]{2}$/, { message: "Invalid state code" }),
  server: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

/* =========================================================
   TYPES  (server-aware)
========================================================= */

/** Server 1 raw data (from `/api/farmer-pdf`) */
interface Server1Data {
  status?: string;
  message?: string;
  data_mode?: string;
  source?: string;
  billable?: string;
  aadhaar?: string;
  name?: string;
  application_no?: string;
  amount?: string;
  balance_left?: string;
  pdf?: string;
}

/** Server 2 raw data (from `/api/farmer-pdf/dx`) */
interface Server2Data {
  sampleCode?: string;
  aadhaar?: string;
  fullname?: string;
  pdf?: string;
  status?: string | number;
  message?: string;
  error?: string;
}

/** Wrapper returned by BOTH backend routes */
interface ApiWrapper {
  message?: string;
  order_id?: string;
  id?: number;
  charge?: number;
  old_balance?: number;
  new_balance?: number;
  state?: string;

  // Server 1 top-level fields
  name?: string;
  application_no?: string;
  billable?: string;
  amount?: string;

  // Server 2 top-level fields
  sampleCode?: string;
  fullname?: string;

  // Common
  aadhaar?: string;
  pdf?: string;
  status?: string | number;
  error?: string;
  api_mode?: string;
  mode?: string;
  data?: Server1Data | Server2Data;
}

type ApiServer = "server1" | "server2";
type ApiMode = "pdf" | "info" | "unknown";

/* =========================================================
   HELPERS
========================================================= */

const SERVER_LABELS: Record<ApiServer, string> = {
  server1: "Server 1",
  server2: "Server 2",
};

function pick<T = any>(...vals: (T | undefined | null)[]): T | undefined {
  for (const v of vals) {
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return undefined;
}

/**
 * Detect which mode the response represents based on fields present
 */
function detectMode(result: ApiWrapper): ApiMode {
  if (result.mode === "pdf" || result.mode === "info") return result.mode;
  if (result.api_mode === "pdf" || result.api_mode === "info")
    return result.api_mode as ApiMode;

  const pdf = pick(result.pdf, (result.data as any)?.pdf);
  if (pdf) return "pdf";

  const info = pick(
    result.fullname,
    result.name,
    result.sampleCode,
    result.application_no,
    (result.data as any)?.fullname,
    (result.data as any)?.name,
    (result.data as any)?.sampleCode,
    (result.data as any)?.application_no
  );
  if (info) return "info";
  return "unknown";
}

/**
 * Server-aware normalisation:
 * - server1 → name, application_no, billable, amount, balance_left, data_mode, source
 * - server2 → fullname, sampleCode
 * Common → aadhaar, pdf, order_id, charge, old_balance, new_balance, state, message
 */
function normaliseResult(result: ApiWrapper, server: ApiServer | null) {
  const merged = (result.data || {}) as any;
  const isServer2 = server === "server2";

  return {
    aadhaar: pick(result.aadhaar, merged.aadhaar),

    // Server1 → name priority, Server2 → fullname priority
    name: isServer2
      ? pick(result.fullname, merged.fullname, result.name, merged.name)
      : pick(result.name, merged.name, result.fullname, merged.fullname),

    pdf: pick(result.pdf, merged.pdf),
    sampleCode: pick(result.sampleCode, merged.sampleCode),
    applicationNo: pick(result.application_no, merged.application_no),
    billable: pick(result.billable, merged.billable),
    amount: pick(result.amount, merged.amount),
    balanceLeft: pick(merged.balance_left, (result as any).balance_left),
    dataMode: pick(result.mode, result.api_mode, merged.data_mode),
    source: pick(merged.source, (result as any).source),
    status: pick(result.status, merged.status),
    orderId: pick(result.order_id),
    charge: result.charge,
    oldBalance: result.old_balance,
    newBalance: result.new_balance,
    state: pick(result.state),
    message: pick(result.message, merged.message),
  };
}

function DetailItem({
  icon: Icon,
  label,
  value,
  highlight = false,
  mono = false,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | number;
  highlight?: boolean;
  mono?: boolean;
}) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  return (
    <div
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
          highlight && "text-orange-600 text-lg",
          mono && "font-mono text-sm break-all"
        )}
      >
        {String(value)}
      </p>
    </div>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function FarmerAgriPdfPage() {
  const { retailer } = useDataProvider();
  const [isLoading, setIsLoading] = React.useState(false);
  const [result, setResult] = React.useState<ApiWrapper | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [showDialog, setShowDialog] = React.useState(false);
  const [searchedAadhaar, setSearchedAadhaar] = React.useState("");

  // which API was used
  const [usedServer, setUsedServer] = React.useState<ApiServer | null>(null);
  // detected response mode
  const [apiMode, setApiMode] = React.useState<ApiMode>("unknown");

  /* =========================================================
     FORM
  ========================================================= */

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      aadhaar: "",
      state: "",
      server: "server1",
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setShowDialog(false);
    setApiMode("unknown");

    const aadhaar = data.aadhaar.trim();
    const state = data.state.trim().toUpperCase();
    const server: ApiServer = (data.server as ApiServer) || "server1";

    setSearchedAadhaar(aadhaar);
    setUsedServer(server);

    const endpoint =
      server === "server1"
        ? `/api/farmer-pdf?aadhaar=${encodeURIComponent(aadhaar)}&state=${encodeURIComponent(state)}`
        : `/api/farmer-pdf/dx?aadhaar=${encodeURIComponent(aadhaar)}&state=${encodeURIComponent(state)}`;

    try {
      const response = await apiFetch(endpoint, {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      let apiResult: ApiWrapper;
      try {
        apiResult = await response.json();
      } catch {
        throw new Error("Invalid response received from Farmer Agri PDF service.");
      }

      // HTTP error
      if (!response.ok) {
        const errMsg =
          apiResult.error ||
          apiResult.message ||
          `Service returned HTTP ${response.status}`;
        throw new Error(errMsg);
      }

      // Detect mode from response
      const mode = detectMode(apiResult);
      setApiMode(mode);

      // Success validation: pdf OR any usable info field must exist
      const pdf = pick(apiResult.pdf, (apiResult.data as any)?.pdf);
      const sampleCode = pick(apiResult.sampleCode, (apiResult.data as any)?.sampleCode);
      const fullname = pick(
        apiResult.fullname,
        apiResult.name,
        (apiResult.data as any)?.fullname,
        (apiResult.data as any)?.name
      );
      const appNo = pick(
        apiResult.application_no,
        (apiResult.data as any)?.application_no
      );

      if (!pdf && !sampleCode && !fullname && !appNo) {
        const errMsg =
          apiResult.error ||
          apiResult.message ||
          "No usable data returned from API.";
        throw new Error(errMsg);
      }

      setResult(apiResult);
      setError(null);
      setShowDialog(true);
      emitRetailerDataChanged();
    } catch (err) {
      console.error("Farmer Agri PDF Error:", err);
      setResult(null);
      setApiMode("unknown");
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  /* =========================================================
     NORMALISED DATA (server-aware)
  ========================================================= */

  const normalised = React.useMemo(
    () => (result ? normaliseResult(result, usedServer) : null),
    [result, usedServer]
  );

  /* =========================================================
     DOWNLOAD PDF
  ========================================================= */

  const canDownload = Boolean(normalised?.pdf);

  const downloadPdf = async () => {
    if (!normalised?.pdf) {
      alert("PDF data not available");
      return;
    }

    const pdfSource = normalised.pdf;
    const filename = `FARMER_${normalised.aadhaar || searchedAadhaar}_${Date.now()}.pdf`;

    try {
      const cleanBase64 = (str: string) =>
        str.replace(/^data:application\/pdf;base64,/, "").replace(/\s/g, "");

      if (/^https?:\/\//i.test(pdfSource)) {
        const res = await fetch(pdfSource, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        triggerDownload(blob, filename);
        return;
      }

      if (pdfSource.startsWith("blob:")) {
        const a = document.createElement("a");
        a.href = pdfSource;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }

      const base64 = cleanBase64(pdfSource);
      if (base64.length < 100) throw new Error("Invalid PDF data");

      const blob = base64ToBlob(base64, "application/pdf");
      triggerDownload(blob, filename);
    } catch (err) {
      console.error("PDF download failed:", err);
      alert(
        "PDF download failed: " +
          (err instanceof Error ? err.message : "Unknown error")
      );
    }
  };

  function base64ToBlob(base64: string, mime: string): Blob {
    const sliceSize = 1024;
    const byteArrays: BlobPart[] = [];

    for (let offset = 0; offset < base64.length; offset += sliceSize) {
      const slice = base64.slice(offset, offset + sliceSize);
      const byteNumbers = new Array(slice.length);

      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }

      let byteArray: BlobPart;
      try {
        byteArray = new Uint8Array(
          atob(slice)
            .split("")
            .map((c) => c.charCodeAt(0))
        );
      } catch {
        byteArray = new Uint8Array(byteNumbers);
      }

      byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: mime });
  }

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1500);
  }

  /* =========================================================
     RESET
  ========================================================= */

  const resetSearch = () => {
    form.reset({
      aadhaar: "",
      state: "",
      server: form.getValues("server") || "server1",
    });
    setResult(null);
    setError(null);
    setSearchedAadhaar("");
    setShowDialog(false);
    setUsedServer(null);
    setApiMode("unknown");
  };

  /* =========================================================
     ANIMATION
  ========================================================= */

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="max-w-2xl mx-auto"
      >
        {/* HEADER */}
        <motion.div variants={itemVariants} className="text-center mb-10">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ff3800]/10">
            <FileText className="h-7 w-7 text-[#ff3800]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
            Farmer <span className="text-[#ff3800]">Agri PDF</span>
          </h1>
          <p className="text-slate-500 dark:text-gray-400 text-lg">
            Generate Agristack farmer verification PDF
          </p>
        </motion.div>

        {/* SEARCH CARD */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-[#ff3800]/5 dark:border-[#ff3800]/20 dark:bg-black/60 backdrop-blur-sm rounded-3xl overflow-hidden">
            <CardHeader className="px-6 pb-6 pt-6">
              <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-white sm:text-xl">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ff3800]/10">
                    <Database className="h-5 w-5 text-[#ff3800]" />
                  </span>
                  <span>Agristack Verification</span>
                </CardTitle>
                <ServiceChargeCard
                  charge={(retailer as any)?.agri_pdf_fee ?? 0}
                  serviceName="Farmer Agri PDF"
                  className="w-full sm:w-auto sm:max-w-none"
                />
              </div>
            </CardHeader>

            <CardContent className="px-6 pb-6">
              <Form {...(form as any)}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  {/* AADHAAR */}
                  <FormField
                    control={form.control as any}
                    name="aadhaar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 dark:text-gray-300 flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-[#ff3800]" />
                          Aadhaar Number <span className="text-[#ff3800]">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="text"
                            inputMode="numeric"
                            maxLength={12}
                            autoComplete="off"
                            spellCheck={false}
                            placeholder="Enter 12-digit Aadhaar Number"
                            className="h-12 bg-white dark:bg-white/5 border-slate-200 dark:border-[#ff3800]/20 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:border-[#ff3800] focus:ring-[#ff3800]/20 rounded-xl transition-all font-mono tracking-widest text-center"
                            onChange={(e) => {
                              const value = e.target.value
                                .replace(/\D/g, "")
                                .slice(0, 12);
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <p className="text-xs text-slate-400 dark:text-gray-500">
                          Example: 335400206902
                        </p>
                        <FormMessage className="text-[#ff3800]" />
                      </FormItem>
                    )}
                  />

                  {/* STATE */}
                  <FormField
                    control={form.control as any}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 dark:text-gray-300 flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-[#ff3800]" />
                          State <span className="text-[#ff3800]">*</span>
                        </FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="h-12 rounded-xl border-slate-200 dark:border-[#ff3800]/20 bg-white dark:bg-white/5 focus:ring-[#ff3800]/20 w-full">
                              <SelectValue placeholder="Select State" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl border-slate-200 dark:border-[#ff3800]/20 max-h-[280px]">
                            <SelectGroup>
                              {indianStates.map((s) => (
                                <SelectItem key={s.value} value={s.value}>
                                  {s.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-[#ff3800]" />
                      </FormItem>
                    )}
                  />

                  {/* SERVER */}
                  <FormField
                    control={form.control as any}
                    name="server"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 dark:text-gray-300 flex items-center gap-2">
                          <Server className="h-4 w-4 text-[#ff3800]" />
                          Select Server
                        </FormLabel>
                        <Select value={field.value || ""} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="h-12 rounded-xl border-slate-200 dark:border-[#ff3800]/20 bg-white dark:bg-white/5 focus:ring-[#ff3800]/20 w-full">
                              <SelectValue placeholder="Select Server" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl border-slate-200 dark:border-[#ff3800]/20">
                            <SelectGroup>
                              <SelectItem value="server1">SERVER 1</SelectItem>
                              <SelectItem value="server2">SERVER 2</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-[#ff3800]" />
                      </FormItem>
                    )}
                  />

                  {/* ACTIONS */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 h-12 bg-[#ff3800] hover:bg-[#ff3800]/90 text-white rounded-xl shadow-lg shadow-[#ff3800]/20 hover:shadow-[#ff3800]/30 transition-all duration-300 group"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <Search className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                          Verify & Generate
                          <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                        </>
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetSearch}
                      disabled={isLoading}
                      className="h-12 px-6 border-slate-200 dark:border-[#ff3800]/20 text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-all"
                    >
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      Clear
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </motion.div>

        {/* ERROR */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-6"
            >
              <Alert
                variant="destructive"
                className="border-red-300 dark:border-red-500/50 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 rounded-2xl"
              >
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Verification Failed</AlertTitle>
                <AlertDescription>
                  <div className="flex flex-col gap-1">
                    <span>{error}</span>
                    {searchedAadhaar && (
                      <span className="text-xs opacity-80">
                        Aadhaar: {searchedAadhaar}
                      </span>
                    )}
                    {usedServer && (
                      <span className="text-xs opacity-80">
                        Server: {SERVER_LABELS[usedServer]}
                      </span>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* RESULT DIALOG */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent
            className={cn(
              "sm:max-w-lg max-h-[90vh] overflow-hidden p-0 gap-0",
              "border-2 border-orange-600 bg-white shadow-2xl"
            )}
          >
            {/* Top Bar */}
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
                    <CheckCircle2 className="h-5 w-5 text-orange-600" />
                  </motion.div>
                  <div>
                    <DialogTitle className="text-xl font-bold text-black">
                      {apiMode === "pdf" ? "PDF Generated" : "Details Fetched"}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-gray-500">
                      {apiMode === "pdf"
                        ? "Agristack verification successful"
                        : "Farmer card details fetched (no PDF available)"}
                    </DialogDescription>
                  </div>
                </div>
                <Badge
                  className={cn(
                    "border-0 px-3 py-1 text-white",
                    apiMode === "pdf"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-orange-600 hover:bg-orange-700"
                  )}
                >
                  {apiMode === "pdf" ? "PDF READY" : "INFO ONLY"}
                </Badge>
              </div>
            </DialogHeader>

            <Separator className="bg-orange-200 my-4" />

            {/* API Server Used Banner */}
            <div className="px-6">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                    API Called
                  </span>
                </div>
                <span className="text-sm font-bold text-blue-800">
                  {usedServer ? SERVER_LABELS[usedServer] : "—"}
                </span>
              </motion.div>
            </div>

            {/* Body */}
            <div className="px-6 mt-4 overflow-y-auto max-h-[50vh]">
              <div className="space-y-4 pb-2">
                {/* Status Message */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-center"
                >
                  <p className="text-sm font-semibold text-orange-800">
                    {normalised?.message ||
                      (apiMode === "pdf"
                        ? "Agristack verification successful"
                        : "Farmer card details fetched")}
                  </p>
                </motion.div>

                {/* ============================================================
                    DETAILS GRID — server-aware, only non-empty items render
                ============================================================ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Common */}
                  <DetailItem
                    icon={CreditCard}
                    label="Aadhaar Number"
                    value={normalised?.aadhaar || searchedAadhaar}
                    highlight
                    mono
                  />

                  {/* Name label differs by server */}
                  <DetailItem
                    icon={User}
                    label={usedServer === "server2" ? "Full Name" : "Name"}
                    value={normalised?.name}
                    highlight
                  />

                  <DetailItem icon={MapPin} label="State" value={normalised?.state} />

                  {/* Server 2 only */}
                  <DetailItem
                    icon={Hash}
                    label="Sample Code"
                    value={normalised?.sampleCode}
                    mono
                  />

                  {/* Server 1 only */}
                  <DetailItem
                    icon={BadgeCheck}
                    label="Application No"
                    value={normalised?.applicationNo}
                    mono
                  />
                  <DetailItem
                    icon={BadgeCheck}
                    label="Billable"
                    value={normalised?.billable}
                  />
                  <DetailItem
                    icon={IndianRupee}
                    label="Amount"
                    value={normalised?.amount ? `₹${normalised.amount}` : undefined}
                  />
                  <DetailItem
                    icon={Database}
                    label="Data Mode"
                    value={normalised?.dataMode}
                  />
                  <DetailItem
                    icon={Info}
                    label="Source"
                    value={normalised?.source}
                  />
                  <DetailItem
                    icon={Wallet}
                    label="Balance Left"
                    value={
                      normalised?.balanceLeft
                        ? `₹${normalised.balanceLeft}`
                        : undefined
                    }
                  />

                  {/* Transaction (common) */}
                  <DetailItem
                    icon={Receipt}
                    label="Order ID"
                    value={normalised?.orderId}
                    mono
                  />

                  {typeof normalised?.charge === "number" && (
                    <DetailItem
                      icon={IndianRupee}
                      label="Amount Charged"
                      value={`₹${normalised.charge}`}
                    />
                  )}

                  {typeof normalised?.oldBalance === "number" && (
                    <DetailItem
                      icon={Wallet}
                      label="Old Balance"
                      value={`₹${normalised.oldBalance}`}
                    />
                  )}

                  {typeof normalised?.newBalance === "number" && (
                    <DetailItem
                      icon={Wallet}
                      label="New Balance"
                      value={`₹${normalised.newBalance}`}
                      highlight
                    />
                  )}
                </div>

                {/* Info-only hint */}
                {apiMode === "info" && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3"
                  >
                    <FileWarning className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-800">
                      Is API call me PDF generate nahi hui. Sirf verification details
                      mili hain. PDF ke liye doosra server try karein.
                    </p>
                  </motion.div>
                )}
              </div>
            </div>

            <Separator className="bg-orange-200" />

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50/50">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                  className="h-11 flex-1 rounded-xl border-black text-black hover:bg-gray-100"
                >
                  Close
                </Button>

                <Button
                  type="button"
                  onClick={downloadPdf}
                  disabled={!canDownload}
                  className={cn(
                    "h-11 flex-1 rounded-xl text-white shadow-lg",
                    canDownload
                      ? "bg-orange-600 hover:bg-orange-700 shadow-orange-600/20"
                      : "bg-gray-300 cursor-not-allowed shadow-none"
                  )}
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  {canDownload ? "Download PDF" : "PDF Not Available"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
}