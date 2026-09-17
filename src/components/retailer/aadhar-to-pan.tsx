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
  Car,
  Server,
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import PanResultDialog from "../result";
import { useDataProvider } from "@/hooks/useDataProvider";
import { ServiceChargeCard } from "../ui/service-charge-card";
import { emitRetailerDataChanged } from "@/lib/data-events";
import { apiFetch } from "@/lib/api-client";

/* =========================================================
   ZOD SCHEMA — AADHAAR (12 digits)
========================================================= */

const formSchema = z.object({
  aadhaar: z
    .string()
    .length(12, {
      message: "Aadhaar number must be exactly 12 digits",
    })
    .regex(/^\d{12}$/, {
      message: "Enter a valid 12-digit Aadhaar number",
    }),
  server: z.string().min(1, {
    message: "Please select a server",
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
  application_no?: string;
  message?: string;
}

interface ApiErrorResponse {
  status: string;
  error?: string;
  message?: string;
}

type ApiResponse = { data?: PanData } & (PanData | ApiErrorResponse);

/* =========================================================
   PAGE
========================================================= */

export default function PanFind() {
  const { retailer } = useDataProvider();
  const [isLoading, setIsLoading] = React.useState(false);
  const [result, setResult] = React.useState<PanData | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [showDialog, setShowDialog] = React.useState(false);
  const [searchedAadhaar, setSearchedAadhaar] = React.useState("");

  /* =========================================================
     FORM
  ========================================================= */

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      aadhaar: "",
      server: "server_2",
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setShowDialog(false);

    const aadhaar = data.aadhaar.trim();
    const server = data.server;

    setSearchedAadhaar(aadhaar);

    try {
      const response = await apiFetch(
        `/api/aadhar-to-pan?aadhaar_no=${encodeURIComponent(aadhaar)}&server=${encodeURIComponent(server)}`,
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


      // Handle HTTP errors
      if (!response.ok) {
        const errMsg =
          (apiResult as ApiErrorResponse).error ||
          (apiResult as ApiErrorResponse).message ||
          `Service returned HTTP ${response.status}`;
        throw new Error(errMsg);
      }

      // Extract PAN data (wrapped or direct)
      const panData: PanData | undefined =
        (apiResult as any).data || ((apiResult as PanData).pan_no ? (apiResult as PanData) : undefined);

      // Check business status
      if (!panData || String(panData.status) !== "200") {
        const errMsg =
          (apiResult as ApiErrorResponse).error ||
          (apiResult as ApiErrorResponse).message ||
          panData?.message ||
          "PAN not found for this Aadhaar number.";
        setError(errMsg);
        return;
      }

      // Success
      setResult(panData);
      setError(null);
      setShowDialog(true);
      emitRetailerDataChanged();
    } catch (err) {
      console.error("Aadhaar-to-PAN Search Error:", err);
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
    form.reset({
      aadhaar: "",
      server: "server_1",
    });
    setResult(null);
    setError(null);
    setSearchedAadhaar("");
    setShowDialog(false);
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
        {/* =====================================================
            HEADER
        ===================================================== */}

        <motion.div variants={itemVariants} className="text-center mb-10">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ff3800]/10">
            <CreditCard className="h-7 w-7 text-[#ff3800]" />
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
            Aadhaar to <span className="text-[#ff3800]">PAN</span>
          </h1>

          <p className="text-slate-500 dark:text-gray-400 text-lg">
            Find PAN details using Aadhaar number
          </p>
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
                    <Car className="h-5 w-5 text-[#ff3800]" />
                  </span>
                  <span>Aadhaar to PAN Find</span>
                </CardTitle>

                <ServiceChargeCard
                  charge={retailer?.pan_find_fee ?? 0}
                  serviceName="Aadhaar to PAN"
                  className="w-full sm:w-auto sm:max-w-none"
                />
              </div>
            </CardHeader>

            <CardContent className="px-6 pb-6">
              <Form {...(form as any)}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  {/* =================================================
                      AADHAAR NUMBER + SERVER SELECT
                  ================================================= */}

                  <FormField
                    control={form.control as any}
                    name="aadhaar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 dark:text-gray-300 flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-[#ff3800]" />
                          Aadhaar Number
                          <span className="text-[#ff3800]">*</span>
                        </FormLabel>

                        <div className="flex flex-col sm:flex-row gap-3">
                          <FormControl>
                            <Input
                              {...field}
                              type="text"
                              inputMode="numeric"
                              maxLength={12}
                              autoComplete="off"
                              spellCheck={false}
                              placeholder="Enter 12-digit Aadhaar Number"
                              className="h-12 flex-1 bg-white dark:bg-white/5 border-slate-200 dark:border-[#ff3800]/20 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:border-[#ff3800] focus:ring-[#ff3800]/20 rounded-xl transition-all"
                              onChange={(e) => {
                                const value = e.target.value
                                  .replace(/\D/g, "")
                                  .slice(0, 12);
                                field.onChange(value);
                              }}
                            />
                          </FormControl>

                          <FormField
                            control={form.control as any}
                            name="server"
                            render={({ field: selectField }) => (
                              <FormItem className="w-full sm:w-[180px]">
                                <FormControl>
                                  <Select
                                    value={selectField.value}
                                    onValueChange={selectField.onChange}
                                  >
                                    <SelectTrigger className="h-12 w-full rounded-xl border-slate-200 dark:border-[#ff3800]/20 bg-white dark:bg-white/5 focus:ring-[#ff3800]/20">
                                      <Server className="h-4 w-4 text-[#ff3800] mr-2 shrink-0" />
                                      <SelectValue placeholder="Select Server" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-slate-200 dark:border-[#ff3800]/20">
                                      <SelectGroup>
                                        <SelectItem value="server_1">
                                          Server 1
                                        </SelectItem>
                                        <SelectItem value="server_2">
                                          Server 2
                                        </SelectItem>
                                      </SelectGroup>
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage className="text-[#ff3800]" />
                              </FormItem>
                            )}
                          />
                        </div>

                        <p className="text-xs text-slate-400 dark:text-gray-500">
                          Example: 1234 5678 9012
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
                <AlertTitle>Not Found</AlertTitle>
                <AlertDescription>
                  <div className="flex flex-col gap-1">
                    <span>{error}</span>
                    {searchedAadhaar && (
                      <span className="text-xs opacity-80">
                        Searched Aadhaar: {searchedAadhaar}
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
          open={showDialog}
          result={result as any}
          searchedPan={result?.pan_no || searchedAadhaar}
          onOpenChange={setShowDialog}
          onSearchAgain={() => {
            setShowDialog(false);
            resetSearch();
          }}
        />
      </motion.div>
    </div>
  );
}