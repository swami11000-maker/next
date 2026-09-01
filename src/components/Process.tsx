"use client";

import AnimatedSection from "./ui/AnimatedSection";
import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    title: "Register",
    description: "Sign up as a retailer or distributor on our platform in under 2 minutes.",
  },
  {
    number: "02",
    title: "Complete KYC",
    description: "Verify your identity with our secure Aadhaar-based e-KYC process.",
  },
  {
    number: "03",
    title: "Start Processing",
    description: "Begin accepting PAN applications and recharge requests immediately.",
  },
  {
    number: "04",
    title: "Earn Commission",
    description: "Get instant commission credited for every successful transaction.",
  },
];

export default function Process() {
  return (
    <section className="py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-[#FF5A1F] text-sm font-semibold tracking-wider uppercase">
            How It Works
          </span>
          <h2 className="mt-4 text-4xl md:text-5xl font-bold">
            Simple <span className="text-[#FF5A1F]">4-Step</span> Process
          </h2>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <AnimatedSection key={step.number} delay={index * 0.15}>
              <div className="relative">
                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-[60%] w-full h-px">
                    <div className="w-full h-full bg-gradient-to-r from-[#FF5A1F]/50 to-transparent" />
                  </div>
                )}
                
                <div className="relative z-10">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="w-24 h-24 bg-gradient-to-br from-[#FF5A1F] to-orange-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-orange-500/20"
                  >
                    <span className="text-3xl font-bold text-white">{step.number}</span>
                  </motion.div>
                  
                  <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                  <p className="text-white/50 leading-relaxed text-sm">{step.description}</p>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}