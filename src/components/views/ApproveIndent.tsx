import { type ColumnDef } from '@tanstack/react-table';
import DataTable from '../element/DataTable';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { ClipboardCheck } from 'lucide-react';
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
import { API_URL } from '@/api'; // http://localhost:3004

// 👇 if your approve API is on 3002 keep separate base here
const APPROVE_API_BASE = `${API_URL}/three-party-approval`;

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

export default function ApproveIndent() {
  const { user } = useAuth();
  const [pendingData, setPendingData] = useState<IndentRow[]>([]);
  const [historyData, setHistoryData] = useState<IndentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndent, setSelectedIndent] = useState<IndentRow | null>(null);
  const [openDialog, setOpenDialog] = useState(false);

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

  // Fetch data
  async function fetchData() {
    try {
      setLoading(true);
      // ✅ both GETs now send token
      const [pendingRes, historyRes] = await Promise.all([
        fetchWithToken(API_URL, '/store-indent/pending'),
        fetchWithToken(API_URL, '/store-indent/history'),
      ]);

      if (!pendingRes.ok || !historyRes.ok) {
        throw new Error('Failed to fetch indents');
      }

      const pending = await pendingRes.json();
      const history = await historyRes.json();

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

      setPendingData(mapData(pending));
      setHistoryData(mapData(history));
    } catch (err) {
      toast.error('Failed to fetch indents');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
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

  const pendingColumns: ColumnDef<IndentRow>[] = [
    { header: 'S.No', cell: ({ row }) => row.index + 1 },
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

  const historyColumns: ColumnDef<IndentRow>[] = [
    { header: 'S.No', cell: ({ row }) => row.index + 1 },
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
  }, [selectedIndent]);

  // ✅ approval call now also sends token
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
      await fetchData();
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
                dataLoading={loading}
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
                dataLoading={loading}
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
