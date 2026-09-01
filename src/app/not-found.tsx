"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/auth/login");
    }, 200); // 0.2 seconds redirect

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3 }}
        className="text-center"
      >
        {/* Icon */}
        <motion.div
          animate={{ rotate: [0, -5, 5, -5, 0] }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-20 h-20 bg-[#FF5A1F]/10 border border-[#FF5A1F]/20 rounded-2xl flex items-center justify-center mx-auto mb-8"
        >
          <AlertTriangle size={40} className="text-[#FF5A1F]" />
        </motion.div>

        {/* 404 Code */}
        <h1 className="text-7xl md:text-9xl font-bold text-white tracking-tighter">
          4<span className="text-[#FF5A1F]">0</span>4
        </h1>

        {/* Message */}
        <p className="mt-4 text-xl text-white/50">
          Page not found
        </p>
        <p className="mt-2 text-sm text-white/30">
          Redirecting to login...
        </p>

        {/* Progress Bar */}
        <div className="mt-8 w-48 h-1 bg-white/10 rounded-full mx-auto overflow-hidden">
          <motion.div
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 0.2, ease: "linear" }}
            className="h-full bg-[#FF5A1F] rounded-full"
          />
        </div>

        {/* Manual Fallback */}
        <p className="mt-6 text-xs text-white/20">
          Not redirected?{" "}
          <a
            href="/auth/login"
            className="text-[#FF5A1F] hover:underline"
          >
            Click here
          </a>
        </p>
      </motion.div>
    </div>
  );
}