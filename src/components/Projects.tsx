"use client";

import AnimatedSection from "./ui/AnimatedSection";
import { ArrowUpRight } from "lucide-react";

const projects = [
  {
    title: "NSDL e-KYC Integration",
    category: "Technology",
    description: "Seamless integration with NSDL for instant paperless PAN processing using Aadhaar e-KYC.",
  },
  {
    title: "UTI PAN Center Network",
    category: "Infrastructure",
    description: "Nationwide authorized UTI PAN centers enabling quick applications and corrections.",
  },
  {
    title: "Mobile Recharge Platform",
    category: "Fintech",
    description: "All-operator instant recharge platform with real-time commission tracking.",
  },
  {
    title: "B2B Distributor Portal",
    category: "Business",
    description: "Comprehensive portal for Super Distributors to manage and onboard retailers.",
  },
];

export default function Projects() {
  return (
    <section id="projects" className="py-24 lg:py-32 bg-[#111111]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <AnimatedSection className="flex flex-col md:flex-row md:items-end md:justify-between mb-16 gap-6">
          <div>
            <span className="text-[#FF5A1F] text-sm font-semibold tracking-wider uppercase">
              Our Projects
            </span>
            <h2 className="mt-4 text-4xl md:text-5xl font-bold">
              Built for <span className="text-[#FF5A1F]">Scale</span>
            </h2>
          </div>
          <p className="text-white/50 max-w-md">
            Innovative solutions that power thousands of PAN applications 
            and recharge transactions daily.
          </p>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 gap-6">
          {projects.map((project, index) => (
            <AnimatedSection key={project.title} delay={index * 0.1}>
              <div className="group relative bg-[#050505] border border-white/5 rounded-2xl overflow-hidden hover:border-[#FF5A1F]/30 transition-all duration-500">
                <div className="aspect-[16/10] bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] relative overflow-hidden">
                  <div className="absolute inset-0 bg-grid opacity-30" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 border-2 border-[#FF5A1F]/20 rounded-2xl flex items-center justify-center group-hover:border-[#FF5A1F]/50 transition-colors">
                      <span className="text-2xl font-bold text-[#FF5A1F]/50 group-hover:text-[#FF5A1F] transition-colors">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="p-8">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className="text-[#FF5A1F] text-xs font-semibold uppercase tracking-wider">
                        {project.category}
                      </span>
                      <h3 className="mt-2 text-xl font-bold text-white group-hover:text-[#FF5A1F] transition-colors">
                        {project.title}
                      </h3>
                    </div>
                    <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center group-hover:bg-[#FF5A1F] transition-colors">
                      <ArrowUpRight size={18} className="text-white/50 group-hover:text-white" />
                    </div>
                  </div>
                  <p className="text-white/50 text-sm leading-relaxed">
                    {project.description}
                  </p>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}