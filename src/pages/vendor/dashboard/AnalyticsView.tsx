import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient'; // Import Supabase client
import { useAuth } from '@/contexts/AuthContext'; // Import Auth context
import {
  Card,
  CardHeader,
  CardBody,
  CircularProgress,
  Select,
  SelectItem,
  CardFooter
} from "@heroui/react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Sector
} from 'recharts'; // Recharts imports

// --- Data Interfaces (Mostly unchanged, adapted for Recharts where needed) ---
interface SalesDataPoint {
  date: string; // Keep original date format for XAxis
  totalSales: number;
}

interface TopItemData {
  name: string;
  totalQuantitySold: number;
  totalRevenue: number;
}

interface HourlyVolumePoint {
  hour: string; // e.g., "00", "01", ..., "23"
  orders: number;
}

interface PaymentMethodPoint {
  name: string; // 'Cash' or 'Online'
  value: number; // Count of orders
}

type SalesPeriod = 'daily' | 'weekly' | 'monthly';

// Define a type for the expected structure from the main query
interface FetchedOrderData {
  created_at: string;
  total_price: number;
  payment_method: string | null;
  order_items: {
    quantity: number;
    price_at_order: number;
    menu_items: { name: string } | null;
  }[] | null;
}

// --- Chart Colors (Dedicated Palette) ---
const CHART_COLORS = {
  primary: '#2563eb',    // Blue
  secondary: '#e11d48',   // Rose
  accent1: '#16a34a',    // Green
  accent2: '#ea580c',    // Orange
  accent3: '#9333ea',    // Purple
  foreground: '#6b7280', // Gray-500 (for text/axes)
  background: '#f9fafb', // Gray-50 (for tooltips/cursor)
  grid: '#f3f4f6',       // Gray-100 (for grid lines)
  // Define a distinct palette for the Pie chart slices
  pie: ['#2563eb', '#16a34a', '#ea580c', '#e11d48', '#9333ea']
};


// --- Helper Function ---
function formatCurrency(value: unknown): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (typeof num !== 'number' || isNaN(num)) return 'N/A';
  return `৳${num.toFixed(2)}`;
}

// --- Custom Tooltip Component (Shadcn Style) ---
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload; // Access the data point payload
    const value = payload[0].value;
    const name = payload[0].name; // e.g., 'totalSales', 'orders', 'value'

    let displayValue = '';
    if (name === 'totalSales' || name === 'value' && typeof value === 'number' && label !== undefined) { // Check label for revenue bar chart
       displayValue = formatCurrency(value);
    } else if (name === 'orders' || name === 'value') { // Quantity or Hourly Orders
       displayValue = `${value}`;
    }

    return (
      // Added max-w-xs to constrain width
      <div className="rounded-lg border bg-background p-2 shadow-sm text-foreground max-w-xs">
        <div className="grid grid-cols-1 gap-1"> {/* Changed to single column for better wrapping */}
          <div className="flex flex-col">
             {/* Added overflow classes for potentially long labels */}
            <span className="text-[0.70rem] uppercase text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap">
              {/* Display label (date, item name, hour) */}
              {label || data.name || data.hour}
            </span>
            <span className="font-bold text-muted-foreground">
              {/* Display formatted value */}
              {displayValue}
            </span>
          </div>
          {/* Can add more details if needed */}
        </div>
      </div>
    );
  }
  return null;
};

// --- Custom Active Shape for Pie Chart ---
const renderActiveShape = (props: any) => {
  const RADIAN = Math.PI / 180;
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} className="font-semibold">
        {payload.name}
      </text>
      <Sector
        cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius}
        startAngle={startAngle} endAngle={endAngle} fill={fill}
      />
      <Sector // Outer ring for active effect
        cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle}
        innerRadius={outerRadius + 4} outerRadius={outerRadius + 8} fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333">{`${value} Orders`}</text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999">
        {`(Rate ${(percent * 100).toFixed(2)}%)`}
      </text>
    </g>
  );
};


