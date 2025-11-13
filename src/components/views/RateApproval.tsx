// src/pages/ThreePartyRateApproval.tsx

import type { ColumnDef, Row } from '@tanstack/react-table';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { useEffect, useState } from 'react';
import DataTable from '../element/DataTable';
import { Button } from '../ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel } from '../ui/form';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { PuffLoader as Loader } from 'react-spinners';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Users } from 'lucide-react';
import { Tabs, TabsContent } from '../ui/tabs';
import Heading from '../element/Heading';
import { Input } from '../ui/input';

// 👇 NEW: API calls to your Oracle backend
const API_BASE = "http://3.6.126.4:3004/three-party-approval";

async function fetchPendingApprovals() {
  const res = await fetch(`${API_BASE}/pending`);
  if (!res.ok) throw new Error("Failed to fetch pending approvals");
  return res.json();
}

async function fetchApprovalHistory() {
  const res = await fetch(`${API_BASE}/history`);
  if (!res.ok) throw new Error("Failed to fetch approval history");
  return res.json();
}

async function approveVendor(indentNumber: string, approvedVendor: string, approvedRate: number, approvedPaymentTerm: string) {
  const res = await fetch(`${API_BASE}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // body: JSON.stringify({ indentNumber, approvedVendor, approvedRate, approvedPaymentTerm }),
    body: JSON.stringify({
  indentNumber,
  vendorName: approvedVendor,
  rate: approvedRate,
  paymentTerm: approvedPaymentTerm
}),

  });
  if (!res.ok) throw new Error("Failed to approve vendor");
  return res.json();
}

interface VendorData {
  indentNo: string;
  indenter: string;
  department: string;
  product: string;
  comparisonSheet: string;
  vendors: { name: string; rate: number; term: string }[];
  vendorType: string;
}

export default function ThreePartyRateApproval() {
  const [pendingData, setPendingData] = useState<VendorData[]>([]);
  const [historyData, setHistoryData] = useState<VendorData[]>([]);
  const [selectedIndent, setSelectedIndent] = useState<VendorData | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  // 🔹 Load data from backend
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [pending, history] = await Promise.all([
          fetchPendingApprovals(),
          fetchApprovalHistory(),
        ]);
        setPendingData(pending);
        setHistoryData(history);
      } catch (err) {
        toast.error("Failed to load approvals");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const schema = z.object({
    vendor: z.string().nonempty(),
  });

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { vendor: '' },
  });

  async function onSubmit(values: z.infer<typeof schema>) {
    try {
      const selectedVendor = selectedIndent!.vendors[parseInt(values.vendor)];
      await approveVendor(
        selectedIndent!.indentNo,
        selectedVendor.name,
        selectedVendor.rate,
        selectedVendor.term
      );
      toast.success(`Approved vendor ${selectedVendor.name} for ${selectedIndent!.indentNo}`);
      setOpenDialog(false);
      form.reset();
    } catch {
      toast.error("Failed to approve vendor");
    }
  }

  function onError() {
    toast.error("Please select a vendor");
  }

  const columns: ColumnDef<VendorData>[] = [
    {
      header: "Action",
      id: "action",
      cell: ({ row }: { row: Row<VendorData> }) => (
        <DialogTrigger asChild>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedIndent(row.original);
              setOpenDialog(true);
            }}
          >
            Approve
          </Button>
        </DialogTrigger>
      ),
    },
    { accessorKey: "indentNo", header: "Indent No." },
    { accessorKey: "indenter", header: "Indenter" },
    { accessorKey: "department", header: "Department" },
    { accessorKey: "product", header: "Product" },
    { accessorKey: "vendorType", header: "Vendor Type" },
  ];

  return (
    <div>
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <Tabs defaultValue="pending">
          <Heading heading="Three Party Rate Approval" subtext="Approve rates for three party vendors" tabs>
            <Users size={50} className="text-primary" />
          </Heading>

          <TabsContent value="pending">
            <DataTable data={pendingData} columns={columns} searchFields={["product", "department", "indenter"]} dataLoading={loading} />
          </TabsContent>

          <TabsContent value="history">
            <DataTable data={historyData} columns={columns} searchFields={["product", "department", "indenter"]} dataLoading={loading} />
          </TabsContent>
        </Tabs>

        {selectedIndent && (
          <DialogContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-5">
                <DialogHeader>
                  <DialogTitle>Approve Vendor</DialogTitle>
                  <DialogDescription>
                    Choose a vendor for <b>{selectedIndent.indentNo}</b>
                  </DialogDescription>
                </DialogHeader>

                <FormField
                  control={form.control}
                  name="vendor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Vendor</FormLabel>
                      <FormControl>
                        <RadioGroup onChange={field.onChange}>
                          {selectedIndent.vendors.map((v, i) => (
                            <FormItem key={i}>
                              <FormLabel className="flex justify-between items-center border rounded-md p-3">
                                <FormControl>
                                  <RadioGroupItem value={`${i}`} />
                                </FormControl>
                                <div className="flex justify-between w-full px-3">
                                  <span>{v.name}</span>
                                  <span>₹{v.rate}</span>
                                </div>
                              </FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Close</Button>
                  </DialogClose>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader size={20} color="white" />}
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
