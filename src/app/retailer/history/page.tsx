import { RetailerHistory } from "@/components/retailer/retailer-history-table";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "History | Retailer",
};

export default function RetailerHistoryPage() {
  return (
    <div className="space-y-6">
      <RetailerHistory />
    </div>
  );
}
