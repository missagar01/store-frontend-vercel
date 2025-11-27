import { useEffect, useMemo, useState } from 'react';
import Heading from '../element/Heading';
import DataTable from '../element/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '../ui/button';
import { ComboBox } from '../ui/combobox';
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

export default function UserIndentListRequisition() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = useState<IndentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [productFilter, setProductFilter] = useState<string[]>([]);
  const [uomFilter, setUomFilter] = useState<string[]>([]);
  const [locationFilter, setLocationFilter] = useState<string[]>([]);

  useEffect(() => {
    let active = true;

    const fetchRequisitions = async () => {
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
          .filter((r: IndentRow) => (r.formType || '').toUpperCase() === 'REQUISITION');

        setRows(mapped);
      } catch (err) {
        console.error('Failed to load requisition data', err);
        if (active) {
          toast.error('Failed to load requisition list');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchRequisitions();

    return () => {
      active = false;
    };
  }, []);

  const filteredRows = useMemo(() => {
    const currentName = user?.name || (user as any)?.user_name;
    const productValue = productFilter[0] ?? '';
    const uomValue = uomFilter[0] ?? '';
    const locationValue = locationFilter[0] ?? '';

    let data = rows;
    if (currentName) {
      data = data.filter((r) => (r.requesterName || '').toLowerCase() === String(currentName).toLowerCase());
    }

    if (productValue) {
      data = data.filter((r) => (r.productName || '').toLowerCase() === productValue.toLowerCase());
    }

    if (uomValue) {
      data = data.filter((r) => (r.uom || '').toLowerCase() === uomValue.toLowerCase());
    }

    if (locationValue) {
      data = data.filter((r) => (r.costLocation || '').toLowerCase() === locationValue.toLowerCase());
    }

    return data;
  }, [rows, user, productFilter, uomFilter, locationFilter]);

  const productOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const val = (r.productName || '').trim();
      if (val) set.add(val);
    });
    return [
      { label: 'All products', value: '' },
      ...Array.from(set)
        .sort((a, b) => a.localeCompare(b))
        .map((v) => ({ label: v, value: v })),
    ];
  }, [rows]);

  const uomOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const val = (r.uom || '').trim();
      if (val) set.add(val);
    });
    return [
      { label: 'All UOM', value: '' },
      ...Array.from(set)
        .sort((a, b) => a.localeCompare(b))
        .map((v) => ({ label: v, value: v })),
    ];
  }, [rows]);

  const locationOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const val = (r.costLocation || '').trim();
      if (val) set.add(val);
    });
    return [
      { label: 'All locations', value: '' },
      ...Array.from(set)
        .sort((a, b) => a.localeCompare(b))
        .map((v) => ({ label: v, value: v })),
    ];
  }, [rows]);

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
      <Heading heading="Requisition List" subtext="Your Requisition lines" />

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-muted-foreground">Product Name</span>
          <ComboBox options={productOptions} value={productFilter} onChange={setProductFilter} placeholder="All products" />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-muted-foreground">UOM</span>
          <ComboBox options={uomOptions} value={uomFilter} onChange={setUomFilter} placeholder="All UOM" />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-muted-foreground">Cost / Project Location</span>
          <ComboBox options={locationOptions} value={locationFilter} onChange={setLocationFilter} placeholder="All locations" />
        </div>
      </div>

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
        <Button onClick={() => navigate('/user-indent/create?formType=REQUISITION')}>+ Add Requisition</Button>
      </DataTable>
    </div>
  );
}


