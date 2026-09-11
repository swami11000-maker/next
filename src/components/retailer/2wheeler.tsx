"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";

import { ArrowRight, Car, Loader2, Phone, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

import { Input } from "@/components/ui/input";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useDataProvider } from "@/hooks/useDataProvider";

import { ServiceChargeCard } from "../ui/service-charge-card";
import { toast } from "../ui/toast";
import { ImageUpload } from "../ui/imageupload";
import { emitRetailerDataChanged } from "@/lib/data-events";
import { apiFetch } from "@/lib/api-client";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result as string);
    };

    reader.onerror = () => {
      reject(new Error("Unable to read image file"));
    };

    reader.readAsDataURL(file);
  });
}
const MAX_FILE_SIZE = 2 * 1024 * 1024;

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const formSchema = z.object({
  mobileNumber: z
    .string()
    .length(10, {
      message: "Mobile number must be exactly 10 digits",
    })
    .regex(/^[6-9]\d{9}$/, {
      message: "Enter a valid 10 digit mobile number",
    }),

  vehicleNumber: z
    .string()
    .min(4, {
      message: "Vehicle number is required",
    })
    .max(15, {
      message: "Invalid vehicle number",
    })
    .regex(/^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{1,4}$/, {
      message: "Example: PB10AB1234",
    }),

  frontSidePhoto: z
    .instanceof(File, {
      message: "Front side photo is required",
    })
    .refine((file) => file.size <= MAX_FILE_SIZE, "Front side photo must be less than 2 MB")
    .refine((file) => ACCEPTED_IMAGE_TYPES.includes(file.type), "Only JPG, JPEG, PNG or WEBP images are allowed"),

  backSidePhoto: z
    .instanceof(File, {
      message: "Back side photo is required",
    })
    .refine((file) => file.size <= MAX_FILE_SIZE, "Back side photo must be less than 2 MB")
    .refine((file) => ACCEPTED_IMAGE_TYPES.includes(file.type), "Only JPG, JPEG, PNG or WEBP images are allowed"),
});

type FormValues = z.infer<typeof formSchema>;

