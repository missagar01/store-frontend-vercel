import { useEffect, useMemo, useState } from 'react';
import Heading from '../element/Heading';
import { ClipboardCheck } from 'lucide-react';
import { fetchSheet } from '@/lib/fetchers';
import DataTable from '../element/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

// Row type
type IndentRow = {
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
  status?: 'APPROVED' | 'REJECTED' | '';
  rowIndex?: number;
  sheetName?: string;
};

// GAS endpoint
const GAS_URL = import.meta.env.VITE_APP_SCRIPT_URL as string;

// ✅ Send updates (Request Status + Approved Quantity + Actual 1 timestamp)
async function sendApprovedToSheet(items: IndentRow[], sheetName = 'INDENT') {
  const nowIso = new Date().toISOString();

  const rowsForGas = items.map((m) => ({
    rowIndex: m.rowIndex, // must match the sheet row
    // keep others blank to avoid overwriting
    requestNumber: '',
    indentSeries: '',
    requesterName: '',
    department: '',
    division: '',
    itemCode: '',
    productName: '',
    requestQty: '',
    uom: '',
    costLocation: '',
    formType: '',
    // ✅ Actual 1 timestamp
    actual1: nowIso,
    // ✅ Status and approved quantity
    requestStatus: m.status && m.status !== '' ? m.status : 'PENDING',
    approvedQuantity:
      typeof m.requestQty === 'number' ? m.requestQty : Number(m.requestQty || 0),
  }));

  // console.log('[frontend] sending rows to GAS:', rowsForGas);

  const body = new URLSearchParams({
    action: 'update',
    sheetName,
    rows: JSON.stringify(rowsForGas),
  });

  const res = await fetch(GAS_URL, {
    method: 'POST',
    body,
  });

  const text = await res.text();
  // console.log('[frontend] GAS raw response:', text);

  if (!res.ok) throw new Error(text || 'Sheet update failed');
}

export default function ApprowIndentData() {
  const [rows, setRows] = useState<IndentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [indentNumber, setIndentNumber] = useState('');
  const [headerRequesterName, setHeaderRequesterName] = useState('');
  const [openEdit, setOpenEdit] = useState(false);
  const [modalItems, setModalItems] = useState<IndentRow[]>([]);
  const [saving, setSaving] = useState(false);

  // Fetch rows
  useEffect(() => {
    let active = true;
    setLoading(true);

    fetchSheet('INDENT')
      .then((res) => {
        if (!active) return;
        const list = Array.isArray(res)
          ? res
          : Array.isArray((res as any).rows)
          ? (res as any).rows
          : [];

        // console.log('[frontend] fetched sheet rows:', list);

        const s = (v: unknown) => (typeof v === 'string' ? v : '');
        const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
        const DATA_STARTS_AT = 7;

        type Rec = Record<string, any>;
        const mapped = list.map((r, idx) => {
          const rec = r as Rec;
          const obj: IndentRow = {
            timestamp: s(rec['timestamp'] ?? rec['Timestamp']),
            requestNumber: s(rec['requestNumber'] ?? rec['Request Number']),
            requesterName: s(rec['requesterName'] ?? rec['Requester Name']),
            department: s(rec['department'] ?? rec['Department']),
            indentSeries: s(rec['indentSeries'] ?? rec['Indent Series']),
            division: s(rec['division'] ?? rec['Division']),
            itemCode: s(rec['itemCode'] ?? rec['Item Code']),
            productName: s(rec['productName'] ?? rec['Product Name']),
            requestQty: n(rec['requestQty'] ?? rec['Request Qty']),
            uom: s(rec['uom'] ?? rec['UOM']),
            costLocation: s(rec['costLocation'] ?? rec['Cost Location']),
            formType: s(rec['formType'] ?? rec['Form Type']),
            status: s(rec['requestStatus'] ?? ''),
            rowIndex:
              typeof rec['rowIndex'] === 'number' && rec['rowIndex'] > 0
                ? rec['rowIndex']
                : DATA_STARTS_AT + idx,
            sheetName: s(rec['sheetName'] ?? 'INDENT'),
          };
          return obj;
        });

        // console.log('[frontend] mapped rows:', mapped);
        setRows(mapped);

        // Fill header with latest request
        if (mapped.length > 0) {
          const sorted = [...mapped].sort(
            (a, b) => Date.parse(b.timestamp || '') - Date.parse(a.timestamp || '')
          );
          const latest = sorted.find((r) => (r.requestNumber || '').trim() !== '');
          if (latest?.requestNumber) setIndentNumber(latest.requestNumber);
          if (latest?.requesterName) setHeaderRequesterName(latest.requesterName);
        }
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, []);

  // Show only PENDING or empty
  const pendingRows = useMemo(
    () =>
      rows.filter(
        (r) => !r.status || r.status === '' || r.status.toUpperCase() === 'PENDING'
      ),
    [rows]
  );

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
              const r = row.original;
              const rn = r.requestNumber || '';
              const sameReqRows = rows.filter((x) => x.requestNumber === rn);
              // console.log('[frontend] editing:', rn, sameReqRows);
              setIndentNumber(rn);
              setHeaderRequesterName(r.requesterName || '');
              setModalItems(sameReqRows);
              setOpenEdit(true);
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

    // ✅ Moved this to the very end (Actions column)
   
  ],
  [rows]
);


  function selectFromRow(r: IndentRow) {
    setIndentNumber(r.requestNumber || '');
    setHeaderRequesterName(r.requesterName || '');
  }

  // Save changes
  async function onSaveEdit() {
    try {
      setSaving(true);
      // console.log('[frontend] saving modal items:', modalItems);

      // Update UI
      setRows((prev) => {
        const reqNo = indentNumber;
        const others = prev.filter((p) => p.requestNumber !== reqNo);
        return [...others, ...modalItems];
      });

      // Push updates to GAS
      await sendApprovedToSheet(modalItems, 'INDENT');

      setOpenEdit(false);
    } catch (err) {
      console.error('[frontend] Failed to update sheet', err);
      alert('Failed to update sheet');
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
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
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

          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
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
                {modalItems.length === 0 ? (
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
              disabled={saving}
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
