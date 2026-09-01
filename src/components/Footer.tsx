import { Phone, Mail, MapPin } from "lucide-react";

const footerLinks = {
  Services: ["NSDL PAN", "UTI PAN", "PAN Correction", "PAN Find", "Recharge"],
  Company: ["About Us", "Careers", "Blog", "Press", "Partners"],
  Support: ["Help Center", "Contact Us", "Privacy Policy", "Terms of Service"],
};

export default function Footer() {
  return (
    <footer className="bg-[#050505] border-t border-white/5 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-[#FF5A1F] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">P</span>
              </div>
              <span className="text-white font-bold text-xl">
                PAN<span className="text-[#FF5A1F]">FIND</span>
              </span>
            </div>
            <p className="text-white/40 leading-relaxed mb-6 max-w-sm">
              India's leading fintech service provider for PAN card solutions, 
              authorized by NSDL and UTI across the nation.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-white/40 text-sm">
                <Phone size={16} className="text-[#FF5A1F]" />
                <span>+91 98765 43210</span>
              </div>
              <div className="flex items-center gap-3 text-white/40 text-sm">
                <Mail size={16} className="text-[#FF5A1F]" />
                <span>support@panfind.com</span>
              </div>
              <div className="flex items-center gap-3 text-white/40 text-sm">
                <MapPin size={16} className="text-[#FF5A1F]" />
                <span>All India Service Coverage</span>
              </div>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-white font-semibold mb-4">{title}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-white/40 hover:text-[#FF5A1F] transition-colors text-sm"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/30 text-sm">
            © 2026 PAN FIND. All Rights Reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-white/30 hover:text-[#FF5A1F] transition-colors text-sm">
              Privacy
            </a>
            <a href="#" className="text-white/30 hover:text-[#FF5A1F] transition-colors text-sm">
              Terms
            </a>
            <a href="#" className="text-white/30 hover:text-[#FF5A1F] transition-colors text-sm">
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}