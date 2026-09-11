"use client";

import * as React from "react";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

import {
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Calendar as CalendarIcon,
  MapPin,
  User,
  CreditCard,
  Phone,
} from "lucide-react";

import { cn } from "@/lib/utils";

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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

/* =========================================================
   ZOD SCHEMA
========================================================= */

const formSchema = z.object({
  name: z
    .string()
    .min(2, {
      message: "Name must be at least 2 characters",
    })
    .max(100, {
      message: "Name must not exceed 100 characters",
    })
    .regex(/^[A-Za-z\s]+$/, {
      message: "Name can contain only letters and spaces",
    }),

  mobileNumber: z
    .string()
    .length(10, {
      message: "Mobile number must be 10 digits",
    })
    .regex(/^[6-9]\d{9}$/, {
      message: "Enter a valid 10 digit mobile number",
    }),
});

type FormValues = z.infer<typeof formSchema>;

/* =========================================================
   MOCK RESULTS
========================================================= */

const mockResults = [
  {
    id: "PAN-2024-001",
    fullName: "John Michael Doe",
    dateOfBirth: "1990-05-15",
    panNumber: "ABCDE1234F",
    status: "Active",
    category: "Individual",
    mobileNumber: "9876543210",
    address: "123 Main Street, New Delhi, India",
    issueDate: "2018-05-15",
  },

  {
    id: "PAN-2024-002",
    fullName: "Sarah Jane Smith",
    dateOfBirth: "1985-11-23",
    panNumber: "FGHIJ5678K",
    status: "Active",
    category: "Individual",
    mobileNumber: "8765432109",
    address: "456 Oak Avenue, Mumbai, Maharashtra",
    issueDate: "2016-11-23",
  },
];

/* =========================================================
   PAGE
========================================================= */

