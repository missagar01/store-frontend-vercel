import { useCallback, useEffect, useMemo, useState } from 'react';
import Heading from '../element/Heading';
import { ClipboardCheck } from 'lucide-react';
import DataTable from '../element/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { Input } from '../ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import axiosInstance from '@/utils/axiosConfig';
import { toast } from 'sonner';

// Row type
type IndentRow = {
  id?: string;
  timestamp: string;
  requestNumber?: string;
  requesterName?: string;
  department?: string;
  indentSeries?: string;
  division?: string;
  itemCode?: string;
  productName?: string;
  requestQty?: number;
  uom?: string;
  costLocation?: string;
  formType?: string;
  status?: 'APPROVED' | 'REJECTED' | 'PENDING' | '';
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

  return {
    id: rec['id'] ? String(rec['id']) : undefined,
    timestamp:
      rec['sample_timestamp'] ??
      rec['timestamp'] ??
      rec['created_at'] ??
      rec['createdAt'] ??
      '',
    requestNumber: rec['request_number'] ?? rec['requestNumber'] ?? '',
    requesterName: rec['requester_name'] ?? rec['requesterName'] ?? '',
    department: rec['department'] ?? '',
    indentSeries: rec['indent_series'] ?? rec['indentSeries'] ?? '',
    division: rec['division'] ?? '',
    itemCode: rec['item_code'] ?? rec['itemCode'] ?? '',
    productName: rec['product_name'] ?? rec['productName'] ?? '',
    requestQty: Number(rec['request_qty'] ?? rec['requestQty'] ?? 0) || 0,
    uom: rec['uom'] ?? '',
    costLocation: rec['cost_location'] ?? rec['costLocation'] ?? '',
    formType: rec['form_type'] ?? rec['formType'] ?? '',
    status: normalizeStatus(rec['request_status']),
  };
};

