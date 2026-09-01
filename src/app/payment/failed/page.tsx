"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { AlertCircle, RefreshCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default function PaymentFailedPage() {
  const [reason, setReason] = React.useState<string>("");
  const [orderId, setOrderId] = React.useState<string>("");

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setReason(params.get("reason") || "unknown_error");
    setOrderId(params.get("order_id") || "");
  }, []);

  const reasonLabels: Record<string, string> = {
    missing_order_id: "Missing order information",
    transaction_not_found: "Transaction not found",
    payment_failed: "Payment was not completed",
    server_error: "Server error occurred",
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full">
        <Card className="border-0 shadow-2xl rounded-3xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-red-500 to-rose-600" />
          <CardContent className="p-8 text-center space-y-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="mx-auto w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center"
            >
              <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
            </motion.div>

            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Payment Failed</h1>
              <p className="text-sm text-zinc-500 dark:text-gray-400 mt-1">
                {reasonLabels[reason] || "Something went wrong during payment."}
              </p>
            </div>

            {orderId && (
              <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900 p-4 text-left space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Order ID</span>
                  <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">{orderId}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Status</span>
                  <span className="font-semibold text-red-600">Failed</span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Link href="/retailer" className="flex-1">
                <Button variant="outline" className="w-full rounded-xl border-black text-black hover:bg-gray-100">
                  <Home className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <Link href="/retailer" className="flex-1">
                <Button className="w-full rounded-xl bg-[#ff3800] text-white hover:bg-[#ff3800]/90">
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
