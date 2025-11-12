import type { ColumnDef, Row } from '@tanstack/react-table';
import { useEffect, useState } from 'react';
import DataTable from '../element/DataTable';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  DialogHeader,
  DialogFooter,
  DialogClose,
} from '../ui/dialog';
import { uploadFile } from '@/lib/fetchers';
import { z } from 'zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel } from '../ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { PuffLoader as Loader } from 'react-spinners';
import { toast } from 'sonner';
import { Tabs, TabsContent } from '../ui/tabs';
import { UserCheck } from 'lucide-react';
import Heading from '../element/Heading';
import { Pill } from '../ui/pill';
import {
  fetchVendorRateUpdatePending,
  fetchVendorRateUpdateHistory,
  submitVendorRateUpdate,
} from '@/lib/fetchers';

interface VendorUpdateData {
  indentNo: string;
  indenter: string;
  department: string;
  product: string;
  quantity: number;
  uom: string;
  vendorType: 'Three Party' | 'Regular';
}

interface HistoryData {
  indentNo: string;
  indenter: string;
  department: string;
  product: string;
  quantity: number;
  uom: string;
  rate: number;
  vendorType: 'Three Party' | 'Regular';
  date: string;
}

export default function VendorRateUpdate() {
  const [selectedIndent, setSelectedIndent] = useState<VendorUpdateData | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<HistoryData | null>(null);
  const [historyData, setHistoryData] = useState<HistoryData[]>([]);
  const [pendingData, setPendingData] = useState<VendorUpdateData[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [allVendorNames, setAllVendorNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // 🔹 Fetch Pending + History data from Oracle backend
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [pending, history] = await Promise.all([
          fetchVendorRateUpdatePending(),
          fetchVendorRateUpdateHistory(),
        ]);
        setPendingData(pending);
        setHistoryData(history);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load vendor data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);


  useEffect(() => {
  async function loadData() {
    try {
      setLoading(true);
      const [pending, history] = await Promise.all([
        fetchVendorRateUpdatePending(),
        fetchVendorRateUpdateHistory(),
      ]);

      // ✅ Map uppercase Oracle keys to your frontend structure
      const mappedPending = pending.map((item: any) => ({
        indentNo: item.INDENT_NUMBER,
        indenter: item.INDENTER_NAME,
        department: item.DEPARTMENT,
        product: item.PRODUCT_NAME,
        quantity: item.APPROVED_QUANTITY,
        uom: item.UOM,
        vendorType: item.VENDOR_TYPE === 'Three Party' ? 'Three Party' : 'Regular',
      }));

      const mappedHistory = history.map((item: any) => ({
        indentNo: item.INDENT_NUMBER,
        indenter: item.INDENTER_NAME,
        department: item.DEPARTMENT,
        product: item.PRODUCT_NAME,
        quantity: item.APPROVED_QUANTITY,
        uom: item.UOM,
        vendorType: item.VENDOR_TYPE === 'Three Party' ? 'Three Party' : 'Regular',
        rate: item.APPROVED_RATE,
        date: item.ACTUAL_2,
      }));

      setPendingData(mappedPending);
      setHistoryData(mappedHistory);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load vendor data');
    } finally {
      setLoading(false);
    }
  }

  loadData();
}, []);


  // 🟢 Regular Vendor form
  const regularSchema = z.object({
    vendorName: z.string().nonempty(),
    rate: z.coerce.number().gt(0),
    paymentTerm: z.string().nonempty(),
  });

  const regularForm = useForm<z.infer<typeof regularSchema>>({
    resolver: zodResolver(regularSchema),
    defaultValues: { vendorName: '', rate: 0, paymentTerm: '' },
  });

  async function onSubmitRegular(values: z.infer<typeof regularSchema>) {
    try {
      const vendors = [
        {
          vendorName: values.vendorName,
          rate: values.rate,
          paymentTerm: values.paymentTerm,
        },
      ];

      await submitVendorRateUpdate(selectedIndent?.indentNo!, vendors, null);
      toast.success(`Updated vendor of ${selectedIndent?.indentNo}`);
      setOpenDialog(false);
      regularForm.reset();
    } catch {
      toast.error('Failed to update vendor');
    }
  }

  // 🟣 Three Party Vendor form
  const threePartySchema = z.object({
    comparisonSheet: z.instanceof(File).optional(),
    vendors: z
      .array(
        z.object({
          vendorName: z.string().nonempty(),
          rate: z.coerce.number().gt(0),
          paymentTerm: z.string().nonempty(),
        })
      )
      .max(15)
      .min(1),
  });

  const threePartyForm = useForm<z.infer<typeof threePartySchema>>({
    resolver: zodResolver(threePartySchema),
    defaultValues: {
      vendors: [{ vendorName: '', rate: 0, paymentTerm: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: threePartyForm.control,
    name: 'vendors',
  });

async function onSubmitThreeParty(values: z.infer<typeof threePartySchema>) {
  try {
    let url = '';
    if (values.comparisonSheet) {
      url = await uploadFile(values.comparisonSheet, 'comparison_sheets');
    }

    await submitVendorRateUpdate(selectedIndent?.indentNo!, values.vendors, url);
    toast.success(`Updated vendors of ${selectedIndent?.indentNo}`);
    setOpenDialog(false);
    threePartyForm.reset();
  } catch {
    toast.error('Failed to update vendor');
  }
}


  const columns: ColumnDef<VendorUpdateData>[] = [
    {
      header: 'Action',
      cell: ({ row }: { row: Row<VendorUpdateData> }) => (
        <DialogTrigger asChild>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedIndent(row.original);
              setOpenDialog(true);
            }}
          >
            Update
          </Button>
        </DialogTrigger>
      ),
    },
    { accessorKey: 'indentNo', header: 'Indent No.' },
    { accessorKey: 'indenter', header: 'Indenter' },
    { accessorKey: 'department', header: 'Department' },
    { accessorKey: 'product', header: 'Product' },
    { accessorKey: 'quantity', header: 'Quantity' },
    { accessorKey: 'uom', header: 'UOM' },
    {
      accessorKey: 'vendorType',
      header: 'Vendor Type',
      cell: ({ row }) => (
        <Pill variant={row.original.vendorType === 'Regular' ? 'primary' : 'secondary'}>
          {row.original.vendorType}
        </Pill>
      ),
    },
  ];

  const historyColumns: ColumnDef<HistoryData>[] = [
    { accessorKey: 'date', header: 'Date' },
    { accessorKey: 'indentNo', header: 'Indent No.' },
    { accessorKey: 'indenter', header: 'Indenter' },
    { accessorKey: 'department', header: 'Department' },
    { accessorKey: 'product', header: 'Product' },
    { accessorKey: 'quantity', header: 'Quantity' },
    { accessorKey: 'uom', header: 'UOM' },
    {
      accessorKey: 'rate',
      header: 'Rate',
      cell: ({ row }) =>
        row.original.rate ? (
          <>₹{row.original.rate}</>
        ) : (
          <span className="text-muted-foreground">Not Decided</span>
        ),
    },
    {
      accessorKey: 'vendorType',
      header: 'Vendor Type',
      cell: ({ row }) => (
        <Pill variant={row.original.vendorType === 'Regular' ? 'primary' : 'secondary'}>
          {row.original.vendorType}
        </Pill>
      ),
    },
  ];

  function onError(e: any) {
    console.log(e);
    toast.error('Please fill all required fields');
  }

  return (
    <div>
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <Tabs defaultValue="pending">
          <Heading
            heading="Vendor Rate Update"
            subtext="Update vendors for Regular and Three Party indents"
            tabs
          >
            <UserCheck size={50} className="text-primary" />
          </Heading>

          {/* Pending Tab */}
          <TabsContent value="pending">
            <DataTable
              data={pendingData}
              columns={columns}
              searchFields={['product', 'department', 'indenter', 'vendorType']}
              dataLoading={loading}
            />
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <DataTable
              data={historyData}
              columns={historyColumns}
              searchFields={['product', 'department', 'indenter', 'vendorType']}
              dataLoading={loading}
            />
          </TabsContent>
        </Tabs>

{selectedIndent && (
  <DialogContent className="max-h-[90vh] overflow-y-auto">
    <Form {...threePartyForm}>
      <form
        onSubmit={threePartyForm.handleSubmit(onSubmitThreeParty, onError)}
        className="space-y-7"
      >
        <DialogHeader className="space-y-1">
          <DialogTitle>
            {selectedIndent.vendorType === 'Three Party'
              ? 'Three Party Vendors'
              : 'Regular Vendors'}
          </DialogTitle>
          <DialogDescription>
            Update vendors for{' '}
            <span className="font-medium">{selectedIndent.indentNo}</span>
            <br />
            <span className="text-sm">
              {fields.length} of 15 vendors added
            </span>
          </DialogDescription>
        </DialogHeader>

        {/* Indent Details */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-muted py-2 px-5 rounded-md ">
          <div className="space-y-1">
            <p className="font-medium">Indenter</p>
            <p className="text-sm font-light">{selectedIndent.indenter}</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium">Department</p>
            <p className="text-sm font-light">{selectedIndent.department}</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium">Product</p>
            <p className="text-sm font-light">{selectedIndent.product}</p>
          </div>
        </div>

        {/* Vendor Forms */}
        <div className="grid gap-5 p-4 border rounded-md">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="border rounded-md p-4 relative"
            >
              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 h-6 w-6 p-0"
                  onClick={() => remove(index)}
                >
                  ×
                </Button>
              )}

              <div className="grid gap-3">
                <h4 className="font-medium">Vendor {index + 1}</h4>

                {/* Vendor Name */}
                <FormField
                  control={threePartyForm.control}
                  name={`vendors.${index}.vendorName`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter vendor name"
                          list={`vendor-list-${index}`}
                          {...field}
                        />
                      </FormControl>
                      <datalist id={`vendor-list-${index}`}>
                        {allVendorNames.map((v, i) => (
                          <option key={i} value={v} />
                        ))}
                      </datalist>
                    </FormItem>
                  )}
                />

                {/* Rate */}
                <FormField
                  control={threePartyForm.control}
                  name={`vendors.${index}.rate`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rate</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter rate"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Payment Term */}
                <FormField
                  control={threePartyForm.control}
                  name={`vendors.${index}.paymentTerm`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Term</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter payment term"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Add Vendor Button */}
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() =>
              append({ vendorName: '', rate: 0, paymentTerm: '' })
            }
            disabled={fields.length >= 15}
            variant="outline"
            size="sm"
          >
            + Add Vendor
          </Button>
        </div>

        {/* Comparison Sheet (optional) */}
        {/* {selectedIndent.vendorType === 'Three Party' && (
          <FormField
            control={threePartyForm.control}
            name="comparisonSheet"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Comparison Sheet</FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    onChange={(e) =>
                      field.onChange(e.target.files?.[0])
                    }
                  />
                </FormControl>
              </FormItem>
            )}
          />
        )} */}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>

          <Button
            type="submit"
            disabled={threePartyForm.formState.isSubmitting}
          >
            {threePartyForm.formState.isSubmitting && (
              <Loader
                size={20}
                color="white"
                aria-label="Loading Spinner"
              />
            )}
            Update
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
