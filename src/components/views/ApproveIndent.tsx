import { type ColumnDef } from '@tanstack/react-table';
import DataTable from '../element/DataTable';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { ClipboardCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import Heading from '../element/Heading';
import { Pill } from '../ui/pill';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '../ui/button';
import { z } from 'zod';
import { useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel } from '../ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Input } from '../ui/input';
import { PuffLoader as Loader } from 'react-spinners';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { API_URL } from '@/api';

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
    // 1–3 pages: show all
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    // >3 pages: sliding window of 3
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
            variant={p === currentPage ? 'default' : 'outline'}
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

export default function ApproveIndent() {
  const { user } = useAuth();
  const [pendingData, setPendingData] = useState<IndentRow[]>([]);
  const [historyData, setHistoryData] = useState<IndentRow[]>([]);
  const [loading, setLoading] = useState(false); // initial + approve
  const [pendingPageLoading, setPendingPageLoading] = useState(false);
  const [historyPageLoading, setHistoryPageLoading] = useState(false);
  const [selectedIndent, setSelectedIndent] = useState<IndentRow | null>(null);
  const [openDialog, setOpenDialog] = useState(false);

  const [pendingPage, setPendingPage] = useState(1);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);

  // ✅ helper to fetch with token
  async function fetchWithToken(
    base: string,
    path: string,
    init?: RequestInit
  ) {
    const token = localStorage.getItem('token');
    const headers: HeadersInit = {
      ...(init?.headers || {}),
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

  // common mapper
  const mapData = (data: any[]): IndentRow[] =>
    data.map((item: any) => ({
      PLANNEDTIMESTAMP: item.PLANNEDTIMESTAMP || null,
      INDENT_NUMBER: item.INDENT_NUMBER,
      INDENT_DATE: item.INDENT_DATE,
      INDENTER_NAME: item.INDENTER_NAME,
      DIVISION: item.DIVISION,
      DEPARTMENT: item.DEPARTMENT,
      ITEM_NAME: item.ITEM_NAME,
      UM: item.UM,
      REQUIRED_QTY: item.REQUIRED_QTY,
      REMARK: item.REMARK,
      SPECIFICATION: item.SPECIFICATION,
      COST_PROJECT: item.COST_PROJECT,
      CANCELLEDDATE: item.CANCELLEDDATE || null,
      CANCELLED_REMARK: item.CANCELLED_REMARK || null,
      PO_NO: item.PO_NO || null,
      PO_QTY: item.PO_QTY || null,
      VENDOR_TYPE: item.VENDOR_TYPE || null,
    }));

  // 🔹 Pending page fetch
  async function fetchPending(page = 1) {
    try {
      setPendingPageLoading(true);
      const res = await fetchWithToken(
        API_URL,
        `/store-indent/pending?page=${page}&pageSize=${PAGE_SIZE}`
      );
      if (!res.ok) throw new Error('Failed to fetch pending indents');
      const json = await res.json();
      const rows = Array.isArray(json.data) ? json.data : [];

      setPendingData(mapData(rows));
      setPendingPage(json.page ?? page);
      setPendingTotal(json.total ?? rows.length);
    } finally {
      setPendingPageLoading(false);
    }
  }

  // 🔹 History page fetch
  async function fetchHistory(page = 1) {
    try {
      setHistoryPageLoading(true);
      const res = await fetchWithToken(
        API_URL,
        `/store-indent/history?page=${page}&pageSize=${PAGE_SIZE}`
      );
      if (!res.ok) throw new Error('Failed to fetch history');
      const json = await res.json();
      const rows = Array.isArray(json.data) ? json.data : [];

      setHistoryData(mapData(rows));
      setHistoryPage(json.page ?? page);
      setHistoryTotal(json.total ?? rows.length);
    } finally {
      setHistoryPageLoading(false);
    }
  }

  // Initial load: page 1 of each
  async function fetchInitial() {
    try {
      setLoading(true);
      await Promise.all([fetchPending(1), fetchHistory(1)]);
    } catch (err) {
      toast.error('Failed to fetch indents');
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
      ? new Date(dateString).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : '';

  const formatDateTime = (dateString?: string | null) =>
    dateString
      ? new Date(dateString).toLocaleString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      : '';

  // 🔹 Pending columns (GLOBAL S.No)
  const pendingColumns: ColumnDef<IndentRow>[] = [
    {
      header: 'S.No',
      cell: ({ row }) => (pendingPage - 1) * PAGE_SIZE + row.index + 1,
    },
    {
      accessorKey: 'PLANNEDTIMESTAMP',
      header: ' Planned Time Stamp',
      cell: ({ row }) => formatDateTime(row.original.PLANNEDTIMESTAMP),
    },
    { accessorKey: 'INDENT_NUMBER', header: 'Indent No.' },
    {
      accessorKey: 'INDENT_DATE',
      header: 'Indent Date',
      cell: ({ row }) => formatDate(row.original.INDENT_DATE),
    },
    { accessorKey: 'INDENTER_NAME', header: 'Indenter' },
    { accessorKey: 'DIVISION', header: 'Division' },
    { accessorKey: 'DEPARTMENT', header: 'Department' },
    { accessorKey: 'ITEM_NAME', header: 'Item Name' },
    { accessorKey: 'UM', header: 'UOM' },
    { accessorKey: 'REQUIRED_QTY', header: 'Required Qty' },
    { accessorKey: 'REMARK', header: 'Remark' },
    { accessorKey: 'SPECIFICATION', header: 'Specification' },
    {
      accessorKey: 'VENDOR_TYPE',
      header: 'Vendor Type',
      cell: ({ row }) => (
        <Pill variant="pending">{row.original.VENDOR_TYPE || 'Pending'}</Pill>
      ),
    },
  ];

  // 🔹 History columns (GLOBAL S.No)
  const historyColumns: ColumnDef<IndentRow>[] = [
    {
      header: 'S.No',
      cell: ({ row }) => (historyPage - 1) * PAGE_SIZE + row.index + 1,
    },
    {
      accessorKey: 'PLANNEDTIMESTAMP',
      header: ' Planned Time Stamp ',
      cell: ({ row }) => formatDateTime(row.original.PLANNEDTIMESTAMP),
    },
    { accessorKey: 'INDENT_NUMBER', header: 'Indent No.' },
    {
      accessorKey: 'INDENT_DATE',
      header: 'Indent Date',
      cell: ({ row }) => formatDate(row.original.INDENT_DATE),
    },
    { accessorKey: 'INDENTER_NAME', header: 'Indenter' },
    { accessorKey: 'DIVISION', header: 'Division' },
    { accessorKey: 'DEPARTMENT', header: 'Department' },
    { accessorKey: 'ITEM_NAME', header: 'Item Name' },
    { accessorKey: 'UM', header: 'UOM' },
    { accessorKey: 'REQUIRED_QTY', header: 'Required Qty' },
    { accessorKey: 'REMARK', header: 'Remark' },
    { accessorKey: 'SPECIFICATION', header: 'Specification' },
    { accessorKey: 'COST_PROJECT', header: 'Cost Project' },
    {
      accessorKey: 'CANCELLEDDATE',
      header: 'Cancelled Date & Time',
      cell: ({ row }) => formatDateTime(row.original.CANCELLEDDATE),
    },
    { accessorKey: 'CANCELLED_REMARK', header: 'Cancelled Remark' },
    { accessorKey: 'PO_NO', header: 'PO No.' },
    { accessorKey: 'PO_QTY', header: 'PO Qty' },
    {
      accessorKey: 'VENDOR_TYPE',
      header: 'Vendor Type',
      cell: ({ row }) => {
        const type = row.original.VENDOR_TYPE;
        const variant =
          type === 'Reject'
            ? 'reject'
            : type === 'Regular'
            ? 'primary'
            : 'secondary';
        return <Pill variant={variant}>{type || 'Pending'}</Pill>;
      },
    },
  ];

  // Form schema
  const schema = z
    .object({
      vendorType: z.enum(['Reject', 'Three Party', 'Regular']),
      approvedQuantity: z.coerce.number().optional(),
    })
    .superRefine((data, ctx) => {
      if (
        data.vendorType !== 'Reject' &&
        (!data.approvedQuantity || data.approvedQuantity === 0)
      ) {
        ctx.addIssue({
          path: ['approvedQuantity'],
          code: z.ZodIssueCode.custom,
          message: 'Approved quantity required',
        });
      }
    });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { vendorType: undefined, approvedQuantity: undefined },
  });

  const vendorType = form.watch('vendorType');

  useEffect(() => {
    if (selectedIndent) {
      form.setValue('approvedQuantity', selectedIndent.REQUIRED_QTY);
    }
  }, [selectedIndent, form]);

  async function onSubmit(values: z.infer<typeof schema>) {
    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`${APPROVE_API_BASE}/store-indent/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          indentNumber: selectedIndent?.INDENT_NUMBER,
          itemCode: selectedIndent?.ITEM_NAME,
          vendorType: values.vendorType,
          approvedQuantity: values.approvedQuantity,
        }),
      });

      if (!res.ok) throw new Error('Approval update failed');

      toast.success(
        `Indent ${selectedIndent?.INDENT_NUMBER} updated successfully`
      );
      setOpenDialog(false);
      form.reset();
      await fetchInitial();
    } catch (err) {
      toast.error('Failed to update indent');
      console.error(err);
    }
  }

  function onError(e: FieldErrors<z.infer<typeof schema>>) {
    console.error(e);
    toast.error('Please fill all required fields');
  }

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

          <TabsContent value="pending">
            <div className="overflow-x-auto overflow-y-auto max-h-[70vh] border rounded-xl p-3 bg-white shadow-sm">
              <DataTable
                data={pendingData}
                columns={pendingColumns}
                searchFields={[
                  'INDENT_NUMBER',
                  'ITEM_NAME',
                  'DEPARTMENT',
                  'INDENTER_NAME',
                ]}
                dataLoading={loading || pendingPageLoading}
              />
              <PaginationBar
                currentPage={pendingPage}
                totalItems={pendingTotal}
                pageSize={PAGE_SIZE}
                isLoading={pendingPageLoading}
                onPageChange={(page) => {
                  if (page === pendingPage) return; // same page → no fetch
                  const safe = Math.max(1, page);
                  fetchPending(safe).catch((err) => {
                    console.error(err);
                    toast.error('Failed to change page');
                  });
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="history">
            <div className="overflow-x-auto overflow-y-auto max-h-[70vh] border rounded-xl p-3 bg-white shadow-sm">
              <DataTable
                data={historyData}
                columns={historyColumns}
                searchFields={[
                  'INDENT_NUMBER',
                  'ITEM_NAME',
                  'DEPARTMENT',
                  'INDENTER_NAME',
                ]}
                dataLoading={loading || historyPageLoading}
              />
              <PaginationBar
                currentPage={historyPage}
                totalItems={historyTotal}
                pageSize={PAGE_SIZE}
                isLoading={historyPageLoading}
                onPageChange={(page) => {
                  if (page === historyPage) return;
                  const safe = Math.max(1, page);
                  fetchHistory(safe).catch((err) => {
                    console.error(err);
                    toast.error('Failed to change page');
                  });
                }}
              />
            </div>
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
                    Update approval for <b>{selectedIndent.INDENT_NUMBER}</b>
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
                            disabled={vendorType === 'Reject'}
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
