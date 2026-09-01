"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Wind,
  Bike,
  Car,
  FileText,
  ClipboardList,
  Stethoscope,
  Search,
  Vote,
  Smartphone,
  LucideWorkflow,
  LucideCoins,
  TractorIcon,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDataProvider } from "@/hooks/useDataProvider";
import { isServiceEnabled } from "@/lib/retailer-helpers";
import { useSearchParams } from "next/navigation";

const serviceGroups = [
  {
    title: "E-SHARM CARD",
    icon: Wind,
    color: "from-orange-500 to-red-500",
    items: [
      { title: "E-Shram PDF DownLoad", href: "/retailer/e-sharam/e-sharm-pdf", icon: Bike, description: "Download E-Shram card PDF", flag: "esharm_pdf" as const },
      { title: "E-Shram Mobile Update", href: "/retailer/e-sharam/e-sharm-mob-update", icon: Car, description: "Update mobile number in E-Shram", flag: "esharm_mob_update" as const },
    ],
  },
  {
    title: "POLLUTION",
    icon: Wind,
    color: "from-green-500 to-emerald-500",
    items: [
      { title: "2 Wheeler PUC", href: "/retailer/pollution/2wheeler", icon: Bike, description: "Generate 2-wheeler pollution certificate", flag: "2wheeler_puc" as const },
      { title: "4 Wheeler PUC", href: "/retailer/pollution/4wheeler", icon: Car, description: "Generate 4-wheeler pollution certificate", flag: "4wheeler_puc" as const },
    ],
  },
  {
    title: "FARMER SERVICE",
    icon: TractorIcon,
    color: "from-yellow-500 to-orange-500",
    items: [
      { title: "Farmer Card PDF", href: "/retailer/farmer-service/farmer-card", icon: FileText, description: "Download farmer card PDF", flag: "agri_pdf" as const },
    ],
  },
  {
    title: "LL EXAM REQUEST",
    icon: ClipboardList,
    color: "from-blue-500 to-cyan-500",
    items: [
      { title: "LL Exam Request", href: "/retailer/ll-exam-request", icon: ClipboardList, description: "Submit learning licence exam request", flag: "ll_exam" as const },
    ],
  },
  {
    title: "LEARNING EXAM MEDICAL",
    icon: Stethoscope,
    color: "from-pink-500 to-rose-500",
    items: [
      { title: "Learning Exam Medical", href: "/retailer/learning-exam-medical", icon: Stethoscope, description: "Submit learning exam medical form", flag: "ll_medical" as const },
    ],
  },
  {
    title: "PAN SERVICE",
    icon: FileText,
    color: "from-indigo-500 to-purple-500",
    items: [
      { title: "PAN Find", href: "/retailer/pan-service/aadhar-to-pan", icon: Search, description: "Find PAN by Aadhaar", flag: "pan_find" as const },
      { title: "PAN Detail", href: "/retailer/pan-service/pan-detail", icon: FileText, description: "Get PAN details", flag: "pandetils" as const },
    ],
  },
  {
    title: "VOTER",
    icon: Vote,
    color: "from-teal-500 to-green-500",
    items: [
      { title: "Voter Mobile Link", href: "/retailer/voter_mobile_link", icon: Smartphone, description: "Link mobile to voter ID", flag: "voter_mobile_link" as const },
    ],
  },
  {
    title: "VEHICLE SERVICE",
    icon: Car,
    color: "from-slate-500 to-gray-500",
    items: [
      { title: "RC PDF", href: "/retailer/vehical-service/rc-pdf", icon: FileText, description: "Download RC PDF", flag: "rc_print" as const },
    ],
  },
  {
    title: "DRIVING LICENCE",
    icon: Car,
    color: "from-amber-500 to-yellow-500",
    items: [
      { title: "DL Print", href: "/retailer/driving-license/dl-print", icon: Search, description: "Print driving licence", flag: "dl_print" as const },
    ],
  },
];

const historyItems = [
  { title: "Work History", href: "/retailer/history", icon: LucideWorkflow, description: "View all service requests" },
  { title: "Payment History", href: "/retailer/transitions", icon: LucideCoins, description: "View transaction history" },
];

