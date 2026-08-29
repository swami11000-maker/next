"use client";

import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  Search,
  RefreshCw,
  Loader2,
  X,
} from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Badge } from "@/components/ui/badge";

interface Transition {
  id: number;
  order_id: string;
  user_mob: string;
  service_name: string;
  old_balance: number | string;
  charge: number | string;
  new_balance: number | string;
  tranfer_type: string;
  status: string;
  date_time: string;
  remark: string | null;
}

type SortKey =
  | "id"
  | "order_id"
  | "service_name"
  | "old_balance"
  | "charge"
  | "new_balance"
  | "tranfer_type"
  | "status"
  | "date_time";

type SortDirection = "asc" | "desc";

const API_URL = "/api/transitions";

export const Transitions = () => {
  const [transitions, setTransitions] = React.useState<Transition[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [transferFilter, setTransferFilter] = React.useState("all");

  const [sortKey, setSortKey] = React.useState<SortKey>("date_time");
  const [sortDirection, setSortDirection] =
    React.useState<SortDirection>("desc");

  const fetchTransitions = React.useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(API_URL, {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || "Failed to fetch transitions");
      }

      setTransitions(result?.data || []);
    } catch (err: any) {
      console.error("Transitions fetch error:", err);
      setError(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchTransitions();
  }, [fetchTransitions]);

  // ---------------------------------------------
  // Sorting
  // ---------------------------------------------
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) {
      return <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-40" />;
    }

    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 h-3.5 w-3.5" />
    ) : (
      <ArrowDown className="ml-1 h-3.5 w-3.5" />
    );
  };

  // ---------------------------------------------
  // Filter + Sort
  // ---------------------------------------------
  const filteredTransitions = React.useMemo(() => {
    const searchValue = search.toLowerCase().trim();

    const filtered = transitions.filter((item) => {
      const matchesSearch =
        !searchValue ||
        String(item.id).toLowerCase().includes(searchValue) ||
        String(item.order_id).toLowerCase().includes(searchValue) ||
        String(item.user_mob).toLowerCase().includes(searchValue) ||
        String(item.service_name).toLowerCase().includes(searchValue) ||
        String(item.tranfer_type).toLowerCase().includes(searchValue) ||
        String(item.status).toLowerCase().includes(searchValue) ||
        String(item.remark || "").toLowerCase().includes(searchValue);

      const matchesStatus =
        statusFilter === "all" ||
        item.status?.toLowerCase() === statusFilter.toLowerCase();

      const matchesTransfer =
        transferFilter === "all" ||
        item.tranfer_type?.toLowerCase() ===
          transferFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesTransfer;
    });

    filtered.sort((a, b) => {
      let valueA: any = a[sortKey];
      let valueB: any = b[sortKey];

      if (sortKey === "date_time") {
        valueA = new Date(valueA).getTime();
        valueB = new Date(valueB).getTime();
      }

      if (
        sortKey === "id" ||
        sortKey === "old_balance" ||
        sortKey === "charge" ||
        sortKey === "new_balance"
      ) {
        valueA = Number(valueA);
        valueB = Number(valueB);
      }

      if (typeof valueA === "string") {
        valueA = valueA.toLowerCase();
      }

      if (typeof valueB === "string") {
        valueB = valueB.toLowerCase();
      }

      if (valueA < valueB) {
        return sortDirection === "asc" ? -1 : 1;
      }

      if (valueA > valueB) {
        return sortDirection === "asc" ? 1 : -1;
      }

      return 0;
    });

    return filtered;
  }, [
    transitions,
    search,
    statusFilter,
    transferFilter,
    sortKey,
    sortDirection,
  ]);

  // ---------------------------------------------
  // Unique Filters
  // ---------------------------------------------
  const statuses = React.useMemo(() => {
    return Array.from(
      new Set(
        transitions
          .map((item) => item.status)
          .filter(Boolean)
      )
    );
  }, [transitions]);

  const transferTypes = React.useMemo(() => {
    return Array.from(
      new Set(
        transitions
          .map((item) => item.tranfer_type)
          .filter(Boolean)
      )
    );
  }, [transitions]);

  // ---------------------------------------------
  // Helpers
  // ---------------------------------------------
  const formatAmount = (value: number | string) => {
    const amount = Number(value || 0);

    return `₹${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (date: string) => {
    if (!date) return "-";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case "success":
      case "completed":
      case "complete":
        return "default";

      case "pending":
        return "secondary";

      case "failed":
      case "cancelled":
      case "rejected":
        return "destructive";

      default:
        return "outline";
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setTransferFilter("all");
  };

  const hasFilters =
    search !== "" ||
    statusFilter !== "all" ||
    transferFilter !== "all";

  // ---------------------------------------------
  // Loading
  // ---------------------------------------------
  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading transitions...</span>
        </div>
      </div>
    );
  }

  // ---------------------------------------------
  // Error
  // ---------------------------------------------
  if (error) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-4">
        <p className="text-sm text-destructive">{error}</p>

        <Button
          variant="outline"
          onClick={fetchTransitions}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Transaction History
          </h2>

          <p className="text-sm text-muted-foreground">
            View and manage all your transactions
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchTransitions}
          className="w-fit gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 md:flex-row md:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            placeholder="Search order, service, mobile, status..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status */}
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value || "all")}
        >
          <SelectTrigger className="w-full md:w-[170px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>

            {statuses.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Transfer Type */}
        <Select
          value={transferFilter}
          onValueChange={(value) =>
            setTransferFilter(value || "all")
          }
        >
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Transfer Type" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">
              All Transfer Types
            </SelectItem>

            {transferTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear */}
        {hasFilters && (
          <Button
            variant="ghost"
            size="icon"
            onClick={clearFilters}
            title="Clear filters"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Result Count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing{" "}
          <strong className="text-foreground">
            {filteredTransitions.length}
          </strong>{" "}
          of{" "}
          <strong className="text-foreground">
            {transitions.length}
          </strong>{" "}
          transactions
        </span>
      </div>

      {/* Table */}
      <div className="w-full overflow-hidden rounded-xl border bg-card">
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button
                    onClick={() => handleSort("id")}
                    className="flex items-center font-medium hover:text-foreground"
                  >
                    #
                    <SortIcon column="id" />
                  </button>
                </TableHead>

                <TableHead>
                  <button
                    onClick={() => handleSort("order_id")}
                    className="flex items-center font-medium hover:text-foreground"
                  >
                    Order ID
                    <SortIcon column="order_id" />
                  </button>
                </TableHead>

                <TableHead>Mobile</TableHead>

                <TableHead>
                  <button
                    onClick={() => handleSort("service_name")}
                    className="flex items-center font-medium hover:text-foreground"
                  >
                    Service
                    <SortIcon column="service_name" />
                  </button>
                </TableHead>

                <TableHead>
                  <button
                    onClick={() => handleSort("old_balance")}
                    className="flex items-center font-medium hover:text-foreground"
                  >
                    Old Balance
                    <SortIcon column="old_balance" />
                  </button>
                </TableHead>

                <TableHead>
                  <button
                    onClick={() => handleSort("charge")}
                    className="flex items-center font-medium hover:text-foreground"
                  >
                    Charge
                    <SortIcon column="charge" />
                  </button>
                </TableHead>

                <TableHead>
                  <button
                    onClick={() => handleSort("new_balance")}
                    className="flex items-center font-medium hover:text-foreground"
                  >
                    New Balance
                    <SortIcon column="new_balance" />
                  </button>
                </TableHead>

                <TableHead>
                  <button
                    onClick={() => handleSort("tranfer_type")}
                    className="flex items-center font-medium hover:text-foreground"
                  >
                    Transfer Type
                    <SortIcon column="tranfer_type" />
                  </button>
                </TableHead>

                <TableHead>
                  <button
                    onClick={() => handleSort("status")}
                    className="flex items-center font-medium hover:text-foreground"
                  >
                    Status
                    <SortIcon column="status" />
                  </button>
                </TableHead>

                <TableHead>
                  <button
                    onClick={() => handleSort("date_time")}
                    className="flex items-center font-medium hover:text-foreground"
                  >
                    Date & Time
                    <SortIcon column="date_time" />
                  </button>
                </TableHead>

                <TableHead>Remark</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredTransitions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={11}
                    className="h-32 text-center"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <p className="font-medium">
                        No transactions found
                      </p>

                      <p className="text-sm text-muted-foreground">
                        Try changing your search or filters.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransitions.map((item) => (
                  <TableRow
                    key={item.id}
                    className="transition-colors hover:bg-muted/50"
                  >
                    {/* ID */}
                    <TableCell className="font-medium">
                      {item.id}
                    </TableCell>

                    {/* Order ID */}
                    <TableCell className="whitespace-nowrap font-mono text-xs">
                      {item.order_id || "-"}
                    </TableCell>

                    {/* Mobile */}
                    <TableCell className="whitespace-nowrap">
                      {item.user_mob || "-"}
                    </TableCell>

                    {/* Service */}
                    <TableCell className="whitespace-nowrap font-medium">
                      {item.service_name || "-"}
                    </TableCell>

                    {/* Old Balance */}
                    <TableCell className="whitespace-nowrap">
                      {formatAmount(item.old_balance)}
                    </TableCell>

                    {/* Charge */}
                    <TableCell className="whitespace-nowrap font-medium text-destructive">
                      -{formatAmount(item.charge)}
                    </TableCell>

                    {/* New Balance */}
                    <TableCell className="whitespace-nowrap font-medium">
                      {formatAmount(item.new_balance)}
                    </TableCell>

                    {/* Transfer Type */}
                    <TableCell>
                      <Badge variant="outline">
                        {item.tranfer_type || "-"}
                      </Badge>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge
                        variant={getStatusVariant(item.status)}
                      >
                        {item.status || "Unknown"}
                      </Badge>
                    </TableCell>

                    {/* Date */}
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatDate(item.date_time)}
                    </TableCell>

                    {/* Remark */}
                    <TableCell className="max-w-[250px] truncate">
                      {item.remark || "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};