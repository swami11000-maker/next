"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { AlertTriangle, Bike, Car, ClipboardList, ExternalLink, LayoutDashboard, RefreshCw, Stethoscope } from "lucide-react";
import { buttonVariants, Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { ServiceCard } from "@/components/admin/service-card";
import type { TwoWheelerRequest } from "@/lib/auth";

async function fetchPending(): Promise<TwoWheelerRequest[]> {
  const res = await fetch("/api/admin/2wheeler?status=panding", {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json() as Promise<TwoWheelerRequest[]>;
}

export default function AdminDashboard() {
  const [pending, setPending] = useState<TwoWheelerRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPending();
      setPending(data);
    } catch {
      setPending([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchPending()
      .then((data) => {
        if (!cancelled) setPending(data);
      })
      .catch(() => {
        if (!cancelled) setPending([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Dashboard</h1>
        <p className="text-slate-500 dark:text-gray-400">
          Manage all retailer services from here.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <ServiceCard
          title="Dashboard"
          description="Overview of all services"
          icon={<LayoutDashboard className="h-5 w-5 text-[#ff3800]" />}
        />
        <ServiceCard
          title="2 Wheeler"
          description="Pollution certificate for two-wheelers"
          icon={<Bike className="h-5 w-5 text-[#ff3800]" />}
        />
        <ServiceCard
          title="4 Wheeler"
          description="Pollution certificate for four-wheelers"
          icon={<Car className="h-5 w-5 text-[#ff3800]" />}
        />
        <ServiceCard
          title="LL Exam"
          description="Learning licence exam requests"
          icon={<ClipboardList className="h-5 w-5 text-[#ff3800]" />}
        />
        <ServiceCard
          title="Medical"
          description="Learning exam medical certificates"
          icon={<Stethoscope className="h-5 w-5 text-[#ff3800]" />}
        />
      </div>

      <Card className="border-0 shadow-lg rounded-3xl dark:bg-black/60 dark:border-[#ff3800]/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
            Pending 2-Wheeler Requests
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={load} disabled={loading} title="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <Alert className="rounded-xl border-green-200 bg-green-50 text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400">
              <AlertTitle>No pending requests</AlertTitle>
              <AlertDescription>
                There are currently no pending 2-wheeler PUC requests.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Alert variant="default" className="rounded-xl border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 mb-3">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{pending.length} pending request(s)</AlertTitle>
                <AlertDescription>
                  New requests from retailers are waiting for your review.
                </AlertDescription>
              </Alert>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle No</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Applied</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pending.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-mono text-sm">{row.vehicle_no}</TableCell>
                        <TableCell>{row.mobile_no}</TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {row.apply_date_time?.slice(0, 16).replace("T", " ") ?? "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link
                            href="/admin/2wheeler"
                            className={buttonVariants({ variant: "outline", size: "sm" })}
                          >
                            Process
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