export default function VehicleDocumentUpload() {
  const [isLoading, setIsLoading] = React.useState(false);

  const { retailer } = useDataProvider();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),

    defaultValues: {
      mobileNumber: "",
      vehicleNumber: "",
      frontSidePhoto: undefined,
      backSidePhoto: undefined,
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    const loadingToastId = toast.loading("Uploading documents...", {
      description: "Please wait while we process your vehicle request.",
    });

    try {
      const [frontside, backside] = await Promise.all([fileToBase64(data.frontSidePhoto), fileToBase64(data.backSidePhoto)]);

      const response = await apiFetch("/api/2wheeler", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          vehicle_no: data.vehicleNumber,
          mobile_no: data.mobileNumber,
          frontside,
          backside,
          fees: retailer?.["2wheeler_fee"] || 70,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.dismiss(loadingToastId);

        toast.error("Request failed", {
          description: result?.message || result?.error || "Unable to complete the request.",
        });

        return;
      }

      toast.dismiss(loadingToastId);

      toast.success("Request submitted successfully!", {
        description: result?.message || "Your vehicle documents have been uploaded successfully.",
        duration: 5000,
      });

      emitRetailerDataChanged();

      form.reset({
        mobileNumber: "",
        vehicleNumber: "",
        frontSidePhoto: undefined,
        backSidePhoto: undefined,
      });
    } catch (error) {
      toast.dismiss(loadingToastId);

      toast.error("Something went wrong", {
        description: error instanceof Error ? error.message : "Unable to complete the request. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    if (isLoading) return;

    form.reset({
      mobileNumber: "",
      vehicleNumber: "",
      frontSidePhoto: undefined,
      backSidePhoto: undefined,
    });

    toast.info("Form cleared", {
      description: "All entered vehicle information has been removed.",
    });
  };

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-4xl">
        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="mb-8 text-center sm:mb-10"
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ff3800]/10 ring-1 ring-[#ff3800]/10">
            <Car className="h-7 w-7 text-[#ff3800]" />
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl lg:text-5xl">
            Vehicle <span className="text-[#ff3800]">2 Wheeler</span>
          </h1>

          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500 dark:text-gray-400 sm:text-base">Upload your vehicle 2 Wheeler photos and submit your request</p>
        </motion.div>

        <motion.div
          initial={{
            opacity: 0,
            y: 25,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.1,
          }}
        >
          <Card className="border-slate-200 bg-white/80 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]">
            <CardHeader className="px-4 pb-6 sm:px-6">
              <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-white sm:text-xl">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ff3800]/10">
                    <Car className="h-5 w-5 text-[#ff3800]" />
                  </span>

                  <span>Enter Vehicle Details</span>
                </CardTitle>

                <ServiceChargeCard charge={retailer?.["2wheeler_fee"] ?? 0} serviceName="2 Wheeler" className="w-full sm:w-auto sm:max-w-none" />
              </div>
            </CardHeader>

            <CardContent className="px-4 sm:px-6">
              <Form {...(form as any)}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 sm:space-y-7">
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <FormField
                      control={form.control as any}
                      name="mobileNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-slate-700 dark:text-gray-300">
                            <Phone className="h-4 w-4 text-[#ff3800]" />

                            <span>Mobile Number</span>

                            <span className="text-xs font-normal text-slate-400">10 digits</span>

                            <span className="text-[#ff3800]">*</span>
                          </FormLabel>

                          <FormControl>
                            <Input
                              {...field}
                              type="tel"
                              inputMode="numeric"
                              maxLength={10}
                              placeholder="Enter 10 digit mobile number"
                              className="h-12 rounded-xl border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#ff3800] focus:ring-[#ff3800]/20 dark:border-[#ff3800]/20 dark:bg-white/5 dark:text-white dark:placeholder:text-gray-500"
                              onChange={(event) => {
                                const value = event.target.value.replace(/\D/g, "").slice(0, 10);

                                field.onChange(value);
                              }}
                            />
                          </FormControl>

                          <FormMessage className="text-[#ff3800]" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control as any}
                      name="vehicleNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-slate-700 dark:text-gray-300">
                            <Car className="h-4 w-4 text-[#ff3800]" />

                            <span>Vehicle Number</span>

                            <span className="text-[#ff3800]">*</span>
                          </FormLabel>

                          <FormControl>
                            <Input
                              {...field}
                              type="text"
                              maxLength={15}
                              autoComplete="off"
                              placeholder="Example: PB10AB1234"
                              className="h-12 rounded-xl border-slate-200 bg-white uppercase text-slate-900 placeholder:text-slate-400 focus:border-[#ff3800] focus:ring-[#ff3800]/20 dark:border-[#ff3800]/20 dark:bg-white/5 dark:text-white dark:placeholder:text-gray-500"
                              onChange={(event) => {
                                const value = event.target.value
                                  .toUpperCase()
                                  .replace(/[^A-Z0-9]/g, "")
                                  .slice(0, 15);

                                field.onChange(value);
                              }}
                            />
                          </FormControl>

                          <p className="text-xs text-slate-400 dark:text-gray-500">Example: PB10AB1234</p>

                          <FormMessage className="text-[#ff3800]" />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <FormField
                      control={form.control as any}
                      name="frontSidePhoto"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <FormControl>
                            <ImageUpload label="Front Side Photo" value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control as any}
                      name="backSidePhoto"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <FormControl>
                            <ImageUpload label="Back Side Photo" value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 dark:border-white/10 sm:flex-row">
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="group h-12 w-full cursor-pointer flex-1 rounded-xl bg-[#ff3800] font-semibold text-white shadow-lg shadow-[#ff3800]/20 transition-all duration-300 hover:bg-[#ff3800]/90 hover:shadow-[#ff3800]/30 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" />
                          Submit Request
                          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleReset}
                      disabled={isLoading}
                      className="h-12 w-full rounded-xl border-slate-200 px-6 font-medium text-slate-700 transition-all hover:border-[#ff3800]/30 hover:bg-[#ff3800]/5 dark:border-[#ff3800]/20 dark:text-gray-300 dark:hover:bg-[#ff3800]/5 sm:w-auto"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Clear
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
