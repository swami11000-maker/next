import { LayoutDashboard, Wind, Bike, Car, FileText, ClipboardList, Stethoscope, Search, Vote, Smartphone, LucideWorkflow, LucideCoins, TractorIcon, Activity, Wallet, CheckCircle2, Clock, ArrowUpRight, Sparkles } from "lucide-react";

export const RETAILER_DATA_CHANGED = "retailer:dataChanged";

export function emitRetailerDataChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(RETAILER_DATA_CHANGED));
  }
}

export const serviceGroups = [
  {
    title: "E-SHARM CARD",
    icon: Wind,
    items: [
      { title: "E-Shram PDF DownLoad", href: "/retailer/e-sharam/e-sharm-pdf", icon: Bike, description: "Download E-Shram card PDF", flag: "esharm_pdf" as const },
      { title: "E-Shram Mobile Update", href: "/retailer/e-sharam/e-sharm-mob-update", icon: Car, description: "Update mobile number in E-Shram", flag: "esharm_mob_update" as const },
    ],
  },
  {
    title: "POLLUTION",
    icon: Wind,
    items: [
      { title: "2 Wheeler PUC", href: "/retailer/pollution/2wheeler", icon: Bike, description: "Generate 2-wheeler pollution certificate", flag: "2wheeler_puc" as const },
      { title: "4 Wheeler PUC", href: "/retailer/pollution/4wheeler", icon: Car, description: "Generate 4-wheeler pollution certificate", flag: "4wheeler_puc" as const },
    ],
  },
  {
    title: "FARMER SERVICE",
    icon: TractorIcon,
    items: [{ title: "Farmer Card PDF", href: "/retailer/farmer-service/farmer-card", icon: FileText, description: "Download farmer card PDF", flag: "agri_pdf" as const }],
  },
  {
    title: "LL EXAM REQUEST",
    icon: ClipboardList,
    items: [{ title: "LL Exam Request", href: "/retailer/ll-exam-request", icon: ClipboardList, description: "Submit learning licence exam request", flag: "ll_exam" as const }],
  },
  {
    title: "LEARNING EXAM MEDICAL",
    icon: Stethoscope,
    items: [{ title: "Learning Exam Medical", href: "/retailer/learning-exam-medical", icon: Stethoscope, description: "Submit learning exam medical form", flag: "ll_medical" as const }],
  },
  {
    title: "PAN SERVICE",
    icon: FileText,
    items: [
      { title: "PAN Find", href: "/retailer/pan-service/aadhar-to-pan", icon: Search, description: "Find PAN by Aadhaar", flag: "pan_find" as const },
      { title: "PAN Detail", href: "/retailer/pan-service/pan-detail", icon: FileText, description: "Get PAN details", flag: "pandetils" as const },
    ],
  },
  {
    title: "VOTER",
    icon: Vote,
    items: [{ title: "Voter Mobile Link", href: "/retailer/voter_mobile_link", icon: Smartphone, description: "Link mobile to voter ID", flag: "voter_mobile_link" as const }],
  },
  {
    title: "VEHICLE SERVICE",
    icon: Car,
    items: [{ title: "RC PDF", href: "/retailer/vehical-service/rc-pdf", icon: FileText, description: "Download RC PDF", flag: "rc_print" as const }],
  },
  {
    title: "DRIVING LICENCE",
    icon: Car,
    items: [{ title: "DL Print", href: "/retailer/driving-license/dl-print", icon: Search, description: "Print driving licence", flag: "dl_print" as const }],
  },
];