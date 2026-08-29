"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { Search, Loader2, CheckCircle2, MapPin, FileText, LockKeyhole, KeyRound, Sun, Moon, Clock3, Calendar1Icon, CalendarX2Icon, Car, ArrowRight } from "lucide-react";
import { format } from "date-fns";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

import { Input } from "@/components/ui/input";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";;

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { toast } from "../ui/toast";
import { ServiceChargeCard } from "../ui/service-charge-card";
import { useDataProvider } from "@/hooks/useDataProvider";
function formatDateForForm(date: Date): string {
  return format(date, "dd-MM-yyyy");
}

/* =========================================================
   INDIAN STATES
========================================================= */
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
const indianStates = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
] as const;

/* =========================================================
   EXAM TYPES
========================================================= */

const examTypes = [
  {
    value: "day-exam",
    label: "Day Exam",
    description: "Available during daytime service hours",
    icon: Sun,
  },
  {
    value: "night-exam",
    label: "Night Exam",
    description: "Available during nighttime service hours",
    icon: Moon,
  },
] as const;

/* =========================================================
   ZOD SCHEMA
========================================================= */

const formSchema = z.object({
  applicationNumber: z.string().trim().min(1, "Application number is required").max(50, "Application number is too long"),

  dateOfBirth: z.string().min(1, "Date of birth is required"),

  password: z.string().min(1, "Password is required"),

  examPin: z.string().max(20, "Exam PIN is too long").optional().or(z.literal("")),

  state: z.enum(indianStates, {
    message: "Please select state",
  }),

  examType: z.enum(["day-exam", "night-exam"], {
    message: "Please select exam type",
  }),
});

type FormValues = z.infer<typeof formSchema>;

/* =========================================================
   RESULT TYPE
========================================================= */

interface ExamResult {
  id: string | number;
  applicationNumber: string;
  state: string;
  examType: string;
  examStatus: string;
  examTime: string;
  message: string;
  charge?: number;
  oldBalance?: number;
  newBalance?: number;
}

/* =========================================================
   COMPONENT
========================================================= */

