import { Car } from "lucide-react";
import { ServiceCard } from "@/components/admin/service-card";

export default function AdminFourWheeler() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">4 Wheeler</h1>
        <p className="text-slate-500 dark:text-gray-400">
          Pollution certificate management for four-wheelers.
        </p>
      </div>

      <ServiceCard
        title="4 Wheeler"
        description="Enter vehicle details to generate a 4-wheeler pollution certificate."
        icon={<Car className="h-5 w-5 text-[#ff3800]" />}
      />
    </div>
  );
}
