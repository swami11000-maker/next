"use client";

import AnimatedSection from "./ui/AnimatedSection";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Rahul Sharma",
    role: "Retailer, Delhi",
    content: "PAN FIND ne mera business badal diya. Ab main ghar baithe PAN card applications process kar sakta hoon. Commission bhi same day mil jata hai.",
    rating: 5,
  },
  {
    name: "Priya Patel",
    role: "Distributor, Mumbai",
    content: "As a Super Distributor, I've onboarded 50+ retailers. The platform is smooth, support is excellent, and payments are always on time.",
    rating: 5,
  },
  {
    name: "Amit Kumar",
    role: "Business Owner, Bangalore",
    content: "2 hours mein PAN card milna was unbelievable until I tried it myself. My customers are extremely satisfied with the speed.",
    rating: 5,
  },
];

export default function Testimonials() {
  return (
    <section className="py-24 lg:py-32 bg-[#111111]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-[#FF5A1F] text-sm font-semibold tracking-wider uppercase">
            Testimonials
          </span>
          <h2 className="mt-4 text-4xl md:text-5xl font-bold">
            Trusted by <span className="text-[#FF5A1F]">Thousands</span>
          </h2>
        </AnimatedSection>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <AnimatedSection key={testimonial.name} delay={index * 0.1}>
              <div className="h-full bg-[#050505] border border-white/5 rounded-2xl p-8 hover:border-white/10 transition-colors relative">
                <Quote size={32} className="text-[#FF5A1F]/20 mb-4" />
                
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} size={16} className="text-[#FF5A1F] fill-[#FF5A1F]" />
                  ))}
                </div>
                
                <p className="text-white/60 leading-relaxed mb-6">
                  "{testimonial.content}"
                </p>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#FF5A1F]/20 rounded-full flex items-center justify-center">
                    <span className="text-[#FF5A1F] font-bold text-sm">
                      {testimonial.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{testimonial.name}</p>
                    <p className="text-white/40 text-xs">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}