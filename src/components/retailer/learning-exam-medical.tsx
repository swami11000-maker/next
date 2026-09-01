"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

import { Search, Loader2, CheckCircle2, AlertCircle, ArrowRight, CalendarDays, Map, FileText, Stethoscope, ClipboardCheck, CalendarX2Icon, Calendar1Icon, MapPinCheck, Car } from "lucide-react";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

import { Input } from "@/components/ui/input";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { toast } from "../ui/toast";

import { indianStates } from "@/lib/constate";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

import { Calendar } from "../ui/calendar";
import { ServiceChargeCard } from "../ui/service-charge-card";
import { useDataProvider } from "@/hooks/useDataProvider";
import { emitRetailerDataChanged } from "@/lib/data-events";

const fieldClass = cn(
  "h-12 w-full rounded-xl",
  "bg-white dark:bg-white/5",
  "border-slate-200 dark:border-[#ff3800]/20",
  "text-slate-900 dark:text-white",
  "focus:border-[#ff3800]",
  "focus:ring-2 focus:ring-[#ff3800]/20",
  "transition-all",
);

const stateValues = indianStates.map((state) => state.value) as [string, ...string[]];

/* =========================================================
   HELPERS
========================================================= */

/**
 * Convert DD-MM-YYYY string into Date.
 */
function parseDateString(value: string): Date | undefined {
  if (!value) return undefined;

  const parts = value.split("-");

  if (parts.length !== 3) {
    return undefined;
  }

  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const year = Number(parts[2]);

  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) {
    return undefined;
  }

  const date = new Date(year, month - 1, day);

  // Validate invalid dates like 31-02-2020
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return undefined;
  }

  return date;
}

/**
 * Convert Date into DD-MM-YYYY.
 */
function formatDateForForm(date: Date): string {
  return format(date, "dd-MM-yyyy");
}

/**
 * Check whether date is valid.
 */
function isValidDob(value: string): boolean {
  const date = parseDateString(value);

  if (!date) {
    return false;
  }

  const today = new Date();

  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  return date <= today;
}

/* =========================================================
   ZOD SCHEMA
========================================================= */

const formSchema = z.object({
  applicationId: z
    .string()
    .trim()
    .min(1, {
      message: "Application ID number is required",
    })
    .max(50, {
      message: "Application ID number is too long",
    }),

  state: z.enum(stateValues, {
    message: "Please select state",
  }),

  dateOfBirth: z
    .string()
    .min(1, {
      message: "Date of birth is required",
    })
    .refine((value) => parseDateString(value) !== undefined, {
      message: "Please select a valid date of birth",
    })
    .refine((value) => isValidDob(value), {
      message: "Date of birth cannot be in the future",
    }),
});

type FormValues = z.infer<typeof formSchema>;

/* =========================================================
   RESULT TYPE
========================================================= */

interface SearchResult {
  id: string;
  applicationId: string;
  state: string;
  dateOfBirth: string;
  status: string;
  message: string;
  charge?: number;
  oldBalance?: number;
  newBalance?: number;
}

/* =========================================================
   API RESPONSE TYPE
========================================================= */

interface ApiResponse {
  data?: {
    id?: string | number;
    order_id?: string | number;
    applicationId?: string;
    application_id?: string;
    state?: string;
    dateOfBirth?: string;
    date_of_birth?: string;
    status?: string;
    message?: string;
    charge?: number;
    old_balance?: number;
    new_balance?: number;
  };

  id?: string | number;
  order_id?: string | number;
  applicationId?: string;
  application_id?: string;
  state?: string;
  dateOfBirth?: string;
  date_of_birth?: string;
  status?: string;
  message?: string;
  error?: string;
  charge?: number;
  old_balance?: number;
  new_balance?: number;
}

/* =========================================================
   PAGE
========================================================= */

