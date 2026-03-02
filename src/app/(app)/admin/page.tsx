"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  Award,
  Gift,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatRelativeTime } from "@/lib/utils";
import { TACO_EMOJI } from "@/lib/constants";
import { useCurrentUser } from "@/lib/auth-user";
import type { AnalyticsData, TacoTransaction } from "@/lib/types";

// --- Sparkline mini component ---
function Sparkline({ data, color = "#f59e0b" }: { data: number[]; color?: string }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// --- Stat card ---
function StatCard({
  title,
  value,
  change,
  icon: Icon,
  sparklineData,
  loading,
}: {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  sparklineData?: number[];
  loading: boolean;
}) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-amber-600">{title}</p>
              <div className="rounded-lg bg-amber-50 p-2">
                <Icon className="h-4 w-4 text-amber-600" />
              </div>
            </div>
            <div className="mt-3 flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold text-amber-950">{value}</p>
                {change !== undefined && (
                  <div className="mt-1 flex items-center gap-1">
                    {isPositive ? (
                      <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
                    )}
                    <span
                      className={cn(
                        "text-xs font-medium",
                        isPositive ? "text-emerald-600" : "text-red-600"
                      )}
                    >
                      {Math.abs(change)}% vs last week
                    </span>
                  </div>
                )}
              </div>
              {sparklineData && sparklineData.length > 1 && (
                <Sparkline data={sparklineData} />
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// --- Custom chart tooltip ---
function ChartTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-amber-100 bg-white px-3 py-2 shadow-lg shadow-amber-100/40">
      <p className="text-xs font-medium text-amber-600">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-semibold text-amber-950">
          {entry.value.toLocaleString()} {entry.name === "count" ? "tacos" : entry.name}
        </p>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const { user: currentUser } = useCurrentUser();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [recentActivity, setRecentActivity] = useState<TacoTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const teamId = currentUser?.teamId || "";
      const [analyticsRes, activityRes] = await Promise.all([
        fetch(`/api/analytics?teamId=${teamId}`),
        fetch(`/api/transactions?teamId=${teamId}&limit=10`),
      ]);

      if (!analyticsRes.ok) throw new Error("Failed to load analytics");

      const analyticsData = await analyticsRes.json();
      setAnalytics(analyticsData);

      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setRecentActivity(Array.isArray(activityData) ? activityData : activityData.transactions || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute sparkline data from weekly trend
  const sparklineData = analytics?.weeklyTrend?.map((d) => d.count) || [];
  const avgPerDay =
    analytics && analytics.weeklyTrend?.length
      ? Math.round(
          analytics.weeklyTrend.reduce((acc, d) => acc + d.count, 0) /
            analytics.weeklyTrend.length
        )
      : 0;

  // Compute week-over-week changes
  const computeChange = (data: { count: number }[]) => {
    if (!data || data.length < 14) return undefined;
    const thisWeek = data.slice(-7).reduce((a, d) => a + d.count, 0);
    const lastWeek = data.slice(-14, -7).reduce((a, d) => a + d.count, 0);
    if (lastWeek === 0) return thisWeek > 0 ? 100 : 0;
    return Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
  };

  const tacoChange = analytics?.weeklyTrend ? computeChange(analytics.weeklyTrend) : undefined;

  // Format chart date labels
  const chartData = analytics?.weeklyTrend?.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));

  // Pie chart colors
  const DONUT_COLORS = [
    "#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#ef4444", "#ec4899",
    "#06b6d4", "#84cc16", "#f97316", "#6366f1",
  ];

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-amber-100 p-2.5">
            <BarChart3 className="h-6 w-6 text-amber-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-amber-950">Admin Overview</h1>
            <p className="text-sm text-amber-600">Analytics & insights</p>
          </div>
        </div>
        <Card className="border-red-200">
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchData}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-amber-100 p-2.5">
          <BarChart3 className="h-6 w-6 text-amber-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-amber-950">Admin Overview</h1>
          <p className="text-sm text-amber-600">Analytics & insights for your team</p>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Tacos Given"
          value={analytics?.totalTacos?.toLocaleString() ?? "--"}
          change={tacoChange}
          icon={Award}
          sparklineData={sparklineData}
          loading={loading}
        />
        <StatCard
          title="Active Users"
          value={analytics?.activeUsers ?? "--"}
          icon={Users}
          loading={loading}
        />
        <StatCard
          title="Avg Tacos / Day"
          value={avgPerDay}
          icon={TrendingUp}
          sparklineData={sparklineData.slice(-7)}
          loading={loading}
        />
        <StatCard
          title="Today's Tacos"
          value={analytics?.todayTacos ?? "--"}
          icon={Gift}
          loading={loading}
        />
      </div>

      {/* Weekly Taco Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-amber-500" />
            Taco Trend (Last 30 Days)
          </CardTitle>
          <CardDescription>Daily tacos given across your team</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="amberGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#fde68a" vertical={false} />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#92400e", fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#92400e", fontSize: 12 }}
                  width={40}
                />
                <RechartsTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  fill="url(#amberGradient)"
                  dot={false}
                  activeDot={{
                    r: 5,
                    fill: "#f59e0b",
                    stroke: "#fff",
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top Givers & Receivers - Side by Side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Givers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Givers</CardTitle>
            <CardDescription>Most generous team members</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : analytics?.topGivers?.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={analytics.topGivers.slice(0, 10)}
                  layout="vertical"
                  margin={{ top: 0, right: 20, bottom: 0, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#fde68a" horizontal={false} />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#92400e", fontSize: 12 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="displayName"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#92400e", fontSize: 12 }}
                    width={100}
                  />
                  <RechartsTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="totalGiven" name="given" fill="#f59e0b" radius={[0, 6, 6, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-sm text-amber-400">No data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Top Receivers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Receivers</CardTitle>
            <CardDescription>Most recognized team members</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : analytics?.topReceivers?.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={analytics.topReceivers.slice(0, 10)}
                  layout="vertical"
                  margin={{ top: 0, right: 20, bottom: 0, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#fde68a" horizontal={false} />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#92400e", fontSize: 12 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="displayName"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#92400e", fontSize: 12 }}
                    width={100}
                  />
                  <RechartsTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="totalReceived" name="received" fill="#d97706" radius={[0, 6, 6, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-sm text-amber-400">No data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tag Distribution & Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Tag Distribution Donut */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tag Distribution</CardTitle>
            <CardDescription>Most used recognition tags</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="mx-auto h-[260px] w-[260px] rounded-full" />
            ) : analytics?.tagDistribution?.length ? (
              <div className="flex flex-col items-center gap-4">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={analytics.tagDistribution}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {analytics.tagDistribution.map((entry, i) => (
                        <Cell
                          key={entry.name}
                          fill={entry.color || DONUT_COLORS[i % DONUT_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="rounded-lg border border-amber-100 bg-white px-3 py-2 shadow-lg">
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-block h-3 w-3 rounded-full"
                                style={{ backgroundColor: d.color }}
                              />
                              <span className="text-sm font-semibold text-amber-950">
                                {d.name}
                              </span>
                            </div>
                            <p className="text-xs text-amber-600">{d.count} uses</p>
                          </div>
                        );
                      }}
                    />
                    <Legend
                      formatter={(value: string) => (
                        <span className="text-xs text-amber-800">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-amber-400">No tags used yet</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <CardDescription>Last 10 taco transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivity.length ? (
              <div className="max-h-[380px] space-y-3 overflow-y-auto pr-1">
                {recentActivity.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-start gap-3 rounded-lg border border-amber-50 bg-amber-50/40 p-3 transition-colors hover:bg-amber-50"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={tx.giver?.avatarUrl || ""} />
                      <AvatarFallback className="text-xs">
                        {tx.giver?.displayName?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-amber-900">
                        <span className="font-semibold">{tx.giver?.displayName}</span>
                        <span className="text-amber-500"> gave </span>
                        <span className="font-semibold">{tx.receiver?.displayName}</span>
                        <span className="ml-1">
                          {TACO_EMOJI.repeat(Math.min(tx.amount, 5))}
                        </span>
                      </p>
                      {tx.message && (
                        <p className="mt-0.5 truncate text-xs text-amber-600/80">{tx.message}</p>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {tx.tags?.map((t) => (
                          <span
                            key={t.id}
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                            style={{
                              backgroundColor: t.tag.color + "18",
                              color: t.tag.color,
                            }}
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: t.tag.color }}
                            />
                            {t.tag.name}
                          </span>
                        ))}
                        <span className="text-[10px] text-amber-400">
                          {formatRelativeTime(tx.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-amber-400">No recent activity</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
