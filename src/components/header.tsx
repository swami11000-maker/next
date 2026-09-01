"use client";

import { callCheckOrderStatus } from "@/app/api/payment/addmoney/route";
import { useDataProvider } from "@/hooks/useDataProvider";
import { Wallet, User, Plus, X, ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { PaymentModal } from "./ui/PaymentModal";

const Header = () => {
  const { retailer } = useDataProvider();
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  return (
    <>
      <header className="relative z-20 w-full">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-[76px] items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ff3800] shadow-[0_8px_30px_rgba(255,56,0,0.25)]">
                <Wallet className="h-5 w-5 text-white" strokeWidth={2.5} />

                <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-zinc-950 bg-emerald-400" />
              </div>

              <div className="leading-none">
                <p className="text-xl font-bold tracking-tight text-white">Wallet</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-zinc-500">Retailer</p>
              </div>
            </div>

            {/* Right section */}
            <div className="flex items-center gap-3 sm:gap-5">
              {/* Wallet Balance */}
              <div className="hidden items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 backdrop-blur-xl sm:flex">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ff3800]/10">
                  <Wallet className="h-4 w-4 text-[#ff3800]" />
                </div>

                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Available Balance</p>

                  <p className="mt-0.5 text-sm font-bold text-white">₹{Number(retailer?.balance || 0).toLocaleString("en-IN")}</p>
                </div>
              </div>

              {/* Add Money */}
              <button
                onClick={() => setShowPaymentModal(true)}
                className="group flex items-center gap-2 rounded-xl bg-[#ff3800] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_25px_rgba(255,56,0,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#ff4a19] hover:shadow-[0_12px_30px_rgba(255,56,0,0.3)] active:translate-y-0"
              >
                <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
                <span className="hidden sm:inline">Add Money</span>
              </button>

              {/* Profile */}
              <div className="flex items-center gap-3 border-l border-white/[0.08] pl-3 sm:pl-5">
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 ring-1 ring-white/10">
                    <User className="h-4 w-4 text-zinc-300" />
                  </div>

                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-zinc-950 bg-emerald-400" />
                </div>

                <div className="hidden max-w-[130px] md:block">
                  <p className="truncate text-sm font-semibold text-white">{retailer?.name || "Retailer"}</p>
                  <p className="text-[11px] text-zinc-500">Account active</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      </header>

      {showPaymentModal && <PaymentModal onClose={() => setShowPaymentModal(false)} />}
    </>
  );
};



export default Header;