export default function LLExamRequest() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<ExamResult[] | null>(null);

  const [showResults, setShowResults] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { retailer } = useDataProvider();

  /* =========================================================
     FORM
  ========================================================= */

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),

    defaultValues: {
      applicationNumber: "",
      dateOfBirth: "",
      password: "",
      examPin: "",
      state: undefined,
      examType: undefined,
    },
  });

  /* =========================================================
     SUBMIT
  ========================================================= */

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    setError(null);
    setShowResults(false);
    setSearchResults(null);

    try {
      const response = await fetch("/api/ll-exam-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          applicationNumber: data.applicationNumber,
          dateOfBirth: data.dateOfBirth,
          password: data.password,
          examPin: data.examPin || "",
          state: data.state,
          examType: data.examType,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to submit LL exam request");
      }

      const examResult: ExamResult = {
        id: result.id ?? result.order_id,
        applicationNumber: data.applicationNumber,
        state: data.state,
        examType: data.examType === "day-exam" ? "Day Exam" : "Night Exam",
        examStatus: "Submitted",
        examTime: data.examType === "day-exam" ? "08:00 AM - 11:00 PM" : "Night Shift",
        message: result.message || "LL exam request submitted successfully",
        charge: result.charge,
        oldBalance: result.old_balance,
        newBalance: result.new_balance,
      };

      setSearchResults([examResult]);
      toast.success("Request submitted successfully!", {
        description: result?.message || "Your vehicle documents have been uploaded successfully.",
        duration: 5000,
      });
    } catch (err) {
      toast.error("Something went wrong", {
        description: err instanceof Error ? err.message : "Unable to complete the request. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  /* =========================================================
     RESET
  ========================================================= */

  const resetSearch = () => {
    form.reset({
      applicationNumber: "",
      dateOfBirth: "",
      password: "",
      examPin: "",
      state: undefined,
      examType: undefined,
    });

    setSearchResults(null);
    setShowResults(false);
    setError(null);
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
     FIELD CLASS
  ========================================================= */

  const fieldClass = cn(
    "h-12 w-full rounded-xl",
    "bg-white dark:bg-white/5",
    "border-slate-200 dark:border-[#ff3800]/20",
    "text-slate-900 dark:text-white",
    "focus:border-[#ff3800]",
    "focus:ring-2 focus:ring-[#ff3800]/20",
    "transition-all",
  );

  return (
    <div className="w-full ">
      <motion.div initial="hidden" animate="visible" variants={containerVariants} className="mx-auto w-full max-w-4xl">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <motion.div variants={itemVariants} className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            LL Exam <span className="text-[#ff3800]">Request</span>
          </h1>

          <p className="mt-2 text-base text-slate-500 dark:text-gray-400 sm:text-lg">Submit your Learner License exam request</p>
        </motion.div>

        {/* =====================================================
            FORM CARD
        ===================================================== */}

        <motion.div variants={itemVariants}>
          <Card
            className="
              overflow-hidden
              rounded-3xl
              border-slate-200
              bg-white
              shadow-xl
              shadow-slate-200/50
              dark:border-[#ff3800]/20
              dark:bg-black/60
              dark:shadow-[#ff3800]/5
            "
          >
            <CardHeader className="px-4 pb-6 sm:px-6">
              <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-white sm:text-xl">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ff3800]/10">
                    <Car className="h-5 w-5 text-[#ff3800]" />
                  </span>

                  <span>Enter LL EXAM Detail Details</span>
                </CardTitle>

                <ServiceChargeCard charge={retailer?.["ll_exam_fee"] ?? 0} serviceName="LL exam" className="w-full sm:w-auto sm:max-w-none" />
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-6 sm:px-8 sm:pb-8">
              <Form {...(form as any)}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* =================================================
                      APPLICATION NUMBER
                  ================================================= */}

                  <FormField
                    control={form.control as any}
                    name="applicationNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-slate-700 dark:text-gray-300">
                          <FileText className="h-4 w-4 text-[#ff3800]" />
                          Application Number
                          <span className="text-[#ff3800]">*</span>
                        </FormLabel>

                        <FormControl>
                          <Input
                            {...field}
                            type="text"
                            maxLength={50}
                            autoComplete="off"
                            placeholder="Enter application number"
                            className={cn(fieldClass, "uppercase placeholder:normal-case")}
                            onChange={(e) => {
                              field.onChange(e.target.value.toUpperCase().slice(0, 50));
                            }}
                          />
                        </FormControl>

                        <FormMessage className="text-[#ff3800]" />
                      </FormItem>
                    )}
                  />

                  {/* =================================================
                      DOB + PASSWORD
                  ================================================= */}

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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

                    <FormField
                      control={form.control as any}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-slate-700 dark:text-gray-300">
                            <LockKeyhole className="h-4 w-4 text-[#ff3800]" />
                            Password
                            <span className="text-[#ff3800]">*</span>
                          </FormLabel>

                          <FormControl>
                            <Input {...field} type="password" autoComplete="off" placeholder="Enter password" className={fieldClass} />
                          </FormControl>

                          <FormMessage className="text-[#ff3800]" />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* =================================================
                      EXAM PIN
                  ================================================= */}

                  <FormField
                    control={form.control as any}
                    name="examPin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-slate-700 dark:text-gray-300">
                          <KeyRound className="h-4 w-4 text-[#ff3800]" />
                          Exam PIN
                          <span className="text-xs font-normal text-slate-400 dark:text-gray-500">(Optional)</span>
                        </FormLabel>

                        <FormControl>
                          <Input {...field} type="text" maxLength={20} autoComplete="off" placeholder="Enter exam PIN if available" className={fieldClass} />
                        </FormControl>

                        <FormMessage className="text-[#ff3800]" />
                      </FormItem>
                    )}
                  />

                  {/* =================================================
                      STATE
                  ================================================= */}

                  <FormField
                    control={form.control as any}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-slate-700 dark:text-gray-300">
                          <MapPin className="h-4 w-4 text-[#ff3800]" />
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
                              <SelectItem key={state} value={state}>
                                {state}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <FormMessage className="text-[#ff3800]" />
                      </FormItem>
                    )}
                  />

                  {/* =================================================
                      EXAM TYPE
                  ================================================= */}

                  <FormField
                    control={form.control as any}
                    name="examType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-slate-700 dark:text-gray-300">
                          <Clock3 className="h-4 w-4 text-[#ff3800]" />
                          Exam Type
                          <span className="text-[#ff3800]">*</span>
                        </FormLabel>

                        <FormControl>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {examTypes.map((exam) => {
                              const Icon = exam.icon;

                              const selected = field.value === exam.value;

                              return (
                                <button
                                  key={exam.value}
                                  type="button"
                                  onClick={() => field.onChange(exam.value)}
                                  className={cn(
                                    "group relative flex min-h-[90px] items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-200",
                                    "hover:border-[#ff3800]/50 hover:bg-[#ff3800]/5",
                                    selected ? "border-[#ff3800] bg-[#ff3800]/10 ring-2 ring-[#ff3800]/20" : "border-slate-200 bg-white dark:border-[#ff3800]/20 dark:bg-white/[0.03]",
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all",
                                      selected ? "bg-[#ff3800] text-white" : "bg-[#ff3800]/10 text-[#ff3800]",
                                    )}
                                  >
                                    <Icon className="h-5 w-5" />
                                  </div>

                                  <div className="min-w-0">
                                    <p className="font-semibold text-slate-900 dark:text-white">{exam.label}</p>

                                    <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">{exam.description}</p>
                                  </div>

                                  {selected && <CheckCircle2 className="absolute right-4 top-4 h-5 w-5 text-[#ff3800]" />}
                                </button>
                              );
                            })}
                          </div>
                        </FormControl>

                        <FormMessage className="text-[#ff3800]" />
                      </FormItem>
                    )}
                  />

                  {/* =================================================
                      EXAM INFORMATION
                  ================================================= */}

                  <div className="rounded-2xl border border-[#ff3800]/20 bg-[#ff3800]/5 p-4">
                    <div className="flex gap-3">
                      <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-[#ff3800]" />

                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Exam Request Timing</p>

                        <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-gray-400">LL exam requests are processed daily between 08:00 AM and 11:00 PM.</p>
                      </div>
                    </div>
                  </div>

                  {/* =================================================
                      ACTIONS
                  ================================================= */}

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
                          Submit Exam Request
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