// --- Component ---
export default function AnalyticsView() {
  const { user } = useAuth();
  const [salesData, setSalesData] = useState<SalesDataPoint[]>([]);
  const [topItems, setTopItems] = useState<TopItemData[]>([]);
  const [hourlyVolume, setHourlyVolume] = useState<HourlyVolumePoint[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodPoint[]>([]);
  const [averageOrderValue, setAverageOrderValue] = useState<number | null>(null);
  const [activePieIndex, setActivePieIndex] = useState(0); // For active pie slice

  const [salesPeriod, setSalesPeriod] = useState<SalesPeriod>('daily');
  const [isLoadingSales, setIsLoadingSales] = useState(true);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [isLoadingVolume, setIsLoadingVolume] = useState(true);
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Data Fetching Callback (Unchanged Logic, just sets different state structures) ---
  const fetchAnalyticsData = useCallback(async (period: SalesPeriod) => {
    if (!user?.id) return;

    setIsLoadingSales(true); setIsLoadingItems(true); setIsLoadingVolume(true); setIsLoadingPayments(true);
    setError(null);
    console.log(`Fetching all analytics data for period: ${period}`);

    try {
      const vendorId = user.id;
      const startDate = new Date();
      if (period === 'daily') startDate.setDate(startDate.getDate() - 30);
      else if (period === 'weekly') startDate.setDate(startDate.getDate() - 12 * 7);
      else if (period === 'monthly') startDate.setMonth(startDate.getMonth() - 12);

      const { data: ordersData, error: dbError } = await supabase
        .from('orders')
        .select(`
          created_at, total_price, payment_method,
          order_items!inner ( quantity, price_at_order, menu_items!inner ( name ), counters!inner ( vendor_id ) )
        `)
        .eq('order_items.counters.vendor_id', vendorId)
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString())
        .returns<FetchedOrderData[]>();

      if (dbError) throw dbError;
      if (!ordersData) throw new Error("No order data returned");

      let totalSalesOverall = 0;
      const salesAggregation: { [key: string]: number } = {};
      const itemStats: { [name: string]: { totalQuantitySold: number; totalRevenue: number } } = {};
      const hourlyCounts: { [hour: string]: number } = {};
      const paymentCounts: { [method: string]: number } = { cash: 0, online: 0 };

      ordersData.forEach(order => {
        if (!order.created_at || typeof order.total_price !== 'number' || !order.order_items) return;
        const orderDate = new Date(order.created_at);
        totalSalesOverall += order.total_price;

        let dateKey: string;
        if (period === 'daily') dateKey = orderDate.toISOString().split('T')[0];
        else if (period === 'weekly') { /* ... week calculation ... */
            const dayNum = orderDate.getUTCDay() || 7;
            orderDate.setUTCDate(orderDate.getUTCDate() + 4 - dayNum);
            const yearStart = new Date(Date.UTC(orderDate.getUTCFullYear(), 0, 1));
            const weekNo = Math.ceil((((orderDate.getTime() - yearStart.getTime()) / 86400000) + yearStart.getUTCDay() + 1) / 7);
            dateKey = `${orderDate.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
        } else dateKey = `${orderDate.getUTCFullYear()}-${String(orderDate.getUTCMonth() + 1).padStart(2, '0')}`;
        if (!salesAggregation[dateKey]) salesAggregation[dateKey] = 0;
        salesAggregation[dateKey] += order.total_price;

        order.order_items.forEach((item) => {
          if (!item.menu_items?.name || typeof item.quantity !== 'number' || typeof item.price_at_order !== 'number') return;
          const name = item.menu_items.name;
          if (!itemStats[name]) itemStats[name] = { totalQuantitySold: 0, totalRevenue: 0 };
          itemStats[name].totalQuantitySold += item.quantity;
          itemStats[name].totalRevenue += item.quantity * item.price_at_order;
        });

        const hour = String(orderDate.getHours()).padStart(2, '0');
        if (!hourlyCounts[hour]) hourlyCounts[hour] = 0;
        hourlyCounts[hour]++;

        const method = order.payment_method?.toLowerCase() === 'cash' ? 'cash' : 'online';
        paymentCounts[method]++;
      });

      // --- Format Data for Recharts ---
      const formattedSales: SalesDataPoint[] = Object.entries(salesAggregation)
        .map(([date, total]) => ({ date: date, totalSales: total })) // Keep original date format
        .sort((a, b) => a.date.localeCompare(b.date)); // Corrected: compare a.date with b.date
      setSalesData(formattedSales);
      setIsLoadingSales(false);

      const aggregatedItems: TopItemData[] = Object.entries(itemStats)
        .map(([name, stats]) => ({ name, ...stats }));
      setTopItems(aggregatedItems);
      setIsLoadingItems(false);

      setAverageOrderValue(ordersData.length > 0 ? totalSalesOverall / ordersData.length : 0);

      const formattedHourly: HourlyVolumePoint[] = Array.from({ length: 24 }, (_, i) => {
        const hourStr = String(i).padStart(2, '0');
        return { hour: hourStr, orders: hourlyCounts[hourStr] || 0 };
      });
      setHourlyVolume(formattedHourly);
      setIsLoadingVolume(false);

      setPaymentMethods([
        { name: 'Cash', value: paymentCounts.cash },
        { name: 'Online', value: paymentCounts.online },
      ].filter(p => p.value > 0));
      setIsLoadingPayments(false);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch analytics data';
      setError(errorMsg); console.error("Analytics Fetch Error:", err);
      setSalesData([]); setTopItems([]); setHourlyVolume([]); setPaymentMethods([]); setAverageOrderValue(null);
      setIsLoadingSales(false); setIsLoadingItems(false); setIsLoadingVolume(false); setIsLoadingPayments(false);
    }
  }, [user?.id]);

  // --- Effects ---
  useEffect(() => {
    if (user?.id) fetchAnalyticsData(salesPeriod);
    else { setIsLoadingSales(true); setIsLoadingItems(true); setIsLoadingVolume(true); setIsLoadingPayments(true); }
  }, [fetchAnalyticsData, salesPeriod, user?.id]);

  // --- Event Handlers ---
  const handlePeriodChange = (keys: Set<React.Key> | string) => {
    if (keys instanceof Set && keys.size > 0) setSalesPeriod(Array.from(keys)[0] as SalesPeriod);
    else if (typeof keys === 'string') setSalesPeriod(keys as SalesPeriod);
  };

  const onPieEnter = useCallback((_: any, index: number) => {
    setActivePieIndex(index);
  }, [setActivePieIndex]);

  // --- Memoized Data for Charts ---
  const topItemsByQuantity = useMemo(() => {
    return [...topItems].sort((a, b) => b.totalQuantitySold - a.totalQuantitySold).slice(0, 5);
  }, [topItems]);

  const topItemsByRevenue = useMemo(() => {
    return [...topItems].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5);
  }, [topItems]);

  // --- Render Logic ---
  const isLoading = isLoadingSales || isLoadingItems || isLoadingVolume || isLoadingPayments;

  if (!user && isLoading) {
    return <div className="flex justify-center items-center h-64"><CircularProgress label="Loading user data..." /></div>;
  }

  // Common Axis/Grid styling using the new palette
  const axisStyle = { fontSize: '0.75rem', fill: CHART_COLORS.foreground };
  const gridStyle = { stroke: CHART_COLORS.grid, strokeDasharray: '3 3' };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* --- Row 1: Sales Trends & AOV --- */}
      <Card className="col-span-1 md:col-span-2 lg:col-span-3">
        <CardHeader className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Sales Trends</h2>
          <Select size="sm" label="Period" placeholder="Select period" selectedKeys={new Set([salesPeriod])} onSelectionChange={handlePeriodChange} className="w-32" aria-label="Sales Period Select" isDisabled={isLoadingSales}>
            <SelectItem key="daily">Daily</SelectItem>
            <SelectItem key="weekly">Weekly</SelectItem>
            <SelectItem key="monthly">Monthly</SelectItem>
          </Select>
        </CardHeader>
        <CardBody className="h-72">
          {isLoadingSales && <div className="flex justify-center items-center h-full"><CircularProgress label="Loading sales..." /></div>}
          {!isLoadingSales && error && <div className="text-danger p-4">{error}</div>}
          {!isLoadingSales && !error && salesData.length === 0 && <div className="text-center p-4 text-foreground-500">No sales data for this period.</div>}
          {!isLoadingSales && !error && salesData.length > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid stroke={gridStyle.stroke} /> {/* Removed strokeDasharray */}
                <XAxis dataKey="date" stroke={CHART_COLORS.foreground} style={axisStyle} tickLine={false} axisLine={false} />
                <YAxis stroke={CHART_COLORS.foreground} style={axisStyle} tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: CHART_COLORS.background }} />
                <Line type="monotone" dataKey="totalSales" stroke={CHART_COLORS.primary} strokeWidth={2} dot={false} activeDot={{ r: 6, fill: CHART_COLORS.primary }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardBody>
         <CardFooter className="text-right">
            <span className="text-lg font-semibold">Average Order Value: </span>
            <span className="text-lg">{formatCurrency(averageOrderValue)}</span>
        </CardFooter>
      </Card>

      {/* --- Row 2: Top Items --- */}
      <Card className="col-span-1 md:col-span-1 lg:col-span-1">
        <CardHeader><h2 className="text-xl font-semibold">Top 5 Items (Quantity)</h2></CardHeader>
        <CardBody className="h-72">
          {isLoadingItems && <div className="flex justify-center items-center h-full"><CircularProgress label="Loading items..." /></div>}
          {!isLoadingItems && error && <div className="text-danger p-4">{error}</div>}
          {!isLoadingItems && !error && topItemsByQuantity.length === 0 && <div className="text-center p-4 text-foreground-500">No item data.</div>}
          {!isLoadingItems && !error && topItemsByQuantity.length > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topItemsByQuantity} layout="vertical" margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                 <CartesianGrid stroke={gridStyle.stroke} horizontal={false}/> {/* Removed strokeDasharray, Vertical grid only */}
                 <XAxis type="number" stroke={CHART_COLORS.foreground} style={axisStyle} tickLine={false} axisLine={false} />
                 <YAxis dataKey="name" type="category" width={100} stroke={CHART_COLORS.foreground} style={axisStyle} tickLine={false} axisLine={false} />
                 <Tooltip content={<CustomTooltip />} cursor={false} /> {/* Disabled cursor hover effect */}
                 <Bar dataKey="totalQuantitySold" name="value" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} /> {/* Rounded corners */}
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardBody>
      </Card>

      <Card className="col-span-1 md:col-span-1 lg:col-span-1">
        <CardHeader><h2 className="text-xl font-semibold">Top 5 Items (Revenue)</h2></CardHeader>
        <CardBody className="h-72">
          {isLoadingItems && <div className="flex justify-center items-center h-full"><CircularProgress label="Loading items..." /></div>}
          {!isLoadingItems && error && <div className="text-danger p-4">{error}</div>}
          {!isLoadingItems && !error && topItemsByRevenue.length === 0 && <div className="text-center p-4 text-foreground-500">No item data.</div>}
          {!isLoadingItems && !error && topItemsByRevenue.length > 0 && (
             <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topItemsByRevenue} layout="vertical" margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                 <CartesianGrid stroke={gridStyle.stroke} horizontal={false}/> {/* Removed strokeDasharray */}
                 <XAxis type="number" stroke={CHART_COLORS.foreground} style={axisStyle} tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(value)} />
                 <YAxis dataKey="name" type="category" width={100} stroke={CHART_COLORS.foreground} style={axisStyle} tickLine={false} axisLine={false} />
                 <Tooltip content={<CustomTooltip />} cursor={false} /> {/* Disabled cursor hover effect */}
                 <Bar dataKey="totalRevenue" name="value" fill={CHART_COLORS.secondary} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardBody>
      </Card>

      {/* --- Row 3: Hourly Volume & Payment Methods --- */}
       <Card className="col-span-1 md:col-span-1 lg:col-span-1">
        <CardHeader><h2 className="text-xl font-semibold">Order Volume by Hour</h2></CardHeader>
        <CardBody className="h-72">
          {isLoadingVolume && <div className="flex justify-center items-center h-full"><CircularProgress label="Loading volume..." /></div>}
          {!isLoadingVolume && error && <div className="text-danger p-4">{error}</div>}
          {!isLoadingVolume && !error && hourlyVolume.length === 0 && <div className="text-center p-4 text-foreground-500">No volume data.</div>}
          {!isLoadingVolume && !error && hourlyVolume.length > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyVolume} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                 <CartesianGrid stroke={gridStyle.stroke} vertical={false}/> {/* Removed strokeDasharray, Horizontal grid only */}
                 <XAxis dataKey="hour" stroke={CHART_COLORS.foreground} style={axisStyle} tickLine={false} axisLine={false} />
                 <YAxis stroke={CHART_COLORS.foreground} style={axisStyle} tickLine={false} axisLine={false} />
                 <Tooltip content={<CustomTooltip />} cursor={false} /> {/* Disabled cursor hover effect */}
                 <Bar dataKey="orders" fill={CHART_COLORS.accent1} radius={[4, 4, 0, 0]} /> {/* Changed color */}
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardBody>
      </Card>

      <Card className="col-span-1 md:col-span-1 lg:col-span-1">
        <CardHeader><h2 className="text-xl font-semibold">Payment Methods</h2></CardHeader>
        <CardBody className="h-72">
           {isLoadingPayments && <div className="flex justify-center items-center h-full"><CircularProgress label="Loading payments..." /></div>}
           {!isLoadingPayments && error && <div className="text-danger p-4">{error}</div>}
           {!isLoadingPayments && !error && paymentMethods.length === 0 && <div className="text-center p-4 text-foreground-500">No payment data.</div>}
           {!isLoadingPayments && !error && paymentMethods.length > 0 && (
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<CustomTooltip />} />
                  <Pie
                    activeIndex={activePieIndex}
                    activeShape={renderActiveShape}
                    data={paymentMethods}
                    cx="50%"
                    cy="50%"
                    innerRadius={60} // Donut chart
                    outerRadius={80}
                    fill={CHART_COLORS.primary} // Base fill, overridden by Cell
                    dataKey="value"
                    onMouseEnter={onPieEnter}
                  >
                    {paymentMethods.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS.pie[index % CHART_COLORS.pie.length]} />
                    ))}
                  </Pie>
                   {/* <Legend />  Optional: Legend can clutter the pie chart */}
                </PieChart>
              </ResponsiveContainer>
          )}
        </CardBody>
      </Card>

    </div>
  );
}
