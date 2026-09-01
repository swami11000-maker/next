"use client";

import * as React from "react";
import { useForm, Control, FieldValues, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";

import { Search, Loader2, AlertCircle, ArrowRight, CreditCard, RefreshCcw, CalendarDays, CheckCircle2, FileDown, Receipt, User, FileText, MapPin, Hash, VenetianMask } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { useDataProvider } from "@/hooks/useDataProvider";
import { ServiceChargeCard } from "../ui/service-charge-card";
import { emitRetailerDataChanged } from "@/lib/data-events";
import { cn } from "@/lib/utils";

// =========================================================
// ZOD SCHEMA
// =========================================================

const formSchema = z.object({
  aadhaar_no: z
    .string()
    .length(12, {
      message: "Aadhaar number must be exactly 12 digits",
    })
    .regex(/^\d{12}$/, {
      message: "Enter a valid 12-digit Aadhaar number",
    }),

  dob: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, {
    message: "Use DD/MM/YYYY format",
  }),
});

type FormValues = z.infer<typeof formSchema>;

// =========================================================
// API RESPONSE TYPES
// =========================================================

export interface EshramPdfData {
  uid_no: string;
  name: string;
  dob: string;
  gender: string;
  uan: string;
  address: string;
  pdf: string;
}

export interface EshramPdfResponse {
  Status: string;
  StatusCode: number;
  application_no: string;
  message: string;
  data?: EshramPdfData;
}

// =========================================================
// DETAIL ITEM
// =========================================================

function DetailItem({
  icon: Icon,
  label,
  value,
  highlight = false,
  mono = false,
  fullWidth = false,
}: {
  icon: React.ElementType;
  label: string;
  value?: string;
  highlight?: boolean;
  mono?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <div className={cn("rounded-xl border p-4 transition-all duration-300", "border-orange-100 bg-orange-50/50", "hover:border-orange-300 hover:bg-orange-50", fullWidth && "sm:col-span-2")}>
      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black">
          <Icon className="h-3.5 w-3.5 text-white" />
        </div>

        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</span>
      </div>

      <p className={cn("font-bold text-black", highlight && "text-orange-600 text-lg", mono && "font-mono text-sm break-all", fullWidth && "text-sm leading-6")}>{value?.trim() || "—"}</p>
    </div>
  );
}

// =========================================================
// PAGE
// =========================================================

