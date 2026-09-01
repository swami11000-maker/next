"use client";

import { useEffect, useState, useCallback } from "react";
import { Edit2, Save, Trash2, X, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import type { Retailer } from "@/lib/auth";

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

const PROFILE_FIELDS: { key: keyof Retailer; label: string; type: "text" | "number" }[] = [
  { key: "name", label: "Name", type: "text" },
  { key: "mobile", label: "Mobile", type: "text" },
  { key: "email", label: "Email", type: "text" },
  { key: "status", label: "Status", type: "text" },
  { key: "balance", label: "Balance", type: "number" },
  { key: "usertype", label: "User Type", type: "text" },
];

const NUMERIC_KEYS = new Set(["balance", ...SERVICE_PAIRS.map((p) => p.fee)]);

function toPayload(data: Partial<Retailer>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || v === "") continue;
    out[k] = NUMERIC_KEYS.has(k) ? Number(v) : v;
  }
  return out;
}

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

export default function AdminRetailersPage() {
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, Partial<Retailer>>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<Retailer[]>("/api/admin/retailers");
      setRetailers(data);
    } catch {
      setRetailers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    api<Retailer[]>("/api/admin/retailers")
      .then((data) => {
        if (!cancelled) setRetailers(data);
      })
      .catch(() => {
        if (!cancelled) setRetailers([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function startEdit(row: Retailer) {
    setEditingId(row.id);
    setDrafts((d) => ({ ...d, [row.id]: { ...row } }));
  }

  function cancelEdit(row: Retailer) {
    setEditingId(null);
    setDrafts((d) => {
      const copy = { ...d };
      delete copy[row.id];
      return copy;
    });
  }

  function updateDraft(id: number, field: keyof Retailer, value: unknown) {
    setDrafts((d) => ({
      ...d,
      [id]: { ...d[id], [field]: value },
    }));
  }

  async function saveProfile(row: Retailer) {
    const draft = drafts[row.id] ?? {};
    setSavingId(row.id);
    try {
      await api<Retailer>(`/api/admin/retailers/${row.id}`, {
        method: "PUT",
        body: JSON.stringify(toPayload(draft)),
      });
      await load();
      setEditingId(null);
      setDrafts((d) => {
        const copy = { ...d };
        delete copy[row.id];
        return copy;
      });
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSavingId(null);
    }
  }

  async function saveField(row: Retailer, field: keyof Retailer, value: unknown) {
    try {
      await api(`/api/admin/retailers/${row.id}`, {
        method: "PUT",
        body: JSON.stringify(toPayload({ [field]: value })),
      });
      await load();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function toggleService(row: Retailer, service: string) {
    const current = row[service as keyof Retailer] === "yes";
    await saveField(row, service as keyof Retailer, current ? "no" : "yes");
  }

  async function saveFee(row: Retailer, fee: string, value: string) {
    await saveField(row, fee as keyof Retailer, value);
  }

  async function deleteRetailer(row: Retailer) {
    if (!confirm(`Delete retailer ${row.name}?`)) return;
    try {
      await api(`/api/admin/retailers/${row.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">All Retailers</h1>
          <p className="text-slate-500 dark:text-gray-400">
            View and manage every retailer profile, services, and pricing.
          </p>
        </div>
        <AddRetailerDialog onCreated={load} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Profile</TableHead>
              {PROFILE_FIELDS.slice(1).map((f) => (
                <TableHead key={f.key}>{f.label}</TableHead>
              ))}
              {SERVICE_PAIRS.map((p) => (
                <TableHead key={p.service}>{p.label} On/Off</TableHead>
              ))}
              {SERVICE_PAIRS.map((p) => (
                <TableHead key={p.fee}>{p.label} Fee</TableHead>
              ))}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={100} className="text-center py-8 text-slate-500">
                  Loading retailers...
                </TableCell>
              </TableRow>
            ) : retailers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={100} className="text-center py-8 text-slate-500">
                  No retailers found.
                </TableCell>
              </TableRow>
            ) : (
              retailers.map((row) => {
                const draft = drafts[row.id] ?? {};
                const isEdit = editingId === row.id;
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      {row.name}
                    </TableCell>
                    {PROFILE_FIELDS.slice(1).map((f) => {
                      const value = isEdit ? (draft[f.key] ?? row[f.key]) : row[f.key];
                      return (
                        <TableCell key={f.key}>
                          {isEdit ? (
                            <Input
                              type={f.type}
                              className="h-8 text-sm"
                              value={(draft[f.key] ?? row[f.key]) as string | number}
                              onChange={(e) =>
                                updateDraft(row.id, f.key, e.target.value)
                              }
                            />
                          ) : (
                            String(value ?? "")
                          )}
                        </TableCell>
                      );
                    })}
                    {SERVICE_PAIRS.map((p) => {
                      const val = (isEdit ? draft[p.service] : row[p.service]) ?? "no";
                      const on = val === "yes";
                      return (
                        <TableCell key={p.service} className="text-center">
                          {isEdit ? (
                            <select
                              className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                              value={String(draft[p.service] ?? row[p.service] ?? "no")}
                              onChange={(e) => updateDraft(row.id, p.service as keyof Retailer, e.target.value)}
                            >
                              <option value="yes">Yes</option>
                              <option value="no">No</option>
                            </select>
                          ) : (
                            <Button
                              size="sm"
                              variant={on ? "default" : "outline"}
                              className={on ? "bg-green-600 hover:bg-green-700" : ""}
                              onClick={() => toggleService(row, p.service)}
                              title={on ? "On" : "Off"}
                            >
                              {on ? "On" : "Off"}
                            </Button>
                          )}
                        </TableCell>
                      );
                    })}
                    {SERVICE_PAIRS.map((p) => (
                      <TableCell key={p.fee}>
                        {isEdit ? (
                          <Input
                            type="number"
                            className="h-8 text-sm w-20"
                            value={String(draft[p.fee as keyof Retailer] ?? row[p.fee as keyof Retailer] ?? 0)}
                            onChange={(e) => updateDraft(row.id, p.fee as keyof Retailer, e.target.value)}
                            onBlur={async (e) => {
                              await saveFee(row, p.fee, e.target.value);
                            }}
                          />
                        ) : (
                          String(row[p.fee as keyof Retailer] ?? 0)
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      {isEdit ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 mr-1"
                            onClick={() => saveProfile(row)}
                            disabled={savingId === row.id}
                            title="Save"
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7"
                            onClick={() => cancelEdit(row)}
                            title="Cancel"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 mr-1"
                            title="Edit"
                            onClick={() => startEdit(row)}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7"
                            title="Delete"
                            onClick={() => deleteRetailer(row)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function AddRetailerDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState<boolean>(false);
  const [form, setForm] = useState({ name: "", email: "", mobile: "", password: "", status: "unpaid", balance: 0, usertype: "retailer" });
  const [submitting, setSubmitting] = useState<boolean>(false);

  function reset() {
    setForm({ name: "", email: "", mobile: "", password: "", status: "unpaid", balance: 0, usertype: "retailer" });
  }

  async function onSubmit() {
    setSubmitting(true);
    try {
      await api("/api/admin/retailers", {
        method: "POST",
        body: JSON.stringify(form),
      });
      reset();
      setOpen(false);
      onCreated();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button
        variant="default"
        className="bg-[#ff3800] hover:bg-[#ff3800]/90"
        onClick={() => setOpen(true)}
      >
        <UserPlus className="h-4 w-4 mr-2" />
        Add Retailer
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
        <h2 className="text-lg font-semibold">Add New Retailer</h2>
        <div className="grid gap-3 mt-3">
          <div>
            <label className="block text-sm text-slate-600 dark:text-gray-300 mb-1">Name</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Full name"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 dark:text-gray-300 mb-1">Email</label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 dark:text-gray-300 mb-1">Mobile</label>
            <Input
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              placeholder="10-digit mobile"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 dark:text-gray-300 mb-1">Status</label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="unpaid">Unpaid</option>
              <option value="active">Active</option>
              <option value="panding">Pending</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-600 dark:text-gray-300 mb-1">User Type</label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.usertype}
              onChange={(e) => setForm({ ...form, usertype: e.target.value })}
            >
              <option value="retailer">Retailer</option>
              <option value="superAdmin">Super Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-600 dark:text-gray-300 mb-1">Balance</label>
            <Input
              type="number"
              value={String(form.balance)}
              onChange={(e) => setForm({ ...form, balance: Number(e.target.value) })}
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 dark:text-gray-300 mb-1">Password</label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Min 6 characters"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={() => { setOpen(false); reset(); }}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={submitting || !form.name || !form.email || !form.mobile || !form.password}
            onClick={onSubmit}
            className="bg-[#ff3800] hover:bg-[#ff3800]/90"
          >
            {submitting ? "Saving..." : "Create"}
          </Button>
        </div>
      </DialogContent>
      </Dialog>
    </>
  );
}
