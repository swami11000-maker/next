"use client";

import * as React from "react";
import { ArrowUpRight, Wallet, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

interface PaymentModalProps {
  onClose: () => void;
}

export function PaymentModal({ onClose }: PaymentModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [amount, setAmount] = React.useState("");

  const quickAmounts = [500, 1000, 2000, 5000];
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");


  const handleActivate = async () => {
    if (!amount || Number(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await apiFetch("/api/payment/addmoney", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Number(amount),
        }),
      });

      const result = await response.json();


      if (!response.ok) {
        throw new Error(result.message || "Failed to initiate payment");
      }

      // ✅ Prefer hosted payment page, fallback to paytm/upi deep link
      const redirectUrl =
        result.payment_url || result.paytm_link || result.bhim_link;

      if (!redirectUrl) {
        throw new Error("Payment URL not received");
      }

      // ✅ Redirect in the SAME tab
      window.location.href = redirectUrl;
    } catch (err) {
      console.error("Payment error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-md"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative my-auto w-full max-w-[430px] overflow-hidden rounded-3xl border border-white/[0.08] bg-[#111111] shadow-[0_30px_100px_rgba(0,0,0,0.6)]">
        {/* Orange glow */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[#ff3800]/10 blur-3xl" />

        <div className="relative p-6 sm:p-7">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ff3800]/10">
                <Wallet className="h-5 w-5 text-[#ff3800]" />
              </div>

              <h2 className="text-xl font-bold tracking-tight text-white">
                Add money to wallet
              </h2>

              <p className="mt-1.5 text-sm leading-5 text-zinc-500">
                Enter the amount you'd like to add to your wallet.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Amount */}
          <div className="mt-7">
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-500">
              Amount
            </label>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-semibold text-zinc-500">
                ₹
              </span>

              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                min="1"
                step="1"
                autoFocus
                className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] py-4 pl-10 pr-4 text-2xl font-bold text-white outline-none transition-all placeholder:text-zinc-700 focus:border-[#ff3800]/50 focus:bg-white/[0.06] focus:ring-4 focus:ring-[#ff3800]/10"
              />
            </div>
          </div>

          {/* Quick amounts */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            {quickAmounts.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setAmount(String(value))}
                className={`rounded-xl border py-2 text-xs font-semibold transition-all ${
                  amount === String(value)
                    ? "border-[#ff3800]/40 bg-[#ff3800]/10 text-[#ff5a2f]"
                    : "border-white/[0.07] bg-white/[0.03] text-zinc-400 hover:border-white/[0.15] hover:text-white"
                }`}
              >
                ₹{value.toLocaleString("en-IN")}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 rounded-xl border border-red-500/10 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="mt-7 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] py-3 text-sm font-semibold text-zinc-300 transition-all hover:bg-white/[0.07] hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleActivate}
              disabled={loading}
              className="group flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#ff3800] py-3 text-sm font-semibold text-white shadow-lg shadow-[#ff3800]/20 transition-all hover:bg-[#ff4a19] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                "Redirecting..."
              ) : (
                <>
                  Continue
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </div>

          <p className="mt-4 text-center text-[10px] text-zinc-600">
            Secure payment • Your wallet will be updated after confirmation
          </p>
        </div>
      </div>
    </div>
  );
}