export default function EsharmPdfPage() {
  const { retailer } = useDataProvider();

  const [isLoading, setIsLoading] = React.useState(false);

  // Complete API response
  const [result, setResult] = React.useState<EshramPdfResponse | null>(null);

  const [error, setError] = React.useState<string | null>(null);

  const [showDialog, setShowDialog] = React.useState(false);

  const [searchedAadhaar, setSearchedAadhaar] = React.useState("");

  // =========================================================
  // FORM
  // =========================================================

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),

    defaultValues: {
      aadhaar_no: "",
      dob: "",
    },
  });

  // =========================================================
  // SUBMIT
  // =========================================================

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setShowDialog(false);

    const aadhaar_no = data.aadhaar_no.trim();
    const dob = data.dob.trim();

    setSearchedAadhaar(aadhaar_no);

    try {
      const params = new URLSearchParams({
        aadhaar_no,
        dob,
      });

      const response = await fetch(`/api/esharm-pdf?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });

      let apiResult: EshramPdfResponse;

      try {
        apiResult = await response.json();
      } catch {
        throw new Error("Invalid response from E-Sharm service.");
      }

      console.log("E-Sharm API Response:", apiResult);

      // HTTP error
      if (!response.ok) {
        throw new Error(apiResult?.message || "E-Sharm request failed.");
      }

      // API failure
      if (apiResult.Status !== "Success" || apiResult.StatusCode !== 100 || !apiResult.data) {
        throw new Error(apiResult?.message || "E-Sharm data not found.");
      }

      // SUCCESS
      setResult(apiResult);
      setShowDialog(true);
      emitRetailerDataChanged();
    } catch (err) {
      console.error("E-Sharm Error:", err);

      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // =========================================================
  // RESET
  // =========================================================

  const resetSearch = () => {
    form.reset({
      aadhaar_no: "",
      dob: "",
    });

    setResult(null);
    setError(null);
    setSearchedAadhaar("");
    setShowDialog(false);
  };

  // =========================================================
  // DOWNLOAD PDF
  // =========================================================

  const downloadPdf = () => {
    const rawPdf = result?.data?.pdf;

    if (!rawPdf) {
      setError("PDF data is not available.");
      return;
    }

    try {
      // Remove accidental data URI prefix if API already sends one
      const cleanBase64 = rawPdf.replace(/^data:application\/pdf;base64,/, "").trim();

      const link = document.createElement("a");

      link.href = `data:application/pdf;base64,${cleanBase64}`;

      link.download = `ESHARM_${searchedAadhaar}_${Date.now()}.pdf`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("PDF Download Error:", err);

      setError("Unable to download PDF.");
    }
  };

  // =========================================================
  // ANIMATION
  // =========================================================

  const containerVariants = {
    hidden: {
      opacity: 0,
      y: 20,
    },

    visible: {
      opacity: 1,
      y: 0,

      transition: {
        duration: 0.5,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 10,
    },

    visible: {
      opacity: 1,
      y: 0,

      transition: {
        duration: 0.3,
      },
    },
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <motion.div initial="hidden" animate="visible" variants={containerVariants} className="max-w-2xl mx-auto">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <motion.div variants={itemVariants} className="text-center mb-10">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ff3800]/10">
            <FileText className="h-7 w-7 text-[#ff3800]" />
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
            E-Sharm <span className="text-[#ff3800]">PDF</span>
          </h1>

          <p className="text-slate-500 dark:text-gray-400 text-lg">Download E-Sharm card using Aadhaar & DOB</p>
        </motion.div>

        {/* =====================================================
            SEARCH CARD
        ===================================================== */}

        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-[#ff3800]/5 dark:border-[#ff3800]/20 dark:bg-black/60 backdrop-blur-sm rounded-3xl overflow-hidden">
            <CardHeader className="px-6 pb-6 pt-6">
              <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-white sm:text-xl">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ff3800]/10">
                    <CreditCard className="h-5 w-5 text-[#ff3800]" />
                  </span>

                  <span>E-Sharm Card Download</span>
                </CardTitle>

                <ServiceChargeCard charge={retailer?.esharm_pdf_fee ?? 0} serviceName="E-Sharm PDF" className="w-full sm:w-auto sm:max-w-none" />
              </div>
            </CardHeader>

            <CardContent className="px-6 pb-6">
              <Form {...(form as unknown as UseFormReturn<FieldValues>)}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  {/* =================================================
                      AADHAAR
                  ================================================= */}

                  <FormField
                    control={form.control as unknown as Control<FieldValues>}
                    name="aadhaar_no"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 dark:text-gray-300 flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-[#ff3800]" />
                          Aadhaar Number
                          <span className="text-[#ff3800]">*</span>
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
                              const value = e.target.value.replace(/\D/g, "").slice(0, 12);

                              field.onChange(value);
                            }}
                          />
                        </FormControl>

                        <p className="text-xs text-slate-400 dark:text-gray-500">Example: 371253512266</p>

                        <FormMessage className="text-[#ff3800]" />
                      </FormItem>
                    )}
                  />

                  {/* =================================================
                      DOB
                  ================================================= */}

                  <FormField
                    control={form.control as unknown as Control<FieldValues>}
                    name="dob"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 dark:text-gray-300 flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-[#ff3800]" />
                          Date of Birth
                          <span className="text-[#ff3800]">*</span>
                        </FormLabel>

                        <FormControl>
                          <Input
                            {...field}
                            type="text"
                            inputMode="numeric"
                            maxLength={10}
                            autoComplete="off"
                            placeholder="DD/MM/YYYY"
                            className="h-12 bg-white dark:bg-white/5 border-slate-200 dark:border-[#ff3800]/20 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:border-[#ff3800] focus:ring-[#ff3800]/20 rounded-xl transition-all font-mono"
                            value={field.value || ""}
                            onChange={(e) => {
                              let val = e.target.value.replace(/\D/g, "").slice(0, 8);

                              if (val.length > 4) {
                                val = `${val.slice(0, 2)}/${val.slice(2, 4)}/${val.slice(4)}`;
                              } else if (val.length > 2) {
                                val = `${val.slice(0, 2)}/${val.slice(2)}`;
                              }

                              field.onChange(val);
                            }}
                          />
                        </FormControl>

                        <p className="text-xs text-slate-400 dark:text-gray-500">Format: DD/MM/YYYY</p>

                        <FormMessage className="text-[#ff3800]" />
                      </FormItem>
                    )}
                  />

                  {/* =================================================
                      ACTIONS
                  ================================================= */}

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 h-12 bg-[#ff3800] hover:bg-[#ff3800]/90 text-white rounded-xl shadow-lg shadow-[#ff3800]/20 hover:shadow-[#ff3800]/30 transition-all duration-300 group"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Search className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                          Download PDF
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

        {/* =====================================================
            ERROR
        ===================================================== */}

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{
                opacity: 0,
                y: -10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: -10,
              }}
              className="mt-6"
            >
              <Alert variant="destructive" className="border-red-300 dark:border-red-500/50 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 rounded-2xl">
                <AlertCircle className="h-4 w-4" />

                <AlertTitle>Request Failed</AlertTitle>

                <AlertDescription>
                  <div className="flex flex-col gap-1">
                    <span>{error}</span>

                    {searchedAadhaar && <span className="text-xs opacity-80">Aadhaar: {searchedAadhaar}</span>}
                  </div>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* =====================================================
            RESULT DIALOG
        ===================================================== */}

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className={cn("sm:max-w-lg max-h-[90vh] overflow-hidden p-0 gap-0", "border-2 border-orange-600 bg-white shadow-2xl")}>
            {/* Top line */}

            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{
                duration: 0.5,
                delay: 0.1,
              }}
              className="h-1.5 w-full origin-left bg-orange-600"
            />

            {/* Header */}

            <DialogHeader className="px-6 pt-5 pb-0 space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <motion.div
                    initial={{
                      scale: 0,
                      rotate: -15,
                    }}
                    animate={{
                      scale: 1,
                      rotate: 0,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      delay: 0.15,
                    }}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100"
                  >
                    <CheckCircle2 className="h-5 w-5 text-orange-600" />
                  </motion.div>

                  <div>
                    <DialogTitle className="text-xl font-bold text-black">PDF Generated</DialogTitle>

                    <DialogDescription className="text-sm text-gray-500">E-Sharm card generated successfully</DialogDescription>
                  </div>
                </div>

                <Badge className="bg-orange-600 text-white border-0 px-3 py-1 hover:bg-orange-700">SUCCESS</Badge>
              </div>
            </DialogHeader>

            <Separator className="bg-orange-200 my-4" />

            {/* =================================================
                RESULT DATA
            ================================================= */}

            <div className="px-6 overflow-y-auto max-h-[50vh]">
              <div className="space-y-4 pb-2">
                {/* Message */}

                <motion.div
                  initial={{
                    opacity: 0,
                    y: 8,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    delay: 0.1,
                  }}
                  className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-center"
                >
                  <p className="text-sm font-semibold text-orange-800">{result?.message || "E-Sharm PDF generated successfully"}</p>
                </motion.div>

                {/* Details */}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* UID */}

                  <DetailItem icon={CreditCard} label="Aadhaar / UID" value={result?.data?.uid_no} highlight mono />

                  {/* Name */}

                  <DetailItem icon={User} label="Name" value={result?.data?.name} highlight />

                  {/* Gender */}

                  <DetailItem icon={VenetianMask} label="Gender" value={result?.data?.gender} />

                  {/* DOB */}

                  <DetailItem icon={CalendarDays} label="Date of Birth" value={result?.data?.dob} />

                  {/* UAN */}

                  <DetailItem icon={Hash} label="UAN Number" value={result?.data?.uan} mono />

                  {/* Application Number */}

                  <DetailItem icon={Receipt} label="Application No" value={result?.application_no} mono />

                  {/* Address */}

                  <DetailItem icon={MapPin} label="Address" value={result?.data?.address} fullWidth />
                </div>
              </div>
            </div>

            <Separator className="bg-orange-200" />

            {/* =================================================
                BUTTONS
            ================================================= */}

            <div className="px-6 py-4 bg-gray-50/50">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="h-11 flex-1 rounded-xl border-black text-black hover:bg-gray-100">
                  Close
                </Button>

                <Button
                  type="button"
                  onClick={downloadPdf}
                  disabled={!result?.data?.pdf}
                  className="h-11 flex-1 rounded-xl bg-orange-600 text-white hover:bg-orange-700 shadow-lg shadow-orange-600/20"
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
}
