"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Activity, Gauge, ArrowUpRight, ArrowDownRight, Zap, Shield, AlertTriangle, TrendingUp, TrendingDown, DollarSign, HelpCircle } from "lucide-react";
import { useMemo } from "react";
import type { ChartDataPoint } from "@/types";

interface LiquidityHeatmapProps {
  netLiquidity: number;
  tga: number;
  rrp: number;
  tgaChartData?: ChartDataPoint[];
  btcChartData?: ChartDataPoint[];
  delay?: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15
    }
  }
};

interface BacktestTrade {
  type: 'buy' | 'sell';
  date: string;
  btcPrice: number;
  tgaChange: number;
}

interface BacktestResult {
  trades: BacktestTrade[];
  totalProfit: number;
  totalProfitPercent: number;
  winningTrades: number;
  losingTrades: number;
  avgTradeProfit: number;
}

export function LiquidityHeatmap({
  netLiquidity,
  tga,
  rrp,
  tgaChartData = [],
  btcChartData = [],
  delay = 0,
}: LiquidityHeatmapProps) {
  // Calculate liquidity health score (0-100)
  const maxNetLiquidity = 6000;
  const healthScore = Math.min(100, Math.max(0, (netLiquidity / maxNetLiquidity) * 100));

  // Backtest trading signals over the last 12 months
  const backtestResult = useMemo((): BacktestResult | null => {
    if (!tgaChartData || tgaChartData.length < 7 || !btcChartData || btcChartData.length < 7) {
      return null;
    }

    const executedTrades: BacktestTrade[] = [];
    const lookbackPeriod = 5;
    const tgaThreshold = 0.02; // 2% TGA change threshold

    // Create BTC price map with fuzzy date matching
    const btcMap = new Map(btcChartData.map(d => [d.date, d.value]));

    const findClosestBtcPrice = (dateStr: string): number | null => {
      const targetTime = new Date(dateStr).getTime();
      if (btcMap.has(dateStr)) return btcMap.get(dateStr)!;
      let closestDate: string | null = null;
      let closestDiff = Infinity;
      for (const [date] of btcMap) {
        const diff = Math.abs(new Date(date).getTime() - targetTime);
        if (diff < closestDiff && diff < 3 * 24 * 60 * 60 * 1000) {
          closestDiff = diff;
          closestDate = date;
        }
      }
      return closestDate ? btcMap.get(closestDate)! : null;
    };

    // Only look at last 12 months of data
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);

    const filteredTgaData = tgaChartData.filter(d => new Date(d.date) >= cutoff);

    // Trading state: waiting for buy (0) or waiting for sell (1)
    let position = 0; // 0 = no BTC, looking for buy signal | 1 = holding 1 BTC, looking for sell signal
    let entryPrice = 0;
    let totalProfit = 0;
    let winningTrades = 0;
    let losingTrades = 0;
    const completedTradesPL: number[] = [];

    for (let i = lookbackPeriod; i < filteredTgaData.length; i++) {
      const currentDate = filteredTgaData[i].date;
      const currentTga = filteredTgaData[i].value;
      const pastTga = filteredTgaData[i - lookbackPeriod].value;
      const tgaChange = (currentTga - pastTga) / pastTga;

      const btcPrice = findClosestBtcPrice(currentDate);
      if (!btcPrice) continue;

      // Looking for BUY signal (TGA drawdown) when not holding
      if (position === 0 && tgaChange <= -tgaThreshold) {
        position = 1;
        entryPrice = btcPrice;
        executedTrades.push({ type: 'buy', date: currentDate, btcPrice, tgaChange });
      }
      // Looking for SELL signal (TGA buildup) when holding
      else if (position === 1 && tgaChange >= tgaThreshold) {
        const profit = btcPrice - entryPrice;
        totalProfit += profit;
        completedTradesPL.push(profit);
        if (profit > 0) winningTrades++;
        else losingTrades++;

        executedTrades.push({ type: 'sell', date: currentDate, btcPrice, tgaChange });
        position = 0;
        entryPrice = 0;
      }
    }

    // If still holding at end, calculate unrealized P&L using latest BTC price
    if (position === 1 && btcChartData.length > 0) {
      const latestBtc = btcChartData[btcChartData.length - 1].value;
      const unrealizedProfit = latestBtc - entryPrice;
      totalProfit += unrealizedProfit;
      completedTradesPL.push(unrealizedProfit);
      if (unrealizedProfit > 0) winningTrades++;
      else losingTrades++;
    }

    // Calculate return % based on average entry price
    const buyTrades = executedTrades.filter(t => t.type === 'buy');
    const avgEntryPrice = buyTrades.length > 0
      ? buyTrades.reduce((sum, t) => sum + t.btcPrice, 0) / buyTrades.length
      : 0;
    const totalProfitPercent = avgEntryPrice > 0 ? (totalProfit / avgEntryPrice) * 100 : 0;

    return {
      trades: executedTrades,
      totalProfit,
      totalProfitPercent,
      winningTrades,
      losingTrades,
      avgTradeProfit: completedTradesPL.length > 0 ? totalProfit / completedTradesPL.length : 0,
    };
  }, [tgaChartData, btcChartData]);

  const getHealthColor = (score: number) => {
    if (score >= 70) return { gradient: "from-emerald-500 to-emerald-600", bg: "bg-emerald-500", text: "text-emerald-500" };
    if (score >= 50) return { gradient: "from-yellow-500 to-amber-500", bg: "bg-yellow-500", text: "text-yellow-500" };
    if (score >= 30) return { gradient: "from-orange-500 to-orange-600", bg: "bg-orange-500", text: "text-orange-500" };
    return { gradient: "from-red-500 to-red-600", bg: "bg-red-500", text: "text-red-500" };
  };

  const getHealthLabel = (score: number) => {
    if (score >= 70) return { label: "High Liquidity", description: "Market conditions favorable", icon: Shield };
    if (score >= 50) return { label: "Moderate Liquidity", description: "Normal market conditions", icon: Gauge };
    if (score >= 30) return { label: "Low Liquidity", description: "Exercise caution", icon: AlertTriangle };
    return { label: "Critical Liquidity", description: "High risk environment", icon: AlertTriangle };
  };

  const colors = getHealthColor(healthScore);
  const health = getHealthLabel(healthScore);
  const HealthIcon = health.icon;

  // Calculate component percentages
  const totalDrain = tga + rrp;
  const tgaPercent = totalDrain > 0 ? (tga / totalDrain) * 100 : 50;
  const rrpPercent = totalDrain > 0 ? (rrp / totalDrain) * 100 : 50;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay }}
    >
      <Card className={cn(
        "overflow-hidden border-0 shadow-lg",
        "bg-gradient-to-br from-card via-card to-muted/10"
      )}>
        {/* Animated gradient accent */}
        <motion.div
          className={cn("h-1 w-full bg-gradient-to-r", colors.gradient)}
          initial={{ scaleX: 0, originX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: delay + 0.2, duration: 0.8, ease: "easeOut" }}
        />

        <CardHeader className="pb-2">
          <motion.div variants={itemVariants} className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Liquidity Health Monitor
              </CardTitle>
              <CardDescription>
                Real-time market liquidity assessment
              </CardDescription>
            </div>
            <Badge
              variant="secondary"
              className={cn(
                "text-sm font-medium px-3 py-1",
                healthScore >= 50
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-500/10 text-red-600 dark:text-red-400"
              )}
            >
              <Zap className="h-3.5 w-3.5 mr-1" />
              {healthScore >= 50 ? "Risk On" : "Risk Off"}
            </Badge>
          </motion.div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Main Health Gauge */}
          <motion.div variants={itemVariants} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HealthIcon className={cn("h-5 w-5", colors.text)} />
                <span className="font-semibold">{health.label}</span>
              </div>
              <span className={cn("text-2xl font-bold", colors.text)}>
                {healthScore.toFixed(0)}%
              </span>
            </div>

            {/* Progress bar with glow effect */}
            <div className="relative">
              <div className="h-4 rounded-full overflow-hidden bg-muted/50 backdrop-blur">
                <motion.div
                  className={cn("h-full rounded-full bg-gradient-to-r", colors.gradient)}
                  initial={{ width: 0 }}
                  animate={{ width: `${healthScore}%` }}
                  transition={{ delay: delay + 0.4, duration: 1, ease: "easeOut" }}
                />
              </div>
              {/* Glow effect */}
              <motion.div
                className={cn(
                  "absolute inset-0 rounded-full blur-lg opacity-30",
                  colors.bg
                )}
                style={{ width: `${healthScore}%` }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                transition={{ delay: delay + 0.6 }}
              />
            </div>

            <p className="text-sm text-muted-foreground">{health.description}</p>
          </motion.div>

          {/* Stats Grid */}
          <motion.div variants={itemVariants} className="grid grid-cols-3 gap-4">
            {/* Net Liquidity */}
            <div className="relative p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                <Gauge className="h-3.5 w-3.5" />
                Net Liquidity
              </div>
              <div className="text-2xl font-bold text-primary">
                ${(netLiquidity / 1000).toFixed(1)}T
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Fed Balance - Drains
              </div>
            </div>

            {/* TGA Drain */}
            <div className="relative p-4 rounded-xl bg-gradient-to-br from-orange-500/5 to-orange-500/10 border border-orange-500/10">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                <ArrowDownRight className="h-3.5 w-3.5 text-orange-500" />
                TGA Drain
              </div>
              <div className="text-2xl font-bold text-orange-500">
                ${tga.toFixed(0)}B
              </div>
              <div className="mt-2">
                <Progress
                  value={tgaPercent}
                  className="h-1.5 bg-orange-500/20"
                />
              </div>
            </div>

            {/* RRP Drain */}
            <div className="relative p-4 rounded-xl bg-gradient-to-br from-blue-500/5 to-blue-500/10 border border-blue-500/10">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                <ArrowDownRight className="h-3.5 w-3.5 text-blue-500" />
                RRP Drain
              </div>
              <div className="text-2xl font-bold text-blue-500">
                ${rrp.toFixed(0)}B
              </div>
              <div className="mt-2">
                <Progress
                  value={rrpPercent}
                  className="h-1.5 bg-blue-500/20"
                />
              </div>
            </div>
          </motion.div>

          {/* Liquidity Signal Indicator */}
          <motion.div
            variants={itemVariants}
            className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50"
          >
            <div className="flex items-center gap-3">
              <motion.div
                className={cn(
                  "w-4 h-4 rounded-full",
                  healthScore >= 50 ? "bg-emerald-500" : "bg-red-500"
                )}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [1, 0.7, 1]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              <div>
                <p className="font-medium">Market Signal</p>
                <p className="text-xs text-muted-foreground">
                  Based on current liquidity conditions
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {healthScore >= 50 ? (
                <ArrowUpRight className="h-5 w-5 text-emerald-500" />
              ) : (
                <ArrowDownRight className="h-5 w-5 text-red-500" />
              )}
              <span className={cn(
                "font-bold text-lg",
                healthScore >= 50 ? "text-emerald-500" : "text-red-500"
              )}>
                {healthScore >= 50 ? "BULLISH" : "BEARISH"}
              </span>
            </div>
          </motion.div>

          {/* Backtest Results Section */}
          {backtestResult && backtestResult.trades.length > 0 && (
            <motion.div
              variants={itemVariants}
              className="p-4 rounded-xl bg-gradient-to-br from-purple-500/5 to-purple-500/10 border border-purple-500/20"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-purple-500" />
                  <span className="font-semibold">12-Month Signal Backtest</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[280px] p-3">
                        <p className="text-xs">
                          Simulated results from trading 1 BTC based on TGA liquidity signals over the past 12 months.
                          Buy when TGA drops ≥2% (liquidity injection), sell when TGA rises ≥2% (liquidity drain).
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    backtestResult.totalProfit >= 0
                      ? "border-emerald-500 text-emerald-600 bg-emerald-500/10"
                      : "border-red-500 text-red-600 bg-red-500/10"
                  )}
                >
                  {backtestResult.trades.length} signals
                </Badge>
              </div>

              {/* Main P&L Display */}
              <div className="flex items-center justify-center gap-3 mb-4">
                {backtestResult.totalProfit >= 0 ? (
                  <TrendingUp className="h-8 w-8 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-red-500" />
                )}
                <div className="text-center">
                  <p className={cn(
                    "text-3xl font-bold",
                    backtestResult.totalProfit >= 0 ? "text-emerald-500" : "text-red-500"
                  )}>
                    {backtestResult.totalProfit >= 0 ? "+" : ""}${backtestResult.totalProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total P&L trading 1 BTC
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2 rounded-lg bg-background/50">
                  <p className={cn(
                    "text-lg font-bold",
                    backtestResult.totalProfitPercent >= 0 ? "text-emerald-500" : "text-red-500"
                  )}>
                    {backtestResult.totalProfitPercent >= 0 ? "+" : ""}{backtestResult.totalProfitPercent.toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-muted-foreground">Return</p>
                </div>
                <div className="p-2 rounded-lg bg-background/50">
                  <p className="text-lg font-bold text-emerald-500">
                    {backtestResult.winningTrades}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Winning</p>
                </div>
                <div className="p-2 rounded-lg bg-background/50">
                  <p className="text-lg font-bold text-red-500">
                    {backtestResult.losingTrades}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Losing</p>
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground text-center mt-3">
                * Past performance does not guarantee future results
              </p>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
