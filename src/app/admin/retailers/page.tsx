"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Edit2,
  Loader2,
  Save,
  Search,
  SlidersHorizontal,
  Trash2,
  UserPlus,
  Users,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Retailer } from "@/lib/auth";
import { apiFetch } from "@/lib/api-client";

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

const SERVICE_PAIRS: { service: keyof Retailer; fee: keyof Retailer; label: string }[] = [
  { service: "2wheeler_puc", fee: "2wheeler_fee", label: "2W PUC" },
  { service: "4wheeler_puc", fee: "4wheeler_fee", label: "4W PUC" },
  { service: "voter_mobile_link", fee: "voter_mobile_link_fee", label: "Voter Link" },
  { service: "rc_mobile_update", fee: "rc_mo_update_fee", label: "RC Mobile" },
  { service: "ll_medical", fee: "ll_medical_fee", label: "LL Medical" },
  { service: "pan_find", fee: "pan_find_fee", label: "PAN Find" },
  { service: "pandetils", fee: "pandetils_fee", label: "PAN Detail" },
  { service: "dl_find", fee: "dl_find_fee", label: "DL Find" },
  { service: "dl_print", fee: "dl_print_fee", label: "DL Print" },
  { service: "dl_mo_update", fee: "dl_mo_update_fee", label: "DL Mobile" },
  { service: "ll_exam", fee: "ll_exam_fee", label: "LL Exam" },
  { service: "agri_pdf", fee: "agri_pdf_fee", label: "Agri PDF" },
  { service: "rc_print", fee: "rc_print_fee", label: "RC Print" },
  { service: "esharm_pdf", fee: "esharm_pdf_fee", label: "E-Sharm PDF" },
  { service: "esharm_mob_update", fee: "esharm_mob_update_fee", label: "E-Sharm Mobile" },
];

const NUMERIC_KEYS = new Set<string>(["balance", ...SERVICE_PAIRS.map((p) => String(p.fee))]);

const STATUS_META: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-orange-50 text-orange-600 ring-orange-600/20" },
  unpaid: { label: "Unpaid", className: "bg-red-50 text-red-600 ring-red-600/20" },
  panding: { label: "Pending", className: "bg-gray-100 text-black ring-black/10" },
};

