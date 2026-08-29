"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";

import { Loader2, UserPlus, User, Mail, Phone, Lock, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Enter a valid email address" }),
  mobile: z
    .string()
    .min(10, { message: "Mobile number must be 10 digits" })
    .max(10, { message: "Mobile number must be 10 digits" })
    .regex(/^\d{10}$/, { message: "Enter a valid 10-digit mobile number" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

type FormValues = z.infer<typeof formSchema>;

export default function SignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", email: "", mobile: "", password: "" },
  });

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Signup failed. Please try again.");
      }

      // Redirect to login or dashboard
      router.push("/login?registered=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
        <Card className="border-0 shadow-xl rounded-3xl dark:bg-black/60 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ff3800]/10">
              <UserPlus className="h-7 w-7 text-[#ff3800]" />
            </div>
            <CardTitle className="text-3xl font-bold text-slate-900 dark:text-white">Create Account</CardTitle>
            <CardDescription className="text-slate-500 dark:text-gray-400">Sign up to get started</CardDescription>
          </CardHeader>

          <CardContent>
            <Form {...(form as any)}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {/* Name */}
                <FormField
                  control={form.control as any}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 dark:text-gray-300">Full Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter your full name"
                          className="h-12 bg-white dark:bg-white/5 border-slate-200 dark:border-[#ff3800]/20 focus:border-[#ff3800] focus:ring-[#ff3800]/20 rounded-xl"
                        />
                      </FormControl>
                      <FormMessage className="text-[#ff3800]" />
                    </FormItem>
                  )}
                />

                {/* Email */}
                <FormField
                  control={form.control as any}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 dark:text-gray-300">Email Address</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="Enter your email"
                          className="h-12 bg-white dark:bg-white/5 border-slate-200 dark:border-[#ff3800]/20 focus:border-[#ff3800] focus:ring-[#ff3800]/20 rounded-xl"
                        />
                      </FormControl>
                      <FormMessage className="text-[#ff3800]" />
                    </FormItem>
                  )}
                />

                {/* Mobile */}
                <FormField
                  control={form.control as any}
                  name="mobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 dark:text-gray-300">Mobile Number</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="tel"
                          maxLength={10}
                          placeholder="Enter 10-digit mobile"
                          className="h-12 bg-white dark:bg-white/5 border-slate-200 dark:border-[#ff3800]/20 focus:border-[#ff3800] focus:ring-[#ff3800]/20 rounded-xl"
                        />
                      </FormControl>
                      <FormMessage className="text-[#ff3800]" />
                    </FormItem>
                  )}
                />

                {/* Password */}
                <FormField
                  control={form.control as any}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 dark:text-gray-300">Password</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder="Create a password (min 6 chars)"
                          className="h-12 bg-white dark:bg-white/5 border-slate-200 dark:border-[#ff3800]/20 focus:border-[#ff3800] focus:ring-[#ff3800]/20 rounded-xl"
                        />
                      </FormControl>
                      <FormMessage className="text-[#ff3800]" />
                    </FormItem>
                  )}
                />

                {error && (
                  <Alert variant="destructive" className="border-red-300 dark:border-red-500/50 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 rounded-xl">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-[#ff3800] hover:bg-[#ff3800]/90 text-white rounded-xl shadow-lg shadow-[#ff3800]/20 hover:shadow-[#ff3800]/30 transition-all duration-300 group"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Sign Up
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>

          <CardFooter className="text-center">
            <p className="text-sm text-slate-500 dark:text-gray-400 w-full">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-[#ff3800] hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
