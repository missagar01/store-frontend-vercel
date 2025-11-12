import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { toast } from 'sonner';
import { Form, FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from '@/components/ui/select';
import { ClipLoader as Loader } from 'react-spinners';
import { ClipboardList, Trash } from 'lucide-react';
import { postToSheet, uploadFile } from '@/lib/fetchers';
import type { IndentSheet } from '@/types';
import { useSheets } from '@/context/SheetsContext';
import Heading from '../element/Heading';
import { useEffect, useState } from 'react';

export default () => {
    const { indentSheet: sheet, updateIndentSheet, masterSheet: options } = useSheets();
    const [indentSheet, setIndentSheet] = useState<IndentSheet[]>([]);
    useEffect(() => {
        setIndentSheet(sheet);
    }, [sheet]);

    const schema = z.object({
        indenterName: z.string().nonempty(),
        indentApproveBy: z.string().nonempty(),
        indentType: z.enum(['Purchase', 'Store Out'], { required_error: 'Select a status' }),
        products: z
            .array(
                z.object({
                    department: z.string().nonempty(),
                    groupHead: z.string().nonempty(),
                    productName: z.string().nonempty(),
                    quantity: z.coerce.number().gt(0, 'Must be greater than 0'),
                    uom: z.string().nonempty(),
                    itemCode: z.string().nonempty(),
                    attachment: z.instanceof(File).optional(),
                    specifications: z.string().optional(),
                })
            )
            .min(1, 'At least one product is required'),
    });

    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            indenterName: '',
            indentApproveBy: '',
            indentType: undefined,
            products: [
                {
                    attachment: undefined,
                    uom: '',
                    productName: '',
                    specifications: '',
                    quantity: 1,
                    itemCode: '',
                    groupHead: '',
                    department: '',
                },
            ],
        },
    });

    const products = form.watch('products');
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'products',
    });

    async function onSubmit(data) {
        try {
            for (const product of data.products) {
                const row = {
                    timestamp: new Date().toISOString(),
                    indenterName: data.indenterName,
                    department: product.department,
                    groupHead: product.groupHead,
                    itemCode: product.itemCode,
                    productName: product.productName,
                    quantity: product.quantity,
                    uom: product.uom,
                    specifications: product.specifications || '',
                    indentApprovedBy: data.indentApproveBy,
                    indentType: data.indentType,
                    attachment: product.attachment ? product.attachment.name : null,
                };

                const res = await fetch('http://localhost:3002/store-indent', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(row),
                });

                if (!res.ok) throw new Error('Failed to save indent');
            }

            toast.success('Indent created successfully');
            form.reset();
        } catch (err) {
            console.error(err);
            toast.error('Error while creating indent! Please try again');
        }
    }

    function onError(e: any) {
        console.log(e);
        toast.error('Please fill all required fields');
    }

    return (
        <div>
            <Heading heading="Indent Form" subtext="Create new Indent">
                <ClipboardList size={50} className="text-primary" />
            </Heading>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-6 p-5">
                   

                    <div className="space-y-4">
                      

                        {fields.map((field, index) => {
                            const groupHead = products[index]?.groupHead;
                            const productOptions = options?.groupHeads[groupHead] || [];

                            return (
                                <div
                                    key={field.id}
                                    className="flex flex-col gap-4 border p-4 rounded-lg"
                                >
                                    <div className="flex justify-between">
                                        <h3 className="text-md font-semibold">
                                            Product {index + 1}
                                        </h3>
                                        <Button
                                            variant="destructive"
                                            type="button"
                                            onClick={() => fields.length > 1 && remove(index)}
                                            disabled={fields.length === 1}
                                        >
                                            <Trash />
                                        </Button>
                                    </div>
                                    <div className="grid gap-4">
                                         <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        <FormField
                            control={form.control}
                            name="indenterName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        Indenter Name
                                        <span className="text-destructive">*</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter indenter name" {...field} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        {/* <FormField
                            control={form.control}
                            name="indentType"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        Indent Type
                                        <span className="text-destructive">*</span>
                                    </FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Purchase">Purchase</SelectItem>
                                            <SelectItem value="Store Out">Store Out</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}
                        /> */}

                         <FormField
                            control={form.control}
                            name="indenterName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        Indent NO
                                        <span className="text-destructive">*</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter Indent No" {...field} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />


                    </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <FormField
                                                control={form.control}
                                                name={`products.${index}.department`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>
                                                            Department
                                                            <span className="text-destructive">
                                                                *
                                                            </span>
                                                        </FormLabel>
                                                        <Select
                                                            onValueChange={field.onChange}
                                                            value={field.value}
                                                        >
                                                            <FormControl>
                                                                <SelectTrigger className="w-full">
                                                                    <SelectValue placeholder="Select department" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {options?.departments.map(
                                                                    (dep, i) => (
                                                                        <SelectItem
                                                                            key={i}
                                                                            value={dep}
                                                                        >
                                                                            {dep}
                                                                        </SelectItem>
                                                                    )
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`products.${index}.groupHead`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>
                                                            Group Head
                                                            <span className="text-destructive">
                                                                *
                                                            </span>
                                                        </FormLabel>
                                                        <Select
                                                            onValueChange={field.onChange}
                                                            value={field.value}
                                                        >
                                                            <FormControl>
                                                                <SelectTrigger className="w-full">
                                                                    <SelectValue placeholder="Select group head" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {Object.keys(
                                                                    options?.groupHeads || {}
                                                                ).map((dep, i) => (
                                                                    <SelectItem key={i} value={dep}>
                                                                        {dep}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`products.${index}.itemCode`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>
                                                            Item Code
                                                            <span className="text-destructive">
                                                                *
                                                            </span>
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder="Enter area of user"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`products.${index}.productName`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>
                                                            Item  Name
                                                            <span className="text-destructive">
                                                                *
                                                            </span>
                                                        </FormLabel>
                                                        <Select
                                                            onValueChange={field.onChange}
                                                            value={field.value}
                                                            disabled={!groupHead}
                                                        >
                                                            <FormControl>
                                                                <SelectTrigger className="w-full">
                                                                    <SelectValue placeholder="Select product" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {productOptions.map((dep, i) => (
                                                                    <SelectItem key={i} value={dep}>
                                                                        {dep}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`products.${index}.quantity`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>
                                                            Quantity
                                                            <span className="text-destructive">
                                                                *
                                                            </span>
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                {...field}
                                                                disabled={!groupHead}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`products.${index}.uom`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>
                                                            UOM
                                                            <span className="text-destructive">
                                                                *
                                                            </span>
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                {...field}
                                                                disabled={!groupHead}
                                                                placeholder="e.g. Pcs, Kgs"
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Division */}
  <FormField
    control={form.control}
    name="division"
    render={({ field }) => (
      <FormItem>
        <FormLabel>
          Division <span className="text-destructive">*</span>
        </FormLabel>
        <FormControl>
          <Input placeholder="Enter division" {...field} />
        </FormControl>
      </FormItem>
    )}
  />

  {/* Required Date */}
  <FormField
    control={form.control}
    name="requiredDate"
    render={({ field }) => (
      <FormItem>
        <FormLabel>
          Required Date <span className="text-destructive">*</span>
        </FormLabel>
        <FormControl>
          <Input type="date" {...field} />
        </FormControl>
      </FormItem>
    )}
  />

  {/* Indent Date */}
  <FormField
    control={form.control}
    name="indentDate"
    render={({ field }) => (
      <FormItem>
        <FormLabel>
          Indent Date <span className="text-destructive">*</span>
        </FormLabel>
        <FormControl>
          <Input type="date" {...field} />
        </FormControl>
      </FormItem>
    )}
  />
</div>

                           
                                        <FormField
                                            control={form.control}
                                            name={`products.${index}.specifications`}
                                            render={({ field }) => (
                                                <FormItem className="w-full">
                                                    <FormLabel>Item Technical Specification</FormLabel>
                                                    <FormControl>
                                                        <Textarea
                                                            placeholder="Enter specifications"
                                                            className="resize-y" // or "resize-y" to allow vertical resizing
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="space-y-4">
  {/* Top bar with buttons on both sides */}
  <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
    <Button
      className="w-full sm:w-auto"
      type="submit"
      disabled={form.formState.isSubmitting}
    >
      {form.formState.isSubmitting && (
        <Loader size={20} color="white" aria-label="Loading Spinner" />
      )}
      Create Indent
    </Button>

    <Button
      type="button"
      variant="outline"
      className="w-full sm:w-auto"
      onClick={() =>
        append({
          department: '',
          groupHead: '',
          productName: '',
          quantity: 1,
          uom: '',
          itemCode: '',
          // @ts-ignore
          priority: undefined,
          attachment: undefined,
        })
      }
    >
      Add Product
    </Button>
  </div>


</div>

                </form>
            </Form>
        </div>
    );
};
