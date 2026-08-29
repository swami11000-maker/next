import { Stethoscope } from "lucide-react";
import { ServiceCard } from "@/components/admin/service-card";

export default function AdminMedical() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Medical</h1>
        <p className="text-slate-500 dark:text-gray-400">
          Manage learning exam medical certificates.
        </p>
      </div>

      <ServiceCard
        title="Medical"
        description="View and process medical certificate requests here."
        icon={<Stethoscope className="h-5 w-5 text-[#ff3800]" />}
      />
    </div>
  );
}
