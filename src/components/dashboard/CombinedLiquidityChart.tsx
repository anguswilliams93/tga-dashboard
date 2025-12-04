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
import { Activity, Layers, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
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

// Signal types for buy/sell indicators
interface TradingSignal {
  date: string;
  type: 'buy' | 'sell';
  normalizedValue: number;
  description: string;
  tgaChange: string;
  btcOutcome: string;
  confidence: 'high' | 'medium' | 'low';
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

  // Detect trading signals based on TGA movements and BTC correlation
  const tradingSignals = useMemo((): TradingSignal[] => {
    if (!tgaData || tgaData.length < 7) return [];

    const signals: TradingSignal[] = [];
    const lookbackPeriod = 5; // 5-day lookback for TGA change
    const tgaThreshold = 0.02; // 2% TGA change threshold (lowered for more signals)

    // Create date maps for quick lookup - find closest BTC price for any date
    const btcMap = new Map(btcData.map(d => [d.date, d.value]));
    const btcDates = btcData.map(d => new Date(d.date).getTime());

    const findClosestBtcPrice = (dateStr: string): number | null => {
      const targetTime = new Date(dateStr).getTime();
      // Try exact match first
      if (btcMap.has(dateStr)) return btcMap.get(dateStr)!;
      // Find closest date within 3 days
      let closestDate: string | null = null;
      let closestDiff = Infinity;
      for (const [date, value] of btcMap) {
        const diff = Math.abs(new Date(date).getTime() - targetTime);
        if (diff < closestDiff && diff < 3 * 24 * 60 * 60 * 1000) {
          closestDiff = diff;
          closestDate = date;
        }
      }
      return closestDate ? btcMap.get(closestDate)! : null;
    };

    // Get normalized TGA values for y-position on chart
    const tgaValues = tgaData.map(d => d.value);
    const tgaMin = Math.min(...tgaValues);
    const tgaMax = Math.max(...tgaValues);
    const tgaRange = tgaMax - tgaMin || 1;

    // Scan through data to find significant TGA movements
    for (let i = lookbackPeriod; i < tgaData.length; i++) {
      const currentDate = tgaData[i].date;
      const currentTga = tgaData[i].value;
      const pastTga = tgaData[i - lookbackPeriod].value;

      // Calculate TGA percentage change
      const tgaChange = (currentTga - pastTga) / pastTga;

      // Look for significant drawdowns (BUY signal) or buildups (SELL signal)
      if (Math.abs(tgaChange) >= tgaThreshold) {
        const normalizedTga = ((currentTga - tgaMin) / tgaRange) * 100;

        // Try to get BTC outcome if we have future data
        let btcOutcome = "Outcome pending...";
        const forwardIndex = Math.min(i + 14, tgaData.length - 1);
        if (forwardIndex > i) {
          const btcAtSignal = findClosestBtcPrice(currentDate);
          const futureDate = tgaData[forwardIndex].date;
          const btcFuture = findClosestBtcPrice(futureDate);

          if (btcAtSignal && btcFuture) {
            const btcChange = ((btcFuture - btcAtSignal) / btcAtSignal) * 100;
            btcOutcome = btcChange >= 0
              ? `BTC rose ${btcChange.toFixed(1)}% in the following 14 days`
              : `BTC fell ${Math.abs(btcChange).toFixed(1)}% in the following 14 days`;
          }
        }

        // TGA drawdown = liquidity injection = potential BUY
        if (tgaChange <= -tgaThreshold) {
          const confidence = Math.abs(tgaChange) >= 0.05 ? 'high' : Math.abs(tgaChange) >= 0.03 ? 'medium' : 'low';
          signals.push({
            date: currentDate,
            type: 'buy',
            normalizedValue: normalizedTga,
            description: `TGA Drawdown: Liquidity injection into markets`,
            tgaChange: `TGA dropped ${(Math.abs(tgaChange) * 100).toFixed(1)}% over ${lookbackPeriod} days`,
            btcOutcome,
            confidence,
          });
        }
        // TGA buildup = liquidity drain = potential SELL
        else if (tgaChange >= tgaThreshold) {
          const confidence = Math.abs(tgaChange) >= 0.05 ? 'high' : Math.abs(tgaChange) >= 0.03 ? 'medium' : 'low';
          signals.push({
            date: currentDate,
            type: 'sell',
            normalizedValue: normalizedTga,
            description: `TGA Buildup: Liquidity draining from markets`,
            tgaChange: `TGA rose ${(Math.abs(tgaChange) * 100).toFixed(1)}% over ${lookbackPeriod} days`,
            btcOutcome,
            confidence,
          });
        }
      }
    }

    // Filter signals to avoid clustering (minimum 14 days apart)
    const filteredSignals: TradingSignal[] = [];
    let lastSignalDate: Date | null = null;

    for (const signal of signals) {
      const signalDate = new Date(signal.date);
      if (!lastSignalDate || (signalDate.getTime() - lastSignalDate.getTime()) >= 14 * 24 * 60 * 60 * 1000) {
        filteredSignals.push(signal);
        lastSignalDate = signalDate;
      }
    }

    // Only return signals within current time range
    const now = new Date();
    const ranges: Record<TimeRange, number> = {
      "30d": 30,
      "90d": 90,
      "180d": 180,
      "1y": 365,
    };
    const cutoff = new Date(now.getTime() - ranges[timeRange] * 24 * 60 * 60 * 1000);

    return filteredSignals.filter(s => new Date(s.date) >= cutoff);
  }, [tgaData, btcData, timeRange]);

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

                  {/* Trading Signal Markers */}
                  {showSignals && tradingSignals.map((signal, index) => (
                    <ReferenceDot
                      key={`signal-${index}`}
                      x={signal.date}
                      y={signal.normalizedValue}
                      r={8}
                      fill={signal.type === 'buy' ? '#22c55e' : '#ef4444'}
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                    />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            </motion.div>
          </AnimatePresence>

          {/* Trading Signals Legend */}
          {showSignals && tradingSignals.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 rounded-lg bg-muted/30 border border-border"
            >
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-semibold">Historical Trading Signals</span>
                <span className="text-xs text-muted-foreground">(Based on TGA liquidity movements)</span>
              </div>
              <div className="grid gap-2 max-h-[200px] overflow-y-auto">
                <TooltipProvider>
                  {tradingSignals.map((signal, index) => (
                    <UITooltip key={index}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "flex items-center justify-between p-2 rounded-md cursor-help transition-colors",
                            signal.type === 'buy'
                              ? "bg-emerald-500/10 hover:bg-emerald-500/20"
                              : "bg-red-500/10 hover:bg-red-500/20"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "flex items-center justify-center w-6 h-6 rounded-full",
                              signal.type === 'buy' ? "bg-emerald-500" : "bg-red-500"
                            )}>
                              {signal.type === 'buy' ? (
                                <TrendingUp className="h-3.5 w-3.5 text-white" />
                              ) : (
                                <TrendingDown className="h-3.5 w-3.5 text-white" />
                              )}
                            </div>
                            <div>
                              <p className={cn(
                                "text-sm font-medium",
                                signal.type === 'buy' ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                              )}>
                                {signal.type === 'buy' ? 'BUY Signal' : 'SELL Signal'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(signal.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              signal.confidence === 'high' ? "border-amber-500 text-amber-600" :
                              signal.confidence === 'medium' ? "border-blue-500 text-blue-600" :
                              "border-gray-500 text-gray-600"
                            )}
                          >
                            {signal.confidence} confidence
                          </Badge>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-[300px] p-3">
                        <div className="space-y-2">
                          <p className="font-semibold text-sm">{signal.description}</p>
                          <div className="space-y-1 text-xs">
                            <p className="text-muted-foreground">
                              <span className="font-medium text-foreground">What happened: </span>
                              {signal.tgaChange}
                            </p>
                            <p className={cn(
                              signal.btcOutcome.includes('rose') ? "text-emerald-600" : "text-red-500"
                            )}>
                              <span className="font-medium text-foreground">Outcome: </span>
                              {signal.btcOutcome}
                            </p>
                          </div>
                        </div>
                      </TooltipContent>
                    </UITooltip>
                  ))}
                </TooltipProvider>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
