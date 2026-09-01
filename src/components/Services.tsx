"use client";

import AnimatedSection from "./ui/AnimatedSection";
import { FileText, CreditCard, Smartphone, Search, Shield, Zap } from "lucide-react";

const services = [
  {
    icon: FileText,
    title: "NSDL Paperless PAN",
    description: "Get Instant PAN within 30 minutes using Aadhaar e-KYC via OTP or Biometric. e-Sign facility available.",
    features: ["30 min delivery", "e-KYC enabled", "e-Sign support"],
  },
  {
    icon: CreditCard,
    title: "UTI E-KYC PAN Center",
    description: "Authorized agent for UTI PAN Center. New applications and corrections with full e-KYC and e-Sign support.",
    features: ["Authorized agent", "New + Correction", "Full e-KYC"],
  },
  {
    icon: Smartphone,
    title: "Mobile & DTH Recharge",
    description: "Recharge all Indian operators instantly. Earn commission on every successful recharge transaction.",
    features: ["All operators", "Instant success", "Commission earned"],
  },
  {
    icon: Search,
    title: "PAN Number Find",
    description: "Easily find your PAN number using just your Aadhaar number. Quick, secure, and hassle-free lookup.",
    features: ["Aadhaar based", "Instant lookup", "100% secure"],
  },
  {
    icon: Shield,
    title: "PAN Correction",
    description: "Update name, address, photo, or signature on your existing PAN card with our guided correction process.",
    features: ["Name/Address change", "Photo update", "Signature change"],
  },
  {
    icon: Zap,
    title: "Super Distributor",
    description: "Join our B2B network as a Super Distributor. Onboard retailers and earn on every PAN application.",
    features: ["B2B Network", "Retailer onboarding", "Revenue sharing"],
  },
];

export default function Services() {
  return (
    <section id="services" className="py-24 lg:py-32 bg-[#111111]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-[#FF5A1F] text-sm font-semibold tracking-wider uppercase">
            Our Services
          </span>
          <h2 className="mt-4 text-4xl md:text-5xl font-bold">
            Everything You Need in{" "}
            <span className="text-[#FF5A1F]">One Platform</span>
          </h2>
          <p className="mt-4 text-white/50 text-lg">
            From PAN applications to mobile recharges, we provide a complete 
            suite of fintech services for individuals and businesses.
          </p>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <AnimatedSection key={service.title} delay={index * 0.1}>
              <div className="group h-full bg-[#050505] border border-white/5 rounded-2xl p-8 hover:border-[#FF5A1F]/30 transition-all duration-500 hover:shadow-xl hover:shadow-orange-500/5">
                <div className="w-14 h-14 bg-[#FF5A1F]/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#FF5A1F]/20 transition-colors">
                  <service.icon size={28} className="text-[#FF5A1F]" />
                </div>
                
                <h3 className="text-xl font-bold text-white mb-3">
                  {service.title}
                </h3>
                
                <p className="text-white/50 leading-relaxed mb-6">
                  {service.description}
                </p>
                
                <div className="flex flex-wrap gap-2">
                  {service.features.map((feature) => (
                    <span
                      key={feature}
                      className="px-3 py-1 bg-white/5 text-white/60 text-xs rounded-full border border-white/5"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}