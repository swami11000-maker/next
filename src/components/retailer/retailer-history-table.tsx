"use client";

import * as React from "react";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Search,
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

import { apiFetch } from "@/lib/api-client";

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
  document?: string | null;
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

const API_URL = "/api/work-history";

/* -------------------------------------------------------------------------- */
/*                           DOCUMENT HELPERS                                 */
/* -------------------------------------------------------------------------- */

const cleanBase64 = (value: string) => {
  return value
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\\:/g, ":")
    .replace(/\s+/g, "");
};

const isDataUrl = (value: string) => {
  return /^data:[^;]+;base64,/i.test(value);
};

const getMimeType = (value: string): string => {
  const cleaned = cleanBase64(value);

  // Data URL
  const dataUrlMatch = cleaned.match(/^data:([^;]+);base64,/i);

  if (dataUrlMatch?.[1]) {
    return dataUrlMatch[1].toLowerCase();
  }

  // PDF
  if (
    cleaned.startsWith("JVBERi0") ||
    cleaned.startsWith("JVBER")
  ) {
    return "application/pdf";
  }

  // PNG
  if (
    cleaned.startsWith("iVBORw0KGgo") ||
    cleaned.startsWith("iVBOR")
  ) {
    return "image/png";
  }

  // JPEG / JPG
  if (
    cleaned.startsWith("/9j/") ||
    cleaned.startsWith("/9j")
  ) {
    return "image/jpeg";
  }

  // GIF
  if (cleaned.startsWith("R0lGOD")) {
    return "image/gif";
  }

  // WEBP
  if (cleaned.startsWith("UklGR")) {
    return "image/webp";
  }

  // SVG encoded as base64
  if (cleaned.startsWith("PHN2Zy")) {
    return "image/svg+xml";
  }

  // ZIP / DOCX / XLSX etc.
  if (cleaned.startsWith("UEsDB")) {
    return "application/zip";
  }

  return "application/octet-stream";
};

const getExtensionFromMime = (mime: string): string => {
  const mimeMap: Record<string, string> = {
    "application/pdf": "pdf",
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "application/zip": "zip",
    "application/octet-stream": "bin",
  };

  return mimeMap[mime.toLowerCase()] || "bin";
};

const getFileName = (
  documentValue: string,
  item: Transition
): string => {
  const mime = getMimeType(documentValue);
  const extension = getExtensionFromMime(mime);

  const orderId =
    String(item.order_id || `document-${item.id}`)
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .replace(/-+/g, "-");

  return `${orderId}.${extension}`;
};

const base64ToBlob = (
  value: string,
  mimeType: string
): Blob => {
  let base64 = cleanBase64(value);

  // Remove data URL prefix
  if (isDataUrl(base64)) {
    base64 = base64.split(",")[1] || "";
  }

  // Browser-safe Base64 decode
  const byteCharacters = atob(base64);

  const sliceSize = 1024 * 1024;
  const byteArrays: ArrayBuffer[] = [];

  for (
    let offset = 0;
    offset < byteCharacters.length;
    offset += sliceSize
  ) {
    const slice = byteCharacters.slice(
      offset,
      offset + sliceSize
    );

    const byteNumbers = new Uint8Array(slice.length);

    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    const buffer = new ArrayBuffer(byteNumbers.length);
    new Uint8Array(buffer).set(byteNumbers);

    byteArrays.push(buffer);
  }

  return new Blob(byteArrays, {
    type: mimeType,
  });
};