export default function RetailerDashboard() {
  const { retailer } = useDataProvider();
  const [hoveredCard, setHoveredCard] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const searchParams = useSearchParams();
const orderId = searchParams.get("order_id");
 React.useEffect(() => {
    if (!orderId) {
      return;
    }

    const checkPaymentStatus = async () => {
      try {
        const response = await fetch(`/api/payment/addmoney?order_id=${encodeURIComponent(orderId)}`, {
          method: "GET",
          cache: "no-store",
        });

        const result = await response.json();

        console.log("Payment Status Result:", result);

        if (!response.ok) {
          throw new Error(result.message || "Failed to check payment status");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to check payment status");
      }
    };
    checkPaymentStatus();
  }, [orderId]);
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-black via-black to-[#ff3800]/10 p-6 sm:p-8 border border-orange-900/20"
      >
        <div className="relative z-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Welcome back, <span className="text-[#ff3800]">{retailer?.name || "Retailer"}</span>
          </h1>
          <p className="mt-2 text-gray-400 text-lg">Manage all your services from one place</p>
          <div className="mt-4 flex items-center gap-4">
            <Badge className="bg-orange-600 text-white border-0 hover:bg-orange-700">
              Balance: ₹{Number(retailer?.balance || 0).toLocaleString("en-IN")}
            </Badge>
            <Badge variant="outline" className="border-orange-600 text-orange-400">
              {retailer?.status === "active" ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-[#ff3800]/10 to-transparent" />
      </motion.div>

      {/* Service Groups */}
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {serviceGroups.map((group, groupIndex) => (
          <motion.div key={group.title} variants={itemVariants} className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <div className={`p-2 rounded-xl bg-gradient-to-br ${group.color}`}>
                <group.icon className="h-4 w-4 text-white" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">{group.title}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
              {group.items.map((item, itemIndex) => {
                const enabled = isServiceEnabled(retailer, item.flag);
                return (
                  <Link key={item.href} href={item.href}>
                    <Card
                      className={`group relative overflow-hidden border-0 bg-white dark:bg-black/60 backdrop-blur-sm rounded-2xl transition-all duration-300 hover:shadow-xl hover:shadow-[#ff3800]/10 hover:-translate-y-1 cursor-pointer ${
                        hoveredCard === `${groupIndex}-${itemIndex}` ? "ring-2 ring-[#ff3800]/50" : ""
                      } ${!enabled ? "opacity-75" : ""}`}
                      onMouseEnter={() => setHoveredCard(`${groupIndex}-${itemIndex}`)}
                      onMouseLeave={() => setHoveredCard(null)}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${group.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className={`p-2.5 rounded-xl bg-gradient-to-br ${group.color} shadow-lg`}>
                            <item.icon className="h-5 w-5 text-white" />
                          </div>
                          <Badge className={`border-0 text-[10px] font-medium ${enabled ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                            {enabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                        <CardTitle className="text-base font-semibold text-slate-900 dark:text-white mt-3 group-hover:text-[#ff3800] transition-colors">
                          {item.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed">{item.description}</p>
                        <div className="mt-3 flex items-center text-xs font-medium text-[#ff3800] opacity-0 group-hover:opacity-100 transition-opacity">
                          <span>{enabled ? "Access Service" : "Contact Admin"}</span>
                          <svg className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        ))}

        {/* History Section */}
        <motion.div variants={itemVariants} className="md:col-span-2 xl:col-span-3">
          <div className="flex items-center gap-2 px-1 mb-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-slate-500 to-slate-700">
              <LucideWorkflow className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">History</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {historyItems.map((item, index) => (
              <Link key={item.href} href={item.href}>
                <Card
                  className={`group relative overflow-hidden border-0 bg-white dark:bg-black/60 backdrop-blur-sm rounded-2xl transition-all duration-300 hover:shadow-xl hover:shadow-slate-500/10 hover:-translate-y-1 cursor-pointer ${
                    hoveredCard === `history-${index}` ? "ring-2 ring-slate-400/50" : ""
                  }`}
                  onMouseEnter={() => setHoveredCard(`history-${index}`)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-500 to-slate-700 opacity-0 group-hover:opacity-5 transition-opacity duration-300" />
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 shadow-lg">
                        <item.icon className="h-5 w-5 text-white" />
                      </div>
                      <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-0 text-[10px] font-medium">
                        History
                      </Badge>
                    </div>
                    <CardTitle className="text-base font-semibold text-slate-900 dark:text-white mt-3 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                      {item.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed">{item.description}</p>
                    <div className="mt-3 flex items-center text-xs font-medium text-slate-600 dark:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>View History</span>
                      <svg className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
