import { useEffect, useMemo, useState } from 'react';
import Heading from '../element/Heading';
import DataTable from '../element/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import axiosInstance from '@/utils/axiosConfig';
import { toast } from 'sonner';
import { CheckCircle, XCircle } from 'lucide-react';

type IndentRow = {
  id?: string;
  createdAt: string;
  updatedAt: string;
  requestNumber?: string;
  requesterName?: string;
  department?: string;
  division?: string;
  productName?: string;
  requestQty?: number;
  status?: 'APPROVED' | 'REJECTED' | 'PENDING' | '';
  approvedQuantity?: string;
  groupName?: string;
  formType?: 'INDENT' | 'REQUISITION' | '';
};

const mapApiRowToIndent = (rec: Record<string, any>): IndentRow => {
  const normalizeStatus = (val: unknown): IndentRow['status'] => {
    if (typeof val !== 'string') return '';
    const upper = val.toUpperCase();
    if (upper === 'APPROVED' || upper === 'REJECTED' || upper === 'PENDING') {
      return upper as IndentRow['status'];
    }
    return '';
  };

  const normalizeFormType = (val: unknown): IndentRow['formType'] => {
    if (typeof val !== 'string') return '';
    const upper = val.toUpperCase();
    if (upper === 'INDENT' || upper === 'REQUISITION') {
      return upper as IndentRow['formType'];
    }
    return '';
  };

  return {
    id: rec['id'] ? String(rec['id']) : undefined,
    createdAt: rec['created_at'] ?? '',
    updatedAt: rec['updated_at'] ?? '',
    requestNumber: rec['request_number'] ?? rec['requestNumber'] ?? '',
    requesterName: rec['requester_name'] ?? rec['requesterName'] ?? '',
    department: rec['department'] ?? '',
    division: rec['division'] ?? '',
    productName: rec['product_name'] ?? rec['productName'] ?? '',
    requestQty: Number(rec['request_qty'] ?? rec['requestQty'] ?? 0) || 0,
    status: normalizeStatus(rec['request_status']),
    approvedQuantity: String(rec['approved_quantity'] ?? rec['approvedQuantity'] ?? ''),
    groupName: rec['group_name'] ?? rec['groupName'] ?? rec['category_name'] ?? '',
    formType: normalizeFormType(rec['form_type'] ?? rec['formType']),
  };
};

export default function CompletedItems() {
  const [rows, setRows] = useState<IndentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    const fetchCompletedItems = async () => {
      try {
        const [approvedRes, rejectedRes] = await Promise.all([
          axiosInstance.get('/indent/status/approved'),
          axiosInstance.get('/indent/status/rejected'),
        ]);

        if (!active) return;

        const approvedData = (approvedRes.data?.data || []).map(mapApiRowToIndent);
        const rejectedData = (rejectedRes.data?.data || []).map(mapApiRowToIndent);

        const combinedData = [...approvedData, ...rejectedData]
          .filter((item) => item.formType === 'INDENT') // Filter for Indents only
          .sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );

        setRows(combinedData);
      } catch (err) {
        console.error('Failed to load completed items', err);
        if (active) {
          toast.error('Failed to load completed items list');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchCompletedItems();

    return () => {
      active = false;
    };
  }, []);

  const columns: ColumnDef<IndentRow>[] = useMemo(
    () => [
      {
        accessorKey: 'createdAt',
        header: 'Created At',
        cell: ({ row }) => {
          const timestamp = row.original.createdAt;
          if (!timestamp) return '';
          const date = new Date(timestamp);
          return date.toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
        },
      },
      { accessorKey: 'requestNumber', header: 'Request No.' },
      { accessorKey: 'requesterName', header: 'Requester' },
      { accessorKey: 'department', header: 'Department' },
      { accessorKey: 'division', header: 'Division' },
      { accessorKey: 'productName', header: 'Product' },
      { accessorKey: 'requestQty', header: 'Qty' },
      { accessorKey: 'approvedQuantity', header: 'Approved Qty' },
      { accessorKey: 'groupName', header: 'Group Name' },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.original.status;
          if (status === 'APPROVED') {
            return <span className="text-green-600 font-medium">APPROVED</span>;
          }
          if (status === 'REJECTED') {
            return <span className="text-red-600 font-medium">REJECTED</span>;
          }
          return <span className="text-gray-500">{status}</span>;
        },
      },
      {
        accessorKey: 'updatedAt',
        header: 'Last Updated',
        cell: ({ row }) => {
          const timestamp = row.original.updatedAt;
          if (!timestamp) return '';
          const date = new Date(timestamp);
          return date.toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
        },
      },
    ],
    []
  );

  return (
    <div className="p-4 md:p-6 lg:p-10">
      <Heading
        heading="Completed Indents"
        subtext="A combined list of all approved and rejected indents"
      >
        <div className="flex">
          <CheckCircle className="text-green-500" size={40} />
          <XCircle className="text-red-500" size={40} />
        </div>
      </Heading>

      <div className="mt-4">
        <DataTable
          data={rows}
          columns={columns}
          searchFields={['requestNumber', 'requesterName', 'productName', 'status']}
          dataLoading={loading}
          className="h-[75dvh]"
        />
      </div>
    </div>
  );
}
