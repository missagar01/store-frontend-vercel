import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { ClipboardCheck, ChevronLeft, ChevronRight } from "lucide-react";
import Heading from "../element/Heading";
import { Pill } from "../ui/pill";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "../ui/button";
import { z } from "zod";
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel } from "../ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Input } from "../ui/input";
import { PuffLoader as Loader } from "react-spinners";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { API_URL } from "@/api";

const APPROVE_API_BASE = `${API_URL}/three-party-approval`;
const PAGE_SIZE = 50;

interface IndentRow {
  PLANNEDTIMESTAMP?: string | null;
  INDENT_NUMBER: string;
  INDENT_DATE: string;
  INDENTER_NAME: string;
  DIVISION: string;
  DEPARTMENT: string;
  ITEM_NAME: string;
  UM: string;
  REQUIRED_QTY: number;
  REMARK: string;
  SPECIFICATION: string;
  COST_PROJECT: string;
  CANCELLEDDATE?: string | null;
  CANCELLED_REMARK?: string | null;
  PO_NO?: string | null;
  PO_QTY?: number | null;
  VENDOR_TYPE?: string;
}

interface PaginationBarProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

// 🔹 Pagination bar – max 3 buttons (1,2,3 style)
function PaginationBar({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  isLoading,
}: PaginationBarProps) {
  if (totalItems === 0) return null;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalItems);

  const pages: number[] = [];

  if (totalPages <= 3) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    if (currentPage <= 2) {
      pages.push(1, 2, 3);
    } else if (currentPage >= totalPages - 1) {
      pages.push(totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(currentPage - 1, currentPage, currentPage + 1);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mt-3 text-sm text-muted-foreground">
      <span>
        Showing{" "}
        <span className="font-semibold">
          {startIndex.toLocaleString("en-IN")}
        </span>
        –
        <span className="font-semibold">
          {endIndex.toLocaleString("en-IN")}
        </span>{" "}
        of{" "}
        <span className="font-semibold">
          {totalItems.toLocaleString("en-IN")}
        </span>
      </span>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || isLoading}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {pages.map((p) => (
          <Button
            key={p}
            variant={p === currentPage ? "default" : "outline"}
            size="icon"
            onClick={() => onPageChange(p)}
            disabled={isLoading || p === currentPage}
          >
            {p}
          </Button>
        ))}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || isLoading}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>

        {isLoading && (
          <span className="ml-2 flex items-center gap-1 text-xs">
            <Loader size={14} />
            Loading...
          </span>
        )}
      </div>
    </div>
  );
}

// ✅ safe lower helper (null/undefined handle karega)
const safeLower = (v: string | null | undefined) =>
  (v ?? "").toString().toLowerCase();

