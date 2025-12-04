"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  delay?: number;
  variant?: "default" | "orange" | "blue" | "green" | "purple";
  progress?: number;
}

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 30,
    scale: 0.9,
    filter: "blur(10px)"
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15,
      mass: 1
    }
  }
};

const iconVariants = {
  hidden: { scale: 0, rotate: -180 },
  visible: {
    scale: 1,
    rotate: 0,
    transition: {
      type: "spring" as const,
      stiffness: 200,
      damping: 15,
      delay: 0.2
    }
  }
};

const valueVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 20,
      delay: 0.1
    }
  }
};

const variantStyles = {
  default: {
    gradient: "from-primary/10 via-primary/5 to-transparent",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    accentColor: "bg-primary"
  },
  orange: {
    gradient: "from-orange-500/10 via-orange-500/5 to-transparent",
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-500",
    accentColor: "bg-orange-500"
  },
  blue: {
    gradient: "from-blue-500/10 via-blue-500/5 to-transparent",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
    accentColor: "bg-blue-500"
  },
  green: {
    gradient: "from-emerald-500/10 via-emerald-500/5 to-transparent",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    accentColor: "bg-emerald-500"
  },
  purple: {
    gradient: "from-purple-500/10 via-purple-500/5 to-transparent",
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-500",
    accentColor: "bg-purple-500"
  }
};

export function MetricCard({
  title,
  value,
  subtitle,
  change,
  changeLabel,
  icon,
  delay = 0,
  variant = "default",
  progress,
}: MetricCardProps) {
  const styles = variantStyles[variant];

  const getTrendIcon = () => {
    if (change === undefined || change === 0) {
      return <Minus className="h-3.5 w-3.5" />;
    }
    return change > 0 ? (
      <TrendingUp className="h-3.5 w-3.5" />
    ) : (
      <TrendingDown className="h-3.5 w-3.5" />
    );
  };

  const getTrendStyles = () => {
    if (change === undefined || change === 0) {
      return "bg-muted text-muted-foreground";
    }
    return change > 0
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      : "bg-red-500/10 text-red-600 dark:text-red-400";
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay }}
      whileHover={{
        scale: 1.02,
        y: -5,
        transition: { type: "spring", stiffness: 400, damping: 25 }
      }}
      whileTap={{ scale: 0.98 }}
    >
      <Card className={cn(
        "relative overflow-hidden border-0 shadow-lg",
        "bg-gradient-to-br from-card via-card to-card",
        "hover:shadow-xl transition-shadow duration-500"
      )}>
        {/* Gradient overlay */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-50",
          styles.gradient
        )} />

        {/* Animated accent line */}
        <motion.div
          className={cn("absolute top-0 left-0 h-1 w-full", styles.accentColor)}
          initial={{ scaleX: 0, originX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: delay + 0.3, duration: 0.6, ease: "easeOut" }}
        />

        {/* Sparkle effect */}
        <motion.div
          className="absolute top-3 right-3 opacity-20"
          animate={{
            rotate: [0, 180, 360],
            scale: [1, 1.2, 1]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          <Sparkles className={cn("h-4 w-4", styles.iconColor)} />
        </motion.div>

        <CardContent className="relative p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              {/* Title */}
              <motion.p
                className="text-sm font-medium text-muted-foreground tracking-wide uppercase"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: delay + 0.1 }}
              >
                {title}
              </motion.p>

              {/* Value */}
              <motion.div
                variants={valueVariants}
                initial="hidden"
                animate="visible"
                className="flex items-baseline gap-2"
              >
                <span className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                  {value}
                </span>
              </motion.div>

              {/* Subtitle */}
              {subtitle && (
                <motion.p
                  className="text-xs text-muted-foreground/80"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: delay + 0.2 }}
                >
                  {subtitle}
                </motion.p>
              )}

              {/* Progress bar */}
              {progress !== undefined && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "100%" }}
                  transition={{ delay: delay + 0.4, duration: 0.5 }}
                >
                  <Progress
                    value={progress}
                    className="h-1.5 bg-muted/50"
                  />
                </motion.div>
              )}

              {/* Change badge */}
              {change !== undefined && (
                <motion.div
                  className="flex items-center gap-2 pt-1"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: delay + 0.3 }}
                >
                  <Badge
                    variant="secondary"
                    className={cn(
                      "flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full",
                      getTrendStyles()
                    )}
                  >
                    {getTrendIcon()}
                    {Math.abs(change).toFixed(2)}%
                  </Badge>
                  {changeLabel && (
                    <span className="text-xs text-muted-foreground">
                      {changeLabel}
                    </span>
                  )}
                </motion.div>
              )}
            </div>

            {/* Icon */}
            {icon && (
              <motion.div
                variants={iconVariants}
                initial="hidden"
                animate="visible"
                className={cn(
                  "flex items-center justify-center w-12 h-12 rounded-2xl",
                  styles.iconBg
                )}
              >
                <div className={styles.iconColor}>
                  {icon}
                </div>
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
