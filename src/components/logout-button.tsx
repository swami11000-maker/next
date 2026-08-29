"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton({ label = "Logout" }: { label?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setLoading(false);
    }
    router.push("/auth/login");
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="w-full cursor-pointer text-sm font-medium text-slate-600 hover:text-[#ff3800] dark:text-gray-300 dark:hover:text-[#ff3800] flex items-center gap-2 rounded-lg p-2 transition-colors"
    >
      <LogOut className="h-4 w-4" />
      {loading ? "Logging out..." : label}
    </button>
  );
}