export default function ApproveIndent() {
  const { user } = useAuth();

  // ✅ FULL data from backend (NO backend pagination)
  const [pendingAll, setPendingAll] = useState<IndentRow[]>([]);
  const [historyAll, setHistoryAll] = useState<IndentRow[]>([]);

  // derived pagination/search state
  const [pendingPage, setPendingPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [pendingSearch, setPendingSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [selectedIndent, setSelectedIndent] = useState<IndentRow | null>(null);
  const [openDialog, setOpenDialog] = useState(false);

  // ✅ helper to fetch with token
  async function fetchWithToken(
    base: string,
    path: string,
    init?: RequestInit
  ) {
    const token = localStorage.getItem("token");
    const headers: Record<string, string> = {
      ...(init?.headers as Record<string, string>),
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const res = await fetch(`${base}${path}`, {
      ...init,
      headers,
    });
    return res;
  }

  // map API data → IndentRow
  // 🔴 YAHAN null se bachne ke liye || "" laga diya
  const mapData = (data: any[]): IndentRow[] =>
    data.map((item: any) => ({
      PLANNEDTIMESTAMP: item.PLANNEDTIMESTAMP || null,
      INDENT_NUMBER: item.INDENT_NUMBER || "",
      INDENT_DATE: item.INDENT_DATE || "",
      INDENTER_NAME: item.INDENTER_NAME || "",
      DIVISION: item.DIVISION || "",
      DEPARTMENT: item.DEPARTMENT || "",
      ITEM_NAME: item.ITEM_NAME || "",
      UM: item.UM || "",
      REQUIRED_QTY:
        typeof item.REQUIRED_QTY === "number"
          ? item.REQUIRED_QTY
          : Number(item.REQUIRED_QTY || 0),
      REMARK: item.REMARK || "",
      SPECIFICATION: item.SPECIFICATION || "",
      COST_PROJECT: item.COST_PROJECT || "",
      CANCELLEDDATE: item.CANCELLEDDATE || null,
      CANCELLED_REMARK: item.CANCELLED_REMARK || null,
      PO_NO: item.PO_NO || null,
      PO_QTY:
        typeof item.PO_QTY === "number" ? item.PO_QTY : Number(item.PO_QTY || 0),
      VENDOR_TYPE: item.VENDOR_TYPE || null,
    }));

  // 🔹 Pending – FULL LIST fetch (no page)
  async function fetchPending() {
    const res = await fetchWithToken(API_URL, `/store-indent/pending`);
    if (!res.ok) throw new Error("Failed to fetch pending indents");
    const json = await res.json();
    const rows = Array.isArray(json.data) ? json.data : [];
    setPendingAll(mapData(rows));
    setPendingPage(1);
  }

  // 🔹 History – FULL LIST fetch (no page)
  async function fetchHistory() {
    const res = await fetchWithToken(API_URL, `/store-indent/history`);
    if (!res.ok) throw new Error("Failed to fetch history");
    const json = await res.json();
    const rows = Array.isArray(json.data) ? json.data : [];
    setHistoryAll(mapData(rows));
    setHistoryPage(1);
  }

  // Initial load
  async function fetchInitial() {
    try {
      setLoading(true);
      await Promise.all([fetchPending(), fetchHistory()]);
    } catch (err) {
      toast.error("Failed to fetch indents");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInitial();
  }, []);

  const formatDate = (dateString?: string | null) =>
    dateString
      ? new Date(dateString).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "";

  const formatDateTime = (dateString?: string | null) =>
    dateString
      ? new Date(dateString).toLocaleString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      : "";

  /* =========================
     FILTER + PAGINATION (PENDING)
     ========================= */
  const pendingQuery = pendingSearch.trim().toLowerCase();
  const pendingFiltered = pendingQuery
    ? pendingAll.filter((row) => {
        const q = pendingQuery;
        return (
          safeLower(row.INDENT_NUMBER).includes(q) ||
          safeLower(row.ITEM_NAME).includes(q) ||
          safeLower(row.DEPARTMENT).includes(q) ||
          safeLower(row.INDENTER_NAME).includes(q)
        );
      })
    : pendingAll;

  const pendingTotal = pendingFiltered.length;
  const pendingTotalPages = Math.max(
    1,
    Math.ceil(pendingTotal / PAGE_SIZE) || 1
  );
  const pendingCurrentPage = Math.min(pendingPage, pendingTotalPages);
  const pendingStartIndex = (pendingCurrentPage - 1) * PAGE_SIZE;
  const pendingPageRows = pendingFiltered.slice(
    pendingStartIndex,
    pendingStartIndex + PAGE_SIZE
  );

  /* =========================
     FILTER + PAGINATION (HISTORY)
     ========================= */
  const historyQuery = historySearch.trim().toLowerCase();
  const historyFiltered = historyQuery
    ? historyAll.filter((row) => {
        const q = historyQuery;
        return (
          safeLower(row.INDENT_NUMBER).includes(q) ||
          safeLower(row.ITEM_NAME).includes(q) ||
          safeLower(row.DEPARTMENT).includes(q) ||
          safeLower(row.INDENTER_NAME).includes(q)
        );
      })
    : historyAll;

  const historyTotal = historyFiltered.length;
  const historyTotalPages = Math.max(
    1,
    Math.ceil(historyTotal / PAGE_SIZE) || 1
  );
  const historyCurrentPage = Math.min(historyPage, historyTotalPages);
  const historyStartIndex = (historyCurrentPage - 1) * PAGE_SIZE;
  const historyPageRows = historyFiltered.slice(
    historyStartIndex,
    historyStartIndex + PAGE_SIZE
  );

  /* =========================
     FORM SCHEMA
     ========================= */
  const schema = z
    .object({
      vendorType: z.enum(["Reject", "Three Party", "Regular"]),
      approvedQuantity: z.coerce.number().optional(),
    })
    .superRefine((data, ctx) => {
      if (
        data.vendorType !== "Reject" &&
        (!data.approvedQuantity || data.approvedQuantity === 0)
      ) {
        ctx.addIssue({
          path: ["approvedQuantity"],
          code: z.ZodIssueCode.custom,
          message: "Approved quantity required",
        });
      }
    });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { vendorType: undefined, approvedQuantity: undefined },
  });

  const vendorType = form.watch("vendorType");

  useEffect(() => {
    if (selectedIndent) {
      form.setValue("approvedQuantity", selectedIndent.REQUIRED_QTY);
    }
  }, [selectedIndent, form]);

  async function onSubmit(values: z.infer<typeof schema>) {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${APPROVE_API_BASE}/store-indent/approve`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          indentNumber: selectedIndent?.INDENT_NUMBER,
          itemCode: selectedIndent?.ITEM_NAME,
          vendorType: values.vendorType,
          approvedQuantity: values.approvedQuantity,
        }),
      });

      if (!res.ok) throw new Error("Approval update failed");

      toast.success(
        `Indent ${selectedIndent?.INDENT_NUMBER} updated successfully`
      );
      setOpenDialog(false);
      form.reset();
      await fetchInitial();
    } catch (err) {
      toast.error("Failed to update indent");
      console.error(err);
    }
  }

  function onError(e: FieldErrors<z.infer<typeof schema>>) {
    console.error(e);
    toast.error("Please fill all required fields");
  }

  /* =========================
     RENDER
     ========================= */
  return (
    <div>
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <Tabs defaultValue="pending">
          <Heading
            heading="Approve Indent"
            subtext="Approve or Reject Indents"
            tabs
          >
            <ClipboardCheck size={50} className="text-primary" />
          </Heading>

          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* ========== PENDING TAB ========== */}
          <TabsContent value="pending">
            <div className="mb-2">
              <Input
                placeholder="Search: Indent / Item / Dept / Indenter"
                value={pendingSearch}
                onChange={(e) => {
                  setPendingSearch(e.target.value);
                  setPendingPage(1);
                }}
                className="w-full"
              />
            </div>

            <div className="max-h-[70vh] overflow-auto border rounded-xl bg-white shadow-sm">
              <table className="min-w-[1400px] text-xs border-collapse">
                <thead className="sticky top-0 z-20 bg-slate-100">
                  <tr>
                    <th className="sticky left-0 z-30 bg-slate-100 border-b px-3 py-2 text-left font-semibold">
                      Indent No.
                    </th>
                    <th className="border-b px-3 py-2 text-center font-semibold">
                      S.No
                    </th>
                    <th className="border-b px-3 py-2 font-semibold">
                      Planned Time Stamp
                    </th>
                    <th className="border-b px-3 py-2 font-semibold">
                      Indent Date
                    </th>
                    <th className="border-b px-3 py-2 font-semibold">
                      Indenter
                    </th>
                    <th className="border-b px-3 py-2 font-semibold">
                      Division
                    </th>
                    <th className="border-b px-3 py-2 font-semibold">
                      Department
                    </th>
                    <th className="border-b px-3 py-2 font-semibold">
                      Item Name
                    </th>
                    <th className="border-b px-3 py-2 font-semibold">UOM</th>
                    <th className="border-b px-3 py-2 font-semibold">
                      Required Qty
                    </th>
                    <th className="border-b px-3 py-2 font-semibold">Remark</th>
                    <th className="border-b px-3 py-2 font-semibold">
                      Specification
                    </th>
                    <th className="border-b px-3 py-2 font-semibold">
                      Cost Project
                    </th>
                    <th className="border-b px-3 py-2 font-semibold">
                      Vendor Type
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={14}
                        className="py-6 text-center text-slate-500 text-sm"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Loader size={16} />
                          Loading...
                        </div>
                      </td>
                    </tr>
                  ) : pendingPageRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={14}
                        className="py-6 text-center text-slate-400 text-sm"
                      >
                        No Pending Indents Found
                      </td>
                    </tr>
                  ) : (
                    pendingPageRows.map((row, index) => (
                      <tr
                        key={row.INDENT_NUMBER + index}
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={() => {
                          setSelectedIndent(row);
                          setOpenDialog(true);
                        }}
                      >
                        <td className="sticky left-0 z-10 bg-white border-b px-3 py-1 text-left font-medium">
                          {row.INDENT_NUMBER}
                        </td>
                        <td className="border-b px-2 py-1 text-center">
                          {pendingStartIndex + index + 1}
                        </td>
                        <td className="border-b px-2 py-1">
                          {formatDateTime(row.PLANNEDTIMESTAMP)}
                        </td>
                        <td className="border-b px-2 py-1">
                          {formatDate(row.INDENT_DATE)}
                        </td>
                        <td className="border-b px-2 py-1">
                          {row.INDENTER_NAME}
                        </td>
                        <td className="border-b px-2 py-1">
                          {row.DIVISION}
                        </td>
                        <td className="border-b px-2 py-1">
                          {row.DEPARTMENT}
                        </td>
                        <td className="border-b px-2 py-1">
                          {row.ITEM_NAME}
                        </td>
                        <td className="border-b px-2 py-1">{row.UM}</td>
                        <td className="border-b px-2 py-1">
                          {row.REQUIRED_QTY}
                        </td>
                        <td className="border-b px-2 py-1">{row.REMARK}</td>
                        <td className="border-b px-2 py-1">
                          {row.SPECIFICATION}
                        </td>
                        <td className="border-b px-2 py-1">
                          {row.COST_PROJECT}
                        </td>
                        <td className="border-b px-2 py-1">
                          <Pill variant="pending">
                            {row.VENDOR_TYPE || "Pending"}
                          </Pill>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <PaginationBar
              currentPage={pendingCurrentPage}
              totalItems={pendingTotal}
              pageSize={PAGE_SIZE}
              isLoading={loading}
              onPageChange={(p) => setPendingPage(Math.max(1, p))}
            />
          </TabsContent>

          {/* ========== HISTORY TAB ========== */}
          <TabsContent value="history">
            <div className="mb-2">
              <Input
                placeholder="Search: Indent / Item / Dept / Indenter"
                value={historySearch}
                onChange={(e) => {
                  setHistorySearch(e.target.value);
                  setHistoryPage(1);
                }}
                className="w-full"
              />
            </div>

            <div className="max-h-[70vh] overflow-auto border rounded-xl bg-white shadow-sm">
              <table className="min-w-[1600px] text-xs border-collapse">
                <thead className="sticky top-0 z-20 bg-slate-100">
                  <tr>
                    <th className="sticky left-0 z-30 bg-slate-100 border-b px-3 py-2 text-left font-semibold">
                      Indent No.
                    </th>
                    <th className="border-b px-3 py-2 text-center font-semibold">
                      S.No
                    </th>
                    <th className="border-b px-3 py-2 font-semibold">
                      Planned Time Stamp
                    </th>
                    <th className="border-b px-3 py-2 font-semibold">
                      Indent Date
                    </th>
                    <th className="border-b px-3 py-2 font-semibold">
                      Indenter
                    </th>
                    <th className="border-b px-3 py-2 font-semibold">
                      Division
                    </th>
                    <th className="border-b px-3 py-2 font-semibold">
                      Department
                    </th>
                    <th className="border-b px-3 py-2 font-semibold">
                      Item Name
                    </th>
                    <th className="border-b px-3 py-2 font-semibold">UOM</th>
                    <th className="border-b px-3 py-2 font-semibold">
                      Required Qty
                    </th>
                    <th className="border-b px-3 py-2 font-semibold">Remark</th>
                    <th className="border-b px-3 py-2 font-semibold">
                      Specification
                    </th>
                    <th className="border-b px-3 py-2 font-semibold">
                      Cost Project
                    </th>
                    <th className="border-b px-3 py-2 font-semibold">
                      Cancelled Date & Time
                    </th>
                    <th className="border-b px-3 py-2 font-semibold">
                      Cancelled Remark
                    </th>
                    <th className="border-b px-3 py-2 font-semibold">
                      PO No.
                    </th>
                    <th className="border-b px-3 py-2 font-semibold">
                      PO Qty
                    </th>
                    <th className="border-b px-3 py-2 font-semibold">
                      Vendor Type
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={18}
                        className="py-6 text-center text-slate-500 text-sm"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Loader size={16} />
                          Loading...
                        </div>
                      </td>
                    </tr>
                  ) : historyPageRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={18}
                        className="py-6 text-center text-slate-400 text-sm"
                      >
                        No History Indents Found
                      </td>
                    </tr>
                  ) : (
                    historyPageRows.map((row, index) => (
                      <tr
                        key={row.INDENT_NUMBER + index}
                        className="hover:bg-slate-50"
                      >
                        <td className="sticky left-0 z-10 bg-white border-b px-3 py-1 text-left font-medium">
                          {row.INDENT_NUMBER}
                        </td>
                        <td className="border-b px-2 py-1 text-center">
                          {historyStartIndex + index + 1}
                        </td>
                        <td className="border-b px-2 py-1">
                          {formatDateTime(row.PLANNEDTIMESTAMP)}
                        </td>
                        <td className="border-b px-2 py-1">
                          {formatDate(row.INDENT_DATE)}
                        </td>
                        <td className="border-b px-2 py-1">
                          {row.INDENTER_NAME}
                        </td>
                        <td className="border-b px-2 py-1">
                          {row.DIVISION}
                        </td>
                        <td className="border-b px-2 py-1">
                          {row.DEPARTMENT}
                        </td>
                        <td className="border-b px-2 py-1">
                          {row.ITEM_NAME}
                        </td>
                        <td className="border-b px-2 py-1">{row.UM}</td>
                        <td className="border-b px-2 py-1">
                          {row.REQUIRED_QTY}
                        </td>
                        <td className="border-b px-2 py-1">{row.REMARK}</td>
                        <td className="border-b px-2 py-1">
                          {row.SPECIFICATION}
                        </td>
                        <td className="border-b px-2 py-1">
                          {row.COST_PROJECT}
                        </td>
                        <td className="border-b px-2 py-1">
                          {formatDateTime(row.CANCELLEDDATE)}
                        </td>
                        <td className="border-b px-2 py-1">
                          {row.CANCELLED_REMARK}
                        </td>
                        <td className="border-b px-2 py-1">{row.PO_NO}</td>
                        <td className="border-b px-2 py-1">{row.PO_QTY}</td>
                        <td className="border-b px-2 py-1">
                          {(() => {
                            const type = row.VENDOR_TYPE;
                            const variant =
                              type === "Reject"
                                ? "reject"
                                : type === "Regular"
                                ? "primary"
                                : "secondary";
                            return (
                              <Pill variant={variant}>
                                {type || "Pending"}
                              </Pill>
                            );
                          })()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <PaginationBar
              currentPage={historyCurrentPage}
              totalItems={historyTotal}
              pageSize={PAGE_SIZE}
              isLoading={loading}
              onPageChange={(p) => setHistoryPage(Math.max(1, p))}
            />
          </TabsContent>
        </Tabs>

        {selectedIndent && (
          <DialogContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit, onError)}
                className="grid gap-5"
              >
                <DialogHeader>
                  <DialogTitle>Approve Indent</DialogTitle>
                  <DialogDescription>
                    Update approval for{" "}
                    <b>{selectedIndent.INDENT_NUMBER}</b>
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-3">
                  <FormField
                    control={form.control}
                    name="vendorType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vendor Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select vendor type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Regular">Regular</SelectItem>
                            <SelectItem value="Three Party">
                              Three Party
                            </SelectItem>
                            <SelectItem value="Reject">Reject</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="approvedQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Approved Quantity</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            disabled={vendorType === "Reject"}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && (
                      <Loader size={18} color="white" className="mr-2" />
                    )}
                    Approve
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
