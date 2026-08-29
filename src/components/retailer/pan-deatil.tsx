"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Loader2,
  AlertCircle,
  ArrowRight,
  CreditCard,
  RefreshCcw,
  PrinterIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import PanResultDialog from "../result";
import { useDataProvider } from "@/hooks/useDataProvider";
import { ServiceChargeCard } from "../ui/service-charge-card";

/* =========================================================
   ZOD SCHEMA
========================================================= */

const formSchema = z.object({
  panNumber: z
    .string()
    .length(10, {
      message: "PAN number must be exactly 10 characters",
    })
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, {
      message: "Enter a valid PAN number (e.g. ABCDE1234F)",
    }),
});

type FormValues = z.infer<typeof formSchema>;

/* =========================================================
   API RESPONSE TYPES
========================================================= */

interface PanData {
  status: string;
  pan_no: string;
  name: string;
  fname?: string;
  father?: string;
  dob: string;
  gender: string;
  application_no: string;
}

interface ApiSuccessWrapper {
  message: string;
  data: PanData;
  order_id?: string;
  panno?: string;
}

interface ApiErrorResponse {
  status: string;
  error?: string;
  message?: string;
}

type ApiResponse = ApiSuccessWrapper | ApiErrorResponse | PanData;

/* =========================================================
   PAGE
========================================================= */

export default function PanDetails() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [result, setResult] = React.useState<PanData | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [showPopup, setShowPopup] = React.useState(false);
  const [searchedPan, setSearchedPan] = React.useState("");
  const { retailer } = useDataProvider();

  /* =========================================================
     FORM
  ========================================================= */

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      panNumber: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setShowPopup(false);

    const panNumber = data.panNumber.trim().toUpperCase();
    setSearchedPan(panNumber);

    try {
      const response = await fetch(
        `/api/pan_details?panno=${encodeURIComponent(panNumber)}`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        }
      );

      let apiResult: ApiResponse;

      try {
        apiResult = await response.json();
      } catch {
        throw new Error("Invalid response received from PAN service.");
      }

      console.log("PAN API Response:", apiResult);

      // Handle HTTP errors first
      if (!response.ok) {
        const errMsg =
          (apiResult as ApiErrorResponse).error ||
          (apiResult as ApiErrorResponse).message ||
          `PAN service returned HTTP ${response.status}`;
        throw new Error(errMsg);
      }

      // Extract PAN data — API may wrap it in `data` or return directly
      const panData: PanData | undefined = (apiResult as ApiSuccessWrapper).data || 
        ((apiResult as PanData).pan_no ? (apiResult as PanData) : undefined);

      // Check for error responses (status !== "200")
      if (!panData || String(panData.status) !== "200") {
        const errMsg =
          (apiResult as ApiErrorResponse).error ||
          (apiResult as ApiErrorResponse).message ||
          (panData as any)?.message ||
          "PAN not found. Please check your PAN number.";
        
        setError(errMsg);
        return;
      }

      // Success
      setResult(panData);
      setError(null);
      setShowPopup(true);
    } catch (err) {
      console.error("PAN Search Error:", err);
      setResult(null);
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  /* =========================================================
     RESET
  ========================================================= */

  const resetSearch = () => {
    form.reset({ panNumber: "" });
    setResult(null);
    setError(null);
    setSearchedPan("");
    setShowPopup(false);
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
    <div className="px-4 sm:px-6 lg:px-8">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="max-w-2xl mx-auto"
      >
        {/* =====================================================
            HEADER
        ===================================================== */}

        <motion.div variants={itemVariants} className="text-center mb-10">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ff3800]/10">
            <CreditCard className="h-7 w-7 text-[#ff3800]" />
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
            PAN <span className="text-[#ff3800]">Details</span>
          </h1>

          <p className="text-slate-500 dark:text-gray-400 text-lg">
            Verify PAN details instantly
          </p>
        </motion.div>

        {/* =====================================================
            SEARCH CARD
        ===================================================== */}

        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-[#ff3800]/5 dark:border-[#ff3800]/20 dark:bg-black/60 backdrop-blur-sm rounded-3xl overflow-hidden p-6 sm:p-8">
            <CardHeader className="px-4 pb-6 sm:px-6">
              <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-white sm:text-xl">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ff3800]/10">
                    <PrinterIcon className="h-5 w-5 text-[#ff3800]" />
                  </span>
                  <span>Pan Detail</span>
                </CardTitle>

                <ServiceChargeCard
                  charge={retailer?.pandetils_fee ?? 0}
                  serviceName="Pan detail"
                  className="w-full sm:w-auto sm:max-w-none"
                />
              </div>
            </CardHeader>

            <CardContent className="px-0">
              <Form {...(form as any)}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  {/* =================================================
                      PAN NUMBER
                  ================================================= */}

                  <FormField
                    control={form.control as any}
                    name="panNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 dark:text-gray-300 flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-[#ff3800]" />
                          PAN Number
                          <span className="text-[#ff3800]">*</span>
                        </FormLabel>

                        <FormControl>
                          <Input
                            {...field}
                            type="text"
                            maxLength={10}
                            autoComplete="off"
                            spellCheck={false}
                            placeholder="Enter PAN Number"
                            className="h-12 uppercase bg-white dark:bg-white/5 border-slate-200 dark:border-[#ff3800]/20 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:border-[#ff3800] focus:ring-[#ff3800]/20 rounded-xl transition-all"
                            onChange={(e) => {
                              const value = e.target.value
                                .toUpperCase()
                                .replace(/[^A-Z0-9]/g, "")
                                .slice(0, 10);
                              field.onChange(value);
                            }}
                          />
                        </FormControl>

                        <p className="text-xs text-slate-400 dark:text-gray-500">
                          Example: ABCDE1234F
                        </p>

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
                          Searching...
                        </>
                      ) : (
                        <>
                          <Search className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                          Find PAN
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
            ERROR ALERT
        ===================================================== */}

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
                <AlertTitle>PAN Not Found</AlertTitle>
                <AlertDescription>
                  <div className="flex flex-col gap-1">
                    <span>{error}</span>
                    {searchedPan && (
                      <span className="text-xs opacity-80">
                        Searched PAN: {searchedPan}
                      </span>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* =====================================================
            RESULT DIALOG
        ===================================================== */}

        <PanResultDialog
          open={showPopup}
          result={result as any}
          searchedPan={searchedPan}
          onOpenChange={setShowPopup}
          onSearchAgain={() => {
            resetSearch();
          }}
        />
      </motion.div>
    </div>
  );
}