export default function ApprowIndentData() {
  const [rows, setRows] = useState<IndentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [indentNumber, setIndentNumber] = useState('');
  const [headerRequesterName, setHeaderRequesterName] = useState('');
  const [openEdit, setOpenEdit] = useState(false);
  const [modalItems, setModalItems] = useState<IndentRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const canSave = useMemo(
    () =>
      modalItems.length > 0 &&
      modalItems.every((item) => {
        const status = (item.status ?? '').toUpperCase();
        return status === 'APPROVED' || status === 'REJECTED';
      }),
    [modalItems]
  );

  useEffect(() => {
    let active = true;
    setLoading(true);

    const fetchIndents = async () => {
      try {
        const res = await axiosInstance.get('/indent/all');
        if (!active) return;

        const payload = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
            ? res.data
            : [];

        const mapped = payload.map((rec: Record<string, any>) =>
          mapApiRowToIndent(rec)
        );
        setRows(mapped);

        if (mapped.length > 0) {
          const sorted = [...mapped].sort(
            (a, b) => Date.parse(b.timestamp || '') - Date.parse(a.timestamp || '')
          );
          const latest = sorted.find((r) => (r.requestNumber || '').trim() !== '');
          if (latest?.requestNumber) setIndentNumber(latest.requestNumber);
          if (latest?.requesterName) setHeaderRequesterName(latest.requesterName);
        }
      } catch (err) {
        console.error('Failed to load indents', err);
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

  // Show only PENDING or empty
  const pendingRows = useMemo(
    () =>
      rows.filter((r) => {
        const status = (r.status || '').toUpperCase();
        const formType = (r.formType || '').toUpperCase();
        const isPending = !status || status === '' || status === 'PENDING';
        const isIndent = formType === 'INDENT';
        return isPending && isIndent;
      }),
    [rows]
  );

  const fetchRequestItems = useCallback(async (requestNo: string) => {
    const res = await axiosInstance.get(`/indent/${requestNo}`);
    const payload = res.data?.data;
    const list = Array.isArray(payload)
      ? payload
      : payload
        ? [payload]
        : [];
    return list.map((rec: Record<string, any>) => mapApiRowToIndent(rec));
  }, []);

  const handleProcess = useCallback(async (row: IndentRow) => {
    const rn = row.requestNumber || '';
    if (!rn) {
      toast.error('Request number unavailable for this row');
      return;
    }

    setIndentNumber(rn);
    setHeaderRequesterName(row.requesterName || '');
    setModalItems([]);
    setDetailsLoading(true);
    setOpenEdit(true);

    try {
      const details = await fetchRequestItems(rn);
      setModalItems(details);
    } catch (err) {
      console.error('Failed to fetch request details', err);
      toast.error('Failed to fetch indent details');
      setOpenEdit(false);
    } finally {
      setDetailsLoading(false);
    }
  }, [fetchRequestItems]);

  const columns: ColumnDef<IndentRow>[] = useMemo(
    () => [
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex gap-2 justify-center">
            <button
              className="px-2 py-1 rounded bg-primary text-white text-xs"
              onClick={(e) => {
                e.preventDefault();
                handleProcess(row.original);
              }}
            >
              Process
            </button>
          </div>
        ),
      },
      { accessorKey: 'requestNumber', header: 'Request No.' },
      { accessorKey: 'formType', header: 'Form Type' },
      { accessorKey: 'indentSeries', header: 'Series' },
      { accessorKey: 'requesterName', header: 'Requester' },
      { accessorKey: 'department', header: 'Department' },
      { accessorKey: 'division', header: 'Division' },
      { accessorKey: 'itemCode', header: 'Item Code' },
      { accessorKey: 'productName', header: 'Product' },
      { accessorKey: 'uom', header: 'UOM' },
      { accessorKey: 'requestQty', header: 'Qty' },
      { accessorKey: 'costLocation', header: 'Cost Location' },
    ],
    [handleProcess]
  );


  function selectFromRow(r: IndentRow) {
    setIndentNumber(r.requestNumber || '');
    setHeaderRequesterName(r.requesterName || '');
  }

  async function onSaveEdit() {
    if (!indentNumber) {
      toast.error('Request number missing');
      return;
    }

    if (!canSave) {
      toast.error('Please approve or reject every item before saving');
      return;
    }

    try {
      setSaving(true);

      const payload = modalItems.map((item) => ({
        id: item.id,
        request_number: indentNumber,
        item_code: item.itemCode,
        request_qty: Number(item.requestQty ?? 0),
        approved_quantity: Number(item.requestQty ?? 0),
        request_status: (() => {
          const status = (item.status ?? '').toUpperCase();
          return status || 'PENDING';
        })(),
      }));

      await axiosInstance.put(`/indent/${indentNumber}/status`, {
        items: payload,
      });

      setRows((prev) => {
        const reqNo = indentNumber;
        const others = prev.filter((p) => p.requestNumber !== reqNo);
        return [...others, ...modalItems];
      });

      toast.success('Indent status updated');
      setOpenEdit(false);
    } catch (err) {
      console.error('Failed to update indent status', err);
      toast.error('Failed to update indent status');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-6 lg:p-10">
      <Heading heading="Approve Indent Data" subtext="View Indent sheet and select a row to fill inputs">
        <ClipboardCheck size={50} className="text-primary" />
      </Heading>

      <div className="grid gap-4">
  
        <div>
          <DataTable
            data={pendingRows}
            columns={columns}
            searchFields={[
              'requestNumber',
              'requesterName',
              'department',
              'indentSeries',
              'division',
              'itemCode',
              'productName',
            ]}
            dataLoading={loading}
            className="h-[70dvh]"
          />
          <p className="text-sm text-muted-foreground mt-2">
            Tip: Click a row, then use Edit to open all items for that request number.
          </p>
        </div>
      </div>

      <RowClickBinder rows={pendingRows} onPick={selectFromRow} />

      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Edit / Approve Items</DialogTitle>
            <DialogDescription>
              Update quantity and mark items approved / rejected.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm mb-1">Request Number</label>
              <Input readOnly value={indentNumber} />
            </div>
            <div>
              <label className="block text-sm mb-1">Requester Name</label>
              <Input readOnly value={headerRequesterName} />
            </div>
          </div>

          <div className="border rounded-md overflow-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left px-2 py-2">Item Code</th>
                  <th className="text-left px-2 py-2">Item Name</th>
                  <th className="text-left px-2 py-2">UOM</th>
                  <th className="text-left px-2 py-2 w-24">Qty</th>
                  <th className="text-left px-2 py-2">Status</th>
                  <th className="text-left px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {detailsLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-muted-foreground">
                      Loading items...
                    </td>
                  </tr>
                ) : modalItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-muted-foreground">
                      No items for this request.
                    </td>
                  </tr>
                ) : (
                  modalItems.map((item, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-2 py-1">{item.itemCode}</td>
                      <td className="px-2 py-1">{item.productName}</td>
                      <td className="px-2 py-1">{item.uom}</td>
                      <td className="px-2 py-1 w-24">
                        <Input
                          type="number"
                          value={
                            typeof item.requestQty === 'number'
                              ? item.requestQty
                              : item.requestQty || ''
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            setModalItems((prev) =>
                              prev.map((m, i) =>
                                i === idx ? { ...m, requestQty: val ? Number(val) : 0 } : m
                              )
                            );
                          }}
                        />
                      </td>
                      <td className="px-2 py-1">
                        {item.status ? (
                          <span
                            className={
                              item.status === 'APPROVED'
                                ? 'text-green-600 font-medium'
                                : 'text-red-600 font-medium'
                            }
                          >
                            {item.status}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Pending</span>
                        )}
                      </td>
                      <td className="px-2 py-1">
                        <div className="flex gap-2">
                          <button
                            className="px-2 py-1 text-xs rounded bg-green-600 text-white"
                            onClick={() =>
                              setModalItems((prev) =>
                                prev.map((m, i) => (i === idx ? { ...m, status: 'APPROVED' } : m))
                              )
                            }
                          >
                            Approve
                          </button>
                          <button
                            className="px-2 py-1 text-xs rounded bg-red-600 text-white"
                            onClick={() =>
                              setModalItems((prev) =>
                                prev.map((m, i) => (i === idx ? { ...m, status: 'REJECTED' } : m))
                              )
                            }
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <DialogFooter className="mt-4">
            <button
              className="px-4 py-2 rounded bg-primary text-white disabled:opacity-70"
              onClick={(e) => {
                e.preventDefault();
                onSaveEdit();
              }}
              disabled={saving || !canSave}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RowClickBinder({
  rows,
  onPick,
}: {
  rows: IndentRow[];
  onPick: (row: IndentRow) => void;
}) {
  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tr = target.closest('tr');
      if (!tr) return;
      const firstCell = tr.querySelector('td, th');
      const text = (firstCell?.textContent || '').trim();
      if (!text) return;
      const match = rows.find((r) => (r.requestNumber || '') === text);
      if (match) onPick(match);
    }
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [rows, onPick]);
  return null;
}
