import { RetailerHistory } from "@/components/retailer/retailer-history-table";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "History | Retailer",
};

export default function RetailerHistoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">History</h1>
        <p className="mt-2 text-base text-slate-500 dark:text-gray-400">View your work history and transaction records</p>
      </div>

      <RetailerHistory />
    </div>
  );
}
