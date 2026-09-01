"use client";

import { useEffect, useState, useCallback } from "react";
import { FileText, Loader2, Search, Trash2, Upload } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import type { FourWheelerRequest } from "@/lib/auth";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "panding", label: "Processing" },
  { value: "success", label: "Approved" },
  { value: "refund", label: "Refunded" },
];

const STATUS_COLORS: Record<string, string> = {
  panding: "bg-amber-100 text-amber-800",
  success: "bg-green-100 text-green-800",
  refund: "bg-red-100 text-red-800",
};

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...options.headers },
    cache: "no-store",
    ...options,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error((json as { message?: string }).message || "Request failed");
  }
  return json as T;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AdminFourWheelerPage() {
  const [requests, setRequests] = useState<FourWheelerRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const url = filter ? `/api/admin/4wheeler?status=${encodeURIComponent(filter)}` : "/api/admin/4wheeler";
      const data = await api<FourWheelerRequest[]>(url);
      setRequests(data);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [load]);

  async function changeStatus(row: FourWheelerRequest, status: string) {
    try {
      await api(`/api/admin/4wheeler/${row.id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function uploadPdf(row: FourWheelerRequest, file: File | null) {
    if (!file) return;
    setUploadingId(row.id);
    try {
      const base64 = await fileToBase64(file);
      await api(`/api/admin/4wheeler/${row.id}`, {
        method: "PUT",
        body: JSON.stringify({ admin_upload_doc: base64 }),
      });
      await load();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setUploadingId(null);
    }
  }

  const filtered = requests.filter((r) =>
    search
      ? r.vehicle_no.toLowerCase().includes(search.toLowerCase()) ||
        r.mobile_no.includes(search)
      : true
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">4 Wheeler Requests</h1>
        <p className="text-slate-500 dark:text-gray-400">
          Manage all 4-wheeler PUC requests submitted by retailers.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            className="pl-8 h-9"
            placeholder="Search vehicle / mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 p-1">
          <button
            className={`px-3 py-1.5 text-xs rounded-md ${!filter ? "bg-[#ff3800] text-white" : "text-slate-600 dark:text-gray-300"}`}
            onClick={() => setFilter("")}
          >
            All
          </button>
          <button
            className={`px-3 py-1.5 text-xs rounded-md ${filter === "panding" ? "bg-[#ff3800] text-white" : "text-slate-600 dark:text-gray-300"}`}
            onClick={() => setFilter("panding")}
          >
            Processing
          </button>
          <button
            className={`px-3 py-1.5 text-xs rounded-md ${filter === "success" ? "bg-[#ff3800] text-white" : "text-slate-600 dark:text-gray-300"}`}
            onClick={() => setFilter("success")}
          >
            Approved
          </button>
          <button
            className={`px-3 py-1.5 text-xs rounded-md ${filter === "refund" ? "bg-[#ff3800] text-white" : "text-slate-600 dark:text-gray-300"}`}
            onClick={() => setFilter("refund")}
          >
            Refunded
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle No</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>User Mobile</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Photos</TableHead>
              <TableHead>Admin PDF</TableHead>
              <TableHead>Applied</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                  Loading requests...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                  No requests found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-sm">{row.vehicle_no}</TableCell>
                  <TableCell>{row.mobile_no}</TableCell>
                  <TableCell>{row.user_mob ? String(row.user_mob) : "-"}</TableCell>
                  <TableCell>
                    <select
                      className={`text-xs rounded-md px-2 py-1 border border-slate-200 dark:border-slate-700 bg-transparent ${STATUS_COLORS[row.status] ?? "bg-slate-100 text-slate-800"}`}
                      value={row.status}
                      onChange={(e) => changeStatus(row, e.target.value)}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell>
                    <ImagePreview src={row.frontside} label="Front" />
                    <ImagePreview src={row.backside} label="Back" />
                  </TableCell>
                  <TableCell>
                    {row.admin_upload_doc ? (
                      <a
                        href={`/api/4wheeler/${row.id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        View PDF
                      </a>
                    ) : (
                      <label className="cursor-pointer inline-flex items-center gap-1 text-xs text-slate-600 dark:text-gray-300">
                        <input
                          type="file"
                          accept="application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0] ?? null;
                            if (f) uploadPdf(row, f);
                            e.target.value = "";
                          }}
                          disabled={uploadingId === row.id}
                        />
                        {uploadingId === row.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-4" />}
                        Upload PDF
                      </label>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {row.apply_date_time ?? "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7"
                      title="Delete request"
                      onClick={async () => {
                        if (confirm("Delete this request?")) {
                          try {
                            await api(`/api/admin/4wheeler/${row.id}`, { method: "DELETE" });
                            await load();
                          } catch (err) {
                            alert((err as Error).message);
                          }
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ImagePreview({ src, label }: { src: string; label: string }) {
  if (!src) {
    return <p className="text-xs text-slate-400">{label}: —</p>;
  }
  return (
    <a
      href={src}
      target="_blank"
      rel="noreferrer"
      className="inline-block mb-1 text-xs text-[#ff3800] underline"
    >
      {label}
    </a>
  );
}