export default function MobtoPan() {
  const [isLoading, setIsLoading] = React.useState(false);

  const [searchResults, setSearchResults] = React.useState<
    typeof mockResults | null
  >(null);

  const [showResults, setShowResults] = React.useState(false);

  const [error, setError] = React.useState<string | null>(null);

  /* =========================================================
     FORM
  ========================================================= */

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),

    defaultValues: {
      name: "",
      mobileNumber: "",
    },
  });

  /* =========================================================
     SUBMIT
  ========================================================= */

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    setError(null);
    setShowResults(false);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      /* =====================================================
         API INTEGRATION
      =====================================================

      const response = await fetch("/api/pan/find", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          name: data.name,
          mobileNumber: data.mobileNumber,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Unable to find PAN details"
        );
      }

      if (result.data?.length > 0) {
        setSearchResults(result.data);
        setShowResults(true);
      } else {
        setError(
          "No PAN record found. Please check your information."
        );

        setSearchResults(null);
      }

      ========================================================= */

      /* =====================================================
         MOCK RESPONSE
      ===================================================== */

      const found = mockResults;

      if (found.length > 0) {
        setSearchResults(found);
        setShowResults(true);
      } else {
        setError(
          "No PAN record found. Please check your information."
        );

        setSearchResults(null);
      }
    } catch (err) {
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
      name: "",
      mobileNumber: "",
    });

    setSearchResults(null);
    setShowResults(false);
    setError(null);
  };

  /* =========================================================
     ANIMATION VARIANTS
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
    <div className=" px-4 sm:px-6 lg:px-8">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="max-w-2xl mx-auto"
      >
        {/* =====================================================
            HEADER
        ===================================================== */}

        <motion.div
          variants={itemVariants}
          className="text-center mb-10"
        >
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
            PAN{" "}
            <span className="text-[#ff3800]">
              Find
            </span>
          </h1>

          <p className="text-slate-500 dark:text-gray-400 text-lg">
            Find PAN instantly
          </p>
        </motion.div>

        {/* =====================================================
            SEARCH CARD
        ===================================================== */}

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
            <CardHeader className="pb-4 px-0">
              <CardTitle className="text-xl flex items-center gap-2 text-slate-800 dark:text-white">
                <Search className="h-5 w-5 text-[#ff3800]" />

                Enter Details
              </CardTitle>
            </CardHeader>

            <CardContent className="px-0">
              <Form {...(form as any)}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  {/* =================================================
                      NAME
                  ================================================= */}

                  <FormField
                    control={form.control as any}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 dark:text-gray-300 flex items-center gap-2">
                          <User className="h-4 w-4 text-[#ff3800]" />

                          Full Name

                          <span className="text-[#ff3800]">
                            *
                          </span>
                        </FormLabel>

                        <FormControl>
                          <Input
                            {...field}
                            type="text"
                            autoComplete="name"
                            placeholder="Enter your full name"
                            className="
                              h-12
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
                                .replace(/[^A-Za-z\s]/g, "")
                                .replace(/\s+/g, " ");

                              field.onChange(value);
                            }}
                          />
                        </FormControl>

                        <FormMessage className="text-[#ff3800]" />
                      </FormItem>
                    )}
                  />

                  {/* =================================================
                      MOBILE NUMBER
                  ================================================= */}

                  <FormField
                    control={form.control as any}
                    name="mobileNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 dark:text-gray-300 flex items-center gap-2">
                          <Phone className="h-4 w-4 text-[#ff3800]" />

                          Mobile Number

                          <span className="text-[#ff3800]">
                            *
                          </span>
                        </FormLabel>

                        <FormControl>
                          <Input
                            {...field}
                            type="tel"
                            inputMode="numeric"
                            maxLength={10}
                            autoComplete="tel"
                            placeholder="Enter 10 digit mobile number"
                            className="
                              h-12
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
                                .replace(/\D/g, "")
                                .slice(0, 10);

                              field.onChange(value);
                            }}
                          />
                        </FormControl>

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
                  Search Failed
                </AlertTitle>

                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* =====================================================
            RESULTS
        ===================================================== */}

        <AnimatePresence>
          {showResults && searchResults && (
            <motion.div
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: 20,
              }}
              className="mt-8 space-y-4"
            >
              {/* RESULTS HEADER */}

              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-500" />

                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                  PAN Results
                </h2>

                <Badge className="bg-[#ff3800] text-white px-3 py-1 text-sm">
                  {searchResults.length} found
                </Badge>
              </div>

              {/* RESULTS */}

              {searchResults.map((result, index) => (
                <motion.div
                  key={result.id}
                  initial={{
                    opacity: 0,
                    y: 20,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    delay: index * 0.1,
                  }}
                >
                  <Card
                    className="
                      border-slate-200
                      dark:border-[#ff3800]/20
                      bg-white
                      dark:bg-black/40
                      backdrop-blur-sm
                      rounded-2xl
                      shadow-md
                      hover:shadow-lg
                      transition-shadow
                    "
                  >
                    <CardHeader className="pb-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <CardTitle
                            className="
                              text-lg
                              text-slate-900
                              dark:text-white
                              flex
                              items-center
                              gap-2
                            "
                          >
                            {result.fullName}

                            <Badge
                              className={cn(
                                "text-xs",
                                result.status === "Active"
                                  ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 border-green-200 dark:border-green-500/30"
                                  : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 border-red-200 dark:border-red-500/30"
                              )}
                            >
                              {result.status}
                            </Badge>
                          </CardTitle>

                          <p className="text-sm text-slate-500 dark:text-gray-400">
                            ID: {result.id}
                          </p>
                        </div>

                        <Badge
                          variant="outline"
                          className="border-[#ff3800]/30 text-[#ff3800]"
                        >
                          {result.category}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="pb-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* LEFT */}

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-gray-300">
                            <CreditCard className="h-4 w-4 text-[#ff3800]" />

                            <span>
                              PAN: {result.panNumber}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-gray-300">
                            <Phone className="h-4 w-4 text-[#ff3800]" />

                            <span>
                              Mobile: {result.mobileNumber}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-gray-300">
                            <CalendarIcon className="h-4 w-4 text-[#ff3800]" />

                            <span>
                              DOB:{" "}
                              {format(
                                new Date(result.dateOfBirth),
                                "PPP"
                              )}
                            </span>
                          </div>
                        </div>

                        {/* RIGHT */}

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-gray-300">
                            <CalendarIcon className="h-4 w-4 text-[#ff3800]" />

                            <span>
                              Issue Date:{" "}
                              {format(
                                new Date(result.issueDate),
                                "PPP"
                              )}
                            </span>
                          </div>

                          <div className="flex items-start gap-2 text-sm text-slate-700 dark:text-gray-300">
                            <MapPin className="h-4 w-4 text-[#ff3800] mt-0.5 shrink-0" />

                            <span>
                              {result.address}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter
                      className="
                        border-t
                        border-slate-100
                        dark:border-[#ff3800]/10
                        pt-3
                      "
                    >
                      <Button
                        variant="ghost"
                        className="
                          w-full
                          text-[#ff3800]
                          hover:bg-[#ff3800]/10
                          rounded-xl
                        "
                      >
                        View PAN Details

                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}