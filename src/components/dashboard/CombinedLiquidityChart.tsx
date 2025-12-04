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
  Line,
  ComposedChart,
  Legend,
} from "recharts";
import type { ChartDataPoint } from "@/types";
import { cn } from "@/lib/utils";
import { Activity, Layers } from "lucide-react";
import { useState, useMemo } from "react";

interface CombinedLiquidityChartProps {
  tgaData: ChartDataPoint[];
  rrpData: ChartDataPoint[];
  btcData: ChartDataPoint[];
  stablecoinData: ChartDataPoint[];
  delay?: number;
}

type TimeRange = "30d" | "90d" | "180d" | "1y";

interface CombinedDataPoint {
  date: string;
  tga: number | null;
  rrp: number | null;
  btc: number | null;
  stablecoin: number | null;
}

// Colors for each metric with slight transparency
const CHART_COLORS = {
  tga: { main: "#f97316", opacity: 0.85 },        // Orange
  rrp: { main: "#3b82f6", opacity: 0.85 },        // Blue
  btc: { main: "#8b5cf6", opacity: 0.85 },        // Purple
  stablecoin: { main: "#10b981", opacity: 0.85 }, // Green
};

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

export function CombinedLiquidityChart({
  tgaData,
  rrpData,
  btcData,
  stablecoinData,
  delay = 0,
}: CombinedLiquidityChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [activeLines, setActiveLines] = useState({
    tga: true,
    rrp: true,
    btc: true,
    stablecoin: true,
  });

  // Normalize data to percentage scale (0-100) for comparison
  const normalizeData = (data: ChartDataPoint[], key: string) => {
    if (!data || data.length === 0) return [];
    const values = data.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    return data.map(d => ({
      date: d.date,
      [key]: ((d.value - min) / range) * 100,
      [`${key}Raw`]: d.value,
    }));
  };

  // Combine all data by date with time filtering
  const combinedData = useMemo(() => {
    const now = new Date();
    const ranges: Record<TimeRange, number> = {
      "30d": 30,
      "90d": 90,
      "180d": 180,
      "1y": 365,
    };
    const days = ranges[timeRange];
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Normalize each dataset
    const normalizedTga = normalizeData(tgaData, 'tga');
    const normalizedRrp = normalizeData(rrpData, 'rrp');
    const normalizedBtc = normalizeData(btcData, 'btc');
    const normalizedStablecoin = normalizeData(stablecoinData, 'stablecoin');

    // Create a map of all dates
    type CombinedEntry = {
      date: string;
      tga: number | null;
      rrp: number | null;
      btc: number | null;
      stablecoin: number | null;
      tgaRaw?: number;
      rrpRaw?: number;
      btcRaw?: number;
      stablecoinRaw?: number;
    };

    const dateMap = new Map<string, CombinedEntry>();

    // Helper to add data to map
    const addToMap = (data: Record<string, unknown>[], key: 'tga' | 'rrp' | 'btc' | 'stablecoin') => {
      data.forEach((d) => {
        const dateStr = d.date as string;
        const date = new Date(dateStr);
        if (date >= cutoff) {
          if (!dateMap.has(dateStr)) {
            dateMap.set(dateStr, {
              date: dateStr,
              tga: null,
              rrp: null,
              btc: null,
              stablecoin: null,
            });
          }
          const entry = dateMap.get(dateStr)!;
          entry[key] = d[key] as number;
          const rawKey = `${key}Raw` as keyof CombinedEntry;
          (entry[rawKey] as number | undefined) = d[`${key}Raw`] as number;
        }
      });
    };

    addToMap(normalizedTga, 'tga');
    addToMap(normalizedRrp, 'rrp');
    addToMap(normalizedBtc, 'btc');
    addToMap(normalizedStablecoin, 'stablecoin');

    // Sort by date
    return Array.from(dateMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [tgaData, rrpData, btcData, stablecoinData, timeRange]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Toggle line visibility
  const toggleLine = (key: keyof typeof activeLines) => {
    setActiveLines(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{
      dataKey: string;
      value: number;
      color: string;
      payload: Record<string, number>;
    }>;
    label?: string;
  }) => {
    if (!active || !payload || !payload.length) return null;

    const formatValue = (dataKey: string, rawValue: number | undefined) => {
      if (rawValue === undefined || rawValue === null) return 'N/A';

      if (dataKey === 'btc') {
        return `$${rawValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
      }
      if (dataKey === 'tga' || dataKey === 'stablecoin') {
        // TGA is in millions, convert to billions
        return `$${(rawValue / 1000).toFixed(2)}B`;
      }
      if (dataKey === 'rrp') {
        // RRP is already in billions
        return `$${rawValue.toFixed(2)}B`;
      }
      return rawValue.toFixed(2);
    };

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-popover/95 backdrop-blur-sm border border-border rounded-xl p-4 shadow-xl min-w-[200px]"
      >
        <p className="text-xs text-muted-foreground mb-3 pb-2 border-b border-border">
          {label ? new Date(label).toLocaleDateString("en-US", {
            weekday: "short",
            year: "numeric",
            month: "long",
            day: "numeric",
          }) : ""}
        </p>
        <div className="space-y-2">
          {payload.map((entry, index) => {
            const rawKey = `${entry.dataKey}Raw`;
            const rawValue = entry.payload[rawKey];
            const labels: Record<string, string> = {
              tga: 'TGA Balance',
              rrp: 'RRP Balance',
              btc: 'Bitcoin Price',
              stablecoin: 'Stablecoin MCap',
            };
            return (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {labels[entry.dataKey] || entry.dataKey}
                  </span>
                </div>
                <span className="text-sm font-semibold" style={{ color: entry.color }}>
                  {formatValue(entry.dataKey, rawValue)}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>
    );
  };

  // Check if we have any data
  const hasData = combinedData.length > 0;

  if (!hasData) {
    return (
      <motion.div
        variants={chartVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay }}
      >
        <Card className="h-full border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/20">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Combined Liquidity Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] flex items-center justify-center">
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
        {/* Multi-color gradient accent */}
        <div
          className="h-1.5 w-full"
          style={{
            background: `linear-gradient(90deg,
              ${CHART_COLORS.tga.main}80 0%,
              ${CHART_COLORS.rrp.main}80 33%,
              ${CHART_COLORS.btc.main}80 66%,
              ${CHART_COLORS.stablecoin.main}80 100%)`
          }}
        />

        <CardHeader className="pb-2">
          <motion.div
            variants={headerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg font-semibold">Combined Liquidity Overview</CardTitle>
                </div>
                <CardDescription>
                  Normalized comparison of all metrics (scaled 0-100%)
                </CardDescription>
              </div>

              {/* Time range selector */}
              <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
                <TabsList className="bg-muted/50 h-9">
                  <TabsTrigger value="30d" className="text-xs h-7 px-3">30D</TabsTrigger>
                  <TabsTrigger value="90d" className="text-xs h-7 px-3">90D</TabsTrigger>
                  <TabsTrigger value="180d" className="text-xs h-7 px-3">180D</TabsTrigger>
                  <TabsTrigger value="1y" className="text-xs h-7 px-3">1Y</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Legend/Toggle buttons */}
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'tga' as const, label: 'TGA Balance', color: CHART_COLORS.tga.main },
                { key: 'rrp' as const, label: 'RRP Balance', color: CHART_COLORS.rrp.main },
                { key: 'btc' as const, label: 'Bitcoin', color: CHART_COLORS.btc.main },
                { key: 'stablecoin' as const, label: 'Stablecoins', color: CHART_COLORS.stablecoin.main },
              ].map(({ key, label, color }) => (
                <Badge
                  key={key}
                  variant="secondary"
                  className={cn(
                    "cursor-pointer transition-all duration-200 px-3 py-1.5",
                    activeLines[key]
                      ? "opacity-100"
                      : "opacity-40 hover:opacity-60"
                  )}
                  style={{
                    backgroundColor: activeLines[key] ? `${color}20` : undefined,
                    borderColor: color,
                    color: activeLines[key] ? color : undefined,
                  }}
                  onClick={() => toggleLine(key)}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full mr-2"
                    style={{ backgroundColor: color }}
                  />
                  {label}
                </Badge>
              ))}
            </div>
          </motion.div>
        </CardHeader>

        <CardContent className="pt-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={timeRange}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="h-[400px] w-full min-w-0"
            >
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={combinedData}
                  margin={{ top: 20, right: 20, left: -10, bottom: 0 }}
                >
                  <defs>
                    {Object.entries(CHART_COLORS).map(([key, { main }]) => (
                      <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={main} stopOpacity={0.3} />
                        <stop offset="50%" stopColor={main} stopOpacity={1} />
                        <stop offset="100%" stopColor={main} stopOpacity={0.3} />
                      </linearGradient>
                    ))}
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
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
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
                      stroke: "hsl(var(--muted-foreground))",
                      strokeWidth: 1,
                      strokeDasharray: "4 4",
                      strokeOpacity: 0.3
                    }}
                  />

                  {/* TGA Line */}
                  {activeLines.tga && (
                    <Line
                      type="monotone"
                      dataKey="tga"
                      stroke={`url(#gradient-tga)`}
                      strokeWidth={2.5}
                      strokeOpacity={CHART_COLORS.tga.opacity}
                      dot={false}
                      activeDot={{
                        r: 6,
                        fill: CHART_COLORS.tga.main,
                        strokeWidth: 2,
                        stroke: "hsl(var(--background))"
                      }}
                      connectNulls
                      animationDuration={1000}
                      animationEasing="ease-out"
                    />
                  )}

                  {/* RRP Line */}
                  {activeLines.rrp && (
                    <Line
                      type="monotone"
                      dataKey="rrp"
                      stroke={`url(#gradient-rrp)`}
                      strokeWidth={2.5}
                      strokeOpacity={CHART_COLORS.rrp.opacity}
                      dot={false}
                      activeDot={{
                        r: 6,
                        fill: CHART_COLORS.rrp.main,
                        strokeWidth: 2,
                        stroke: "hsl(var(--background))"
                      }}
                      connectNulls
                      animationDuration={1000}
                      animationEasing="ease-out"
                    />
                  )}

                  {/* BTC Line */}
                  {activeLines.btc && (
                    <Line
                      type="monotone"
                      dataKey="btc"
                      stroke={`url(#gradient-btc)`}
                      strokeWidth={2.5}
                      strokeOpacity={CHART_COLORS.btc.opacity}
                      dot={false}
                      activeDot={{
                        r: 6,
                        fill: CHART_COLORS.btc.main,
                        strokeWidth: 2,
                        stroke: "hsl(var(--background))"
                      }}
                      connectNulls
                      animationDuration={1000}
                      animationEasing="ease-out"
                    />
                  )}

                  {/* Stablecoin Line */}
                  {activeLines.stablecoin && (
                    <Line
                      type="monotone"
                      dataKey="stablecoin"
                      stroke={`url(#gradient-stablecoin)`}
                      strokeWidth={2.5}
                      strokeOpacity={CHART_COLORS.stablecoin.opacity}
                      dot={false}
                      activeDot={{
                        r: 6,
                        fill: CHART_COLORS.stablecoin.main,
                        strokeWidth: 2,
                        stroke: "hsl(var(--background))"
                      }}
                      connectNulls
                      animationDuration={1000}
                      animationEasing="ease-out"
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
