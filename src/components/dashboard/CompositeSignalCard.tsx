"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Wallet,
  Coins,
  Bitcoin,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CompositeSignal, FactorSignal } from "@/types";
import { useState, useEffect } from "react";

interface CompositeSignalCardProps {
  signal: CompositeSignal;
}

// Animated number display
function AnimatedNumber({ value }: { value: number }) {
  const progress = useMotionValue(0);
  const rounded = useTransform(progress, (v: number) => Math.round(v));

  useEffect(() => {
    const controls = animate(progress, value, {
      duration: 1.5,
      ease: [0.25, 0.46, 0.45, 0.94],
    });
    return () => controls.stop();
  }, [progress, value]);

  return <motion.span>{rounded}</motion.span>;
}

// Get icon for each factor
function getFactorIcon(name: string) {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    TGA: Wallet,
    RRP: BarChart3,
    Stablecoins: Coins,
    "BTC Divergence": Bitcoin,
  };
  return iconMap[name] || Activity;
}

// Factor card component - cleaner design
function FactorCard({ factor, index }: { factor: FactorSignal; index: number }) {
  const isPositive = factor.score > 0.1;
  const isNegative = factor.score < -0.1;
  const Icon = getFactorIcon(factor.name);
  const scorePercent = Math.round(((factor.score + 1) / 2) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        "relative rounded-xl p-4 transition-all",
        "bg-card border border-border/50 hover:border-border"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-lg",
              isPositive
                ? "bg-emerald-500/10 text-emerald-500"
                : isNegative
                ? "bg-red-500/10 text-red-500"
                : "bg-muted text-muted-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium text-sm">{factor.name}</p>
            <p className="text-xs text-muted-foreground">
              Weight: {(factor.weight * 100).toFixed(0)}%
            </p>
          </div>
        </div>
        <Badge
          variant="secondary"
          className={cn(
            "text-xs font-mono",
            isPositive
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : isNegative
              ? "bg-red-500/10 text-red-600 dark:text-red-400"
              : "bg-muted text-muted-foreground"
          )}
        >
          {isPositive ? (
            <ArrowUpRight className="h-3 w-3 mr-1" />
          ) : isNegative ? (
            <ArrowDownRight className="h-3 w-3 mr-1" />
          ) : (
            <Minus className="h-3 w-3 mr-1" />
          )}
          {factor.score >= 0 ? "+" : ""}
          {factor.score.toFixed(2)}
        </Badge>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">{factor.condition}</span>
          <span
            className={cn(
              "font-medium",
              isPositive
                ? "text-emerald-500"
                : isNegative
                ? "text-red-500"
                : "text-muted-foreground"
            )}
          >
            {scorePercent}%
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${scorePercent}%` }}
            transition={{ duration: 1, delay: index * 0.1, ease: "easeOut" }}
            className={cn(
              "h-full rounded-full",
              isPositive
                ? "bg-emerald-500"
                : isNegative
                ? "bg-red-500"
                : "bg-muted-foreground"
            )}
          />
        </div>
      </div>
    </motion.div>
  );
}

export function CompositeSignalCard({ signal }: CompositeSignalCardProps) {
  const [expanded, setExpanded] = useState(false);
  const signalPercent = Math.round(((signal.score + 1) / 2) * 100);

  const actionConfig = {
    BUY: {
      gradient: "from-emerald-500 to-emerald-600",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      text: "text-emerald-500",
      label: "Buy Signal",
      icon: TrendingUp,
    },
    SELL: {
      gradient: "from-red-500 to-red-600",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      text: "text-red-500",
      label: "Sell Signal",
      icon: TrendingDown,
    },
    HOLD: {
      gradient: "from-amber-500 to-amber-600",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      text: "text-amber-500",
      label: "Hold Signal",
      icon: Minus,
    },
  };

  const config = actionConfig[signal.action];
  const ActionIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 15 }}
    >
      <Card className="overflow-hidden relative">
        {/* Top accent line */}
        <motion.div
          className={cn(
            "absolute top-0 left-0 h-1 w-full z-10",
            signal.action === "BUY" && "bg-emerald-500",
            signal.action === "SELL" && "bg-red-500",
            signal.action === "HOLD" && "bg-amber-500"
          )}
          initial={{ scaleX: 0, originX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
        />

        <CardContent className="p-0">
          {/* Hero Section - Main Signal Display */}
          <div className="relative p-6 pb-8">
            <div className="flex items-center justify-between">
              {/* Left side - Signal info */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={cn("text-xs uppercase tracking-wide", config.bg, config.text)}
                  >
                    {signal.strength}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(signal.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight">
                  {config.label}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Composite trading recommendation
                </p>
              </div>

              {/* Right side - Large action indicator */}
              <div className="flex items-center gap-4">
                {/* Score display */}
                <div className="text-right">
                  <div
                    className={cn(
                      "text-4xl font-bold font-mono tracking-tight",
                      config.text
                    )}
                  >
                    <AnimatedNumber value={signalPercent} />
                    <span className="text-2xl">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Signal Strength
                  </p>
                </div>

                {/* Action icon */}
                <div
                  className={cn(
                    "flex items-center justify-center w-16 h-16 rounded-2xl",
                    `bg-gradient-to-br ${config.gradient}`,
                    "shadow-lg"
                  )}
                >
                  <ActionIcon className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>

            {/* Gauge bar */}
            <div className="relative mt-6">
              <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${signalPercent}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className={cn(
                    "h-full rounded-full",
                    `bg-gradient-to-r ${config.gradient}`
                  )}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>Strong Sell</span>
                <span>Neutral</span>
                <span>Strong Buy</span>
              </div>
            </div>
          </div>

          {/* Factor Summary - Always visible */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">Contributing Factors</h3>
              <span className="text-xs text-muted-foreground">
                4 factors analyzed
              </span>
            </div>

            {/* Compact factor overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {signal.factors.map((factor) => {
                const isPositive = factor.score > 0.1;
                const isNegative = factor.score < -0.1;
                const Icon = getFactorIcon(factor.name);

                return (
                  <div
                    key={factor.name}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border",
                      isPositive && "bg-emerald-500/5 border-emerald-500/20",
                      isNegative && "bg-red-500/5 border-red-500/20",
                      !isPositive && !isNegative && "bg-muted/30 border-border/50"
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-md",
                        isPositive && "bg-emerald-500/10 text-emerald-500",
                        isNegative && "bg-red-500/10 text-red-500",
                        !isPositive && !isNegative && "bg-muted text-muted-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{factor.name}</p>
                      <p
                        className={cn(
                          "text-sm font-mono font-semibold",
                          isPositive && "text-emerald-500",
                          isNegative && "text-red-500",
                          !isPositive && !isNegative && "text-muted-foreground"
                        )}
                      >
                        {factor.score >= 0 ? "+" : ""}
                        {factor.score.toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Expand/Collapse Button */}
            <button
              onClick={() => setExpanded(!expanded)}
              className={cn(
                "flex items-center justify-center gap-2 w-full mt-4 py-2.5 rounded-lg",
                "text-sm font-medium transition-colors",
                "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Hide Details
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  View Factor Details
                </>
              )}
            </button>

            {/* Expanded Details */}
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 100, damping: 15 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 space-y-3">
                    {signal.factors.map((factor, index) => (
                      <FactorCard key={factor.name} factor={factor} index={index} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