const NEUTRAL_BADGE = "bg-gray-100 text-black ring-black/10";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function toPayload(data: Partial<Retailer>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || v === "") continue;
    out[k] = NUMERIC_KEYS.has(k) ? Number(v) : v;
  }
  return out;
}

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, {
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

function initials(name?: unknown) {
  const value = String(name ?? "").trim();
  if (!value) return "?";
  return (
    value
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function money(value: unknown) {
  return `₹${Number(value ?? 0).toLocaleString("en-IN")}`;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminRetailersPage() {
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editTarget, setEditTarget] = useState<Retailer | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const notify = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const data = await api<Retailer[]>("/api/admin/retailers");
        setRetailers(data);
      } catch (err) {
        if (!silent) setRetailers([]);
        notify((err as Error).message, "error");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [notify],
  );

  useEffect(() => {
    void load();
  }, [load]);

  /* ---------------- derived ---------------- */

  const stats = useMemo(() => {
    const total = retailers.length;
    const active = retailers.filter((r) => String(r.status) === "active").length;
    const unpaid = retailers.filter((r) => String(r.status) === "unpaid").length;
    const balance = retailers.reduce((sum, r) => sum + (Number(r.balance) || 0), 0);
    return { total, active, unpaid, balance };
  }, [retailers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return retailers.filter((r) => {
      const haystack = [r.name, r.email, r.mobile].map((v) => String(v ?? "").toLowerCase());
      const matchesQuery = !q || haystack.some((v) => v.includes(q));
      const matchesStatus = statusFilter === "all" || String(r.status) === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [retailers, query, statusFilter]);

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /* ---------------- mutations ---------------- */

  async function saveField(row: Retailer, field: keyof Retailer, value: unknown) {
    const key = `${row.id}-${String(field)}`;
    setBusyKey(key);
    // optimistic
    setRetailers((prev) =>
      prev.map((r) => (r.id === row.id ? ({ ...r, [field]: value } as Retailer) : r)),
    );
    try {
      await api(`/api/admin/retailers/${row.id}`, {
        method: "PUT",
        body: JSON.stringify(toPayload({ [field]: value } as Partial<Retailer>)),
      });
    } catch (err) {
      notify((err as Error).message, "error");
      await load(true);
    } finally {
      setBusyKey(null);
    }
  }

  async function toggleService(row: Retailer, service: string) {
    const on = String(row[service as keyof Retailer] ?? "no") === "yes";
    await saveField(row, service as keyof Retailer, on ? "no" : "yes");
  }

  async function saveFee(row: Retailer, fee: string, value: string) {
    if (String(row[fee as keyof Retailer] ?? "") === value) return;
    await saveField(row, fee as keyof Retailer, value);
  }

  async function deleteRetailer(row: Retailer) {
    if (!confirm(`Delete retailer ${row.name}?`)) return;
    try {
      await api(`/api/admin/retailers/${row.id}`, { method: "DELETE" });
      await load(true);
      notify("Retailer deleted");
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }

  /* ---------------- render ---------------- */

  return (
    <div className="min-h-screen bg-white p-4 text-black sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600 text-white shadow-sm">
                <Users className="h-5 w-5" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-black">All Retailers</h1>
            </div>
            <p className="mt-2 text-sm text-black/60">
              Manage every retailer profile, service access and pricing in one place.
            </p>
          </div>
          <AddRetailerDialog onCreated={() => load(true)} notify={notify} />
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Users className="h-4 w-4" />}
            label="Total Retailers"
            value={String(stats.total)}
            tone="dark"
          />
          <StatCard
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Active"
            value={String(stats.active)}
            tone="orange"
          />
          <StatCard
            icon={<XCircle className="h-4 w-4" />}
            label="Unpaid"
            value={String(stats.unpaid)}
            tone="red"
          />
          <StatCard
            icon={<Wallet className="h-4 w-4" />}
            label="Total Balance"
            value={money(stats.balance)}
            tone="orange"
          />
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email or mobile…"
              className="h-10 border-gray-200 bg-white pl-9 text-black shadow-none placeholder:text-black/40 focus-visible:border-orange-600 focus-visible:ring-2 focus-visible:ring-orange-600/20"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-black outline-none transition focus:border-orange-600 focus:ring-2 focus:ring-orange-600/20"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="unpaid">Unpaid</option>
            <option value="panding">Pending</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 bg-gray-50 hover:bg-gray-50">
                  <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-black">
                    Retailer
                  </TableHead>
                  <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-black">
                    Mobile
                  </TableHead>
                  <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-black">
                    Status
                  </TableHead>
                  <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-black">
                    Balance
                  </TableHead>
                  <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-black">
                    User Type
                  </TableHead>
                  <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-black">
                    Services
                  </TableHead>
                  <TableHead className="h-11 text-right text-xs font-semibold uppercase tracking-wide text-black">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
                        <span className="text-sm text-black/60">Loading retailers…</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-8 w-8 text-black/30" />
                        <span className="text-sm font-medium text-black">
                          {retailers.length === 0
                            ? "No retailers found."
                            : "No retailers match your filters."}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row) => {
                    const isOpen = expanded.has(row.id);
                    const enabledCount = SERVICE_PAIRS.filter(
                      (p) => String(row[p.service] ?? "no") === "yes",
                    ).length;
                    const status = String(row.status ?? "");
                    const statusMeta = STATUS_META[status];

                    return (
                      <Fragment key={row.id}>
                        <TableRow
                          className={`border-gray-200 transition-colors ${
                            isOpen ? "bg-orange-50/40" : "hover:bg-gray-50"
                          }`}
                        >
                          {/* Retailer */}
                          <TableCell className="min-w-[240px] py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-600 text-[11px] font-bold text-white">
                                {initials(row.name)}
                              </div>
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-black">
                                  {row.name}
                                </div>
                                <div className="truncate text-xs text-black/60">
                                  {row.email || "—"}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          {/* Mobile */}
                          <TableCell className="py-3.5">
                            <span className="text-sm tabular-nums text-black">
                              {row.mobile || "—"}
                            </span>
                          </TableCell>

                          {/* Status */}
                          <TableCell className="py-3.5">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                                statusMeta?.className ?? NEUTRAL_BADGE
                              }`}
                            >
                              {statusMeta?.label ?? (status || "—")}
                            </span>
                          </TableCell>

                          {/* Balance */}
                          <TableCell className="py-3.5">
                            <span className="text-sm font-semibold tabular-nums text-black">
                              {money(row.balance)}
                            </span>
                          </TableCell>

                          {/* User type */}
                          <TableCell className="py-3.5">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                                String(row.usertype) === "superAdmin"
                                  ? "bg-orange-50 text-orange-600 ring-orange-600/20"
                                  : NEUTRAL_BADGE
                              }`}
                            >
                              {String(row.usertype) === "superAdmin" ? "Super Admin" : "Retailer"}
                            </span>
                          </TableCell>

                          {/* Services */}
                          <TableCell className="py-3.5">
                            <button
                              type="button"
                              onClick={() => toggleExpand(row.id)}
                              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                                isOpen
                                  ? "bg-orange-600 text-white hover:bg-orange-700"
                                  : "bg-gray-100 text-black hover:bg-gray-200"
                              }`}
                            >
                              {enabledCount}/{SERVICE_PAIRS.length}
                              <ChevronDown
                                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                                  isOpen ? "rotate-180" : ""
                                }`}
                              />
                            </button>
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="py-3.5 text-right">
                            <div className="flex justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 border-gray-200 p-0 text-black transition hover:border-orange-600 hover:bg-orange-50 hover:text-orange-600"
                                title="Edit"
                                onClick={() => setEditTarget(row)}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 border-gray-200 p-0 text-red-600 transition hover:border-red-600 hover:bg-red-50 hover:text-red-600"
                                title="Delete"
                                onClick={() => deleteRetailer(row)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Expanded services panel */}
                        {isOpen && (
                          <TableRow className="border-gray-200 bg-orange-50/30 hover:bg-orange-50/30">
                            <TableCell colSpan={7} className="p-0">
                              <div className="border-t border-gray-200 px-4 py-4 sm:px-6">
                                <div className="mb-3 flex items-center gap-2">
                                  <SlidersHorizontal className="h-4 w-4 text-orange-600" />
                                  <span className="text-sm font-semibold text-black">
                                    Services &amp; Pricing
                                  </span>
                                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-600">
                                    {enabledCount} enabled
                                  </span>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                  {SERVICE_PAIRS.map((p) => {
                                    const on = String(row[p.service] ?? "no") === "yes";
                                    const feeKey = `${row.id}-${String(p.fee)}`;
                                    const isBusy =
                                      busyKey === `${row.id}-${String(p.service)}` ||
                                      busyKey === feeKey;

                                    return (
                                      <div
                                        key={String(p.service)}
                                        className={`rounded-xl border p-3 transition ${
                                          on
                                            ? "border-orange-600/30 bg-white"
                                            : "border-gray-200 bg-white"
                                        }`}
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="truncate text-[13px] font-medium text-black">
                                            {p.label}
                                          </span>
                                          <button
                                            type="button"
                                            role="switch"
                                            aria-checked={on}
                                            aria-label={`Toggle ${p.label}`}
                                            disabled={isBusy}
                                            onClick={() => toggleService(row, String(p.service))}
                                            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                                              on ? "bg-orange-600" : "bg-gray-300"
                                            }`}
                                          >
                                            <span
                                              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                                on ? "translate-x-4" : "translate-x-0.5"
                                              }`}
                                            />
                                          </button>
                                        </div>

                                        <div className="mt-2.5 flex items-center gap-2">
                                          <span className="text-[11px] font-medium uppercase tracking-wide text-black/50">
                                            Fee
                                          </span>
                                          <div className="relative flex-1">
                                            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-black/40">
                                              ₹
                                            </span>
                                            <input
                                              type="number"
                                              defaultValue={String(row[p.fee] ?? 0)}
                                              onBlur={(e) =>
                                                saveFee(row, String(p.fee), e.target.value)
                                              }
                                              className="h-8 w-full rounded-lg border border-gray-200 bg-white pl-6 pr-2 text-sm tabular-nums text-black outline-none transition focus:border-orange-600 focus:ring-2 focus:ring-orange-600/20"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Edit drawer */}
      {editTarget && (
        <EditRetailerDialog
          retailer={editTarget}
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            void load(true);
            notify("Retailer updated");
          }}
          notify={notify}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-medium shadow-lg ring-1 ${
            toast.type === "success"
              ? "text-orange-600 ring-orange-600/30"
              : "text-red-600 ring-red-600/30"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          {toast.message}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat card                                                          */
/* ------------------------------------------------------------------ */

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "orange" | "red" | "dark";
}) {
  const toneClass =
    tone === "orange"
      ? "bg-orange-50 text-orange-600"
      : tone === "red"
        ? "bg-red-50 text-red-600"
        : "bg-gray-100 text-black";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-orange-600/40">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-black/60">{label}</span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneClass}`}>
          {icon}
        </span>
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight text-black">{value}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Edit retailer dialog                                               */
/* ------------------------------------------------------------------ */

function EditRetailerDialog({
  retailer,
  open,
  onClose,
  onSaved,
  notify,
}: {
  retailer: Retailer;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  notify: (message: string, type?: "success" | "error") => void;
}) {
  const [form, setForm] = useState<Partial<Retailer>>({
    name: String(retailer.name ?? ""),
    email: String(retailer.email ?? ""),
    mobile: String(retailer.mobile ?? ""),
    status: String(retailer.status ?? "unpaid"),
    balance: Number(retailer.balance ?? 0),
    usertype: String(retailer.usertype ?? "retailer"),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      name: String(retailer.name ?? ""),
      email: String(retailer.email ?? ""),
      mobile: String(retailer.mobile ?? ""),
      status: String(retailer.status ?? "unpaid"),
      balance: Number(retailer.balance ?? 0),
      usertype: String(retailer.usertype ?? "retailer"),
    });
    setError(null);
  }, [retailer]);

  async function onSubmit() {
    setSaving(true);
    setError(null);
    try {
      await api(`/api/admin/retailers/${retailer.id}`, {
        method: "PUT",
        body: JSON.stringify(toPayload(form as Partial<Retailer>)),
      });
      onSaved();
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      notify(msg, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-white sm:max-w-lg">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-600 text-sm font-bold text-white">
            {initials(retailer.name)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-black">Edit Retailer</h2>
            <p className="truncate text-sm text-black/60">
              {retailer.email || "Update profile details"}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Name" className="sm:col-span-2">
            <Input
              className="border-gray-200 text-black focus-visible:border-orange-600 focus-visible:ring-2 focus-visible:ring-orange-600/20"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Full name"
            />
          </Field>

          <Field label="Email">
            <Input
              type="email"
              className="border-gray-200 text-black focus-visible:border-orange-600 focus-visible:ring-2 focus-visible:ring-orange-600/20"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="email@example.com"
            />
          </Field>

          <Field label="Mobile">
            <Input
              className="border-gray-200 text-black focus-visible:border-orange-600 focus-visible:ring-2 focus-visible:ring-orange-600/20"
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              placeholder="10-digit mobile"
            />
          </Field>

          <Field label="Status">
            <select
              className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-black outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-600/20"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="unpaid">Unpaid</option>
              <option value="active">Active</option>
              <option value="panding">Pending</option>
            </select>
          </Field>

          <Field label="User Type">
            <select
              className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-black outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-600/20"
              value={form.usertype}
              onChange={(e) => setForm({ ...form, usertype: e.target.value })}
            >
              <option value="retailer">Retailer</option>
              <option value="superAdmin">Super Admin</option>
            </select>
          </Field>

          <Field label="Balance" className="sm:col-span-2">
            <Input
              type="number"
              className="border-gray-200 text-black focus-visible:border-orange-600 focus-visible:ring-2 focus-visible:ring-orange-600/20"
              value={form.balance}
              onChange={(e) => setForm({ ...form, balance: Number(e.target.value) })}
              placeholder="0"
            />
          </Field>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-red-600/20">
            <XCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="outline"
            className="border-gray-200 text-black hover:bg-gray-50"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={saving || !form.name || !form.email || !form.mobile}
            className="bg-orange-600 font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Add retailer dialog                                                */
/* ------------------------------------------------------------------ */

function AddRetailerDialog({
  onCreated,
  notify,
}: {
  onCreated: () => void;
  notify: (message: string, type?: "success" | "error") => void;
}) {
  const emptyForm = {
    name: "",
    email: "",
    mobile: "",
    password: "",
    status: "unpaid",
    balance: 0,
    usertype: "retailer",
  };

  const [open, setOpen] = useState<boolean>(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setForm(emptyForm);
    setError(null);
  }

  async function onSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await api("/api/admin/retailers", {
        method: "POST",
        body: JSON.stringify(form),
      });
      reset();
      setOpen(false);
      onCreated();
      notify("Retailer created");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    !submitting && !!form.name && !!form.email && !!form.mobile && form.password.length >= 6;

  return (
    <>
      <Button
        className="h-10 rounded-xl bg-orange-600 px-4 font-semibold text-white hover:bg-orange-700"
        onClick={() => setOpen(true)}
      >
        <UserPlus className="mr-2 h-4 w-4" />
        Add Retailer
      </Button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) reset();
        }}
      >
        <DialogContent className="bg-white sm:max-w-lg">
          <div className="mb-1">
            <h2 className="text-lg font-semibold text-black">Add New Retailer</h2>
            <p className="text-sm text-black/60">
              Create a retailer account with login credentials.
            </p>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Name" className="sm:col-span-2">
              <Input
                className="border-gray-200 text-black focus-visible:border-orange-600 focus-visible:ring-2 focus-visible:ring-orange-600/20"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Full name"
              />
            </Field>

            <Field label="Email">
              <Input
                type="email"
                className="border-gray-200 text-black focus-visible:border-orange-600 focus-visible:ring-2 focus-visible:ring-orange-600/20"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@example.com"
              />
            </Field>

            <Field label="Mobile">
              <Input
                className="border-gray-200 text-black focus-visible:border-orange-600 focus-visible:ring-2 focus-visible:ring-orange-600/20"
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                placeholder="10-digit mobile"
              />
            </Field>

            <Field label="Status">
              <select
                className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-black outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-600/20"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="unpaid">Unpaid</option>
                <option value="active">Active</option>
                <option value="panding">Pending</option>
              </select>
            </Field>

            <Field label="User Type">
              <select
                className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-black outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-600/20"
                value={form.usertype}
                onChange={(e) => setForm({ ...form, usertype: e.target.value })}
              >
                <option value="retailer">Retailer</option>
                <option value="superAdmin">Super Admin</option>
              </select>
            </Field>

            <Field label="Balance">
              <Input
                type="number"
                className="border-gray-200 text-black focus-visible:border-orange-600 focus-visible:ring-2 focus-visible:ring-orange-600/20"
                value={String(form.balance)}
                onChange={(e) => setForm({ ...form, balance: Number(e.target.value) })}
                placeholder="0"
              />
            </Field>

            <Field label="Password">
              <Input
                type="password"
                className="border-gray-200 text-black focus-visible:border-orange-600 focus-visible:ring-2 focus-visible:ring-orange-600/20"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Min 6 characters"
              />
            </Field>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-red-600/20">
              <XCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <Button
              variant="outline"
              className="border-gray-200 text-black hover:bg-gray-50"
              onClick={() => {
                setOpen(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={!canSubmit}
              onClick={onSubmit}
              className="bg-orange-600 font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Create Retailer"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-black">
        {label}
      </label>
      {children}
    </div>
  );
}