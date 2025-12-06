"use client";

import { MetricCard } from "@/components/dashboard/MetricCard";
import { LiquidityChart } from "@/components/dashboard/LiquidityChart";
import { CombinedLiquidityChart } from "@/components/dashboard/CombinedLiquidityChart";
import { SuggestionBox } from "@/components/dashboard/SuggestionBox";
import { CompositeSignalCard } from "@/components/dashboard/CompositeSignalCard";
import { NewsCard } from "@/components/dashboard/NewsCard";
import type { ChartDataPoint } from "@/types";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { DollarSign, TrendingUp, Bitcoin, Coins, RefreshCw, Info, Target, LineChart, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useMemo, useRef } from "react";
import { calculateCompositeSignal } from "@/lib/signals";

interface DashboardClientProps {
  tgaData: ChartDataPoint[];
  rrpData: ChartDataPoint[];
  latestTga: { balance: number; date: string; change: number } | null;
  latestRrp: { balance: number; date: string; change: number } | null;
  btcData: { price: number; change24h: number; marketCap: number } | null;
  stablecoinData: { total: number; usdt: number; usdc: number; change24h: number } | null;
  btcChartData: ChartDataPoint[];
  stablecoinChartData: ChartDataPoint[];
}

// Scroll-triggered animation wrapper component
function ScrollReveal({
  children,
  delay = 0,
  direction = "right"
}: {
  children: React.ReactNode;
  delay?: number;
  direction?: "right" | "left" | "up" | "down";
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const directionVariants = {
    right: { x: 100, opacity: 0 },
    left: { x: -100, opacity: 0 },
    up: { y: 50, opacity: 0 },
    down: { y: -50, opacity: 0 },
  };

  return (
    <motion.div
      ref={ref}
      initial={directionVariants[direction]}
      animate={isInView ? { x: 0, y: 0, opacity: 1 } : directionVariants[direction]}
      transition={{
        type: "spring",
        stiffness: 60,
        damping: 20,
        delay: delay,
      }}
    >
      {children}
    </motion.div>
  );
}

// Container animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15
    }
  }
};

const sectionVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 80,
      damping: 20
    }
  }
};