const downloadDocument = (item: Transition) => {
  try {
    const value = item.document;

    if (!value || !value.trim()) {
      return;
    }

    const cleaned = cleanBase64(value);

    if (!cleaned) {
      return;
    }

    const mimeType = getMimeType(cleaned);
    const fileName = getFileName(cleaned, item);

    let blob: Blob;

    /*
     * Data URL
     *
     * Example:
     * data:application/pdf;base64,JVBERi0x...
     */
    if (isDataUrl(cleaned)) {
      const base64Part = cleaned.split(",")[1] || "";

      blob = base64ToBlob(
        base64Part,
        mimeType
      );
    } else {
      /*
       * Raw Base64
       *
       * Example:
       * JVBERi0xLjQKJeLjz9MK...
       */
      blob = base64ToBlob(
        cleaned,
        mimeType
      );
    }

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = fileName;

    document.body.appendChild(link);

    link.click();

    link.remove();

    // Give browser enough time before revoking
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  } catch (error) {
    console.error(
      "Document download error:",
      error
    );

    alert(
      "Unable to download this document. The document data may be invalid."
    );
  }
};

const getDocumentType = (
  value?: string | null
) => {
  if (!value?.trim()) {
    return null;
  }

  const mime = getMimeType(value);

  if (mime === "application/pdf") {
    return "PDF";
  }

  if (mime.startsWith("image/")) {
    return mime
      .replace("image/", "")
      .toUpperCase();
  }

  if (mime === "application/zip") {
    return "ZIP";
  }

  return "FILE";
};

/* -------------------------------------------------------------------------- */
/*                              MAIN COMPONENT                                */
/* -------------------------------------------------------------------------- */

