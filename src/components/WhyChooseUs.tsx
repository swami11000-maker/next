"use client";

import AnimatedSection from "./ui/AnimatedSection";
import { Clock, Shield, Headphones, TrendingUp, Award, Users } from "lucide-react";

const reasons = [
  {
    icon: Clock,
    title: "2 Hour Delivery",
    description: "Get your PAN card processed and delivered faster than anyone else in the market.",
  },
  {
    icon: Shield,
    title: "100% Secure",
    description: "End-to-end encrypted e-KYC process with government-authorized protocols.",
  },
  {
    icon: Headphones,
    title: "24/7 Support",
    description: "Our dedicated team is available round the clock to assist you with any queries.",
  },
  {
    icon: TrendingUp,
    title: "Best Commissions",
    description: "Industry-leading commission rates for distributors and retail partners.",
  },
  {
    icon: Award,
    title: "Authorized Partner",
    description: "Officially authorized by NSDL and UTI for PAN card services across India.",
  },
  {
    icon: Users,
    title: "B2B Network",
    description: "Robust Super Distributor and Retailer network covering all of India.",
  },
];

export default function WhyChooseUs() {
  return (
    <section className="py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-[#FF5A1F] text-sm font-semibold tracking-wider uppercase">
            Why Choose Us
          </span>
          <h2 className="mt-4 text-4xl md:text-5xl font-bold">
            The <span className="text-[#FF5A1F]">PAN FIND</span> Advantage
          </h2>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reasons.map((reason, index) => (
            <AnimatedSection key={reason.title} delay={index * 0.1}>
              <div className="group p-8 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-[#FF5A1F]/20 transition-all duration-500">
                <div className="w-12 h-12 bg-[#FF5A1F]/10 rounded-lg flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <reason.icon size={24} className="text-[#FF5A1F]" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{reason.title}</h3>
                <p className="text-white/50 leading-relaxed text-sm">{reason.description}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}