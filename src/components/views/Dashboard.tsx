// src/components/views/Dashboard.tsx
import Heading from '../element/Heading';
import {
  CalendarIcon,
  ClipboardList,
  LayoutDashboard,
  PackageCheck,
  Truck,
  Warehouse,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ChartContainer, ChartTooltip, type ChartConfig } from '../ui/chart';
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts';
import { useEffect, useMemo, useState } from 'react';
import { useSheets } from '@/context/SheetsContext';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { format } from 'date-fns';
import { Calendar } from '../ui/calendar';
import { ComboBox } from '../ui/combobox';
import { analyzeData } from '@/lib/filter';
import axiosInstance from '@/utils/axiosConfig';
import { Input } from '../ui/input';

function CustomChartTooltipContent({
  payload,
  label,
}: {
  payload?: { payload: { quantity: number; frequency: number } }[];
  label?: string;
}) {
  if (!payload?.length) return null;

  const data = payload[0].payload;

  return (
    <div className="rounded-md border bg-white px-3 py-2 shadow-sm text-sm">
      <p className="font-medium">{label}</p>
      <p>Quantity: {data.quantity}</p>
      <p>Frequency: {data.frequency}</p>
    </div>
  );
}

export default function UsersTable() {
  const { receivedSheet, indentSheet, inventorySheet } = useSheets();
  const formatTimestamp = (value?: string) =>
    value ? format(new Date(value), 'dd-MM-yyyy HH:mm:ss') : '—';

  // chart + lists
  const [chartData, setChartData] = useState<
    { name: string; quantity: number; frequency: number }[]
  >([]);
  const [topVendorsData, setTopVendors] = useState<
    { name: string; orders: number; quantity: number }[]
  >([]);

  // cards
  const [indent, setIndent] = useState({ count: 0, quantity: 0 });
  const [purchase, setPurchase] = useState({ count: 0, quantity: 0 });
  const [out, setOut] = useState({ count: 0, quantity: 0 });
  const [alerts, setAlerts] = useState({ lowStock: 0, outOfStock: 0 });

  // filters
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [filteredVendors, setFilteredVendors] = useState<string[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<string[]>([]);
  const [allVendors, setAllVendors] = useState<string[]>([]);
  const [allProducts, setAllProducts] = useState<string[]>([]);
  const [hasError, setHasError] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyProduct, setHistoryProduct] = useState('');
  const [historyStart, setHistoryStart] = useState<Date>();
  const [historyEnd, setHistoryEnd] = useState<Date>();
  const [historyRequester, setHistoryRequester] = useState('');

  useEffect(() => {
    const safeIndent = Array.isArray(indentSheet) ? indentSheet : [];
    const safeReceived = Array.isArray(receivedSheet) ? receivedSheet : [];

    // dropdown options
    setAllVendors(
      Array.from(
        new Set(
          safeIndent
            .map((item: any) => item?.approvedVendorName)
            .filter((v) => typeof v === 'string' && v.trim() !== '')
        )
      )
    );
    setAllProducts(
      Array.from(
        new Set(
          safeIndent
            .map((item: any) => item?.productName)
            .filter((v) => typeof v === 'string' && v.trim() !== '')
        )
      )
    );

    // STOCK ALERTS: always compute
    if (Array.isArray(inventorySheet)) {
      const low = inventorySheet.filter(
        (i: any) => Number(i.currentQty ?? 0) < Number(i.reorderLevel ?? 0)
      ).length;
      const outS = inventorySheet.filter(
        (i: any) => Number(i.currentQty ?? 0) === 0
      ).length;
      setAlerts({ lowStock: low, outOfStock: outS });
    } else {
      setAlerts({ lowStock: 0, outOfStock: 0 });
    }

    try {
      const {
        topVendors,
        topProducts,
        issuedIndentCount,
        approvedIndentCount,
        totalIssuedQuantity,
        receivedPurchaseCount,
        totalApprovedQuantity,
        totalPurchasedQuantity,
      } = analyzeData(
        { receivedSheet: safeReceived, indentSheet: safeIndent },
        {
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
          vendors: filteredVendors,
          products: filteredProducts,
        }
      );

      // ------------------
      // CHART + fallback
      // ------------------
      let finalChartData =
        (topProducts || []).map((p: any) => ({
          frequency: p.freq,
          quantity: p.quantity,
          name: p.name,
        })) || [];

      if (finalChartData.length === 0 && safeIndent.length > 0) {
        const productMap: Record<string, { freq: number; quantity: number }> = {};
        for (const row of safeIndent) {
          const name = (row?.productName ?? 'Unknown').toString();
          const qty = Number(row?.approvedQuantity ?? row?.requestQty ?? 0);
          if (!productMap[name]) {
            productMap[name] = { freq: 0, quantity: 0 };
          }
          productMap[name].freq += 1;
          productMap[name].quantity += isNaN(qty) ? 0 : qty;
        }
        finalChartData = Object.entries(productMap)
          .map(([name, v]) => ({ name, frequency: v.freq, quantity: v.quantity }))
          .sort((a, b) => b.frequency - a.frequency)
          .slice(0, 10);
      }

      setChartData(finalChartData);
      setTopVendors(topVendors || []);

      // ------------------
      // TOTAL INDENTS
      // ------------------
      const totalIndentsToShow =
        approvedIndentCount && approvedIndentCount > 0
          ? approvedIndentCount
          : safeIndent.length;

      let indentQtyToShow = totalApprovedQuantity || 0;
      if (indentQtyToShow === 0 && safeIndent.length > 0) {
        indentQtyToShow = safeIndent.reduce((sum: number, row: any) => {
          const q = Number(row?.approvedQuantity ?? row?.requestQty ?? 0);
          return sum + (isNaN(q) ? 0 : q);
        }, 0);
      }
      setIndent({
        quantity: indentQtyToShow,
        count: totalIndentsToShow,
      });

      // ------------------
      // TOTAL PURCHASES (fallback to receivedSheet)
      // ------------------
      const totalPurchaseCountToShow =
        receivedPurchaseCount && receivedPurchaseCount > 0
          ? receivedPurchaseCount
          : safeReceived.length;

      let purchaseQtyToShow = totalPurchasedQuantity || 0;
      if (purchaseQtyToShow === 0 && safeReceived.length > 0) {
        purchaseQtyToShow = safeReceived.reduce((sum: number, row: any) => {
          const q = Number(row?.receivedQuantity ?? 0);
          return sum + (isNaN(q) ? 0 : q);
        }, 0);
      }
      setPurchase({
        quantity: purchaseQtyToShow,
        count: totalPurchaseCountToShow,
      });

      // ------------------
      // TOTAL ISSUED (this was 0 earlier)
      // ------------------
      // 1) try from analyzeData
      let issuedCountToShow = issuedIndentCount || 0;
      let issuedQtyToShow = totalIssuedQuantity || 0;

      // 2) fallback from sheet: rows with indentType=Store Out OR issueStatus=issued
      if (issuedCountToShow === 0 || issuedQtyToShow === 0) {
        const issuedRows = safeIndent.filter((row: any) => {
          const type = (row?.indentType ?? '').toString().toLowerCase();
          const status = (row?.issueStatus ?? '').toString().toLowerCase();
          return type === 'store out' || status === 'issued';
        });

        if (issuedRows.length > 0) {
          if (issuedCountToShow === 0) {
            issuedCountToShow = issuedRows.length;
          }
          if (issuedQtyToShow === 0) {
            issuedQtyToShow = issuedRows.reduce((sum: number, row: any) => {
              const q = Number(
                row?.issuedQuantity ??
                  row?.approvedQuantity ??
                  row?.requestQty ??
                  0
              );
              return sum + (isNaN(q) ? 0 : q);
            }, 0);
          }
        }
      }

      setOut({
        quantity: issuedQtyToShow,
        count: issuedCountToShow,
      });

      setHasError(false);
    } catch (err) {
      console.error('Dashboard analyzeData error:', err);
      setHasError(true);
      setChartData([]);
      setTopVendors([]);

      // basic fallbacks on error
      const safeIndent2 = Array.isArray(indentSheet) ? indentSheet : [];
      setIndent({ quantity: 0, count: safeIndent2.length });

      // issued fallback on error too
      const issuedRows = safeIndent2.filter((row: any) => {
        const type = (row?.indentType ?? '').toString().toLowerCase();
        const status = (row?.issueStatus ?? '').toString().toLowerCase();
        return type === 'store out' || status === 'issued';
      });
      const issuedQty = issuedRows.reduce((sum: number, row: any) => {
        const q = Number(
          row?.issuedQuantity ?? row?.approvedQuantity ?? row?.requestQty ?? 0
        );
        return sum + (isNaN(q) ? 0 : q);
      }, 0);
      setOut({ quantity: issuedQty, count: issuedRows.length });

      // purchases fallback
      const safeReceived2 = Array.isArray(receivedSheet) ? receivedSheet : [];
      setPurchase({ quantity: safeReceived2.length, count: safeReceived2.length });
      // alerts were already set above
    }
  }, [
    startDate,
    endDate,
    filteredProducts,
    filteredVendors,
    indentSheet,
    receivedSheet,
    inventorySheet,
  ]);

  const chartConfig = {
    quantity: {
      label: 'Quantity',
      color: 'var(--color-primary)',
    },
  } satisfies ChartConfig;

  const isLoading =
    (!indentSheet || indentSheet.length === 0) &&
    (!receivedSheet || receivedSheet.length === 0);

  // ------------- Fetch user history -------------
  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      setHistoryError(null);

      const resAll = await axiosInstance.get('/indent/all', {
        validateStatus: () => true,
      });

      if (resAll.status >= 200 && resAll.status < 300) {
        const base =
          Array.isArray(resAll.data?.data) ? resAll.data.data : Array.isArray(resAll.data) ? resAll.data : [];

        const filtered = base.filter((item: any) => {
          const ts = item.sample_timestamp ?? item.timestamp ?? item.created_at ?? item.createdAt;
          const dt = ts ? new Date(ts) : null;
          if (historyStart && dt && dt < historyStart) return false;
          if (historyEnd && dt && dt > historyEnd) return false;
          if (
            historyProduct.trim() &&
            !(item.product_name ?? item.productName ?? '')
              .toLowerCase()
              .includes(historyProduct.toLowerCase())
          )
            return false;
          if (
            historyRequester.trim() &&
            !(item.requester_name ?? item.requesterName ?? '')
              .toLowerCase()
              .includes(historyRequester.toLowerCase())
          )
            return false;
          return true;
        });

        setHistory(
          filtered.map((item: any) => ({
            id: item.id ?? item._id,
            timestamp:
              item.sample_timestamp ??
              item.timestamp ??
              item.created_at ??
              item.createdAt ??
              '',
            formType: item.form_type ?? item.formType ?? '',
            requestNumber: item.request_number ?? item.requestNumber ?? '',
            indentSeries: item.indent_series ?? item.indentSeries ?? '',
            requesterName: item.requester_name ?? item.requesterName ?? '',
            department: item.department ?? '',
            division: item.division ?? '',
            itemCode: item.item_code ?? item.itemCode ?? '',
            productName: item.product_name ?? item.productName ?? '',
            requestQty: Number(item.request_qty ?? item.requestQty ?? 0) || 0,
            uom: item.uom ?? '',
            purpose: item.purpose ?? '',
          }))
        );
      } else {
        setHistory([]);
        setHistoryError('Failed to load history');
      }
    } catch (err: any) {
      setHistory([]);
      setHistoryError('Failed to load history');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredHistory = useMemo(() => {
    const hasProduct = historyProduct.trim().length > 0;
    const hasRequester = historyRequester.trim().length > 0;

    if (!hasProduct && !hasRequester) return history;

    const productNeedle = historyProduct.toLowerCase();
    const requesterNeedle = historyRequester.toLowerCase();

    return history.filter((row) => {
      const productMatch = hasProduct
        ? (row.productName || '').toLowerCase().includes(productNeedle)
        : true;
      const requesterMatch = hasRequester
        ? (row.requesterName || '').toLowerCase().includes(requesterNeedle)
        : true;
      return productMatch && requesterMatch;
    });
  }, [history, historyProduct, historyRequester]);

  return (
    <div>
      <Heading heading="Dashboard" subtext="View your analytics">
        <LayoutDashboard size={50} className="text-primary" />
      </Heading>

      <div className="grid gap-3 m-3">
        {/* Filters */}
        <div className="gap-3 grid grid-cols-2 md:grid-cols-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                data-empty={!startDate}
                className="data-[empty=true]:text-muted-foreground w-full min-w-0 justify-start text-left font-normal"
              >
                <CalendarIcon />
                {startDate ? format(startDate, 'PPP') : <span>Pick a start date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={startDate} onSelect={setStartDate} />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                data-empty={!endDate}
                className="data-[empty=true]:text-muted-foreground w-full min-w-0 justify-start text-left font-normal"
              >
                <CalendarIcon />
                {endDate ? format(endDate, 'PPP') : <span>Pick an end date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={endDate} onSelect={setEndDate} />
            </PopoverContent>
          </Popover>

          <ComboBox
            multiple
            options={allVendors.map((v) => ({ label: v, value: v }))}
            value={filteredVendors}
            onChange={setFilteredVendors}
            placeholder="Select Vendors"
          />

          <ComboBox
            multiple
            options={allProducts.map((v) => ({ label: v, value: v }))}
            value={filteredProducts}
            onChange={setFilteredProducts}
            placeholder="Select Products"
          />
        </div>

        {/* Stat cards */}
        <div className="grid md:grid-cols-4 gap-3">
          <Card className="bg-gradient-to-br from-transparent to-blue-500/10">
            <CardContent>
              <div className="text-blue-500 flex justify-between">
                <p className="font-semibold">Total Indents</p>
                <ClipboardList size={18} />
              </div>
              <p className="text-3xl font-bold text-blue-800">
                {isLoading ? '—' : indent.count}
              </p>
              <div className="text-blue-500 flex justify-between">
                <p className="text-sm ">Indented Quantity</p>
                <p>{isLoading ? '—' : indent.quantity}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-transparent to-green-500/10">
            <CardContent>
              <div className="text-green-500 flex justify-between">
                <p className="font-semibold">Total Purchases</p>
                <Truck size={18} />
              </div>
              <p className="text-3xl font-bold text-green-800">
                {isLoading ? '—' : purchase.count}
              </p>
              <div className="text-green-500 flex justify-between">
                <p className="text-sm ">Purchased Quantity</p>
                <p>{isLoading ? '—' : purchase.quantity}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-transparent to-orange-500/10">
            <CardContent>
              <div className="text-orange-500 flex justify-between">
                <p className="font-semibold">Total Issued</p>
                <PackageCheck size={18} />
              </div>
              <p className="text-3xl font-bold text-orange-800">
                {isLoading ? '—' : out.count}
              </p>
              <div className="text-orange-500 flex justify-between">
                <p className="text-sm ">Out Quantity</p>
                <p>{isLoading ? '—' : out.quantity}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-transparent to-yellow-500/10 text-yellow-500 ">
            <CardContent>
              <div className="flex justify-between">
                <p className="font-semibold">Out of Stock</p>
                <Warehouse size={18} />
              </div>
              <p className="text-3xl font-bold text-yellow-800">
                {alerts.outOfStock}
              </p>
              <div className="text-yellow-500 flex justify-between">
                <p className="text-sm ">Low in Stock</p>
                <p>{alerts.lowStock}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart + Top Vendors */}
        <div className="flex gap-3 flex-wrap">
          <Card className="w-[55%] md:min-w-150 flex-grow">
            <CardHeader>
              <CardTitle className="text-xl">
                {hasError ? 'Top Purchased Products (no data)' : 'Top Purchased Products'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data to display</p>
              ) : (
                <ChartContainer className="max-h-80 w-full" config={chartConfig}>
                  <BarChart
                    accessibilityLayer
                    data={chartData}
                    layout="vertical"
                    margin={{ right: 16 }}
                  >
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="100%" stopColor="#3b82f6" />
                        <stop offset="0%" stopColor="#2563eb" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid horizontal={false} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      hide
                    />
                    <XAxis dataKey="frequency" type="number" hide />
                    <ChartTooltip cursor={false} content={<CustomChartTooltipContent />} />
                    <Bar
                      dataKey="frequency"
                      layout="vertical"
                      fill="url(#barGradient)"
                      radius={4}
                    >
                      <LabelList
                        dataKey="name"
                        position="insideLeft"
                        offset={8}
                        className="fill-(--color-background) font-semibold"
                        fontSize={12}
                      />
                      <LabelList
                        dataKey="frequency"
                        position="insideRight"
                        offset={8}
                        className="fill-(--color-background) font-semibold"
                        fontSize={12}
                      />
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card className="flex-grow min-w-60 w-[40%]">
            <CardHeader>
              <CardTitle className="text-xl">Top Vendors</CardTitle>
            </CardHeader>
            <CardContent className="text-base grid gap-2">
              {topVendorsData.length === 0 ? (
                <p className="text-sm text-muted-foreground">No vendors to show</p>
              ) : (
                topVendorsData.map((vendor, i) => (
                  <div className="flex justify-between" key={i}>
                    <p className="font-semibold text-md">{vendor.name}</p>
                    <div className="flex gap-5">
                      <p>{vendor.orders} Orders</p>
                      <p>{vendor.quantity} Items</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="m-3 grid gap-3 mt-10">
        <div className="flex flex-wrap gap-2 items-end">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">From Date</p>
            <Input
              type="date"
              value={historyStart ? format(historyStart, 'yyyy-MM-dd') : ''}
              onChange={(e) =>
                setHistoryStart(e.target.value ? new Date(e.target.value) : undefined)
              }
              className="w-44"
            />
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">To Date</p>
            <Input
              type="date"
              value={historyEnd ? format(historyEnd, 'yyyy-MM-dd') : ''}
              onChange={(e) =>
                setHistoryEnd(e.target.value ? new Date(e.target.value) : undefined)
              }
              className="w-44"
            />
          </div>
          <div className="space-y-1 flex-1 min-w-40">
            <p className="text-sm text-muted-foreground">Product Name</p>
            <Input
              placeholder="Search product"
              value={historyProduct}
              onChange={(e) => setHistoryProduct(e.target.value)}
            />
          </div>
          <div className="space-y-1 flex-1 min-w-40">
            <p className="text-sm text-muted-foreground">User Name</p>
            <Input
              placeholder="Search requester"
              value={historyRequester}
              onChange={(e) => setHistoryRequester(e.target.value)}
            />
          </div>
          <Button onClick={loadHistory} disabled={historyLoading}>
            Apply Filters
          </Button>
        </div>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-xl">User History</CardTitle>
            {historyError && <p className="text-sm text-destructive">{historyError}</p>}
          </CardHeader>
          <CardContent className="overflow-auto">
            {historyLoading ? (
              <p className="text-sm text-muted-foreground">Loading history...</p>
            ) : filteredHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No history to show</p>
            ) : (
              <table className="w-full text-sm min-w-[960px]">
                <thead>
                  <tr className="text-left bg-muted">
                    <th className="px-2 py-2">Timestamp</th>
                    <th className="px-2 py-2">Form Type</th>
                    <th className="px-2 py-2">Request #</th>
                    <th className="px-2 py-2">Series</th>
                    <th className="px-2 py-2">User Name</th>
                    <th className="px-2 py-2">Department</th>
                    <th className="px-2 py-2">Division</th>
                    <th className="px-2 py-2">Product</th>
                    <th className="px-2 py-2">Qty</th>
                    <th className="px-2 py-2">UOM</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((row, idx) => (
                    <tr key={row.id ?? idx} className="border-b hover:bg-muted/40">
                      <td className="px-2 py-1">
                        {formatTimestamp(row.timestamp)}
                      </td>
                      <td className="px-2 py-1">{row.formType || '—'}</td>
                      <td className="px-2 py-1">{row.requestNumber || '—'}</td>
                      <td className="px-2 py-1">{row.indentSeries || '—'}</td>
                      <td className="px-2 py-1">{row.requesterName || '—'}</td>
                      <td className="px-2 py-1">{row.department || '—'}</td>
                      <td className="px-2 py-1">{row.division || '—'}</td>
                      <td className="px-2 py-1">{row.productName || '—'}</td>
                      <td className="px-2 py-1">{row.requestQty}</td>
                      <td className="px-2 py-1">{row.uom || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