export const RetailerHistory = () => {
  const [data, setData] =
    React.useState<Transition[]>([]);

  const [loading, setLoading] =
    React.useState(true);

  const [error, setError] =
    React.useState("");

  const [search, setSearch] =
    React.useState("");

  const [statusFilter, setStatusFilter] =
    React.useState("all");

  const [transferFilter, setTransferFilter] =
    React.useState("all");

  const [sortKey, setSortKey] =
    React.useState<SortKey>("date_time");

  const [sortDirection, setSortDirection] =
    React.useState<SortDirection>("desc");

  const fetchHistory =
    React.useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const response = await apiFetch(
          API_URL,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result?.message ||
              "Failed to fetch history"
          );
        }

        setData(result?.data || []);
      } catch (err: any) {
        console.error(
          "Retailer History Error:",
          err
        );

        setError(
          err?.message ||
            "Something went wrong while loading history"
        );
      } finally {
        setLoading(false);
      }
    }, []);

  React.useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  /* ---------------------------------------------------------------------- */
  /*                                SORTING                                 */
  /* ---------------------------------------------------------------------- */

  const handleSort = (
    key: SortKey
  ) => {
    if (sortKey === key) {
      setSortDirection((prev) =>
        prev === "asc"
          ? "desc"
          : "asc"
      );
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({
    column,
  }: {
    column: SortKey;
  }) => {
    if (sortKey !== column) {
      return (
        <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-40" />
      );
    }

    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 h-3.5 w-3.5" />
    ) : (
      <ArrowDown className="ml-1 h-3.5 w-3.5" />
    );
  };

  /* ---------------------------------------------------------------------- */
  /*                              FILTERING                                  */
  /* ---------------------------------------------------------------------- */

  const filteredData =
    React.useMemo(() => {
      const searchValue =
        search.toLowerCase().trim();

      const result = data.filter(
        (item) => {
          const matchesSearch =
            !searchValue ||
            String(item.id)
              .toLowerCase()
              .includes(searchValue) ||
            String(item.order_id)
              .toLowerCase()
              .includes(searchValue) ||
            String(item.user_mob)
              .toLowerCase()
              .includes(searchValue) ||
            String(item.service_name)
              .toLowerCase()
              .includes(searchValue) ||
            String(item.tranfer_type)
              .toLowerCase()
              .includes(searchValue) ||
            String(item.status)
              .toLowerCase()
              .includes(searchValue) ||
            String(item.remark || "")
              .toLowerCase()
              .includes(searchValue);

          const matchesStatus =
            statusFilter === "all" ||
            item.status?.toLowerCase() ===
              statusFilter.toLowerCase();

          const matchesTransfer =
            transferFilter === "all" ||
            item.tranfer_type?.toLowerCase() ===
              transferFilter.toLowerCase();

          return (
            matchesSearch &&
            matchesStatus &&
            matchesTransfer
          );
        }
      );

      result.sort((a, b) => {
        let valueA: any =
          a[sortKey];

        let valueB: any =
          b[sortKey];

        if (sortKey === "date_time") {
          valueA = new Date(
            valueA
          ).getTime();

          valueB = new Date(
            valueB
          ).getTime();
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

        if (
          typeof valueA === "string"
        ) {
          valueA =
            valueA.toLowerCase();
        }

        if (
          typeof valueB === "string"
        ) {
          valueB =
            valueB.toLowerCase();
        }

        if (valueA < valueB) {
          return sortDirection ===
            "asc"
            ? -1
            : 1;
        }

        if (valueA > valueB) {
          return sortDirection ===
            "asc"
            ? 1
            : -1;
        }

        return 0;
      });

      return result;
    }, [
      data,
      search,
      statusFilter,
      transferFilter,
      sortKey,
      sortDirection,
    ]);

  const statuses =
    React.useMemo(
      () =>
        Array.from(
          new Set(
            data
              .map(
                (item) =>
                  item.status
              )
              .filter(Boolean)
          )
        ),
      [data]
    );

  const transferTypes =
    React.useMemo(
      () =>
        Array.from(
          new Set(
            data
              .map(
                (item) =>
                  item.tranfer_type
              )
              .filter(Boolean)
          )
        ),
      [data]
    );

  /* ---------------------------------------------------------------------- */
  /*                              FORMATTERS                                 */
  /* ---------------------------------------------------------------------- */

  const formatAmount = (
    value: number | string
  ) => {
    const amount =
      Number(value || 0);

    return `₹${amount.toLocaleString(
      "en-IN",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
  };

  const formatDate = (
    value: string
  ) => {
    if (!value) {
      return "-";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    return date.toLocaleString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }
    );
  };

  /* ---------------------------------------------------------------------- */
  /*                                FILTERS                                  */
  /* ---------------------------------------------------------------------- */

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setTransferFilter("all");
  };

  const hasFilters =
    search !== "" ||
    statusFilter !== "all" ||
    transferFilter !== "all";

  /* ---------------------------------------------------------------------- */
  /*                                LOADING                                  */
  /* ---------------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="flex min-h-[350px] items-center justify-center bg-white text-black">
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin" />

          <span>
            Loading retailer history...
          </span>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /*                                  ERROR                                  */
  /* ---------------------------------------------------------------------- */

  if (error) {
    return (
      <div className="flex min-h-[350px] flex-col items-center justify-center gap-4 bg-white text-black">
        <p className="text-sm text-red-600">
          {error}
        </p>

        <Button
          variant="outline"
          onClick={fetchHistory}
          className="gap-2 border-gray-300 bg-white text-black hover:bg-gray-100"
        >
          <RefreshCw className="h-4 w-4" />

          Try Again
        </Button>
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /*                                  UI                                    */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="w-full space-y-5 rounded-4xl bg-white p-4 text-black">

      {/* HEADER */}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Retailer History
          </h2>

          <p className="text-sm text-gray-600">
            View all your transaction history
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchHistory}
          className="w-fit gap-2 border-gray-300 bg-white text-black hover:bg-gray-100"
        >
          <RefreshCw className="h-4 w-4" />

          Refresh
        </Button>
      </div>

      {/* FILTERS */}

      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />

          <Input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search order, service, mobile, status..."
            className="border-gray-300 bg-white pl-9 text-black placeholder:text-gray-400 focus:border-gray-400 focus:ring-gray-400"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(value) =>
            setStatusFilter(
              value || "all"
            )
          }
        >
          <SelectTrigger className="w-full border-gray-300 bg-white text-black md:w-[170px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>

          <SelectContent className="bg-white text-black">
            <SelectItem value="all">
              All Status
            </SelectItem>

            {statuses.map(
              (status) => (
                <SelectItem
                  key={status}
                  value={status}
                >
                  {status}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>

        <Select
          value={transferFilter}
          onValueChange={(value) =>
            setTransferFilter(
              value || "all"
            )
          }
        >
          <SelectTrigger className="w-full border-gray-300 bg-white text-black md:w-[190px]">
            <SelectValue placeholder="Transfer Type" />
          </SelectTrigger>

          <SelectContent className="bg-white text-black">
            <SelectItem value="all">
              All Transfer Types
            </SelectItem>

            {transferTypes.map(
              (type) => (
                <SelectItem
                  key={type}
                  value={type}
                >
                  {type}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="icon"
            onClick={clearFilters}
            title="Clear filters"
            className="text-gray-500 hover:bg-gray-100 hover:text-black"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* COUNT */}

      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          Showing{" "}
          <strong className="font-semibold text-black">
            {filteredData.length}
          </strong>{" "}
          of{" "}
          <strong className="font-semibold text-black">
            {data.length}
          </strong>{" "}
          transactions
        </span>
      </div>

      {/* TABLE */}

      <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="w-full overflow-x-auto">
          <Table>

            {/* TABLE HEADER */}

            <TableHeader className="bg-gray-50">
              <TableRow>

                <TableHead className="text-black">
                  <button
                    onClick={() =>
                      handleSort("id")
                    }
                    className="flex items-center font-medium hover:text-black"
                  >
                    #
                    <SortIcon column="id" />
                  </button>
                </TableHead>

                <TableHead className="text-black">
                  <button
                    onClick={() =>
                      handleSort("order_id")
                    }
                    className="flex items-center whitespace-nowrap font-medium"
                  >
                    Order ID
                    <SortIcon column="order_id" />
                  </button>
                </TableHead>

                <TableHead className="text-black">
                  Mobile
                </TableHead>

                <TableHead className="text-black">
                  <button
                    onClick={() =>
                      handleSort(
                        "service_name"
                      )
                    }
                    className="flex items-center font-medium"
                  >
                    Service
                    <SortIcon column="service_name" />
                  </button>
                </TableHead>

                <TableHead className="text-black">
                  <button
                    onClick={() =>
                      handleSort(
                        "old_balance"
                      )
                    }
                    className="flex items-center whitespace-nowrap font-medium"
                  >
                    Old Balance
                    <SortIcon column="old_balance" />
                  </button>
                </TableHead>

                <TableHead className="text-black">
                  <button
                    onClick={() =>
                      handleSort("charge")
                    }
                    className="flex items-center font-medium"
                  >
                    Charge
                    <SortIcon column="charge" />
                  </button>
                </TableHead>

                <TableHead className="text-black">
                  <button
                    onClick={() =>
                      handleSort(
                        "new_balance"
                      )
                    }
                    className="flex items-center whitespace-nowrap font-medium"
                  >
                    New Balance
                    <SortIcon column="new_balance" />
                  </button>
                </TableHead>

                <TableHead className="text-black">
                  <button
                    onClick={() =>
                      handleSort(
                        "tranfer_type"
                      )
                    }
                    className="flex items-center whitespace-nowrap font-medium"
                  >
                    Transfer Type
                    <SortIcon column="tranfer_type" />
                  </button>
                </TableHead>

                <TableHead className="text-black">
                  <button
                    onClick={() =>
                      handleSort("status")
                    }
                    className="flex items-center font-medium"
                  >
                    Status
                    <SortIcon column="status" />
                  </button>
                </TableHead>

                <TableHead className="text-black">
                  <button
                    onClick={() =>
                      handleSort(
                        "date_time"
                      )
                    }
                    className="flex items-center whitespace-nowrap font-medium"
                  >
                    Date & Time
                    <SortIcon column="date_time" />
                  </button>
                </TableHead>

                <TableHead className="text-black">
                  Remark
                </TableHead>

                <TableHead className="whitespace-nowrap text-black">
                  Document
                </TableHead>

              </TableRow>
            </TableHeader>

            {/* TABLE BODY */}

            <TableBody>

              {filteredData.length ===
              0 ? (
                <TableRow>
                  <TableCell
                    colSpan={12}
                    className="h-32 text-center text-black"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <p className="font-medium">
                        No transactions found
                      </p>

                      <p className="text-sm text-gray-500">
                        Try changing your search or filters.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map(
                  (item) => (
                    <TableRow
                      key={item.id}
                      className="border-b border-gray-100 transition-colors hover:bg-gray-50"
                    >

                      {/* ID */}

                      <TableCell className="font-medium text-black">
                        {item.id}
                      </TableCell>

                      {/* ORDER */}

                      <TableCell className="whitespace-nowrap font-mono text-xs text-black">
                        {item.order_id ||
                          "-"}
                      </TableCell>

                      {/* MOBILE */}

                      <TableCell className="whitespace-nowrap text-black">
                        {item.user_mob ||
                          "-"}
                      </TableCell>

                      {/* SERVICE */}

                      <TableCell className="whitespace-nowrap font-medium text-black">
                        {item.service_name ||
                          "-"}
                      </TableCell>

                      {/* OLD BALANCE */}

                      <TableCell className="whitespace-nowrap text-black">
                        {formatAmount(
                          item.old_balance
                        )}
                      </TableCell>

                      {/* CHARGE */}

                      <TableCell className="whitespace-nowrap font-medium text-red-600">
                        -
                        {formatAmount(
                          item.charge
                        )}
                      </TableCell>

                      {/* NEW BALANCE */}

                      <TableCell className="whitespace-nowrap font-medium text-black">
                        {formatAmount(
                          item.new_balance
                        )}
                      </TableCell>

                      {/* TRANSFER TYPE */}

                      <TableCell>
                        <Badge
                          variant="outline"
                          className="border-gray-300 bg-white text-black"
                        >
                          {item.tranfer_type ||
                            "-"}
                        </Badge>
                      </TableCell>

                      {/* STATUS */}

                      <TableCell>
                        <Badge
                          className={
                            item.status?.toLowerCase() ===
                              "success" ||
                            item.status?.toLowerCase() ===
                              "completed"
                              ? "bg-green-100 text-green-800"
                              : item.status?.toLowerCase() ===
                                  "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : item.status?.toLowerCase() ===
                                    "failed" ||
                                item.status?.toLowerCase() ===
                                    "cancelled"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }
                        >
                          {item.status ||
                            "Unknown"}
                        </Badge>
                      </TableCell>

                      {/* DATE */}

                      <TableCell className="whitespace-nowrap text-sm text-black">
                        {formatDate(
                          item.date_time
                        )}
                      </TableCell>

                      {/* REMARK */}

                      <TableCell className="max-w-[250px] text-black">
                        <div className="max-w-[250px] truncate">
                          {item.remark ||
                            "-"}
                        </div>
                      </TableCell>

                      {/* DOCUMENT */}

                      <TableCell>
                        {item.document ? (
                          <div className="flex items-center gap-2">

                            <Button
                              type="button"
                              size="sm"
                              onClick={() =>
                                downloadDocument(
                                  item
                                )
                              }
                              className="gap-2 bg-black text-white hover:bg-gray-800"
                            >
                              <Download className="h-4 w-4" />

                              Download
                            </Button>

                            <Badge
                              variant="outline"
                              className="whitespace-nowrap border-gray-300 bg-white text-xs text-black"
                            >
                              <FileText className="mr-1 h-3 w-3" />

                              {getDocumentType(
                                item.document
                              )}
                            </Badge>

                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">
                            No document
                          </span>
                        )}
                      </TableCell>

                    </TableRow>
                  )
                )
              )}

            </TableBody>

          </Table>
        </div>
      </div>
    </div>
  );
};
