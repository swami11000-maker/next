"use client";

import { motion } from "framer-motion";

export default function WhatsAppButton() {
  const phone = "918699592500";
  const message = encodeURIComponent(
    "Hello Please Help Me."
  );

  return (
    <motion.a
      href={`https://wa.me/${phone}?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      initial={{ opacity: 0, scale: 0.7, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      whileHover={{
        y: -4,
        scale: 1.05,
      }}
      whileTap={{
        scale: 0.9,
      }}
      className="
        fixed
        bottom-20
        right-5
        z-[9999]
        flex
        h-14
        w-14
        items-center
        justify-center
        rounded-full
        bg-[#25D366]
        text-white
        shadow-lg
        transition-shadow
        hover:shadow-xl
        sm:bottom-6
        sm:right-7
      "
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-8 w-8"
        aria-hidden="true"
      >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.611-.916-2.207-.242-.579-.487-.5-.67-.51l-.57-.01c-.198 0-.52.074-.792.372-.273.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
        <path d="M12.004 2C6.479 2 2 6.477 2 12c0 1.767.463 3.426 1.27 4.888L2 22l5.255-1.248A9.953 9.953 0 0 0 12.004 22C17.523 22 22 17.523 22 12S17.523 2 12.004 2zm0 18c-1.55 0-3.045-.4-4.354-1.16l-.312-.18-3.118.74.746-3.043-.203-.322A7.963 7.963 0 0 1 4.004 12c0-4.411 3.59-8 8-8s8 3.589 8 8-3.589 8-8 8z" />
      </svg>

      {/* Online indicator */}
      <span
        className="
          absolute
          right-0
          top-0
          h-3
          w-3
          rounded-full
          border-2
          border-white
          bg-[#25D366]
        "
      />
    </motion.a>
  );
}
