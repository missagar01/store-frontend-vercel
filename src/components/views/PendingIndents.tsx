import { useEffect, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ListTodo, ChevronLeft, ChevronRight } from 'lucide-react';

import Heading from '../element/Heading';
import DataTable from '../element/DataTable';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { API_URL } from '@/api';
import { toast } from 'sonner';

interface POData {
  PLANNED_TIMESTAMP: string;
  VRNO: string;
  VRDATE: string;
  VENDOR_NAME: string;
  ITEM_NAME: string;
  QTYORDER: number;
  QTYEXECUTE: number;
  BALANCE_QTY?: number;
  UM: string;
}

const PAGE_SIZE = 50;

interface PaginationBarProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

// 🔹 PaginationBar – max 3 buttons (1,2,3 style)
function PaginationBar({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
}: PaginationBarProps) {
  if (totalItems === 0) return null;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalItems);

  const pages: number[] = [];
  // 👉 Only 3 buttons: e.g. 1-2-3, 4-5-6, etc.
  let start = Math.max(1, currentPage - 1);
  let end = Math.min(totalPages, start + 2);
  start = Math.max(1, end - 2);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
      {/* Left: summary */}
      <span>
        Showing{' '}
        <span className="font-semibold">
          {startIndex.toLocaleString('en-IN')}
        </span>
        –
        <span className="font-semibold">
          {endIndex.toLocaleString('en-IN')}
        </span>{' '}
        of{' '}
        <span className="font-semibold">
          {totalItems.toLocaleString('en-IN')}
        </span>
      </span>

      {/* Right: buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {pages.map((p) => (
          <Button
            key={p}
            variant={p === currentPage ? 'default' : 'outline'}
            size="icon"
            onClick={() => onPageChange(p)}
          >
            {p}
          </Button>
        ))}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-GB');
};

const formatDateTime = (dateString: string) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

// 🔹 Helper: always send token + handle error
async function fetchWithToken(path: string) {
  const token = localStorage.getItem('token');
  const headers: HeadersInit = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { headers });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${path}`);
  }
  return res.json();
}

// 🔹 Normalize one row
const normalize = (po: Partial<POData>): POData => ({
  PLANNED_TIMESTAMP: po.PLANNED_TIMESTAMP ?? '',
  VRNO: po.VRNO ?? '',
  VRDATE: po.VRDATE ?? '',
  VENDOR_NAME: po.VENDOR_NAME ?? '',
  ITEM_NAME: po.ITEM_NAME ?? '',
  UM: po.UM ?? '',
  QTYORDER: po.QTYORDER ?? 0,
  QTYEXECUTE: po.QTYEXECUTE ?? 0,
  BALANCE_QTY:
    po.BALANCE_QTY ??
    Math.max((po.QTYORDER ?? 0) - (po.QTYEXECUTE ?? 0), 0),
});

export default function PurchaseOrders() {
  const [pendingPOs, setPendingPOs] = useState<POData[]>([]);
  const [historyPOs, setHistoryPOs] = useState<POData[]>([]);
  const [loading, setLoading] = useState(false);

  // 🔹 pagination state
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);

  // 🔹 pending page fetch (server-side)
  async function fetchPending(page = 1) {
    try {
      setLoading(true);
      const json = await fetchWithToken(
        `/po/pending?page=${page}&pageSize=${PAGE_SIZE}`
      );

      const rows = Array.isArray(json.data) ? json.data : [];
      setPendingPOs(rows.map(normalize));
      setPendingPage(json.page ?? page);
      setPendingTotal(json.total ?? rows.length);
    } catch (err) {
      console.error('Error fetching pending POs:', err);
      toast.error('Failed to fetch pending POs');
    } finally {
      setLoading(false);
    }
  }

  // 🔹 history page fetch (server-side)
  async function fetchHistory(page = 1) {
    try {
      setLoading(true);
      const json = await fetchWithToken(
        `/po/history?page=${page}&pageSize=${PAGE_SIZE}`
      );

      const rows = Array.isArray(json.data) ? json.data : [];
      setHistoryPOs(rows.map(normalize));
      setHistoryPage(json.page ?? page);
      setHistoryTotal(json.total ?? rows.length);
    } catch (err) {
      console.error('Error fetching PO history:', err);
      toast.error('Failed to fetch PO history');
    } finally {
      setLoading(false);
    }
  }

  // 🔹 Initial load: page 1 for both tabs (fast parallel)
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await Promise.all([fetchPending(1), fetchHistory(1)]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 🔹 Columns with GLOBAL S.No (depends on current page)
  const pendingColumns: ColumnDef<POData>[] = [
    {
      header: 'S.No',
      cell: ({ row }) => (pendingPage - 1) * PAGE_SIZE + row.index + 1,
      enableSorting: false,
      size: 60,
    },
    {
      accessorKey: 'PLANNED_TIMESTAMP',
      header: 'Planned Time Stamp',
      cell: ({ row }) => formatDateTime(row.original.PLANNED_TIMESTAMP),
    },
    { accessorKey: 'VRNO', header: 'PO No.' },
    {
      accessorKey: 'VRDATE',
      header: 'PO Date',
      cell: ({ row }) => formatDate(row.original.VRDATE),
    },
    { accessorKey: 'VENDOR_NAME', header: 'Vendor Name' },
    { accessorKey: 'ITEM_NAME', header: 'Item Name' },
    { accessorKey: 'UM', header: 'UOM' },
    { accessorKey: 'QTYORDER', header: 'Ordered Qty' },
    { accessorKey: 'QTYEXECUTE', header: 'Executed Qty' },
    { accessorKey: 'BALANCE_QTY', header: 'Balance Qty' },
  ];

  const historyColumns: ColumnDef<POData>[] = [
    {
      header: 'S.No',
      cell: ({ row }) => (historyPage - 1) * PAGE_SIZE + row.index + 1,
      enableSorting: false,
      size: 60,
    },
    {
      accessorKey: 'PLANNED_TIMESTAMP',
      header: 'Planned Time Stamp',
      cell: ({ row }) => formatDateTime(row.original.PLANNED_TIMESTAMP),
    },
    { accessorKey: 'VRNO', header: 'PO No.' },
    {
      accessorKey: 'VRDATE',
      header: 'PO Date',
      cell: ({ row }) => formatDate(row.original.VRDATE),
    },
    { accessorKey: 'VENDOR_NAME', header: 'Vendor Name' },
    { accessorKey: 'ITEM_NAME', header: 'Item Name' },
    { accessorKey: 'UM', header: 'UOM' },
    { accessorKey: 'QTYORDER', header: 'Ordered Qty' },
    { accessorKey: 'QTYEXECUTE', header: 'Executed Qty' },
    { accessorKey: 'BALANCE_QTY', header: 'Balance Qty' },
  ];

  return (
    <div className="p-4">
      <Heading
        heading="Purchase Orders"
        subtext="Manage pending and received purchase orders"
      >
        <ListTodo size={50} className="text-primary" />
      </Heading>

      <Tabs defaultValue="pending" className="mt-6 w-full">
        <TabsList className="grid grid-cols-2 w-full mb-4">
          <TabsTrigger value="pending" className="w-full py-2 text-center">
            Pending POs
          </TabsTrigger>
          <TabsTrigger value="received" className="w-full py-2 text-center">
            Received POs
          </TabsTrigger>
        </TabsList>

        {/* Pending Tab */}
        <TabsContent value="pending">
          <div className="overflow-x-auto">
            <DataTable
              data={pendingPOs}
              columns={pendingColumns}
              searchFields={['VRNO', 'VENDOR_NAME', 'ITEM_NAME']}
              dataLoading={loading}
              className="min-w-[900px] h-[75vh]"
            />
            <PaginationBar
              currentPage={pendingPage}
              totalItems={pendingTotal}
              pageSize={PAGE_SIZE}
              onPageChange={(page) => {
                const safe = Math.max(1, page);
                fetchPending(safe);
              }}
            />
          </div>
        </TabsContent>

        {/* Received / History Tab */}
        <TabsContent value="received">
          <div className="overflow-x-auto">
            <DataTable
              data={historyPOs}
              columns={historyColumns}
              searchFields={['VRNO', 'VENDOR_NAME', 'ITEM_NAME']}
              dataLoading={loading}
              className="min-w-[900px] h-[75vh]"
            />
            <PaginationBar
              currentPage={historyPage}
              totalItems={historyTotal}
              pageSize={PAGE_SIZE}
              onPageChange={(page) => {
                const safe = Math.max(1, page);
                fetchHistory(safe);
              }}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
