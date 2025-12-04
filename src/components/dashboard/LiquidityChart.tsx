"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
} from "recharts";
import type { ChartDataPoint } from "@/types";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Activity, Calendar } from "lucide-react";
import { useState, useMemo } from "react";

interface LiquidityChartProps {
  title: string;
  description?: string;
  data: ChartDataPoint[];
  color?: string;
  fillColor?: string;
  type?: "line" | "area";
  yAxisLabel?: string;
  delay?: number;
  valuePrefix?: string;
  valueSuffix?: string;
  valueInBillions?: boolean;
}

const chartVariants = {
  hidden: {
    opacity: 0,
    y: 40,
    scale: 0.95
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 80,
      damping: 20,
      mass: 1
    }
  }
};

const headerVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { delay: 0.1, duration: 0.4 }
  }
};

type TimeRange = "7d" | "30d" | "90d" | "180d" | "1y" | "all";

export function LiquidityChart({
  title,
  description,
  data,
  color = "#4f46e5",
  delay = 0,
  valuePrefix = "$",
  valueSuffix = "B",
  valueInBillions = true,
}: LiquidityChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");

  // Create a safe ID for SVG gradients (no spaces or special chars)
  const safeId = useMemo(() => title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase(), [title]);

  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const now = new Date();
    const ranges: Record<TimeRange, number> = {
      "7d": 7,
      "30d": 30,
      "90d": 90,
      "180d": 180,
      "1y": 365,
      "all": Infinity
    };

    const days = ranges[timeRange];
    if (days === Infinity) return data;

    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return data.filter(d => new Date(d.date) >= cutoff);
  }, [data, timeRange]);

  const stats = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return null;

    const values = filteredData.map(d => d.value);
    const latest = values[values.length - 1];
    const first = values[0];
    const change = first !== 0 ? ((latest - first) / first) * 100 : 0;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);

    return { latest, change, avg, max, min };
  }, [filteredData]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const formatValue = (value: number) => {
    if (valueInBillions) {
      return `${valuePrefix}${value.toFixed(1)}${valueSuffix}`;
    }
    // Format large numbers with K suffix for thousands
    if (value >= 1000) {
      return `${valuePrefix}${(value / 1000).toFixed(1)}K${valueSuffix}`;
    }
    return `${valuePrefix}${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}${valueSuffix}`;
  };

  const formatYAxis = (value: number) => {
    if (valueInBillions) {
      return `${value.toFixed(0)}${valueSuffix}`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ value: number }>;
    label?: string;
  }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-popover/95 backdrop-blur-sm border border-border rounded-xl p-3 shadow-xl"
      >
        <p className="text-xs text-muted-foreground mb-1">
          {label ? new Date(label).toLocaleDateString("en-US", {
            weekday: "short",
            year: "numeric",
            month: "long",
            day: "numeric",
          }) : ""}
        </p>
        <p className="text-lg font-bold" style={{ color }}>
          {formatValue(payload[0].value)}
        </p>
      </motion.div>
    );
  };

  // Don't render chart if no data
  if (!data || data.length === 0) {
    return (
      <motion.div
        variants={chartVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay }}
      >
        <Card className="h-full border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/20">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              <div className="text-center space-y-2">
                <Activity className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="text-muted-foreground">No data available</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={chartVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay }}
      whileHover={{ y: -2 }}
    >
      <Card className={cn(
        "h-full border-0 shadow-lg overflow-hidden",
        "bg-gradient-to-br from-card via-card to-muted/10"
      )}>
        {/* Gradient accent */}
        <div
          className="h-1 w-full"
          style={{ background: `linear-gradient(90deg, ${color}80, ${color}20)` }}
        />

        <CardHeader className="pb-2">
          <motion.div
            variants={headerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-semibold">{title}</CardTitle>
                {stats && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-xs font-medium",
                      stats.change >= 0
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-red-500/10 text-red-600 dark:text-red-400"
                    )}
                  >
                    {stats.change >= 0 ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    )}
                    {Math.abs(stats.change).toFixed(1)}%
                  </Badge>
                )}
              </div>
              {description && (
                <CardDescription>{description}</CardDescription>
              )}
            </div>

            {/* Time range selector */}
            <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
              <TabsList className="bg-muted/50 h-8">
                <TabsTrigger value="7d" className="text-xs h-6 px-1.5">7D</TabsTrigger>
                <TabsTrigger value="30d" className="text-xs h-6 px-1.5">30D</TabsTrigger>
                <TabsTrigger value="90d" className="text-xs h-6 px-1.5">90D</TabsTrigger>
                <TabsTrigger value="180d" className="text-xs h-6 px-1.5">180D</TabsTrigger>
                <TabsTrigger value="1y" className="text-xs h-6 px-1.5">1Y</TabsTrigger>
                <TabsTrigger value="all" className="text-xs h-6 px-1.5">All</TabsTrigger>
              </TabsList>
            </Tabs>
          </motion.div>

          {/* Stats row */}
          {stats && (
            <motion.div
              className="grid grid-cols-3 gap-4 pt-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: delay + 0.2 }}
            >
              <div className="text-center p-2 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground">Current</p>
                <p className="text-sm font-bold" style={{ color }}>
                  {formatValue(stats.latest)}
                </p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground">Average</p>
                <p className="text-sm font-bold text-foreground">
                  {formatValue(stats.avg)}
                </p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground">Range</p>
                <p className="text-sm font-bold text-foreground">
                  {formatValue(stats.min)} - {formatValue(stats.max)}
                </p>
              </div>
            </motion.div>
          )}
        </CardHeader>

        <CardContent className="pt-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={timeRange}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="h-[280px] w-full min-w-0"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={filteredData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id={`gradient-${safeId}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.6} />
                      <stop offset="50%" stopColor={color} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={color} stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--muted-foreground))"
                    strokeOpacity={0.1}
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 11
                    }}
                    dy={10}
                  />
                  <YAxis
                    tickFormatter={formatYAxis}
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 11
                    }}
                    dx={-5}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{
                      stroke: color,
                      strokeWidth: 1,
                      strokeDasharray: "4 4",
                      strokeOpacity: 0.5
                    }}
                  />
                  {stats && (
                    <ReferenceLine
                      y={stats.avg}
                      stroke={color}
                      strokeDasharray="8 8"
                      strokeOpacity={0.3}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={2.5}
                    fill={`url(#gradient-${safeId})`}
                    fillOpacity={1}
                    animationDuration={1000}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
