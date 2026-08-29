import { ClipboardList } from "lucide-react";
import { ServiceCard } from "@/components/admin/service-card";

export default function AdminLlExam() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">LL Exam</h1>
        <p className="text-slate-500 dark:text-gray-400">
          Manage learning licence exam requests.
        </p>
      </div>

      <ServiceCard
        title="LL Exam"
        description="View and process learning licence exam requests here."
        icon={<ClipboardList className="h-5 w-5 text-[#ff3800]" />}
      />
    </div>
  );
}
