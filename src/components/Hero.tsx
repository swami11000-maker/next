"use client";

import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";

export default function Hero() {
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center pt-20 overflow-hidden bg-grid"
    >
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#FF5A1F]/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#FF5A1F]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 w-full relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8"
            >
              <span className="w-2 h-2 rounded-full bg-[#FF5A1F] animate-pulse" />
              <span className="text-sm text-white/70">Fintech Services Provider</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight"
            >
              Get Your{" "}
              <span className="text-[#FF5A1F]">PAN Card</span>
              <br />
              Within <span className="text-white">2 Hours</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="mt-6 text-lg text-white/50 max-w-lg leading-relaxed"
            >
              Authorized PAN Card services across India. NSDL & UTI e-KYC, 
              paperless applications, corrections, and instant mobile recharges — 
              all in one platform.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="mt-10 flex flex-wrap gap-4"
            >
              <a
                href="#services"
                className="group px-8 py-4 bg-[#FF5A1F] text-white font-semibold rounded-full hover:bg-[#e54d18] transition-all duration-300 flex items-center gap-2 hover:shadow-xl hover:shadow-orange-500/25"
              >
                Explore Services
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </a>
              <a
                href="#about"
                className="px-8 py-4 bg-white/5 border border-white/10 text-white font-semibold rounded-full hover:bg-white/10 transition-all duration-300 flex items-center gap-2"
              >
                <Play size={18} className="text-[#FF5A1F]" />
                Learn More
              </a>
            </motion.div>

            {/* Trust Badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.5 }}
              className="mt-12 flex items-center gap-8"
            >
              <div>
                <p className="text-2xl font-bold text-white">50K+</p>
                <p className="text-sm text-white/40">PAN Cards Issued</p>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div>
                <p className="text-2xl font-bold text-white">99.9%</p>
                <p className="text-sm text-white/40">Success Rate</p>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div>
                <p className="text-2xl font-bold text-white">2Hr</p>
                <p className="text-sm text-white/40">Delivery Time</p>
              </div>
            </motion.div>
          </div>

          {/* Right Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            <div className="relative w-full aspect-square max-w-lg mx-auto">
              {/* Main Card */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#111111] to-[#1a1a1a] rounded-3xl border border-white/10 p-8 flex flex-col justify-between shadow-2xl">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 bg-[#FF5A1F]/20 rounded-xl flex items-center justify-center">
                    <span className="text-[#FF5A1F] font-bold text-xl">P</span>
                  </div>
                  <span className="text-xs text-white/30 font-mono">NSDL AUTHORIZED</span>
                </div>
                
                <div>
                  <p className="text-white/40 text-sm mb-1">PAN Number</p>
                  <p className="text-2xl font-mono text-white tracking-widest">ABCDE****F</p>
                </div>

                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-white/40 text-sm mb-1">Holder Name</p>
                    <p className="text-white font-medium">Rahul Sharma</p>
                  </div>
                  <div className="w-16 h-16 bg-gradient-to-br from-[#FF5A1F] to-orange-400 rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold">GOVT</span>
                  </div>
                </div>
              </div>

              {/* Floating Badge 1 */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-6 -right-6 bg-[#111111] border border-white/10 rounded-2xl p-4 shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">Verified</p>
                    <p className="text-white/40 text-xs">e-KYC Complete</p>
                  </div>
                </div>
              </motion.div>

              {/* Floating Badge 2 */}
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="absolute -bottom-4 -left-4 bg-[#111111] border border-white/10 rounded-2xl p-4 shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#FF5A1F]/20 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#FF5A1F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">2 Hours</p>
                    <p className="text-white/40 text-xs">Fast Delivery</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}