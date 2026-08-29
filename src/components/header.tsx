"use client";
import { useDataProvider } from "@/hooks/useDataProvider";
import { Wallet, User } from "lucide-react";

const Header = () => {
  const { retailer } = useDataProvider();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="flex items-center justify-between h-20">
        {/* Logo Section - Enhanced */}
        <div className="flex items-center space-x-3 group cursor-pointer">
          <div className="relative">
            <div className="w-10 h-10 bg-[#ff3800] rounded-xl flex items-center justify-center transform group-hover:scale-110 transition-all duration-300 shadow-lg shadow-[#ff3800]/30">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-black animate-pulse"></div>
          </div>
          <div>
            <span className="text-white font-bold text-2xl tracking-tight">
              <span className="text-[#ff3800]">Wallet</span>
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-all cursor-pointer group border border-transparent hover:border-[#ff3800]/30">
            <div className="relative">
              <div className="w-9 h-9 bg-gradient-to-br from-[#ff3800] to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-[#ff3800]/20">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-black"></div>
            </div>
            <div className="hidden sm:block">
              <p className="text-gray-400 text-xs">{retailer?.name}</p>
            </div>
          </div>

          {/* Modern Wallet Card */}
          <div className="relative">
            {/* Animated shimmer effect */}
            <div className="absolute inset-0 w-3/4 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>

            <div className="flex items-center space-x-3 relative">
              <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="text-white/70 text-xs font-medium">Total Balance</p>
                <div className="flex items-center space-x-2">
                  <p className="font-bold text-lg bg-black rounded-4xl text-shadow-red-600 px-4 py-1 text-white">{retailer?.balance}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
