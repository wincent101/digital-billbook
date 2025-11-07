import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from "date-fns";
import { th } from "date-fns/locale";
import { TrendingUp, ShoppingCart, DollarSign, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface SalesData {
  date: string;
  amount: number;
  count: number;
}

interface SummaryData {
  totalSales: number;
  totalOrders: number;
  averageOrder: number;
  completedOrders: number;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--secondary))", "hsl(var(--chart-1))", "hsl(var(--chart-2))"];

export default function Reports() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("daily");
  const [dailyData, setDailyData] = useState<SalesData[]>([]);
  const [weeklyData, setWeeklyData] = useState<SalesData[]>([]);
  const [monthlyData, setMonthlyData] = useState<SalesData[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    totalSales: 0,
    totalOrders: 0,
    averageOrder: 0,
    completedOrders: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadDailyData(),
      loadWeeklyData(),
      loadMonthlyData(),
      loadSummary(),
    ]);
    setLoading(false);
  };

  const loadDailyData = async () => {
    try {
      const days = 7;
      const data: SalesData[] = [];

      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const start = startOfDay(date);
        const end = endOfDay(date);

        const { data: transactions, error } = await supabase
          .from("pos_transactions")
          .select("total_amount")
          .gte("created_at", start.toISOString())
          .lte("created_at", end.toISOString());

        if (error) throw error;

        const total = transactions?.reduce((sum, t) => sum + Number(t.total_amount), 0) || 0;
        data.push({
          date: format(date, "dd MMM", { locale: th }),
          amount: total,
          count: transactions?.length || 0,
        });
      }

      setDailyData(data);
    } catch (error) {
      console.error("Load daily data error:", error);
    }
  };

  const loadWeeklyData = async () => {
    try {
      const weeks = 8;
      const data: SalesData[] = [];

      for (let i = weeks - 1; i >= 0; i--) {
        const date = subWeeks(new Date(), i);
        const start = startOfWeek(date, { locale: th });
        const end = endOfWeek(date, { locale: th });

        const { data: transactions, error } = await supabase
          .from("pos_transactions")
          .select("total_amount")
          .gte("created_at", start.toISOString())
          .lte("created_at", end.toISOString());

        if (error) throw error;

        const total = transactions?.reduce((sum, t) => sum + Number(t.total_amount), 0) || 0;
        data.push({
          date: `${format(start, "dd", { locale: th })}-${format(end, "dd MMM", { locale: th })}`,
          amount: total,
          count: transactions?.length || 0,
        });
      }

      setWeeklyData(data);
    } catch (error) {
      console.error("Load weekly data error:", error);
    }
  };

  const loadMonthlyData = async () => {
    try {
      const months = 12;
      const data: SalesData[] = [];

      for (let i = months - 1; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const start = startOfMonth(date);
        const end = endOfMonth(date);

        const { data: transactions, error } = await supabase
          .from("pos_transactions")
          .select("total_amount")
          .gte("created_at", start.toISOString())
          .lte("created_at", end.toISOString());

        if (error) throw error;

        const total = transactions?.reduce((sum, t) => sum + Number(t.total_amount), 0) || 0;
        data.push({
          date: format(date, "MMM yyyy", { locale: th }),
          amount: total,
          count: transactions?.length || 0,
        });
      }

      setMonthlyData(data);
    } catch (error) {
      console.error("Load monthly data error:", error);
    }
  };

  const loadSummary = async () => {
    try {
      const { data: transactions, error } = await supabase
        .from("pos_transactions")
        .select("total_amount, payment_status");

      if (error) throw error;

      const totalSales = transactions?.reduce((sum, t) => sum + Number(t.total_amount), 0) || 0;
      const totalOrders = transactions?.length || 0;
      const completedOrders = transactions?.filter(t => t.payment_status === "paid").length || 0;
      const averageOrder = totalOrders > 0 ? totalSales / totalOrders : 0;

      setSummary({
        totalSales,
        totalOrders,
        averageOrder,
        completedOrders,
      });
    } catch (error) {
      console.error("Load summary error:", error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
    }).format(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              รายงานสรุปยอดขาย
            </h1>
            <p className="text-muted-foreground mt-2">
              ติดตามและวิเคราะห์ยอดขายของคุณ
            </p>
          </div>
          <Button onClick={() => navigate("/")} variant="outline">
            กลับหน้าหลัก
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="border-2 border-primary/20 shadow-[var(--shadow-soft)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                ยอดขายรวม
              </CardTitle>
              <DollarSign className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(summary.totalSales)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-accent/20 shadow-[var(--shadow-soft)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                จำนวนออเดอร์
              </CardTitle>
              <ShoppingCart className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">
                {summary.totalOrders}
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-secondary/20 shadow-[var(--shadow-soft)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                ค่าเฉลี่ยต่อออเดอร์
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary">
                {formatCurrency(summary.averageOrder)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-chart-1/20 shadow-[var(--shadow-soft)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                ออเดอร์ชำระแล้ว
              </CardTitle>
              <Package className="h-5 w-5" style={{ color: "hsl(var(--chart-1))" }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: "hsl(var(--chart-1))" }}>
                {summary.completedOrders}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Card className="shadow-[var(--shadow-elevated)] border-2 border-primary/10">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 border-b">
            <CardTitle className="text-2xl">กราฟแสดงยอดขาย</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="daily">รายวัน (7 วัน)</TabsTrigger>
                <TabsTrigger value="weekly">รายสัปดาห์ (8 สัปดาห์)</TabsTrigger>
                <TabsTrigger value="monthly">รายเดือน (12 เดือน)</TabsTrigger>
              </TabsList>

              <TabsContent value="daily" className="space-y-6">
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="date" 
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: "hsl(var(--foreground))" }}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: "hsl(var(--foreground))" }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--background))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                        formatter={(value: number) => [formatCurrency(value), "ยอดขาย"]}
                      />
                      <Legend />
                      <Bar dataKey="amount" fill="hsl(var(--primary))" name="ยอดขาย" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="date" 
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: "hsl(var(--foreground))" }}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: "hsl(var(--foreground))" }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--background))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="hsl(var(--accent))" 
                        strokeWidth={2}
                        name="จำนวนออเดอร์"
                        dot={{ fill: "hsl(var(--accent))", r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>

              <TabsContent value="weekly" className="space-y-6">
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="date" 
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: "hsl(var(--foreground))" }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--background))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                        formatter={(value: number) => [formatCurrency(value), "ยอดขาย"]}
                      />
                      <Legend />
                      <Bar dataKey="amount" fill="hsl(var(--accent))" name="ยอดขาย" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="date" 
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: "hsl(var(--foreground))" }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--background))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="hsl(var(--secondary))" 
                        strokeWidth={2}
                        name="จำนวนออเดอร์"
                        dot={{ fill: "hsl(var(--secondary))", r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>

              <TabsContent value="monthly" className="space-y-6">
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="date" 
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: "hsl(var(--foreground))" }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--background))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                        formatter={(value: number) => [formatCurrency(value), "ยอดขาย"]}
                      />
                      <Legend />
                      <Bar dataKey="amount" fill="hsl(var(--chart-1))" name="ยอดขาย" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="date" 
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: "hsl(var(--foreground))" }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--background))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="hsl(var(--chart-2))" 
                        strokeWidth={2}
                        name="จำนวนออเดอร์"
                        dot={{ fill: "hsl(var(--chart-2))", r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card className="shadow-[var(--shadow-elevated)] border-2 border-primary/10">
          <CardHeader className="bg-gradient-to-r from-accent/5 to-primary/5 border-b">
            <CardTitle className="text-xl">รายละเอียดข้อมูล</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-semibold text-foreground">ช่วงเวลา</th>
                    <th className="text-right py-3 px-4 font-semibold text-foreground">ยอดขาย</th>
                    <th className="text-right py-3 px-4 font-semibold text-foreground">จำนวนออเดอร์</th>
                    <th className="text-right py-3 px-4 font-semibold text-foreground">ค่าเฉลี่ย</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeTab === "daily" ? dailyData : activeTab === "weekly" ? weeklyData : monthlyData).map((item, index) => (
                    <tr key={index} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4 text-foreground">{item.date}</td>
                      <td className="text-right py-3 px-4 font-semibold text-primary">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="text-right py-3 px-4 text-foreground">{item.count}</td>
                      <td className="text-right py-3 px-4 text-accent font-medium">
                        {formatCurrency(item.count > 0 ? item.amount / item.count : 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
