"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { CreditCard, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SelfActivationPage() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleActivate = async () => {
    setIsLoading(true);
    setError(null);

    // Open a new tab synchronously to preserve the user activation
    const paymentWindow = window.open("", "_blank");

    try {
      const response = await fetch("/api/auth/self-activation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (!result.paytm_link) {
        paymentWindow?.close();
        throw new Error("Payment URL not received");
      }

      // Redirect immediately – no artificial delay
      if (paymentWindow) {
        paymentWindow.location.href = result.paytm_link;
      } else {
        // Popup blocked – fallback to current tab
        window.location.href = result.paytm_link;
      }
    } catch (err) {
      console.error("Self activation error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Card className="border-0 shadow-xl rounded-3xl dark:bg-black/60 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ff3800]/10">
              <CreditCard className="h-7 w-7 text-[#ff3800]" />
            </div>
            <CardTitle className="text-3xl font-bold text-slate-900 dark:text-white">Activate Account</CardTitle>
            <CardDescription className="text-slate-500 dark:text-gray-400">Pay the activation fee to unlock all features 123</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-6">
              <div className="rounded-xl bg-slate-50 dark:bg-slate-900 p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-gray-400">Activation Fee</span>
                  <span className="font-semibold text-slate-900 dark:text-white">₹5</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-gray-400">Status</span>
                  <span className="font-semibold text-amber-600">Unpaid</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-gray-400">Payment Type</span>
                  <span className="font-semibold text-slate-900 dark:text-white">One-time</span>
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="border-red-300 dark:border-red-500/50 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 rounded-xl">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleActivate}
                disabled={isLoading}
                className="w-full h-12 bg-[#ff3800] hover:bg-[#ff3800]/90 text-white rounded-xl shadow-lg shadow-[#ff3800]/20 hover:shadow-[#ff3800]/30 transition-all duration-300 group"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Pay ₹5 & Activate
                    <CreditCard className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-slate-400">Secure payment powered by payment gateway</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
