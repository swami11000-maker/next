"use client";

import AnimatedSection from "./ui/AnimatedSection";
import { ArrowRight } from "lucide-react";

export default function CTA() {
  return (
    <section id="contact" className="py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <AnimatedSection>
          <div className="relative overflow-hidden bg-gradient-to-br from-[#FF5A1F] to-orange-700 rounded-3xl p-12 md:p-16 lg:p-20 text-center">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_30%,white_1px,transparent_1px)] bg-[length:30px_30px]" />
            </div>
            
            {/* Floating Circles */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-black/10 rounded-full blur-3xl" />

            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
                Ready to Grow Your Business?
              </h2>
              <p className="mt-6 text-white/80 text-lg">
                Join India's largest PAN service network. Become a retailer or 
                distributor today and start earning from day one.
              </p>
              
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="#"
                  className="group px-8 py-4 bg-white text-[#FF5A1F] font-bold rounded-full hover:bg-[#F5F5F5] transition-all duration-300 flex items-center justify-center gap-2"
                >
                  Get Started Now
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </a>
                <a
                  href="#"
                  className="px-8 py-4 bg-black/20 text-white font-semibold rounded-full hover:bg-black/30 transition-all duration-300 border border-white/20"
                >
                  Contact Sales
                </a>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}