export default function LearningExamMedical() {
  const [isLoading, setIsLoading] = React.useState(false);

  const [searchResults, setSearchResults] = React.useState<SearchResult[] | null>(null);

  const [showResults, setShowResults] = React.useState(false);

  const [error, setError] = React.useState<string | null>(null);

  const {retailer} = useDataProvider()
  /* =========================================================
     FORM
  ========================================================= */

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),

    defaultValues: {
      applicationId: "",
      state: undefined,
      dateOfBirth: "",
    },
  });

  /* =========================================================
     SUBMIT
  ========================================================= */

  const onSubmit = async (data: FormValues) => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);
    setShowResults(false);
    setSearchResults(null);

    const loadingToastId = toast.loading("Submitting request...", {
      description: "Please wait while we process your Learning Exam Medical request.",
    });

    try {
      const response = await fetch("/api/learning-exam-medical", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          applicationId: data.applicationId.trim().toUpperCase(),

          state: data.state,

          dateOfBirth: data.dateOfBirth,
        }),
      });

      let result: ApiResponse | null = null;

      try {
        result = (await response.json()) as ApiResponse;
      } catch {
        result = null;
      }

      toast.dismiss(loadingToastId);

      /* =====================================================
         API ERROR
      ===================================================== */

      if (!response.ok) {
        const message = result?.message || result?.error || `Request failed with status ${response.status}.`;

        setError(message);

        toast.error("Request failed", {
          description: message,
        });

        return;
      }

      /* =====================================================
         SUCCESS
      ===================================================== */

      const selectedState = indianStates.find((item) => item.value === data.state)?.label ?? data.state;

      const resultData = result?.data ?? result ?? {};

      const finalResult: SearchResult = {
        id: String(resultData.id ?? resultData.order_id ?? `LM-${Date.now()}`),

        applicationId: String(resultData.applicationId ?? resultData.application_id ?? data.applicationId),

        state: String(resultData.state ?? selectedState),

        dateOfBirth: String(resultData.dateOfBirth ?? resultData.date_of_birth ?? data.dateOfBirth),

        status: String(resultData.status ?? "Request Submitted"),

        message: String(resultData.message ?? result?.message ?? "Learning Exam Medical request has been submitted successfully."),

        charge: resultData.charge ?? result?.charge,

        oldBalance: resultData.old_balance ?? result?.old_balance,

        newBalance: resultData.new_balance ?? result?.new_balance,
      };

      setSearchResults([finalResult]);
      setShowResults(true);

      toast.success("Request submitted successfully!", {
        description: result?.message ?? "Your Learning Exam Medical request has been submitted successfully.",
        duration: 5000,
      });

      emitRetailerDataChanged();

      /* =====================================================
         CLEAR FORM
      ===================================================== */

      form.reset({
        applicationId: "",
        state: undefined,
        dateOfBirth: "",
      });
    } catch (err) {
      toast.dismiss(loadingToastId);

      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";

      setError(message);

      toast.error("Something went wrong", {
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  /* =========================================================
     RESET
  ========================================================= */

  const resetSearch = () => {
    if (isLoading) return;

    form.reset({
      applicationId: "",
      state: undefined,
      dateOfBirth: "",
    });

    setSearchResults(null);
    setShowResults(false);
    setError(null);

    toast.info("Form cleared", {
      description: "All entered application information has been removed.",
    });
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
        staggerChildren: 0.08,
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
    <div className="px-4 sm:px-6 lg:px-8">
      <motion.div initial="hidden" animate="visible" variants={containerVariants} className="mx-auto max-w-3xl">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <motion.div variants={itemVariants} className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ff3800]/10">
            <Stethoscope className="h-7 w-7 text-[#ff3800]" />
          </div>

          <h1 className="mb-2 text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            Learning Exam <span className="text-[#ff3800]">Medical</span>
          </h1>

          <p className="text-lg text-slate-500 dark:text-gray-400">Submit your learning exam medical request</p>
        </motion.div>

        {/* =====================================================
            FORM CARD
        ===================================================== */}

        <motion.div variants={itemVariants}>
          <Card
            className="
              overflow-hidden
              rounded-3xl
              border-0
              p-6
              shadow-xl
              shadow-slate-200/50
              backdrop-blur-sm
              dark:border-[#ff3800]/20
              dark:bg-black/60
              dark:shadow-[#ff3800]/5
              sm:p-8
            "
          >
           <CardHeader className="px-4 pb-6 sm:px-6">
              <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-white sm:text-xl">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ff3800]/10">
                    <Car className="h-5 w-5 text-[#ff3800]" />
                  </span>

                  <span>Enter LL EXAM Medical</span>
                </CardTitle>

                <ServiceChargeCard charge={retailer?.["ll_medical_fee"] ?? 0} serviceName="LL Exam Medical " className="w-full sm:w-auto sm:max-w-none" />
              </div>
            </CardHeader>

            <CardContent className="px-0">
              <Form {...(form as any)}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* =================================================
                      APPLICATION ID
                  ================================================= */}

                  <FormField
                    control={form.control as any}
                    name="applicationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-slate-700 dark:text-gray-300">
                          <FileText className="h-4 w-4 text-[#ff3800]" />
                          Application ID Number
                          <span className="text-[#ff3800]">*</span>
                        </FormLabel>

                        <FormControl>
                          <Input
                            {...field}
                            type="text"
                            maxLength={50}
                            autoComplete="off"
                            placeholder="Enter application ID number"
                            disabled={isLoading}
                            value={field.value ?? ""}
                            onChange={(e) => {
                              field.onChange(e.target.value.toUpperCase().slice(0, 50));
                            }}
                            className="
                              h-12
                              rounded-xl
                              border-slate-200
                              bg-white
                              uppercase
                              text-slate-900
                              transition-all
                              placeholder:text-slate-400
                              focus:border-[#ff3800]
                              focus:ring-[#ff3800]/20
                              dark:border-[#ff3800]/20
                              dark:bg-white/5
                              dark:text-white
                              dark:placeholder:text-gray-500
                            "
                          />
                        </FormControl>

                        <FormMessage className="text-[#ff3800]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control as any}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-slate-700 dark:text-gray-300">
                          <MapPinCheck className="h-4 w-4 text-[#ff3800]" />
                          Select State
                          <span className="text-[#ff3800]">*</span>
                        </FormLabel>

                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className={`py-2 ${fieldClass}`}>
                              <SelectValue className={"py-2"} placeholder="Select State" />
                            </SelectTrigger>
                          </FormControl>

                          <SelectContent className={"py-2"}>
                            {indianStates.map((state) => (
                              <SelectItem key={state.value} value={state.value}>
                                {state.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <FormMessage className="text-[#ff3800]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control as any}
                    name="dateOfBirth"
                    render={({ field }) => {
                      const selectedDate = parseDateString(field.value);

                      const handleDateSelect = (date: Date | undefined) => {
                        if (!date) {
                          field.onChange("");
                          return;
                        }

                        field.onChange(formatDateForForm(date));
                      };

                      return (
                        <FormItem className="flex flex-col">
                          <FormLabel className="flex items-center gap-2 text-slate-700 dark:text-gray-300">
                            <Calendar1Icon className="h-4 w-4 text-[#ff3800]" />
                            Date of Birth
                            <span className="text-[#ff3800]">*</span>
                          </FormLabel>

                           <Popover>
                             <PopoverTrigger>
                               <FormControl>
                                 <div
                                   role="button"
                                   tabIndex={0}
                                   className={cn(
                                     "h-12 w-full justify-start rounded-xl border-slate-200 bg-white text-left font-normal text-slate-900 transition-all",
                                     "hover:bg-slate-50",
                                     "dark:border-[#ff3800]/20 dark:bg-white/5 dark:text-white dark:hover:bg-white/10",
                                     !field.value && "text-slate-400 dark:text-gray-500",
                                     "inline-flex shrink-0 items-center border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
                                   )}
                                 >
                                   <CalendarX2Icon className="mr-2 h-4 w-4 shrink-0 text-[#ff3800]" />

                                   {selectedDate ? format(selectedDate, "PPP") : "Select your birth date"}
                                 </div>
                               </FormControl>
                             </PopoverTrigger>

                            <PopoverContent
                              className="
                                w-auto
                                rounded-xl
                                border-slate-200
                                bg-white
                                p-0
                                dark:border-[#ff3800]/20
                                dark:bg-black/95
                              "
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={handleDateSelect}
                                disabled={(date) => {
                                  const today = new Date();

                                  today.setHours(0, 0, 0, 0);

                                  const minDate = new Date(1900, 0, 1);

                                  return date > today || date < minDate;
                                }}
                                captionLayout="dropdown"
                                className="bg-white p-3 text-slate-900 dark:bg-black dark:text-white"
                                classNames={{
                                  selected: "bg-[#ff3800] text-white hover:bg-[#ff3800]",
                                  day: "rounded-lg transition-colors hover:bg-[#ff3800]/10",
                                }}
                              />
                            </PopoverContent>
                          </Popover>

                          <p className="text-xs text-slate-400 dark:text-gray-500">Format: DD-MM-YYYY</p>

                          <FormMessage className="text-[#ff3800]" />
                        </FormItem>
                      );
                    }}
                  />

                  <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="
                        group
                        h-12
                        flex-1
                        rounded-xl
                        bg-[#ff3800]
                        text-white
                        shadow-lg
                        shadow-[#ff3800]/20
                        transition-all
                        duration-300
                        hover:bg-[#ff3800]/90
                        hover:shadow-[#ff3800]/30
                        disabled:cursor-not-allowed
                        disabled:opacity-60
                      "
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Search className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" />
                          Submit Request
                          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
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
                        rounded-xl
                        border-slate-200
                        px-6
                        text-slate-700
                        transition-all
                        hover:bg-slate-50
                        dark:border-[#ff3800]/20
                        dark:text-gray-300
                        dark:hover:bg-white/5
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
      </motion.div>
    </div>
  );
}
