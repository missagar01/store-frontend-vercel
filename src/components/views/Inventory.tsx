import React, { useState, useEffect } from "react";
import Heading from "../element/Heading";
import { Store, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import DataTable from "../element/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import axios from "axios";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Pill } from "../ui/pill";

import { API_URL } from "@/api";

interface StockRow {
  itemCode: string;
  itemName: string;
  uom: string;
  openingQty: number;
  closingQty: number;
}

const PAGE_SIZE = 50;

/* 🔹 Simple Pagination (1,2,3 buttons only) */
function PaginationBar({
  page,
  total,
  onChange,
}: {
  page: number;
  total: number;
  onChange: (p: number) => void;
}) {
  if (!total) return null;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pages: number[] = [];
  const start = Math.max(1, page - 1);
  const end = Math.min(totalPages, page + 1);
  for (let p = start; p <= end; p++) pages.push(p);

  const startIndex = (page - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="flex items-center justify-between mt-3 text-sm text-slate-500">
      <span>
        Showing{" "}
        <span className="font-semibold text-slate-700">{startIndex}</span>–
        <span className="font-semibold text-slate-700">{endIndex}</span> of{" "}
        <span className="font-semibold text-slate-700">
          {total.toLocaleString("en-IN")}
        </span>{" "}
        records
      </span>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {pages.map((p) => (
          <Button
            key={p}
            variant={p === page ? "default" : "outline"}
            size="icon"
            onClick={() => onChange(p)}
          >
            {p}
          </Button>
        ))}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default function StockReport() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const firstOfMonth = `${yyyy}-${mm}-01`;
  const todayStr = `${yyyy}-${mm}-${dd}`;

  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(todayStr);
  const [data, setData] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Convert YYYY-MM-DD → DD-MM-YYYY for backend
  const toBackendDate = (dateStr: string) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}-${m}-${y}`;
  };

  const fetchStock = async (pageToLoad = 1) => {
    if (!fromDate || !toDate) return;
    setLoading(true);
    setError(null);

    try {
      const fromParam = toBackendDate(fromDate);
      const toParam = toBackendDate(toDate);

      const res = await axios.get(
        `${API_URL}/stock?fromDate=${fromParam}&toDate=${toParam}&page=${pageToLoad}&pageSize=${PAGE_SIZE}`
      );

      const apiData = res.data;
      if (apiData?.success && Array.isArray(apiData.data)) {
        const rows = apiData.data.map((r: any) => ({
          itemCode: r.COL1?.trim() || "",
          itemName: r.COL2?.trim() || "",
          uom: r.COL3?.trim() || "",
          openingQty: parseFloat(r.COL4) || 0,
          closingQty: parseFloat(r.COL5) || 0,
        }));

        setData(rows);
        setTotal(apiData.total ?? rows.length);
        setPage(apiData.page ?? pageToLoad);
      } else {
        setData([]);
        setTotal(0);
      }
    } catch (err: any) {
      console.error("Fetch error:", err);
      setError(err?.response?.data?.message || "Failed to fetch data");
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // Optional: load once on mount with default date range
  // useEffect(() => {
  //   fetchStock(1);
  // }, []);

  const columns: ColumnDef<StockRow>[] = [
    {
      header: "S.No",
      // 🔹 Global S.No: page 1 → 1–50, page 2 → 51–100, ...
      cell: ({ row }) => (page - 1) * PAGE_SIZE + row.index + 1,
      enableSorting: false,
      size: 60,
    },
    {
      accessorKey: "itemCode",
      header: () => <div className="text-center font-semibold">Item Code</div>,
      cell: ({ row }) => (
        <div className="text-center text-slate-700">
          {row.original.itemCode}
        </div>
      ),
    },
    {
      accessorKey: "itemName",
      header: () => <div className="text-center font-semibold">Item Name</div>,
      cell: ({ row }) => (
        <div className="text-center text-slate-700">
          {row.original.itemName}
        </div>
      ),
    },
    {
      accessorKey: "uom",
      header: () => <div className="text-center font-semibold">UOM</div>,
      cell: ({ row }) => (
        <div className="text-center text-slate-700">{row.original.uom}</div>
      ),
    },
    {
      accessorKey: "openingQty",
      header: () => (
        <div className="text-center font-semibold">Opening Qty</div>
      ),
      cell: ({ row }) => (
        <div className="text-center">{row.original.openingQty}</div>
      ),
    },
    {
      accessorKey: "closingQty",
      header: () => (
        <div className="text-center font-semibold">Closing Qty</div>
      ),
      cell: ({ row }) =>
        row.original.closingQty === 0 ? (
          <div className="flex justify-center">
            <Pill variant="reject">Out of Stock</Pill>
          </div>
        ) : (
          <div className="text-center">{row.original.closingQty}</div>
        ),
    },
  ];


  return (
    <div className="space-y-4">
      {/* Heading */}
      <Heading
        heading="Stock Report"
        subtext="View Oracle stock data by date range"
      >
        <Store size={50} className="text-primary" />
      </Heading>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">From Date</label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full sm:w-[200px]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">To Date</label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full sm:w-[200px]"
            />
          </div>
        </div>

        <div className="flex gap-2 items-center justify-between sm:justify-start">
          <Button
            onClick={() => fetchStock(1)}
            disabled={loading}
            className="mt-2 sm:mt-0"
          >
            {loading ? "Loading..." : "Search"}
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="mt-2 sm:mt-0"
            onClick={() => {
              setFromDate(firstOfMonth);
              setToDate(todayStr);
              fetchStock(1);
            }}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Record Count */}
      <div className="flex justify-between items-center text-sm text-slate-500">
        <p>
          Showing{" "}
          <span className="font-semibold text-slate-700">
            {total.toLocaleString("en-IN")}
          </span>{" "}
          total records
        </p>
        {error && (
          <p className="text-red-600 text-sm bg-red-50 px-3 py-1 rounded-md">
            {error}
          </p>
        )}
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-x-auto">
        <DataTable
          data={data}
          columns={columns}
          dataLoading={loading}
          searchFields={["itemCode", "itemName", "uom"]}
          className="h-[70dvh] min-w-full text-center"
        />
      </div>

      {/* Pagination Bar */}
      <PaginationBar
        page={page}
        total={total}
        onChange={(p) => fetchStock(p)}
      />

      {/* Footer */}
      <div className="text-[11px] text-slate-400 text-right">
        Oracle stock view · {new Date().toLocaleString()}
      </div>
    </div>
  );
}
