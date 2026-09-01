"use client";

import AnimatedSection from "./ui/AnimatedSection";
import { CheckCircle } from "lucide-react";

const features = [
  "Authorized by NSDL & UTI",
  "Paperless e-KYC Process",
  "PAN Correction & Duplicate",
  "All India Service Coverage",
];

export default function About() {
  return (
    <section id="about" className="py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Image/Visual */}
          <AnimatedSection>
            <div className="relative">
              <div className="aspect-[4/3] bg-gradient-to-br from-[#111111] to-[#1a1a1a] rounded-3xl border border-white/10 overflow-hidden relative">
                <div className="absolute inset-0 bg-grid opacity-50" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-24 h-24 bg-[#FF5A1F]/20 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                      <span className="text-4xl font-bold text-[#FF5A1F]">PF</span>
                    </div>
                    <p className="text-white/30 text-sm font-mono">PAN FIND FINTECH</p>
                  </div>
                </div>
                {/* Decorative elements */}
                <div className="absolute top-6 left-6 w-20 h-20 border border-[#FF5A1F]/20 rounded-full" />
                <div className="absolute bottom-6 right-6 w-32 h-32 border border-white/5 rounded-full" />
              </div>
              
              {/* Experience Badge */}
              <div className="absolute -bottom-6 -right-6 bg-[#FF5A1F] text-white p-6 rounded-2xl shadow-xl">
                <p className="text-3xl font-bold">15+</p>
                <p className="text-sm opacity-90">Years of Trust</p>
              </div>
            </div>
          </AnimatedSection>

          {/* Right - Content */}
          <div>
            <AnimatedSection>
              <span className="text-[#FF5A1F] text-sm font-semibold tracking-wider uppercase">
                About Us
              </span>
              <h2 className="mt-4 text-4xl md:text-5xl font-bold leading-tight">
                India's Most Trusted{" "}
                <span className="text-[#FF5A1F]">PAN Service</span> Provider
              </h2>
            </AnimatedSection>

            <AnimatedSection delay={0.1}>
              <p className="mt-6 text-white/50 text-lg leading-relaxed">
                PAN FIND is an authorized Fintech Services Provider Company, 
                empowering businesses across India with seamless PAN card solutions. 
                Through our extensive network of Super Distributors, Distributors, 
                and Retailers, we make PAN applications fast, paperless, and hassle-free.
              </p>
            </AnimatedSection>

            <AnimatedSection delay={0.2}>
              <div className="mt-8 grid sm:grid-cols-2 gap-4">
                {features.map((feature) => (
                  <div key={feature} className="flex items-center gap-3">
                    <CheckCircle size={20} className="text-[#FF5A1F] flex-shrink-0" />
                    <span className="text-white/70">{feature}</span>
                  </div>
                ))}
              </div>
            </AnimatedSection>

            <AnimatedSection delay={0.3}>
              <a
                href="#services"
                className="inline-block mt-10 px-8 py-4 bg-white text-[#050505] font-semibold rounded-full hover:bg-[#F5F5F5] transition-all duration-300"
              >
                Discover Our Services
              </a>
            </AnimatedSection>
          </div>
        </div>
      </div>
    </section>
  );
}