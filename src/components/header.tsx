"use client";

import { useDataProvider } from "@/hooks/useDataProvider";
import { Wallet, User, Plus, Bell, Menu, X, LogOut, Settings, LayoutDashboard } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { PaymentModal } from "./ui/PaymentModal";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const Header = () => {
  const { retailer, logout } = useDataProvider();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-gradient-to-br from-black to-gray-700 backdrop-blur-xl border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-[72px] items-center justify-between">
            {/* Logo */}
            <Link
              href="/retailer/dashboard"
              className="flex items-center gap-3 group"
            >
              <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ff3800] shadow-[0_8px_30px_rgba(255,56,0,0.25)] transition-transform group-hover:scale-105">
                <Wallet
                  className="h-5 w-5 text-white"
                  strokeWidth={2.5}
                />
                <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-zinc-950 bg-emerald-400" />
              </div>
              <div className="leading-none">
                <p className="text-xl font-bold tracking-tight text-white">Wallet</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-zinc-500">Retailer</p>
              </div>
            </Link>

            {/* Right section */}
            <div className="flex items-center gap-2 sm:gap-4">
              

              {/* Add Money */}
              <button
                onClick={() => setShowPaymentModal(true)}
                className="group flex items-center gap-2 rounded-xl bg-[#ff3800] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_25px_rgba(255,56,0,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#ff4a19] hover:shadow-[0_12px_30px_rgba(255,56,0,0.3)] active:translate-y-0"
              >
                <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
                <span className="hidden sm:inline">Add Money</span>
              </button>

              {/* Notifications */}
              <button className="relative p-2 rounded-xl hover:bg-white/[0.06] transition-colors">
                <Bell className="h-5 w-5 text-zinc-400" />
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">3</span>
              </button>

              {/* Profile Dropdown */}
              <div
                className="relative"
                ref={profileRef}
              >
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-3 border-l border-white/[0.08] pl-3 sm:pl-4"
                >
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
                </button>

                <AnimatePresence>
                  {showProfileMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-48 rounded-xl border border-white/[0.08] bg-zinc-900/95 backdrop-blur-xl shadow-2xl overflow-hidden"
                    >
                      <div className="p-2">
                        <Link
                          href="/retailer/profile"
                          className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-white/[0.06] rounded-lg transition-colors"
                          onClick={() => setShowProfileMenu(false)}
                        >
                          <User className="h-4 w-4" />
                          Profile
                        </Link>
                        <div className="h-px bg-white/[0.06] my-1" />
                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            if (logout) logout();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <LogOut className="h-4 w-4" />
                          Logout
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Mobile menu toggle */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 rounded-xl hover:bg-white/[0.06] transition-colors md:hidden"
              >
                {showMobileMenu ? <X className="h-5 w-5 text-white" /> : <Menu className="h-5 w-5 text-white" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {showMobileMenu && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-white/[0.06] bg-zinc-900/95 backdrop-blur-xl overflow-hidden"
            >
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Available Balance</span>
                  <span className="text-sm font-semibold text-white">₹{Number(retailer?.balance || 0).toLocaleString("en-IN")}</span>
                </div>
                <Link
                  href="/retailer/profile"
                  className="flex items-center gap-2 text-sm text-zinc-300 hover:text-white transition-colors"
                  onClick={() => setShowMobileMenu(false)}
                >
                  <User className="h-4 w-4" /> Profile
                </Link>
                <Link
                  href="/retailer/settings"
                  className="flex items-center gap-2 text-sm text-zinc-300 hover:text-white transition-colors"
                  onClick={() => setShowMobileMenu(false)}
                >
                  <Settings className="h-4 w-4" /> Settings
                </Link>
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    if (logout) logout();
                  }}
                  className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors"
                >
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {showPaymentModal && <PaymentModal onClose={() => setShowPaymentModal(false)} />}
    </>
  );
};

export default Header;
