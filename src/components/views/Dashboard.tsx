// src/components/views/Dashboard.tsx
import Heading from '../element/Heading';
import { ClipboardList, LayoutDashboard, PackageCheck, Truck, Warehouse } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ChartContainer, ChartTooltip, type ChartConfig } from '../ui/chart';
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts';
import { useEffect, useMemo, useState } from 'react';
import axiosInstance from '@/utils/axiosConfig';

type DashboardApiResponse = {
  success: boolean;
  data: {
    totalIndents: number;
    totalIndentedQuantity: number;
    totalPurchaseOrders: number;
    totalPurchasedQuantity: number;
    totalIssuedQuantity: number;
    outOfStockCount: number;
    topPurchasedItems: {
      itemName: string;
      orderCount: number;
      totalOrderQty: number;
    }[];
    topVendors: {
      vendorName: string;
      uniquePoCount: number;
      totalItems: number;
    }[];
  };
};

type ChartDatum = {
  name: string;
  frequency: number;
  quantity: number;
};

type VendorEntry = {
  name: string;
  orders: number;
  quantity: number;
};

function DashboardTooltip({
  payload,
  label,
}: {
  payload?: { payload: ChartDatum }[];
  label?: string;
}) {
  if (!payload?.length || !label) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-md border bg-white p-3 text-sm shadow-md">
      <p className="font-semibold">{label}</p>
      <p>Orders: {data.frequency}</p>
      <p>Total Qty: {data.quantity.toLocaleString()}</p>
    </div>
  );
}

function LoadingSpinner({ message = 'Loading dashboard data...' }: { message?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-2 text-sm text-slate-500 shadow-lg shadow-slate-900/5">
      <span className="h-6 w-6 animate-spin rounded-full border-4 border-slate-200 border-t-slate-500" />
      <span>{message}</span>
    </div>
  );
}

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardApiResponse['data'] | null>(null);
  const [chartData, setChartData] = useState<ChartDatum[]>([]);
  const [vendorData, setVendorData] = useState<VendorEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadDashboard = async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.get<DashboardApiResponse>('/api/store-indent/dashboard');
        if (!active) return;
        const payload = res.data?.data;
        if (!payload) {
          throw new Error('No dashboard payload');
        }
        setDashboardData(payload);

        setChartData(
          (payload.topPurchasedItems || [])
            .slice(0, 10)
            .map((item) => ({
              name: item.itemName,
              frequency: item.orderCount,
              quantity: item.totalOrderQty,
            }))
        );

        setVendorData(
          (payload.topVendors || [])
            .slice(0, 10)
            .map((vendor) => ({
              name: vendor.vendorName,
              orders: vendor.uniquePoCount,
              quantity: vendor.totalItems,
            }))
        );
        setError(null);
      } catch (err) {
        console.error('Failed to load dashboard', err);
        if (active) {
          setError('Unable to fetch dashboard data right now.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  const chartConfig = {
    quantity: {
      label: 'Quantity',
      color: 'var(--color-primary)',
    },
  } satisfies ChartConfig;

  const cards = [
    {
      title: 'Total Indents',
      icon: <ClipboardList size={18} />,
      value: dashboardData?.totalIndents ?? '—',
      sublabel: 'Indented Quantity',
      subvalue: dashboardData ? dashboardData.totalIndentedQuantity.toLocaleString() : '—',
      bg: 'from-transparent to-blue-500/10',
      text: 'text-blue-800',
    },
    {
      title: 'Total Purchases',
      icon: <Truck size={18} />,
      value: dashboardData?.totalPurchaseOrders ?? '—',
      sublabel: 'Purchased Quantity',
      subvalue: dashboardData ? dashboardData.totalPurchasedQuantity.toLocaleString() : '—',
      bg: 'from-transparent to-green-500/10',
      text: 'text-green-800',
    },
    {
      title: 'Total Issued',
      icon: <PackageCheck size={18} />,
      value: dashboardData?.totalIssuedQuantity ?? '—',
      sublabel: 'Out Quantity',
      subvalue: dashboardData?.totalIssuedQuantity
        ? dashboardData.totalIssuedQuantity.toLocaleString()
        : '—',
      bg: 'from-transparent to-orange-500/10',
      text: 'text-orange-800',
    },
    {
      title: 'Out of Stock',
      icon: <Warehouse size={18} />,
      value: dashboardData?.outOfStockCount ?? '—',
      sublabel: 'Low in Stock',
      subvalue: dashboardData ? dashboardData.outOfStockCount.toLocaleString() : '—',
      bg: 'from-transparent to-yellow-500/10',
      text: 'text-yellow-800',
    },
  ];

  const isEmpty = !chartData.length && !vendorData.length;

  return (
    <div className="p-4 md:p-6 lg:p-10 space-y-8">
      <Heading heading="Procurement Pulse" subtext="Live insights from the store indent API">
        <LayoutDashboard size={46} className="text-primary" />
      </Heading>

      {loading && !error && (
        <div className="flex justify-center">
          <LoadingSpinner />
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title} className={`bg-gradient-to-br ${card.bg}`}>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-muted-foreground">
                <p className="font-semibold">{card.title}</p>
                {card.icon}
              </div>
              <p className={`text-3xl font-bold ${card.text}`}>{loading ? '—' : card.value}</p>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <p>{card.sublabel}</p>
                <p className="font-semibold">{loading ? '—' : card.subvalue}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="min-h-[280px] border border-slate-200/60 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
          <CardHeader>
            <CardTitle className="text-xl">Top Purchased Products</CardTitle>
          </CardHeader>
          <CardContent className="bg-gradient-to-b from-white to-slate-50">
          {isEmpty ? (
            <p className="text-sm text-muted-foreground">Dashboard data is still loading.</p>
          ) : (
            <ChartContainer className="max-h-80 w-full" config={chartConfig}>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ right: 10 }}
                  barCategoryGap="30%"
                >
                  <defs>
                    <linearGradient id="dashboardGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="100%" stopColor="#0ea5e9" />
                      <stop offset="0%" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid horizontal={false} vertical={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    width={160}
                  />
                  <XAxis type="number" hide />
                  <ChartTooltip cursor={false} content={<DashboardTooltip />} />
                  <Bar dataKey="frequency" fill="url(#dashboardGradient)" radius={[0, 10, 10, 0]}>
                    <LabelList
                      dataKey="frequency"
                      position="insideRight"
                      offset={12}
                      className="font-semibold text-white"
                    />
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="min-h-[280px] border border-slate-200/60 shadow-[0_20px_35px_rgba(15,23,42,0.08)]">
          <CardHeader>
            <CardTitle className="text-xl">Top Vendors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isEmpty ? (
              <p className="text-sm text-muted-foreground">Vendor insights will appear here.</p>
            ) : (
              vendorData.map((vendor) => (
                <div key={vendor.name} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div>
                    <p className="font-semibold">{vendor.name}</p>
                    <p className="text-xs text-muted-foreground">Order Qty: {vendor.quantity.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{vendor.orders} Orders</p>
                    <p className="text-xs text-muted-foreground">Items: {vendor.quantity.toLocaleString()}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
