import { useEffect, useMemo, useState } from 'react';
import Heading from '../element/Heading';
import DataTable from '../element/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import axiosInstance from '@/utils/axiosConfig';
import { toast } from 'sonner';

type IndentRow = {
  timestamp: string;
  formType?: string;
  requestNumber?: string;
  indentSeries?: string;
  requesterName?: string;
  department?: string;
  division?: string;
  itemCode?: string;
  productName?: string;
  requestQty?: number;
  uom?: string;
  make?: string;
  purpose?: string;
  costLocation?: string;
};

export default function UserIndentListIndent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = useState<IndentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchIndents = async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.get('/indent/all');
        if (!active) return;

        const list = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
            ? res.data
            : [];

        const mapped = list
          .map((r: any) => ({
            timestamp: r.sample_timestamp ?? r.timestamp ?? r.created_at ?? '',
            formType: r.form_type ?? r.formType ?? '',
            requestNumber: r.request_number ?? r.requestNumber ?? '',
            indentSeries: r.indent_series ?? r.indentSeries ?? '',
            requesterName: r.requester_name ?? r.requesterName ?? '',
            department: r.department ?? '',
            division: r.division ?? '',
            itemCode: r.item_code ?? r.itemCode ?? '',
            productName: r.product_name ?? r.productName ?? '',
            requestQty: Number(r.request_qty ?? r.requestQty ?? 0) || 0,
            uom: r.uom ?? '',
            make: r.make ?? '',
            purpose: r.purpose ?? '',
            costLocation: r.cost_location ?? r.costLocation ?? '',
          }))
          .filter((r) => (r.formType || '').toUpperCase() === 'INDENT');

        setRows(mapped);
      } catch (err) {
        console.error('Failed to load indent data', err);
        if (active) {
          toast.error('Failed to load indent list');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchIndents();

    return () => {
      active = false;
    };
  }, []);

  const filteredRows = useMemo(() => {
    const currentName = user?.name || (user as any)?.user_name;
    if (!currentName) return rows;
    return rows.filter((r) => (r.requesterName || '').toLowerCase() === String(currentName).toLowerCase());
  }, [rows, user]);

  const columns: ColumnDef<IndentRow>[] = [
    { accessorKey: 'requestNumber', header: 'Request No.' },
    { accessorKey: 'indentSeries', header: 'Series' },
    { accessorKey: 'requesterName', header: 'Requester' },
    { accessorKey: 'department', header: 'Department' },
    { accessorKey: 'division', header: 'Division' },
    { accessorKey: 'itemCode', header: 'Item Code' },
    { accessorKey: 'productName', header: 'Product' },
    { accessorKey: 'uom', header: 'UOM' },
    { accessorKey: 'requestQty', header: 'Qty' },
    { accessorKey: 'costLocation', header: 'Cost Location' },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-10">
      <Heading heading="Indent List" subtext="Your Indent lines" />

      <DataTable
        data={filteredRows}
        columns={columns}
        searchFields={[
          'requestNumber',
          'indentSeries',
          'requesterName',
          'department',
          'division',
          'itemCode',
          'productName',
          'costLocation',
        ]}
        dataLoading={loading}
        className="h-[74dvh]"
      >
        <Button onClick={() => navigate('/user-indent/create?formType=INDENT')}>+ Add Indent</Button>
      </DataTable>
    </div>
  );
}


