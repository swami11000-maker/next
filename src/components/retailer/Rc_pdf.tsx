"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Car,
  Palette,
  CreditCard,
  FileText,
  Download,
  Eye,
  X,
  User,
  Hash,
  Wallet,
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
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

import { useDataProvider } from "@/hooks/useDataProvider";
import { ServiceChargeCard } from "../ui/service-charge-card";
import { emitRetailerDataChanged } from "@/lib/data-events";
import { apiFetch } from "@/lib/api-client";

/* =========================================================
   TYPES
========================================================= */

type RcFormValues = {
  rcNumber: string;
  cardColorType: "new" | "old";
  cardType: "with-chip" | "without-chip";
};

type RcApiResponse = {
  success: boolean;
  message?: string;

  order_id?: string;
  rcno?: string;
  name?: string;
  application_no?: string;

  pdf?: string;

  old_balance?: number;
  new_balance?: number;
  charge?: number;

  status?: string | number;

  [key: string]: unknown;
};

/* =========================================================
   COMPONENT
========================================================= */

export default function RcPdf() {
  const [isLoading, setIsLoading] = React.useState(false);

  const [result, setResult] =
    React.useState<RcApiResponse | null>(null);

  const [showPopup, setShowPopup] = React.useState(false);

  const [error, setError] =
    React.useState<string | null>(null);

  const { retailer } = useDataProvider();

  /* =========================================================
     FORM
  ========================================================= */

  const form = useForm<RcFormValues>({
    defaultValues: {
      rcNumber: "",
      cardColorType: "new",
      cardType: "with-chip",
    },
  });

  /* =========================================================
     SUBMIT
  ========================================================= */

  const onSubmit = async (data: RcFormValues) => {
    const rcNumber = data.rcNumber.trim().toUpperCase();

    if (!rcNumber) {
      setError("Please enter RC number.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setShowPopup(false);

    try {
      const params = new URLSearchParams({
        rcNumber,
        cardColorType: data.cardColorType,
        cardType: data.cardType,
      });

      const apiUrl = `/api/rc-print?${params.toString()}`;

      console.log("RC Print Request:", apiUrl);

      const response = await apiFetch(apiUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });

      /* =====================================================
         SAFE JSON PARSING
      ===================================================== */

      let apiResult: RcApiResponse;

      try {
        apiResult = await response.json();
      } catch {
        throw new Error(
          `Invalid server response (${response.status})`
        );
      }

      console.log("RC Print Response:", apiResult);

      /* =====================================================
         API ERROR
      ===================================================== */

      if (!response.ok) {
        throw new Error(
          apiResult?.message ||
            `RC verification failed (${response.status})`
        );
      }

      /* =====================================================
         SUCCESS
      ===================================================== */

      if (apiResult.success === true) {
        setResult(apiResult);
        setShowPopup(true);

        /*
         * Refresh retailer balance/data.
         */
        emitRetailerDataChanged();

        return;
      }

      /* =====================================================
         FAILED RESPONSE
      ===================================================== */

      throw new Error(
        apiResult?.message ||
          "RC verification failed. Please try again."
      );
    } catch (err) {
      console.error("RC PDF API Error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
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
      rcNumber: "",
      cardColorType: "new",
      cardType: "with-chip",
    });

    setResult(null);
    setShowPopup(false);
    setError(null);
  };

  /* =========================================================
     PDF HELPERS
  ========================================================= */

  const normalizePdfSource = (pdf: string) => {
    if (!pdf) return null;

    const value = pdf.trim();

    if (!value) return null;

    /*
     * Already a data URL
     */
    if (value.startsWith("data:")) {
      return value;
    }

    /*
     * Normal HTTP/HTTPS URL
     */
    if (
      value.startsWith("http://") ||
      value.startsWith("https://") ||
      value.startsWith("blob:")
    ) {
      return value;
    }

    /*
     * Raw Base64 PDF
     *
     * PDF base64 usually starts with JVBERi
     */
    if (
      value.startsWith("JVBER") ||
      value.length > 100
    ) {
      return `data:application/pdf;base64,${value}`;
    }

    return value;
  };

  /* =========================================================
     VIEW PDF
  ========================================================= */

  const viewPdf = () => {
    if (!result?.pdf) {
      setError("PDF document is not available.");
      return;
    }

    const pdfSource = normalizePdfSource(result.pdf);

    if (!pdfSource) {
      setError("Invalid PDF document.");
      return;
    }

    try {
      window.open(
        pdfSource,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (err) {
      console.error("PDF View Error:", err);
      setError("Unable to open PDF.");
    }
  };

  /* =========================================================
     DOWNLOAD PDF
  ========================================================= */

  const downloadPdf = async () => {
    if (!result?.pdf) {
      setError("PDF document is not available.");
      return;
    }

    const pdfSource = normalizePdfSource(result.pdf);

    if (!pdfSource) {
      setError("Invalid PDF document.");
      return;
    }

    const fileName = `${
      result.rcno || "RC"
    }-Document.pdf`;

    try {
      /*
       * DATA URL
       */
      if (pdfSource.startsWith("data:")) {
        const [header, base64] = pdfSource.split(",");

        if (!base64) {
          throw new Error("Invalid PDF base64 data");
        }

        const mimeMatch =
          header.match(/data:(.*?);base64/);

        const mimeType =
          mimeMatch?.[1] || "application/pdf";

        const binaryString = window.atob(base64);

        const len = binaryString.length;

        const bytes = new Uint8Array(len);

        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const blob = new Blob([bytes], {
          type: mimeType,
        });

        const blobUrl =
          window.URL.createObjectURL(blob);

        const link =
          document.createElement("a");

        link.href = blobUrl;
        link.download = fileName;

        document.body.appendChild(link);

        link.click();

        link.remove();

        window.URL.revokeObjectURL(blobUrl);

        return;
      }

      /*
       * NORMAL URL
       */
      if (
        pdfSource.startsWith("http://") ||
        pdfSource.startsWith("https://") ||
        pdfSource.startsWith("blob:")
      ) {
        const response = await fetch(pdfSource);

        if (!response.ok) {
          throw new Error("Unable to fetch PDF");
        }

        const blob = await response.blob();

        const blobUrl =
          window.URL.createObjectURL(blob);

        const link =
          document.createElement("a");

        link.href = blobUrl;
        link.download = fileName;

        document.body.appendChild(link);

        link.click();

        link.remove();

        window.URL.revokeObjectURL(blobUrl);

        return;
      }

      throw new Error("Unsupported PDF format");
    } catch (err) {
      console.error("PDF Download Error:", err);

      /*
       * Last fallback
       */
      try {
        const link =
          document.createElement("a");

        link.href = pdfSource;
        link.download = fileName;
        link.target = "_blank";
        link.rel = "noopener noreferrer";

        document.body.appendChild(link);

        link.click();

        link.remove();
      } catch {
        setError(
          "Unable to download PDF. Please use View PDF."
        );
      }
    }
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
      <div className="px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="max-w-2xl mx-auto"
        >
          {/* =================================================
              HEADER
          ================================================= */}

          <motion.div
            variants={itemVariants}
            className="text-center mb-10"
          >
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
              RC{" "}
              <span className="text-[#ff3800]">
                PDF
              </span>
            </h1>

            <p className="text-slate-500 dark:text-gray-400 text-lg">
              Generate your vehicle RC PDF
            </p>
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
                <div
                  className="
                    flex
                    flex-col
                    gap-4
                    border-b
                    border-slate-100
                    pb-5
                    dark:border-white/10
                    sm:flex-row
                    sm:items-center
                    sm:justify-between
                  "
                >
                  <CardTitle
                    className="
                      flex
                      items-center
                      gap-2
                      text-lg
                      font-semibold
                      text-slate-800
                      dark:text-white
                      sm:text-xl
                    "
                  >
                    <span
                      className="
                        flex
                        h-9
                        w-9
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        bg-[#ff3800]/10
                      "
                    >
                      <Car className="h-5 w-5 text-[#ff3800]" />
                    </span>

                    <span>Enter Details</span>
                  </CardTitle>

                  <ServiceChargeCard
                    charge={retailer?.rc_print_fee ?? 0}
                    serviceName="RC PDF"
                    className="w-full sm:w-auto sm:max-w-none"
                  />
                </div>
              </CardHeader>

              <CardContent className="px-0">
                <Form {...(form as any)}>
                  <form
                    onSubmit={form.handleSubmit(
                      onSubmit
                    )}
                    className="space-y-6"
                  >
                    {/* =========================================
                        RC NUMBER
                    ========================================= */}

                    <FormField
                      control={form.control as any}
                      name="rcNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel
                            className="
                              text-slate-700
                              dark:text-gray-300
                              flex
                              items-center
                              gap-2
                            "
                          >
                            <Car className="h-4 w-4 text-[#ff3800]" />

                            RC Number

                            <span className="text-[#ff3800]">
                              *
                            </span>
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
                                const value =
                                  e.target.value
                                    .toUpperCase()
                                    .replace(
                                      /[^A-Z0-9 -]/g,
                                      ""
                                    )
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
                          <FormLabel
                            className="
                              text-slate-700
                              dark:text-gray-300
                              flex
                              items-center
                              gap-2
                            "
                          >
                            <Palette className="h-4 w-4 text-[#ff3800]" />

                            Card Color Type

                            <span className="text-[#ff3800]">
                              *
                            </span>
                          </FormLabel>

                          <FormControl>
                            <Select
                              value={field.value}
                              onValueChange={
                                field.onChange
                              }
                            >
                              <SelectTrigger className="w-full h-12 rounded-xl">
                                <SelectValue placeholder="Select card color" />
                              </SelectTrigger>

                              <SelectContent>
                                <SelectGroup>
                                  <SelectItem value="new">
                                    New Background
                                  </SelectItem>

                                  <SelectItem value="old">
                                    Old Background
                                  </SelectItem>
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
                          <FormLabel
                            className="
                              text-slate-700
                              dark:text-gray-300
                              flex
                              items-center
                              gap-2
                            "
                          >
                            <CreditCard className="h-4 w-4 text-[#ff3800]" />

                            Select Card Type

                            <span className="text-[#ff3800]">
                              *
                            </span>
                          </FormLabel>

                          <FormControl>
                            <Select
                              value={field.value}
                              onValueChange={
                                field.onChange
                              }
                            >
                              <SelectTrigger className="w-full h-12 rounded-xl">
                                <SelectValue placeholder="Select card type" />
                              </SelectTrigger>

                              <SelectContent>
                                <SelectGroup>
                                  <SelectItem value="with-chip">
                                    Chip
                                  </SelectItem>

                                  <SelectItem value="without-chip">
                                    Non-Chip
                                  </SelectItem>
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

                  <AlertTitle>
                    Request Failed
                  </AlertTitle>

                  <AlertDescription>
                    {error}
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* =====================================================
          SUCCESS POPUP
      ===================================================== */}

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
            onClick={() =>
              setShowPopup(false)
            }
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
              onClick={(e) =>
                e.stopPropagation()
              }
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
                onClick={() =>
                  setShowPopup(false)
                }
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
                      shrink-0
                      rounded-2xl
                      bg-green-500/10
                      flex
                      items-center
                      justify-center
                    "
                  >
                    <CheckCircle2 className="h-7 w-7 text-green-500" />
                  </motion.div>

                  <div className="min-w-0">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      RC Verified
                    </h2>

                    <p className="text-sm text-slate-500 dark:text-gray-400 break-words">
                      {result.message ||
                        "RC verification successful"}
                    </p>
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

                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-gray-400">
                        RC Number
                      </span>
                    </div>

                    <p className="font-bold text-slate-900 dark:text-white uppercase break-all">
                      {result.rcno ||
                        "Not Available"}
                    </p>
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

                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-gray-400">
                        Owner Name
                      </span>
                    </div>

                    <p className="font-bold text-slate-900 dark:text-white break-words">
                      {result.name ||
                        "Not Available"}
                    </p>
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

                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-gray-400">
                        Application Number
                      </span>
                    </div>

                    <p className="font-bold text-sm break-all text-slate-900 dark:text-white">
                      {result.application_no ||
                        "Not Available"}
                    </p>
                  </div>

                  {/* ORDER ID */}

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
                      <Hash className="h-4 w-4 text-[#ff3800]" />

                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-gray-400">
                        Order ID
                      </span>
                    </div>

                    <p className="font-bold text-sm font-mono text-slate-900 dark:text-white break-all">
                      {result.order_id ||
                        "Not Available"}
                    </p>
                  </div>

                  {/* CHARGE */}

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
                      <CreditCard className="h-4 w-4 text-[#ff3800]" />

                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-gray-400">
                        Amount Charged
                      </span>
                    </div>

                    <p className="font-bold text-sm text-slate-900 dark:text-white">
                      ₹
                      {Number(
                        result.charge || 0
                      ).toLocaleString("en-IN")}
                    </p>
                  </div>

                  {/* OLD BALANCE */}

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
                      <Wallet className="h-4 w-4 text-[#ff3800]" />

                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-gray-400">
                        Old Balance
                      </span>
                    </div>

                    <p className="font-bold text-sm text-slate-900 dark:text-white">
                      ₹
                      {Number(
                        result.old_balance || 0
                      ).toLocaleString("en-IN")}
                    </p>
                  </div>

                  {/* NEW BALANCE */}

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
                      <Wallet className="h-4 w-4 text-[#ff3800]" />

                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-gray-400">
                        New Balance
                      </span>
                    </div>

                    <p className="font-bold text-sm text-slate-900 dark:text-white">
                      ₹
                      {Number(
                        result.new_balance || 0
                      ).toLocaleString("en-IN")}
                    </p>
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
                          shrink-0
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
                        <p className="font-semibold text-slate-900 dark:text-white">
                          RC PDF Ready
                        </p>

                        <p className="text-xs text-slate-500 dark:text-gray-400">
                          Your RC document is ready
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      {/* VIEW */}

                      <Button
                        type="button"
                        variant="outline"
                        onClick={viewPdf}
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
                  onClick={() =>
                    setShowPopup(false)
                  }
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