export function DashboardClient({
  tgaData,
  rrpData,
  latestTga,
  latestRrp,
  btcData,
  stablecoinData,
  btcChartData,
  stablecoinChartData,
}: DashboardClientProps) {
  const [showExplanation, setShowExplanation] = useState(false);

  // TGA balance is in millions from API (e.g., 935847 = $935.847B)
  // RRP balance is already in billions from FRED API (e.g., 2.514 = $2.514B)
  const tgaBillions = latestTga ? latestTga.balance / 1000 : 0;
  const rrpBillions = latestRrp ? latestRrp.balance : 0;

  // Format TGA/RRP values (input is in millions from API)
  const formatMillionsAsBillions = (valueInMillions: number) => {
    const billions = valueInMillions / 1000;
    return `$${billions.toFixed(2)}B`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calculate progress percentages for visual indicators
  const tgaProgress = Math.min(100, (tgaBillions / 1000) * 100); // Max 1T
  const rrpProgress = Math.min(100, (rrpBillions / 500) * 100); // Max 500B
  const btcProgress = btcData ? Math.min(100, (btcData.price / 150000) * 100) : 0; // Max 150k

  // Calculate composite multi-factor signal
  const compositeSignal = useMemo(() => {
    return calculateCompositeSignal(
      tgaData,
      rrpData,
      btcChartData,
      stablecoinChartData,
      latestTga ? { balance: latestTga.balance, change: latestTga.change } : null,
      latestRrp ? { balance: latestRrp.balance, change: latestRrp.change } : null,
      btcData,
      stablecoinData
    );
  }, [tgaData, rrpData, btcChartData, stablecoinChartData, latestTga, latestRrp, btcData, stablecoinData]);

  return (
    <motion.div
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header with animated gradient */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-6 border border-primary/10"
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent"
          animate={{
            x: ["-100%", "100%"],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        {/* <div className="relative flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text">
              Liquidity Signal Dashboard
            </h2>
            <p className="text-muted-foreground mt-1 max-w-xl">
              Track Treasury flows, Fed liquidity, and stablecoin supply to identify optimal BTC entry and exit points using our 4-factor composite signal strategy.
            </p>
          </div>
          <motion.div
            className="flex items-center gap-2 text-sm text-muted-foreground"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <RefreshCw className="h-4 w-4" />
            Live data
          </motion.div>
        </div> */}

        {/* Expandable explanation section */}
        <div className="relative">
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <Info className="h-4 w-4" />
            Why This Dashboard Matters
            {showExplanation ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          <AnimatePresence>
            {showExplanation && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="mt-4 grid gap-6 md:grid-cols-3">
                  {/* Why TGA is Important */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-orange-500/10">
                        <DollarSign className="h-4 w-4 text-orange-500" />
                      </div>
                      <h3 className="font-semibold text-sm">Why the TGA Chart is Important</h3>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-2">
                      <p>
                        The Treasury General Account (TGA) is the U.S. government&apos;s checking account at the Federal Reserve.
                      </p>
                      <p>
                        <span className="text-emerald-500 font-medium">When TGA goes down:</span> Money enters the private financial system, increasing reserves, liquidity, risk-taking, and asset prices.
                      </p>
                      <p>
                        <span className="text-red-500 font-medium">When TGA goes up:</span> Dollars leave the banking system, tightening liquidity and weakening risk assets.
                      </p>
                      <p className="font-medium text-foreground">
                        Tracking TGA tells you if liquidity is flowing into or out of markets.
                      </p>
                    </div>
                  </div>

                  {/* Mission Critical for Traders */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-purple-500/10">
                        <Target className="h-4 w-4 text-purple-500" />
                      </div>
                      <h3 className="font-semibold text-sm">Mission Critical for Traders</h3>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-2">
                      <p>
                        TGA moves are among the strongest predictors of crypto and tech index performance. Treasury accidentally becomes one of the biggest market movers:
                      </p>
                      <ul className="space-y-1 ml-3">
                        <li className="flex items-start gap-1.5">
                          <span className="text-emerald-500 mt-0.5">-</span>
                          A $400B drawdown equals a $400B liquidity injection
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-red-500 mt-0.5">-</span>
                          A $600B rebuild equals a $600B liquidity drain
                        </li>
                      </ul>
                      <p className="font-medium text-foreground">
                        Historically, BTC, ETH, and Nasdaq often rise 15-35% within 60 days of a major TGA drawdown.
                      </p>
                    </div>
                  </div>

                  {/* Why Seeing Charts Matters */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-blue-500/10">
                        <LineChart className="h-4 w-4 text-blue-500" />
                      </div>
                      <h3 className="font-semibold text-sm">Why Visualizing This Data Matters</h3>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-2">
                      <p>
                        Individual data points don&apos;t reveal trend direction. Charts show whether TGA is trending down (liquidity expansion), flat (neutral), or up (liquidity contraction).
                      </p>
                      <p>
                        <span className="font-medium text-foreground">Detect inflection points early:</span> TGA trend reversals often lead to crypto breakouts, tech rallies, and bond volatility compression.
                      </p>
                      <p>
                        <span className="font-medium text-foreground">Precise timing:</span> Visually identify waterfall drawdowns, slow drip liquidity, sharp rebuilds, and seasonal plateaus. These patterns repeat year after year.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Metric Cards Grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        variants={containerVariants}
      >
        <motion.div variants={itemVariants}>
          <MetricCard
            title="TGA Balance"
            value={latestTga ? formatMillionsAsBillions(latestTga.balance) : "N/A"}
            subtitle={latestTga ? `As of ${latestTga.date}` : undefined}
            change={latestTga?.change}
            changeLabel="vs previous"
            icon={<DollarSign className="h-6 w-6" />}
            variant="orange"
            progress={tgaProgress}
            delay={0}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <MetricCard
            title="RRP Balance"
            value={latestRrp ? `$${latestRrp.balance.toFixed(2)}B` : "N/A"}
            subtitle={latestRrp ? `As of ${latestRrp.date}` : undefined}
            change={latestRrp?.change}
            changeLabel="vs previous"
            icon={<TrendingUp className="h-6 w-6" />}
            variant="blue"
            progress={rrpProgress}
            delay={0.05}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <MetricCard
            title="Bitcoin Price"
            value={btcData ? formatCurrency(btcData.price) : "N/A"}
            subtitle={btcData ? `MCap: ${(btcData.marketCap / 1e12).toFixed(2)}T` : undefined}
            change={btcData?.change24h}
            changeLabel="24h change"
            icon={<Bitcoin className="h-6 w-6" />}
            variant="purple"
            progress={btcProgress}
            delay={0.1}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <MetricCard
            title="Stablecoin Supply"
            value={
              stablecoinData
                ? `$${(stablecoinData.total / 1e9).toFixed(1)}B`
                : "N/A"
            }
            subtitle={
              stablecoinData
                ? `USDT: $${(stablecoinData.usdt / 1e9).toFixed(1)}B | USDC: $${(stablecoinData.usdc / 1e9).toFixed(1)}B`
                : undefined
            }
            change={stablecoinData?.change24h}
            changeLabel="24h change"
            icon={<Coins className="h-6 w-6" />}
            variant="green"
            delay={0.15}
          />
        </motion.div>
      </motion.div>

      {/* Composite Signal Card - Multi-Factor Trading Signal */}
      <ScrollReveal direction="right" delay={0}>
        <CompositeSignalCard signal={compositeSignal} />
      </ScrollReveal>

      {/* Combined Multi-Line Chart */}
      <ScrollReveal direction="right" delay={0.1}>
        <CombinedLiquidityChart
          tgaData={tgaData}
          rrpData={rrpData}
          btcData={btcChartData}
          stablecoinData={stablecoinChartData}
          delay={0}
        />
      </ScrollReveal>

      {/* Charts Section - Liquidity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ScrollReveal direction="right" delay={0}>
          <LiquidityChart
            title="TGA Balance"
            description="Treasury General Account balance over time"
            data={tgaData}
            color="#f97316"
            delay={0}
          />
        </ScrollReveal>
        <ScrollReveal direction="right" delay={0.1}>
          <LiquidityChart
            title="RRP Balance"
            description="Reverse Repo Program balance over time"
            data={rrpData}
            color="#3b82f6"
            delay={0}
          />
        </ScrollReveal>
      </div>

      {/* Charts Section - Crypto */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ScrollReveal direction="right" delay={0}>
          <LiquidityChart
            title="Bitcoin Price"
            description="BTC price in USD over time"
            data={btcChartData}
            color="#8b5cf6"
            valuePrefix="$"
            valueSuffix=""
            valueInBillions={false}
            delay={0}
          />
        </ScrollReveal>
        <ScrollReveal direction="right" delay={0.1}>
          <LiquidityChart
            title="Stablecoin Market Cap"
            description="Total stablecoin supply over time"
            data={stablecoinChartData}
            color="#10b981"
            delay={0}
          />
        </ScrollReveal>
      </div>

      {/* News Feed */}
      <ScrollReveal direction="right" delay={0}>
        <NewsCard delay={0} />
      </ScrollReveal>

      {/* Suggestion Box */}
      <ScrollReveal direction="right" delay={0}>
        <SuggestionBox delay={0} />
      </ScrollReveal>

      {/* Footer */}
      <ScrollReveal direction="up" delay={0}>
        <footer className="flex items-center justify-between gap-3 border-t pt-6 pb-2 max-lg:flex-col">
          <p className="text-muted-foreground text-sm text-balance max-md:text-center">
            ©{new Date().getFullYear()}{" "}
            <span className="text-primary font-medium">TGA Liquidity Dashboard</span>
            {" · "}Data sources: Treasury FiscalData, FRED, CoinGecko
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Made with <span className="text-red-500">♥</span> by</span>
            <a
              href="https://nativeschema.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:text-primary transition-colors"
            >
              NativeSchema
            </a>
            <span className="w-1 h-1 rounded-full bg-muted-foreground" />
            <a
              href="https://zerobi.au"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:text-primary transition-colors"
            >
              ZEROBI
            </a>
          </div>
        </footer>
      </ScrollReveal>
    </motion.div>
  );
}
