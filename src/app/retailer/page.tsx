"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { LayoutDashboard, Wind, Bike, Car, FileText, ClipboardList, Stethoscope, Search, Vote, Smartphone, LucideWorkflow, LucideCoins, TractorIcon, Activity, Wallet, CheckCircle2, Clock, ArrowUpRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useDataProvider } from "@/hooks/useDataProvider";
import { isServiceEnabled } from "@/lib/retailer-helpers";
import { useSearchParams } from "next/navigation";
import { serviceGroups } from "@/lib/data-events";




export default function RetailerDashboard() {
  const { retailer } = useDataProvider();
  const [hoveredCard, setHoveredCard] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");


  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 90, damping: 15 } as const },
  };

  const totalServices = serviceGroups.reduce((acc, group) => acc + group.items.length, 0);
  const enabledServices = serviceGroups.reduce((acc, group) => acc + group.items.filter((item) => isServiceEnabled(retailer, item.flag)).length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-gray-700 text-white overflow-hidden relative font-sans selection:bg-orange-600/30 rounded-4xl" >
      {/* Modern Background Atmospheric Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-600/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[30rem] h-[30rem] bg-indigo-600/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] bg-orange-900/5 rounded-full blur-[128px] pointer-events-none" />

      <div className="relative z-10 space-y-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        {/* Header Section */}
        <div className="flex flex-col gap-2 mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
            Dashboard <Sparkles className="h-6 w-6 text-orange-500" />
          </h1>
          <p className="text-zinc-400">Manage your services, track requests, and view history.</p>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>


        {/* Service Sections Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          {serviceGroups.map((group, groupIndex) => (
            <motion.div
              key={group.title}
              variants={itemVariants}
              className="group relative rounded-3xl overflow-hidden border border-white/5 bg-zinc-950/50 backdrop-blur-xl transition-all duration-500 hover:border-orange-600/30 hover:shadow-[0_8px_30px_rgba(234,88,12,0.1)] hover:-translate-y-1"
            >
              {/* Top Accent Line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-600/0 via-orange-600 to-orange-600/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="p-7">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3.5 rounded-2xl bg-zinc-900 border border-white/5 group-hover:bg-orange-600/10 group-hover:border-orange-600/30 transition-colors duration-500">
                    <group.icon className="h-6 w-6 text-zinc-400 group-hover:text-orange-500 transition-colors duration-500" />
                  </div>
                  <h2 className="text-lg font-bold text-white tracking-wide">{group.title}</h2>
                </div>

                <div className="space-y-4">
                  {group.items.map((item, itemIndex) => {
                    const enabled = isServiceEnabled(retailer, item.flag);
                    const isHovered = hoveredCard === `${groupIndex}-${itemIndex}`;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                      >
                        <div
                          className={`relative flex my-1 items-center gap-4 p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${isHovered ? "border-orange-600/50 bg-orange-600/[0.03] shadow-[0_0_20px_rgba(234,88,12,0.1)] scale-[1.02]" : "border-white/5 bg-zinc-900/50 hover:bg-zinc-900"} ${!enabled ? "opacity-60 grayscale-[50%]" : ""}`}
                          onMouseEnter={() => setHoveredCard(`${groupIndex}-${itemIndex}`)}
                          onMouseLeave={() => setHoveredCard(null)}
                        >
                          <div className={`p-2.5 rounded-xl transition-colors duration-300 ${isHovered ? "bg-orange-600" : "bg-zinc-800"}`}>
                            <item.icon className={`h-5 w-5 ${isHovered ? "text-white" : "text-zinc-400"}`} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold transition-colors duration-300 ${isHovered ? "text-orange-500" : "text-zinc-200"}`}>{item.title}</p>
                            <p className="text-xs text-zinc-500 mt-0.5 truncate">{item.description}</p>
                          </div>

                          <Badge className={`shrink-0 border ${enabled ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>{enabled ? "Active" : "Locked"}</Badge>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ))}

        </motion.div>
      </div>
    </div>
  );
}
