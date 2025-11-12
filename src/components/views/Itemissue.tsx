// src/components/views/ItemIssue.tsx
import React from 'react';
import { useForm } from 'react-hook-form';
import {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormField,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import Heading from '../element/Heading';
import { ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

type ItemIssueForm = {
  vrSeries: string;
  department: string;
  requisitionBy: string;
  requestNumber: string;
  requisitionDate: string;
  division: string;
  requestQty: string;
  uom: string;
  costLocation: string;
  remark: string;
};

export default function ItemIssue() {
  const form = useForm<ItemIssueForm>({
    defaultValues: {
      vrSeries: '',
      department: '',
      requisitionBy: '',
      requestNumber: '',
      requisitionDate: '',
      division: '',
      requestQty: '',
      uom: '',
      costLocation: '',
      remark: '',
    },
  });

  const { handleSubmit, control, reset } = form;

  // submit handler – right now just toast, you can plug Google Sheet here
  const onSubmit = async (data: ItemIssueForm) => {
    console.log('Item issue data:', data);
    toast.success('Item Issue saved (demo)');
    // TODO: yahi pe aap Apps Script / backend ko POST kar do
    // reset form if needed
    // reset();
  };

  return (
    <div className="p-4 md:p-6 lg:p-10 bg-gradient-to-br from-gray-50 to-white rounded-2xl">
      <Heading
        heading="Item Issue Form"
        subtext="Issue material against requisition"
      >
        <ClipboardList size={50} className="text-primary" />
      </Heading>

      <Form {...form}>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6 bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100"
        >
          {/* Top row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* VR Series */}
            <FormField
              control={control}
              name="vrSeries"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>VR Series</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="border rounded-md h-10 px-3 text-sm w-full"
                    >
                      <option value="">Select VR Series</option>
                      <option value="IS1">IS1 - STORE ISSUE</option>
                      <option value="IS2">IS2 - PROJECT ISSUE</option>
                      <option value="IS3">IS3 - MAINTENANCE ISSUE</option>
                    </select>
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Department */}
            <FormField
              control={control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="border rounded-md h-10 px-3 text-sm w-full"
                    >
                      <option value="">Select Department</option>
                      <option value="SMS">SMS</option>
                      <option value="ROLLING">ROLLING</option>
                      <option value="PIPEMILL">PIPE MILL</option>
                      <option value="MAINT">MAINTENANCE</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Requisition By */}
            <FormField
              control={control}
              name="requisitionBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Requisition By</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter employee / user name" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {/* Second row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Request Number */}
            <FormField
              control={control}
              name="requestNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Request Number</FormLabel>
                  <FormControl>
                    <Input placeholder="REQ-XXXX" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Requisition Date */}
            <FormField
              control={control}
              name="requisitionDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Requisition Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Division */}
            <FormField
              control={control}
              name="division"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Division</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="border rounded-md h-10 px-3 text-sm w-full"
                    >
                      <option value="">Select Division</option>
                      <option value="SM">SM - SMS</option>
                      <option value="RP">RP - PATRA</option>
                      <option value="PM">PM - PIPEMILL</option>
                      <option value="CO">CO - COMMERCIAL</option>
                    </select>
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {/* Third row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Request Qty */}
            <FormField
              control={control}
              name="requestQty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Request Qty</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Enter qty" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* UOM */}
            <FormField
              control={control}
              name="uom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>UOM</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="border rounded-md h-10 px-3 text-sm w-full"
                    >
                      <option value="">Select UOM</option>
                      <option value="NOS">NOS</option>
                      <option value="KG">KG</option>
                      <option value="MTR">MTR</option>
                      <option value="SET">SET</option>
                    </select>
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Cost Location */}
            <FormField
              control={control}
              name="costLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cost Location / Project</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter cost centre / location" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {/* Remark */}
          <FormField
            control={control}
            name="remark"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Remark</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder="Any note for store / issue..."
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Buttons */}
          <div className="flex gap-3 justify-between">
            <Button type="submit" className="px-10">
              Submit Item Issue
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => reset()}
            >
              Reset
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
