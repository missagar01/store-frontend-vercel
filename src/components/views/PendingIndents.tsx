import { ListTodo } from 'lucide-react';
import Heading from '../element/Heading';
import DataTable from '../element/DataTable';
import { useEffect, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { API_URL } from '@/api';

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

export default function PurchaseOrders() {
  const [pendingPOs, setPendingPOs] = useState<POData[]>([]);
  const [historyPOs, setHistoryPOs] = useState<POData[]>([]);
  const [loading, setLoading] = useState(true);

  // 👉 small helper so we always send token
  async function fetchWithToken(path: string) {
    const token = localStorage.getItem('token');
    const headers: HeadersInit = {};

    if (token) {
      headers.Authorization = `Bearer ${token}`; // ✅ token passed here
    }

    const res = await fetch(`${API_URL}${path}`, { headers });
    if (!res.ok) {
      throw new Error(`Failed to fetch ${path}`);
    }
    return res.json();
  }

  // normalize
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pendingData, historyData] = await Promise.all([
          fetchWithToken('/po/pending'),
          fetchWithToken('/po/history'),
        ]);

        const pendingArray = Array.isArray(pendingData)
          ? pendingData
          : pendingData
          ? [pendingData]
          : [];

        const historyArray = Array.isArray(historyData)
          ? historyData
          : historyData
          ? [historyData]
          : [];

        setPendingPOs(pendingArray.map(normalize));
        setHistoryPOs(historyArray.map(normalize));
      } catch (err) {
        console.error('Error fetching PO data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const columns: ColumnDef<POData>[] = [
    {
      header: 'S.No',
      cell: ({ row }) => row.index + 1,
      enableSorting: false,
      size: 50,
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

        <TabsContent value="pending">
          <div className="overflow-x-auto">
            <DataTable
              data={pendingPOs}
              columns={columns}
              searchFields={['VRNO', 'VENDOR_NAME', 'ITEM_NAME']}
              dataLoading={loading}
              className="min-w-[900px] h-[75vh]"
            />
          </div>
        </TabsContent>

        <TabsContent value="received">
          <div className="overflow-x-auto">
            <DataTable
              data={historyPOs}
              columns={columns}
              searchFields={['VRNO', 'VENDOR_NAME', 'ITEM_NAME']}
              dataLoading={loading}
              className="min-w-[900px] h-[75vh]"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
