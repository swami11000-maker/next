"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { useDataProvider } from "@/hooks/useDataProvider";
import { isServiceEnabled } from "@/lib/retailer-helpers";
import { serviceGroups } from "@/lib/data-events";

export default function RetailerDashboard() {
  const { retailer } = useDataProvider();

  const [hoveredCard, setHoveredCard] = React.useState<string | null>(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
      },
    },
  };

  return (
    <div className="relative block w-full min-w-0 bg-gradient-to-br from-black via-zinc-950 to-zinc-800 text-white">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[20%] top-0 h-72 w-72 rounded-full bg-orange-600/10 blur-[100px]" />

        <div className="absolute bottom-0 right-[10%] h-72 w-72 rounded-full bg-indigo-600/10 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full min-w-0 px-3 py-5 sm:px-5 sm:py-8 lg:px-6 xl:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold sm:text-3xl lg:text-4xl">
              Dashboard
            </h1>

            <Sparkles className="h-5 w-5 text-orange-500 sm:h-6 sm:w-6" />
          </div>

          <p className="mt-2 text-sm text-zinc-400 sm:text-base">
            Manage your services, track requests, and view history.
          </p>
        </div>

        {/* Services */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="
            grid
            w-full
            min-w-0
            grid-cols-1
            gap-4
            md:grid-cols-2
            xl:grid-cols-3
          "
        >
          {serviceGroups.map((group, groupIndex) => (
            <motion.div
              key={group.title}
              variants={itemVariants}
              className="
                relative
                min-w-0
                overflow-hidden
                rounded-2xl
                border
                border-white/10
                bg-zinc-950/80
                shadow-lg
              "
            >
              {/* Top Line */}
              <div className="h-1 w-full bg-gradient-to-r from-transparent via-orange-500 to-transparent" />

              <div className="p-4 sm:p-5 lg:p-6">
                {/* Group Header */}
                <div className="mb-5 flex min-w-0 items-center gap-3">
                  <div className="shrink-0 rounded-xl bg-orange-500/10 p-3">
                    <group.icon className="h-5 w-5 text-orange-500" />
                  </div>

                  <h2 className="min-w-0 truncate text-base font-bold sm:text-lg">
                    {group.title}
                  </h2>
                </div>

                {/* Items */}
                <div className="space-y-3">
                  {group.items.map((item, itemIndex) => {
                    const enabled = isServiceEnabled(
                      retailer,
                      item.flag
                    );

                    const id = `${groupIndex}-${itemIndex}`;

                    const isHovered = hoveredCard === id;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block w-full min-w-0"
                      >
                        <div
                          onMouseEnter={() => setHoveredCard(id)}
                          onMouseLeave={() => setHoveredCard(null)}
                          className={`
                            flex
                            w-full
                            min-w-0
                            items-center
                            gap-3
                            rounded-xl
                            border
                            border-white/10
                            p-3
                            transition-all
                            duration-300
                            lg:p-4
                            ${isHovered
                              ? "border-orange-500/50 bg-orange-500/10"
                              : "bg-zinc-900/60"
                            }
                            ${!enabled
                              ? "opacity-60"
                              : ""
                            }
                          `}
                        >
                          {/* Icon */}
                          <div
                            className={`
                              shrink-0
                              rounded-lg
                            
                              ${isHovered
                                ? "bg-orange-500"
                                : "bg-zinc-800"
                              }
                            `}
                          >
                            <item.icon
                              className={`
                                h-5
                                w-5
                                ${isHovered
                                  ? "text-white"
                                  : "text-zinc-400"
                                }
                              `}
                            />
                          </div>

                          {/* Text */}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-white">
                              {item.title}
                            </p>

                            <p className="mt-1 line-clamp-2 text-xs text-zinc-400">
                              {item.description}
                            </p>
                          </div>

                          {/* Badge */}
                          <Badge
                            className={`
    absolute
    right-2
    top-2
    z-10
    h-5
    min-w-0
    rounded-md
    px-1.5
    py-0
    text-[8px]
    font-medium
    leading-none
    sm:right-3
    sm:top-3
    sm:h-5
    sm:px-2
    sm:text-[9px]
    ${enabled
                                ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                : "border border-red-500/30 bg-red-500/10 text-red-400"
                              }
  `}
                          >
                            {enabled ? "Active" : "Locked"}
                          </Badge>
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
