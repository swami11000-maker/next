"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, CheckCircle2, AlertCircle, ArrowRight, Car, Palette, CreditCard, FileText, Download, Eye, X, User, Hash } from "lucide-react";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

import { Input } from "@/components/ui/input";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useDataProvider } from "@/hooks/useDataProvider";
import { ServiceChargeCard } from "../ui/service-charge-card";

/* =========================================================
   ZOD SCHEMA
========================================================= */

const formSchema = z.object({
  rcNumber: z
    .string()
    .min(3, {
      message: "RC number is required",
    })
    .max(20, {
      message: "RC number must not exceed 20 characters",
    })
    .regex(/^[A-Z0-9 -]+$/, {
      message: "Enter a valid RC number",
    }),

  cardColorType: z.enum(["old", "new"], {
    message: "Please select card color type",
  }),

  cardType: z.enum(["without-chip", "with-chip"], {
    message: "Please select card type",
  }),
});

type FormValues = z.infer<typeof formSchema>;

/* =========================================================
   API RESPONSE TYPE
========================================================= */

type RcApiResponse = {
  status: string | number;
  rcno?: string;
  name?: string;
  application_no?: string;
  message?: string;
  pdf?: string;
};

/* =========================================================
   PAGE
========================================================= */

export default function RcPdf() {
  const [isLoading, setIsLoading] = React.useState(false);

  const [result, setResult] = React.useState<RcApiResponse | null>(null);

  const [showPopup, setShowPopup] = React.useState(false);

  const [error, setError] = React.useState<string | null>(null);
  const { retailer } = useDataProvider();

  /* =========================================================
     FORM
  ========================================================= */

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),

    defaultValues: {
      rcNumber: "",
      cardColorType: undefined,
      cardType: undefined,
    },
  });

  /* =========================================================
     SUBMIT - GET API
  ========================================================= */

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setShowPopup(false);

    try {
      const params = new URLSearchParams({
        rcNumber: data.rcNumber.trim().toUpperCase(),
        cardColorType: data.cardColorType,
        cardType: data.cardType,
      });

      const apiUrl = `/api/vehicle/rc-pdf?${params.toString()}`;

      console.log("RC PDF API Request:", apiUrl);

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });

      const apiResult: RcApiResponse = await response.json();

      console.log("RC PDF API Response:", apiResult);

      /* =====================================================
         404 / FAILED
      ===================================================== */

      if (!response.ok || String(apiResult.status) === "404") {
        throw new Error(apiResult.message || "RC verification failed");
      }

      /* =====================================================
         200 / SUCCESS
      ===================================================== */

      if (String(apiResult.status) === "200") {
        setResult(apiResult);

        // Show animated popup
        setShowPopup(true);

        return;
      }

      throw new Error(apiResult.message || "Unable to verify RC");
    } catch (err) {
      console.error("RC PDF API Error:", err);

      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  /* =========================================================
     RESET
  ========================================================= */

  const resetSearch = () => {
    form.reset({
      rcNumber: "",
      cardColorType: undefined,
      cardType: undefined,
    });

    setResult(null);
    setShowPopup(false);
    setError(null);
  };

  /* =========================================================
     DOWNLOAD PDF
  ========================================================= */

  const downloadPdf = () => {
    if (!result?.pdf) {
      return;
    }

    const link = document.createElement("a");

    link.href = result.pdf;

    link.download = `${result.rcno || "RC"}-Document.pdf`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
  };

  /* =========================================================
     ANIMATION
  ========================================================= */

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

  /* =========================================================
     UI
  ========================================================= */

  return (
    <>
      <div className=" px-4 sm:px-6 lg:px-8">
        <motion.div initial="hidden" animate="visible" variants={containerVariants} className="max-w-2xl mx-auto">
          {/* =================================================
              HEADER
          ================================================= */}

          <motion.div variants={itemVariants} className="text-center mb-10">
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
              RC <span className="text-[#ff3800]">PDF</span>
            </h1>

            <p className="text-slate-500 dark:text-gray-400 text-lg">Generate your vehicle RC PDF</p>
          </motion.div>

          {/* =================================================
              SEARCH CARD
          ================================================= */}

          <motion.div variants={itemVariants}>
            <Card
              className="
                border-0
                shadow-xl
                shadow-slate-200/50
                dark:shadow-[#ff3800]/5
                dark:border-[#ff3800]/20
                dark:bg-black/60
                backdrop-blur-sm
                rounded-3xl
                overflow-hidden
                p-8
              "
            >
              <CardHeader className="px-4 pb-6 sm:px-6">
                <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-white sm:text-xl">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ff3800]/10">
                      <Car className="h-5 w-5 text-[#ff3800]" />
                    </span>

                    <span>Enter Details</span>
                  </CardTitle>

                  <ServiceChargeCard charge={retailer?.rc_print_fee ?? 0} serviceName="RC PDF" className="w-full sm:w-auto sm:max-w-none" />
                </div>
              </CardHeader>
              <CardContent className="px-0">
                <Form {...(form as any)}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* =========================================
                        RC NUMBER
                    ========================================= */}

                    <FormField
                      control={form.control as any}
                      name="rcNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-700 dark:text-gray-300 flex items-center gap-2">
                            <Car className="h-4 w-4 text-[#ff3800]" />
                            RC Number
                            <span className="text-[#ff3800]">*</span>
                          </FormLabel>

                          <FormControl>
                            <Input
                              {...field}
                              type="text"
                              maxLength={20}
                              autoComplete="off"
                              placeholder="Enter RC Number"
                              className="
                                h-12
                                uppercase
                                bg-white
                                dark:bg-white/5
                                border-slate-200
                                dark:border-[#ff3800]/20
                                text-slate-900
                                dark:text-white
                                placeholder:text-slate-400
                                dark:placeholder:text-gray-500
                                focus:border-[#ff3800]
                                focus:ring-[#ff3800]/20
                                rounded-xl
                                transition-all
                              "
                              onChange={(e) => {
                                const value = e.target.value
                                  .toUpperCase()
                                  .replace(/[^A-Z0-9 -]/g, "")
                                  .slice(0, 20);

                                field.onChange(value);
                              }}
                            />
                          </FormControl>

                          <FormMessage className="text-[#ff3800]" />
                        </FormItem>
                      )}
                    />

                    {/* =========================================
                        CARD COLOR TYPE
                    ========================================= */}

                    <FormField
                      control={form.control as any}
                      name="cardColorType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-700 dark:text-gray-300 flex items-center gap-2">
                            <Palette className="h-4 w-4 text-[#ff3800]" />
                            Card Color Type
                            <span className="text-[#ff3800]">*</span>
                          </FormLabel>

                          <FormControl>
                            <Select>
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Theme" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  <SelectItem value="New Background">New Background</SelectItem>
                                  <SelectItem value="Old Background">Old Background</SelectItem>
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </FormControl>

                          <FormMessage className="text-[#ff3800]" />
                        </FormItem>
                      )}
                    />

                    {/* =========================================
                        CARD TYPE
                    ========================================= */}

                    <FormField
                      control={form.control as any}
                      name="cardType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-700 dark:text-gray-300 flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-[#ff3800]" />
                            Select Card Type
                            <span className="text-[#ff3800]">*</span>
                          </FormLabel>

                          <FormControl>
                            <Select>
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Theme" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  <SelectItem value="Chip">Chip</SelectItem>
                                  <SelectItem value="Non-Chip">Non-Chip</SelectItem>
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </FormControl>

                          <FormMessage className="text-[#ff3800]" />
                        </FormItem>
                      )}
                    />

                    {/* =========================================
                        ACTIONS
                    ========================================= */}

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="
                          flex-1
                          h-12
                          bg-[#ff3800]
                          hover:bg-[#ff3800]/90
                          text-white
                          rounded-xl
                          shadow-lg
                          shadow-[#ff3800]/20
                          hover:shadow-[#ff3800]/30
                          transition-all
                          duration-300
                          group
                        "
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Search className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                            Generate RC PDF
                            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                          </>
                        )}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={resetSearch}
                        disabled={isLoading}
                        className="
                          h-12
                          px-6
                          border-slate-200
                          dark:border-[#ff3800]/20
                          text-slate-700
                          dark:text-gray-300
                          hover:bg-slate-50
                          dark:hover:bg-white/5
                          rounded-xl
                          transition-all
                        "
                      >
                        Clear
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </motion.div>

          {/* =================================================
              ERROR
          ================================================= */}

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
                <Alert
                  variant="destructive"
                  className="
                    border-red-300
                    dark:border-red-500/50
                    bg-red-50
                    dark:bg-red-500/10
                    text-red-700
                    dark:text-red-400
                    rounded-2xl
                  "
                >
                  <AlertCircle className="h-4 w-4" />

                  <AlertTitle>Request Failed</AlertTitle>

                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <AnimatePresence>
        {showPopup && result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="
              fixed
              inset-0
              z-[100]
              flex
              items-center
              justify-center
              p-4
              bg-black/60
              backdrop-blur-md
            "
            onClick={() => setShowPopup(false)}
          >
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.9,
                y: 30,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                scale: 0.9,
                y: 30,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 25,
              }}
              onClick={(e) => e.stopPropagation()}
              className="
                relative
                w-full
                max-w-lg
                max-h-[90vh]
                overflow-y-auto
                rounded-3xl
                bg-white
                dark:bg-[#0b0b0b]
                border
                border-slate-200
                dark:border-[#ff3800]/20
                shadow-2xl
              "
            >
              {/* TOP BAR */}

              <div className="h-1.5 w-full bg-[#ff3800]" />

              {/* CLOSE */}

              <button
                type="button"
                onClick={() => setShowPopup(false)}
                className="
                  absolute
                  right-4
                  top-5
                  z-10
                  h-9
                  w-9
                  rounded-full
                  flex
                  items-center
                  justify-center
                  text-slate-500
                  dark:text-gray-400
                  hover:text-[#ff3800]
                  hover:bg-[#ff3800]/10
                  transition-all
                "
              >
                <X className="h-5 w-5" />
              </button>

              {/* HEADER */}

              <div className="px-6 pt-7 pb-4">
                <div className="flex items-center gap-3 pr-10">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      delay: 0.15,
                      type: "spring",
                    }}
                    className="
                      h-12
                      w-12
                      rounded-2xl
                      bg-green-500/10
                      flex
                      items-center
                      justify-center
                    "
                  >
                    <CheckCircle2 className="h-7 w-7 text-green-500" />
                  </motion.div>

                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">RC Verified</h2>

                    <p className="text-sm text-slate-500 dark:text-gray-400">{result.message || "RC verification successful"}</p>
                  </div>
                </div>
              </div>

              {/* DETAILS */}

              <div className="px-6 pb-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* RC NUMBER */}

                  <div
                    className="
                      rounded-2xl
                      border
                      border-slate-200
                      dark:border-[#ff3800]/10
                      bg-slate-50
                      dark:bg-white/[0.03]
                      p-4
                    "
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Car className="h-4 w-4 text-[#ff3800]" />

                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-gray-400">RC Number</span>
                    </div>

                    <p className="font-bold text-slate-900 dark:text-white uppercase">{result.rcno || "Not Available"}</p>
                  </div>

                  {/* NAME */}

                  <div
                    className="
                      rounded-2xl
                      border
                      border-slate-200
                      dark:border-[#ff3800]/10
                      bg-slate-50
                      dark:bg-white/[0.03]
                      p-4
                    "
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-[#ff3800]" />

                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-gray-400">Owner Name</span>
                    </div>

                    <p className="font-bold text-slate-900 dark:text-white">{result.name || "Not Available"}</p>
                  </div>

                  {/* APPLICATION NUMBER */}

                  <div
                    className="
                      rounded-2xl
                      border
                      border-slate-200
                      dark:border-[#ff3800]/10
                      bg-slate-50
                      dark:bg-white/[0.03]
                      p-4
                      sm:col-span-2
                    "
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Hash className="h-4 w-4 text-[#ff3800]" />

                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-gray-400">Application Number</span>
                    </div>

                    <p className="font-bold text-sm break-all text-slate-900 dark:text-white">{result.application_no || "Not Available"}</p>
                  </div>
                </div>
              </div>

              {/* PDF AVAILABLE */}

              {result.pdf && (
                <div className="px-6 pb-6">
                  <div
                    className="
                      rounded-2xl
                      border
                      border-[#ff3800]/20
                      bg-[#ff3800]/5
                      p-4
                    "
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="
                          h-10
                          w-10
                          rounded-xl
                          bg-[#ff3800]/10
                          flex
                          items-center
                          justify-center
                        "
                      >
                        <FileText className="h-5 w-5 text-[#ff3800]" />
                      </div>

                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">RC PDF Ready</p>

                        <p className="text-xs text-slate-500 dark:text-gray-400">Your RC document is ready</p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      {/* VIEW PDF */}

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          window.open(result.pdf, "_blank", "noopener,noreferrer");
                        }}
                        className="
                          flex-1
                          h-11
                          rounded-xl
                          border-[#ff3800]/20
                          text-[#ff3800]
                          hover:bg-[#ff3800]/10
                        "
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View PDF
                      </Button>

                      {/* DOWNLOAD */}

                      <Button
                        type="button"
                        onClick={downloadPdf}
                        className="
                          flex-1
                          h-11
                          rounded-xl
                          bg-[#ff3800]
                          hover:bg-[#ff3800]/90
                          text-white
                        "
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* FOOTER */}

              <div
                className="
                  border-t
                  border-slate-100
                  dark:border-[#ff3800]/10
                  px-6
                  py-4
                "
              >
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowPopup(false);
                  }}
                  className="
                    w-full
                    rounded-xl
                    text-[#ff3800]
                    hover:bg-[#ff3800]/10
                  "
                >
                  Search Another RC
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
