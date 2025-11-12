import { useEffect, useMemo, useState } from 'react';
import Heading from '../element/Heading';
import { fetchSheet } from '@/lib/fetchers';
import DataTable from '../element/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

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
    setLoading(true);
    fetchSheet('INDENT')
      .then((res) => {
        if (!active) return;
        const list = Array.isArray(res) ? (res as any[]) : [];
        const mapped = list.map((r) => ({
          timestamp: r.timestamp ?? r.TIMESTAMP ?? '',
          formType: r.formType ?? r.FORMTYPE ?? '',
          requestNumber: r.requestNumber ?? r.REQUESTNUMBER ?? '',
          indentSeries: r.indentSeries ?? r.INDENTSERIES ?? '',
          requesterName: r.requesterName ?? r.REQUESTERNAME ?? '',
          department: r.department ?? r.DEPARTMENT ?? '',
          division: r.division ?? r.DIVISION ?? '',
          itemCode: r.itemCode ?? r.ITEMCODE ?? '',
          productName: r.productName ?? r.PRODUCTNAME ?? '',
          requestQty: Number(r.requestQty ?? r.REQUESTQTY ?? 0) || 0,
          uom: r.uom ?? r.UOM ?? '',
          make: r.make ?? r.MAKE ?? '',
          purpose: r.purpose ?? r.PURPOSE ?? '',
          costLocation: r.costLocation ?? r.COSTLOCATION ?? '',
        }));
        setRows(mapped.filter((r) => (r.formType || '').toUpperCase() === 'INDENT'));
      })
      .finally(() => active && setLoading(false));
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


