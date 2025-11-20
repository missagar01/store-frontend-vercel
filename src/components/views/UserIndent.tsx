import { ClipboardList, Trash2, Plus } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormField,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import Heading from '../element/Heading';
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import axiosInstance from '@/utils/axiosConfig';
import { API_URL, decodeToken } from '@/api';
import { toast } from 'sonner';
type IndentForm = {
  formType: 'INDENT' | 'REQUISITION' | '';  // 👈 new
  indentSeries: string;
  department: string;
  requesterName: string;
  division: string;
  items: {
    productName: string;
    itemCode: string;
    uom: string;
    requestQty: string;
    make: string;
    specification: string;
    purpose: string;
    costLocation: string;
  }[];
};

type MasterItem = {
  item_code: string;
  item_name: string;
};

type UomRow = {
  item_code: string;
  item_name: string;
  uom: string;
};

export default function UserIndent() {
  const location = useLocation();
  const [masterItems, setMasterItems] = useState<MasterItem[]>([]);
  const [uomList, setUomList] = useState<string[]>([]);
  const [costLocations, setCostLocations] = useState<string[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [loadingCostLocations, setLoadingCostLocations] = useState(false);
  const [previousDivision, setPreviousDivision] = useState<string>('');

  const form = useForm<IndentForm>({
    defaultValues: {
      formType: '',          // 👈 default blank
      indentSeries: '',
      department: '',
      requesterName: '',
      division: '',
      items: [
        {
          productName: '',
          itemCode: '',
          uom: '',
          requestQty: '',
          make: '',
          specification: '',
          purpose: '',
          costLocation: '',
        },
      ],
    },
  });

  const { control, handleSubmit, watch, setValue, reset } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const itemCount = watch('items').length;

  const formType = watch('formType');      // 👈 watch formType
  // 0) Preselect formType from query param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const qp = params.get('formType');
    if (qp === 'INDENT' || qp === 'REQUISITION') {
      setValue('formType', qp);
      setValue('indentSeries', '');
      setValue('division', '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const indentSeries = watch('indentSeries');
  const division = watch('division');

  // 1) load logged-in user
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const decoded = decodeToken(token);
    const employeeId = decoded?.employee_id;
    if (!employeeId) return;

    axiosInstance
      .get(`/user/${employeeId}`)
      .then((res) => {
        if (res.data?.success && res.data.data) {
          const user = res.data.data;
          setValue('requesterName', user.user_name || '');
          setValue('department', user.user_access || '');
        }
      })
      .catch(() => {});
  }, [setValue]);

  // 2) load item master
  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoadingItems(true);
        const res = await axiosInstance.get('/items');
        if (res.data?.success && Array.isArray(res.data.data)) {
          setMasterItems(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load items', err);
      } finally {
        setLoadingItems(false);
      }
    };
    fetchItems();
  }, []);

  // 3) load UOMs
  useEffect(() => {
    const fetchUom = async () => {
      try {
        const res = await axiosInstance.get('/uom');
        if (res.data?.success && Array.isArray(res.data.data)) {
          const uniqueUoms = Array.from(
            new Set(
              (res.data.data as UomRow[])
                .map((r) => r.uom || (r as any).UOM)
                .filter(Boolean)
            )
          );
          setUomList(uniqueUoms);
        } else {
          setUomList([]);
        }
      } catch (err) {
        console.warn('UOM endpoint not available.');
        setUomList([]);
      }
    };
    fetchUom();
  }, []);

  // 4) Auto-select Division based on Indent/Requisition Series
  useEffect(() => {
    if (!indentSeries) return;

    // Indent map
    const indentDivisionMap: Record<string, string> = {
      I1: 'SM',
      I3: 'RP',
      I4: 'PM',
      I5: 'CO',
    };

    // Requisition map (as per your message)
    const requisitionDivisionMap: Record<string, string> = {
      R1: 'SM', // REQUISITION-STORE-SMS
      R3: 'RP', // REQUISITION-STORE-TMT ROLLING
      R4: 'PM', // REQUISITION-STORE-PIPE
    };

    let mappedDivision = '';

    if (indentDivisionMap[indentSeries]) {
      mappedDivision = indentDivisionMap[indentSeries];
    } else if (requisitionDivisionMap[indentSeries]) {
      mappedDivision = requisitionDivisionMap[indentSeries];
    }

    if (mappedDivision) {
      setValue('division', mappedDivision);
    }
  }, [indentSeries, setValue]);

  // 5) load Cost Locations based on Division
  useEffect(() => {
    const fetchCostLocations = async () => {
      if (!division) {
        setCostLocations([]);
        if (previousDivision) {
          const currentItems = form.getValues('items');
          currentItems.forEach((_, index) => {
            setValue(`items.${index}.costLocation`, '');
          });
        }
        setPreviousDivision('');
        return;
      }

      const divisionChanged =
        previousDivision !== '' && previousDivision !== division;

      try {
        setLoadingCostLocations(true);

        let apiUrl = '';
        if (division === 'RP') {
          apiUrl = `${API_URL}/cost-location/rp`;
        } else if (division === 'PM') {
          apiUrl = `${API_URL}/cost-location/pm`;
        } else if (division === 'CO') {
          apiUrl = `${API_URL}/cost-location/co`;
        } else {
          apiUrl = `${API_URL}/cost-location`;
        }

        const apiPath = apiUrl.replace(API_URL, '');
        const res = await axiosInstance.get(apiPath, {
          ...(division !== 'RP' &&
            division !== 'PM' &&
            division !== 'CO' && { params: { divCode: division } }),
        });

        if (res.data?.success && Array.isArray(res.data.data)) {
          const locations = res.data.data
            .map((item: any) => item.cost_name || item.COST_NAME)
            .filter(Boolean);
          setCostLocations(locations);

          if (divisionChanged) {
            const currentItems = form.getValues('items');
            currentItems.forEach((_, index) => {
              setValue(`items.${index}.costLocation`, '');
            });
          }

          setPreviousDivision(division);
        } else {
          setCostLocations([]);
        }
      } catch (err) {
        console.error(
          'Failed to load cost locations for division:',
          division,
          err
        );
        setCostLocations([]);
      } finally {
        setLoadingCostLocations(false);
      }
    };

    fetchCostLocations();
  }, [division, setValue, form, previousDivision]);

  const handleItemSelect = (rowIndex: number, selectedName: string) => {
    setValue(`items.${rowIndex}.productName`, selectedName);
    const found = masterItems.find((it) => it.item_name === selectedName);
    setValue(`items.${rowIndex}.itemCode`, found?.item_code || '');
  };

  const generateRequestNumber = async (
    currentFormType: 'INDENT' | 'REQUISITION'
  ) => {
    const prefix = currentFormType === 'INDENT' ? 'IND' : 'REQ';
    try {
      const res = await axiosInstance.get('/indent/all');
      const list = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
          ? res.data
          : [];

      const numbers: number[] = list
        .map((row: any) => {
          const value = row.request_number ?? row.requestNumber ?? '';
          if (typeof value !== 'string') return 0;
          if (!value.toUpperCase().startsWith(prefix)) return 0;
          const numeric = value.replace(/[^0-9]/g, '');
          const parsed = parseInt(numeric, 10);
          return Number.isNaN(parsed) ? 0 : parsed;
        })
        .filter((n: unknown): n is number => typeof n === 'number');

      const nextNumber =
        numbers.reduce((max: number, current: number) => (current > max ? current : max), 0) + 1;

      return `${prefix}${String(nextNumber).padStart(2, '0')}`;
    } catch (error) {
      console.error('Failed to generate request number:', error);
      return `${prefix}${String(Date.now() % 100).padStart(2, '0')}`;
    }
  };

  // 6) Submit to backend API
  const onSubmit = async (data: IndentForm) => {
    try {
      if (!data.items || data.items.length === 0) {
        toast.error('Please add at least one item');
        return;
      }

      if (!data.requesterName || !data.department) {
        toast.error('Please ensure user name and department are filled');
        return;
      }

      if (!data.formType) {
        toast.error('Please select a form type');
        return;
      }

      if (!data.indentSeries) {
        toast.error('Please select an indent/requisition series');
        return;
      }

      const requestNumber = await generateRequestNumber(data.formType);

      const payloads = data.items
        .filter((item) => item.productName && item.itemCode)
        .map((item) => {
          const qty = item.requestQty ? Number(item.requestQty) : 0;
          const specificationValue = item.specification
            ? String(item.specification).trim()
            : '';

          return {
            form_type: data.formType,
            indent_series: data.indentSeries,
            requester_name: data.requesterName || '',
            department: data.department || '',
            division: data.division || '',
            item_code: item.itemCode || '',
            product_name: item.productName || '',
            request_qty: qty,
            uom: item.uom || '',
            specification: specificationValue,
            make: item.make || '',
            purpose: item.purpose || '',
            cost_location: item.costLocation || '',
            request_state: 'PENDING',
            request_number: requestNumber,
          };
        });

      if (payloads.length === 0) {
        toast.error('Please add at least one valid item');
        return;
      }

      await Promise.all(
        payloads.map((payload) => axiosInstance.post('/indent', payload))
      );

      toast.success(`${requestNumber} submitted successfully!`);

      reset((prev) => ({
        ...prev,
        formType: prev.formType, // keep selected form type
        indentSeries: '',
        division: '',
        items: [
          {
            productName: '',
            itemCode: '',
            uom: '',
            requestQty: '',
            make: '',
            specification: '',
            purpose: '',
            costLocation: '',
          },
        ],
      }));
    } catch (err: any) {
      console.error('Error submitting indent:', err);
      const message =
        err?.response?.data?.message || 'Failed to save indent to backend';
      toast.error(message);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-10 bg-gradient-to-br from-gray-50 to-white rounded-2xl">
      <Heading
        heading="User Indent Form"
        subtext="Create a new Store/Purchase Indent or Requisition"
      >
        <ClipboardList size={50} className="text-primary" />
      </Heading>

      <Form {...form}>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-8 bg-white p-6 md/p-8 rounded-2xl shadow-sm border border-gray-100"
        >
          {/* Header */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Form Type */}
            <FormField
              control={control}
              name="formType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Form Type</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="border rounded-md h-10 px-3 text-sm w-full"
                      onChange={(e) => {
                        const v = e.target.value as 'INDENT' | 'REQUISITION' | '';
                        field.onChange(v);
                        // reset indentSeries & division when form type changes
                        setValue('indentSeries', '');
                        setValue('division', '');
                      }}
                    >
                      <option value="">Select Form Type</option>
                      <option value="INDENT">Indent Form</option>
                      <option value="REQUISITION">Requisition Form</option>
                    </select>
                  </FormControl>
                </FormItem>
              )}
            />

            {/* requester */}
            <FormField
              control={control}
              name="requesterName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User Name</FormLabel>
                  <FormControl>
                    <Input {...field} readOnly className="bg-gray-100" />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* department */}
            <FormField
              control={control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <FormControl>
                    <Input {...field} readOnly className="bg-gray-100" />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Indent / Requisition Series */}
            <FormField
              control={control}
              name="indentSeries"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{formType === 'REQUISITION' ? 'Requisition Series' : 'Indent Series'}</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="border rounded-md h-10 px-3 text-sm w-full"
                    >
                      <option value="">
                        {formType === 'REQUISITION'
                          ? 'Select requisition series'
                          : 'Select indent series'}
                      </option>

                      {formType === 'INDENT' && (
                        <>
                          <option value="I1">I1-INDENT-SMS</option>
                          <option value="I3">I3-INDENT-PATRA ROLLING</option>
                          <option value="I4">I4-PIPE MILL</option>
                          <option value="I5">I5-INDENT- GENERAL</option>
                        </>
                      )}

                      {formType === 'REQUISITION' && (
                        <>
                          <option value="R1">R1 - REQUISITION-STORE-SMS</option>
                          <option value="R3">R3 - REQUISITION-STORE-TMT ROLLING</option>
                          <option value="R4">R4 - REQUISITION-STORE-PIPE</option>
                        </>
                      )}
                    </select>
                  </FormControl>
                </FormItem>
              )}
            />

            {/* division (auto) */}
            <FormField
              control={control}
              name="division"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Division</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      readOnly
                      className="bg-gray-100 cursor-not-allowed"
                      placeholder="Auto from series"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {/* Items */}
          <div className="space-y-6">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="border rounded-xl p-4 bg-slate-50 space-y-4"
              >
                <div className="flex justify-between items-center">
                  <p className="font-medium text-sm">Item {index + 1}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    disabled={itemCount === 1}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Product Name */}
                  <FormField
                    control={control}
                    name={`items.${index}.productName`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Name</FormLabel>
                        <FormControl>
                          <select
                            {...field}
                            onChange={(e) =>
                              handleItemSelect(index, e.target.value)
                            }
                            className="border rounded-md h-10 px-3 text-sm w-full"
                          >
                            <option value="">
                              {loadingItems
                                ? 'Loading items...'
                                : 'Select Product'}
                            </option>
                            {masterItems.map((it) => (
                              <option
                                key={it.item_code}
                                value={it.item_name}
                              >
                                {it.item_name}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {/* Item Code */}
                  <FormField
                    control={control}
                    name={`items.${index}.itemCode`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Item Code</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            readOnly
                            className="bg-gray-100"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {/* UOM */}
                  <FormField
                    control={control}
                    name={`items.${index}.uom`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>UOM</FormLabel>
                        <FormControl>
                          <select
                            {...field}
                            className="border rounded-md h-10 px-3 text-sm w-full"
                          >
                            <option value="">Select UOM</option>
                            {uomList.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {/* Qty */}
                  <FormField
                    control={control}
                    name={`items.${index}.requestQty`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Required Qty</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            placeholder="Enter Qty"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {/* Make */}
                  <FormField
                    control={control}
                    name={`items.${index}.make`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Make / Brand</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter Brand" />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {/* Cost Location */}
                  <FormField
                    control={control}
                    name={`items.${index}.costLocation`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cost / Project Location</FormLabel>
                        <FormControl>
                          <select
                            {...field}
                            className="border rounded-md h-10 px-3 text-sm w-full"
                            disabled={!division || loadingCostLocations}
                          >
                            <option value="">
                              {loadingCostLocations
                                ? 'Loading locations...'
                                : !division
                                  ? 'Select Division first'
                                  : 'Select Cost Location'}
                            </option>
                            {costLocations.map((location) => (
                              <option key={location} value={location}>
                                {location}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Specification + Purpose */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={control}
                    name={`items.${index}.specification`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Specification</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={2}
                            placeholder="Enter technical spec"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name={`items.${index}.purpose`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purpose / Place of Use</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={2}
                            placeholder="Enter purpose / use"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between pt-4">
            <Button
              type="submit"
              className="bg-primary text-white rounded-xl px-10"
            >
              Submit
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex items-center gap-2"
              onClick={() =>
                append({
                  productName: '',
                  itemCode: '',
                  uom: '',
                  requestQty: '',
                  make: '',
                  specification: '',
                  purpose: '',
                  costLocation: '',
                })
              }
            >
              <Plus size={16} />
              Add Product
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
