"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  ReferenceDot,
  ReferenceArea,
} from "recharts";
import type { ChartDataPoint } from "@/types";
import { cn } from "@/lib/utils";
import { Activity, Layers, TrendingUp, TrendingDown, AlertCircle, ChevronDown, DollarSign, BarChart3, Target, Percent } from "lucide-react";
import { useState, useMemo } from "react";
import { calculateHistoricalSignals, calculateBacktestMetrics, type HistoricalSignal, type BacktestMetrics } from "@/lib/signals";

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
  const [timeRange, setTimeRange] = useState<TimeRange>("90d");
  const [activeLines, setActiveLines] = useState({
    tga: true,
    rrp: true,
    btc: true,
    stablecoin: true,
  });
  const [showSignals, setShowSignals] = useState(true);
  const [expandedSignal, setExpandedSignal] = useState<string | null>(null);

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

  // Calculate multi-factor trading signals using the new composite strategy
  const tradingSignals = useMemo((): HistoricalSignal[] => {
    if (!tgaData || tgaData.length < 30) return [];

    // Only return signals within current time range
    const now = new Date();
    const ranges: Record<TimeRange, number> = {
      "30d": 30,
      "90d": 90,
      "180d": 180,
      "1y": 365,
    };
    const cutoff = new Date(now.getTime() - ranges[timeRange] * 24 * 60 * 60 * 1000);

    const signals = calculateHistoricalSignals(
      tgaData,
      rrpData,
      stablecoinData,
      btcData,
      14 // Minimum 14 days between signals
    );

    return signals.filter(s => new Date(s.date) >= cutoff);
  }, [tgaData, rrpData, stablecoinData, btcData, timeRange]);

  // Calculate backtest metrics for the signals
  const backtestMetrics = useMemo((): BacktestMetrics | null => {
    if (tradingSignals.length < 2) return null;
    return calculateBacktestMetrics(tradingSignals);
  }, [tradingSignals]);

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
        return `$${rawValue.toFixed(2)}B`;
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
              stablecoin: 'USDT & C Supply',
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

              {/* Trading Signals Toggle */}
              <Badge
                variant="secondary"
                className={cn(
                  "cursor-pointer transition-all duration-200 px-3 py-1.5 ml-2",
                  showSignals
                    ? "opacity-100 bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500"
                    : "opacity-40 hover:opacity-60"
                )}
                onClick={() => setShowSignals(!showSignals)}
              >
                <AlertCircle className="w-3.5 h-3.5 mr-2" />
                Buy/Sell Signals ({tradingSignals.length})
              </Badge>
            </div>

            {/* Signal Legend - Show when signals are enabled */}
            <AnimatePresence>
              {showSignals && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-border/50"
                >
                  <span className="text-xs text-muted-foreground font-medium">Signal Legend:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-xs text-muted-foreground">Strong BUY</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 opacity-70" />
                    <span className="text-xs text-muted-foreground">Moderate BUY</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-xs text-muted-foreground">Strong SELL</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 opacity-70" />
                    <span className="text-xs text-muted-foreground">Moderate SELL</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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

                  {/* Trading Signal Markers */}
                  {showSignals && tradingSignals.map((signal, index) => {
                    const isBuy = signal.action === 'BUY';
                    // Position based on score (scale -1 to 1 to 0-100)
                    const yPosition = ((signal.score + 1) / 2) * 100;
                    return (
                      <ReferenceDot
                        key={`signal-${index}`}
                        x={signal.date}
                        y={yPosition}
                        r={signal.strength === 'strong' ? 10 : 7}
                        fill={isBuy ? '#22c55e' : '#ef4444'}
                        stroke="hsl(var(--background))"
                        strokeWidth={2}
                        opacity={signal.strength === 'strong' ? 1 : 0.7}
                      />
                    );
                  })}
                </ComposedChart>
              </ResponsiveContainer>
            </motion.div>
          </AnimatePresence>

          {/* Trading Signals Legend - Show latest signals + backtest metrics */}
          {showSignals && tradingSignals.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 rounded-lg bg-muted/30 border border-border"
            >
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-semibold">Multi-Factor Trading Signals</span>
                <Badge variant="outline" className="text-xs">4-Factor Strategy</Badge>
              </div>

              {/* Backtest Metrics Summary */}
              {backtestMetrics && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-3 rounded-lg bg-background/50 border border-border/50">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                      <BarChart3 className="h-3 w-3" />
                      <span>Total Signals</span>
                    </div>
                    <p className="text-lg font-bold">{backtestMetrics.totalSignals}</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                      <Target className="h-3 w-3" />
                      <span>Win Rate (14d)</span>
                    </div>
                    <p className={cn(
                      "text-lg font-bold",
                      backtestMetrics.winRate14Days >= 50 ? "text-emerald-500" : "text-red-500"
                    )}>
                      {backtestMetrics.winRate14Days.toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                      <Percent className="h-3 w-3" />
                      <span>Avg Return (14d)</span>
                    </div>
                    <p className={cn(
                      "text-lg font-bold",
                      backtestMetrics.avgReturn14Days >= 0 ? "text-emerald-500" : "text-red-500"
                    )}>
                      {backtestMetrics.avgReturn14Days >= 0 ? "+" : ""}{backtestMetrics.avgReturn14Days.toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                      <TrendingUp className="h-3 w-3" />
                      <span>Best Signal</span>
                    </div>
                    <p className="text-lg font-bold text-emerald-500">
                      {backtestMetrics.bestSignal
                        ? `+${(backtestMetrics.bestSignal.return14Days ?? 0).toFixed(1)}%`
                        : "N/A"}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid gap-3">
                {/* Get latest buy and sell signals */}
                {(() => {
                  const latestBuy = [...tradingSignals].reverse().find(s => s.action === 'BUY');
                  const latestSell = [...tradingSignals].reverse().find(s => s.action === 'SELL');
                  const latestSignals = [latestBuy, latestSell].filter(Boolean) as HistoricalSignal[];

                  return latestSignals.map((signal) => {
                    const isBuy = signal.action === 'BUY';
                    const signalKey = `${signal.action}-${signal.date}`;
                    const isExpanded = expandedSignal === signalKey;

                    return (
                      <motion.div
                        key={signalKey}
                        layout
                        className={cn(
                          "rounded-xl overflow-hidden border transition-all cursor-pointer",
                          isBuy
                            ? "bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40"
                            : "bg-red-500/5 border-red-500/20 hover:border-red-500/40"
                        )}
                        onClick={() => setExpandedSignal(isExpanded ? null : signalKey)}
                      >
                        {/* Header - always visible */}
                        <div className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "flex items-center justify-center w-10 h-10 rounded-xl",
                              isBuy
                                ? "bg-gradient-to-br from-emerald-500 to-emerald-600"
                                : "bg-gradient-to-br from-red-500 to-red-600"
                            )}>
                              {isBuy ? (
                                <TrendingUp className="h-5 w-5 text-white" />
                              ) : (
                                <TrendingDown className="h-5 w-5 text-white" />
                              )}
                            </div>
                            <div>
                              <p className={cn(
                                "text-base font-semibold",
                                isBuy ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                              )}>
                                {signal.strength === 'strong' ? 'Strong' : 'Moderate'} {signal.action} Signal
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(signal.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                {" · "}Score: {(signal.score * 100).toFixed(0)}%
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge
                              className={cn(
                                "text-xs font-medium px-3 py-1",
                                signal.strength === 'strong'
                                  ? isBuy
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                    : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"
                                  : "bg-muted text-muted-foreground border-border"
                              )}
                              variant="outline"
                            >
                              {signal.strength}
                            </Badge>
                            <motion.div
                              animate={{ rotate: isExpanded ? 180 : 0 }}
                              transition={{ duration: 0.2 }}
                              className="text-muted-foreground"
                            >
                              <ChevronDown className="h-5 w-5" />
                            </motion.div>
                          </div>
                        </div>

                        {/* Expandable content */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className={cn(
                                "px-4 pb-4 pt-2 border-t",
                                isBuy ? "border-emerald-500/20" : "border-red-500/20"
                              )}>
                                {/* Factor Breakdown */}
                                <div className="mb-4">
                                  <p className="text-xs font-medium text-muted-foreground mb-3">Factor Breakdown (Weighted)</p>
                                  <div className="grid grid-cols-2 gap-2">
                                    {[
                                      { name: "TGA", weight: "35%", value: signal.factors.tga, color: "orange" },
                                      { name: "RRP", weight: "15%", value: signal.factors.rrp, color: "blue" },
                                      { name: "Stables", weight: "30%", value: signal.factors.stablecoin, color: "green" },
                                      { name: "BTC Div", weight: "20%", value: signal.factors.btcDivergence, color: "purple" },
                                    ].map((factor) => {
                                      const isPositive = factor.value >= 0;
                                      const percent = (factor.value * 100).toFixed(0);
                                      return (
                                        <div
                                          key={factor.name}
                                          className={cn(
                                            "flex items-center justify-between text-xs p-3 rounded-lg border",
                                            `bg-${factor.color}-500/5 border-${factor.color}-500/20`
                                          )}
                                          style={{
                                            backgroundColor: `color-mix(in srgb, var(--${factor.color === 'orange' ? 'orange' : factor.color === 'blue' ? 'blue' : factor.color === 'green' ? 'green' : 'purple'}-500, rgb(139, 92, 246)) 5%, transparent)`,
                                          }}
                                        >
                                          <div className="flex items-center gap-2">
                                            <div className={cn(
                                              "w-2 h-2 rounded-full",
                                              factor.color === 'orange' && "bg-orange-500",
                                              factor.color === 'blue' && "bg-blue-500",
                                              factor.color === 'green' && "bg-green-500",
                                              factor.color === 'purple' && "bg-purple-500",
                                            )} />
                                            <span className={cn(
                                              factor.color === 'orange' && "text-orange-600 dark:text-orange-400",
                                              factor.color === 'blue' && "text-blue-600 dark:text-blue-400",
                                              factor.color === 'green' && "text-green-600 dark:text-green-400",
                                              factor.color === 'purple' && "text-purple-600 dark:text-purple-400",
                                            )}>
                                              {factor.name} ({factor.weight})
                                            </span>
                                          </div>
                                          <span className={cn(
                                            "font-mono font-semibold",
                                            isPositive ? "text-emerald-500" : "text-red-500"
                                          )}>
                                            {isPositive ? "+" : ""}{percent}%
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Performance Display */}
                                <div className={cn(
                                  "p-4 rounded-xl border",
                                  signal.returnToNow >= 0
                                    ? "bg-emerald-500/10 border-emerald-500/20"
                                    : "bg-red-500/10 border-red-500/20"
                                )}>
                                  <div className="flex items-center justify-center gap-3 mb-2">
                                    <div className={cn(
                                      "flex items-center justify-center w-8 h-8 rounded-lg",
                                      signal.returnToNow >= 0 ? "bg-emerald-500/20" : "bg-red-500/20"
                                    )}>
                                      <DollarSign className={cn(
                                        "h-5 w-5",
                                        signal.returnToNow >= 0 ? "text-emerald-500" : "text-red-500"
                                      )} />
                                    </div>
                                    <span className={cn(
                                      "text-3xl font-bold font-mono",
                                      signal.returnToNow >= 0 ? "text-emerald-500" : "text-red-500"
                                    )}>
                                      {signal.returnToNow >= 0 ? "+" : ""}{signal.returnToNow.toFixed(1)}%
                                    </span>
                                  </div>
                                  <p className="text-xs text-center text-muted-foreground">
                                    BTC performance since signal (
                                    ${signal.btcPriceAtSignal.toLocaleString(undefined, { maximumFractionDigits: 0 })} →
                                    ${signal.btcPriceNow.toLocaleString(undefined, { maximumFractionDigits: 0 })})
                                  </p>
                                  {signal.return14Days !== null && (
                                    <p className="text-xs text-center text-muted-foreground mt-2 pt-2 border-t border-border/50">
                                      14-day return: <span className={cn(
                                        "font-semibold",
                                        signal.return14Days >= 0 ? "text-emerald-500" : "text-red-500"
                                      )}>
                                        {signal.return14Days >= 0 ? "+" : ""}{signal.return14Days.toFixed(1)}%
                                      </span>
                                    </p>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  });
                })()}
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
