import type {
  CompositeSignal,
  FactorSignal,
  SignalAction,
  SignalStrength,
  ChartDataPoint,
} from "@/types";

// Signal thresholds
const THRESHOLDS = {
  strongBuy: 0.6,
  moderateBuy: 0.3,
  moderateSell: -0.3,
  strongSell: -0.6,
};

// Factor weights (should sum to 1.0)
const WEIGHTS = {
  tga: 0.35,
  rrp: 0.15, // Lower weight since RRP is near zero now
  stablecoin: 0.30,
  btcDivergence: 0.20,
};

/**
 * Calculate TGA signal based on weekly change
 * BUY when TGA falling (government spending), SELL when rising (draining)
 */
export function calculateTgaSignal(
  tgaData: ChartDataPoint[],
  latestTga: { balance: number; change: number } | null
): FactorSignal {
  if (!latestTga || tgaData.length < 7) {
    return {
      name: "TGA",
      score: 0,
      weight: WEIGHTS.tga,
      reason: "Insufficient data",
      condition: "N/A",
    };
  }

  // Get weekly change (last 7 data points)
  const recentData = tgaData.slice(-7);
  const weekAgo = recentData[0]?.value ?? 0;
  const current = recentData[recentData.length - 1]?.value ?? 0;
  const weeklyChangeBillions = current - weekAgo;
  const weeklyChangePercent = weekAgo > 0 ? (weeklyChangeBillions / weekAgo) * 100 : 0;

  // TGA falling = bullish (negative change = positive signal)
  // >$50B/week change = strong signal, scale from -1 to +1
  const normalizedChange = Math.max(-100, Math.min(100, weeklyChangeBillions));
  const score = -normalizedChange / 100; // Invert: falling TGA = positive score

  let condition = "";
  let reason = "";

  if (weeklyChangeBillions < -50) {
    condition = "Falling rapidly (>$50B/week)";
    reason = "Government spending injecting liquidity";
  } else if (weeklyChangeBillions < -20) {
    condition = "Falling moderately";
    reason = "Gradual liquidity injection";
  } else if (weeklyChangeBillions > 50) {
    condition = "Rising rapidly (>$50B/week)";
    reason = "Tax receipts/debt issuance draining liquidity";
  } else if (weeklyChangeBillions > 20) {
    condition = "Rising moderately";
    reason = "Gradual liquidity drain";
  } else {
    condition = "Stable";
    reason = "Minimal liquidity impact";
  }

  return {
    name: "TGA",
    score: Math.max(-1, Math.min(1, score)),
    weight: WEIGHTS.tga,
    reason,
    condition: `${condition} (${weeklyChangePercent >= 0 ? "+" : ""}${weeklyChangePercent.toFixed(1)}% weekly)`,
  };
}

/**
 * Calculate RRP signal
 * BUY when RRP falling (money leaving Fed), SELL when rising
 */
export function calculateRrpSignal(
  rrpData: ChartDataPoint[],
  latestRrp: { balance: number; change: number } | null
): FactorSignal {
  if (!latestRrp || rrpData.length < 7) {
    return {
      name: "RRP",
      score: 0,
      weight: WEIGHTS.rrp,
      reason: "Insufficient data",
      condition: "N/A",
    };
  }

  // RRP is very low now (~$2-5B), so less impactful
  const currentBalance = latestRrp.balance;
  const isNearZero = currentBalance < 50; // Less than $50B

  // Get weekly trend
  const recentData = rrpData.slice(-7);
  const weekAgo = recentData[0]?.value ?? 0;
  const current = recentData[recentData.length - 1]?.value ?? 0;
  const weeklyChange = current - weekAgo;

  // RRP falling = bullish (negative change = positive signal)
  let score = 0;
  if (!isNearZero) {
    const normalizedChange = Math.max(-50, Math.min(50, weeklyChange));
    score = -normalizedChange / 50;
  }

  let condition = "";
  let reason = "";

  if (isNearZero) {
    condition = `Near zero ($${currentBalance.toFixed(1)}B)`;
    reason = "RRP depleted, minimal further impact";
    score = 0.1; // Slight bullish bias - no more draining possible
  } else if (weeklyChange < -20) {
    condition = "Falling rapidly";
    reason = "Cash leaving Fed facility into risk assets";
  } else if (weeklyChange < 0) {
    condition = "Declining";
    reason = "Gradual shift to risk assets";
  } else if (weeklyChange > 20) {
    condition = "Rising sharply";
    reason = "Money parking at Fed (risk-off)";
  } else {
    condition = "Stable";
    reason = "No significant flow";
  }

  return {
    name: "RRP",
    score: Math.max(-1, Math.min(1, score)),
    weight: WEIGHTS.rrp,
    reason,
    condition,
  };
}

/**
 * Calculate Stablecoin signal
 * BUY when supply increasing (capital entering crypto)
 */
export function calculateStablecoinSignal(
  stablecoinData: ChartDataPoint[],
  latestStablecoin: { total: number; change24h: number } | null
): FactorSignal {
  if (!latestStablecoin || stablecoinData.length < 7) {
    return {
      name: "Stablecoins",
      score: 0,
      weight: WEIGHTS.stablecoin,
      reason: "Insufficient data",
      condition: "N/A",
    };
  }

  // Get weekly change
  const recentData = stablecoinData.slice(-7);
  const weekAgo = recentData[0]?.value ?? 0;
  const current = recentData[recentData.length - 1]?.value ?? 0;
  const weeklyChangePercent = weekAgo > 0 ? ((current - weekAgo) / weekAgo) * 100 : 0;

  // Stablecoin increasing = bullish
  // 2% weekly change = strong signal
  const score = Math.max(-1, Math.min(1, weeklyChangePercent / 2));

  let condition = "";
  let reason = "";

  if (weeklyChangePercent > 1) {
    condition = `Increasing (+${weeklyChangePercent.toFixed(2)}% weekly)`;
    reason = "Fresh capital entering crypto ecosystem";
  } else if (weeklyChangePercent > 0) {
    condition = `Slight increase (+${weeklyChangePercent.toFixed(2)}% weekly)`;
    reason = "Modest capital inflow";
  } else if (weeklyChangePercent < -1) {
    condition = `Decreasing (${weeklyChangePercent.toFixed(2)}% weekly)`;
    reason = "Capital leaving crypto for fiat";
  } else if (weeklyChangePercent < 0) {
    condition = `Slight decrease (${weeklyChangePercent.toFixed(2)}% weekly)`;
    reason = "Modest capital outflow";
  } else {
    condition = "Stable";
    reason = "Capital flow neutral";
  }

  return {
    name: "Stablecoins",
    score,
    weight: WEIGHTS.stablecoin,
    reason,
    condition,
  };
}

/**
 * Calculate BTC divergence signal
 * BUY when BTC down while liquidity expanding (opportunity)
 * SELL when BTC up while liquidity contracting (distribution)
 */
export function calculateBtcDivergenceSignal(
  btcData: { price: number; change24h: number } | null,
  btcChartData: ChartDataPoint[],
  liquidityTrend: number // positive = expanding, negative = contracting
): FactorSignal {
  if (!btcData || btcChartData.length < 7) {
    return {
      name: "BTC Divergence",
      score: 0,
      weight: WEIGHTS.btcDivergence,
      reason: "Insufficient data",
      condition: "N/A",
    };
  }

  // Get BTC weekly change
  const recentData = btcChartData.slice(-7);
  const weekAgo = recentData[0]?.value ?? 0;
  const current = recentData[recentData.length - 1]?.value ?? 0;
  const btcWeeklyChange = weekAgo > 0 ? ((current - weekAgo) / weekAgo) * 100 : 0;

  // Divergence: BTC direction vs liquidity direction
  // BTC down + liquidity up = BUY opportunity
  // BTC up + liquidity down = SELL signal
  let score = 0;
  let condition = "";
  let reason = "";

  const btcTrend = btcWeeklyChange > 2 ? "up" : btcWeeklyChange < -2 ? "down" : "flat";
  const liqTrend = liquidityTrend > 0.1 ? "expanding" : liquidityTrend < -0.1 ? "contracting" : "stable";

  if (btcTrend === "down" && liqTrend === "expanding") {
    score = 0.8;
    condition = "Bullish divergence";
    reason = "BTC down while liquidity expanding = buying opportunity";
  } else if (btcTrend === "up" && liqTrend === "contracting") {
    score = -0.8;
    condition = "Bearish divergence";
    reason = "BTC up while liquidity contracting = distribution phase";
  } else if (btcTrend === "flat" && liqTrend === "expanding") {
    score = 0.5;
    condition = "Dry powder building";
    reason = "BTC flat + liquidity expanding = breakout likely";
  } else if (btcTrend === "up" && liqTrend === "expanding") {
    score = 0.3;
    condition = "Aligned bullish";
    reason = "BTC and liquidity both rising = trend continuation";
  } else if (btcTrend === "down" && liqTrend === "contracting") {
    score = -0.3;
    condition = "Aligned bearish";
    reason = "BTC and liquidity both falling = trend continuation";
  } else {
    score = 0;
    condition = "No clear divergence";
    reason = "Mixed signals";
  }

  return {
    name: "BTC Divergence",
    score,
    weight: WEIGHTS.btcDivergence,
    reason,
    condition: `${condition} (BTC ${btcWeeklyChange >= 0 ? "+" : ""}${btcWeeklyChange.toFixed(1)}% weekly)`,
  };
}

/**
 * Calculate the overall liquidity trend from TGA and RRP signals
 */
export function calculateLiquidityTrend(
  tgaSignal: FactorSignal,
  rrpSignal: FactorSignal
): number {
  // Weighted average of TGA and RRP signals
  const tgaWeight = WEIGHTS.tga / (WEIGHTS.tga + WEIGHTS.rrp);
  const rrpWeight = WEIGHTS.rrp / (WEIGHTS.tga + WEIGHTS.rrp);
  return tgaSignal.score * tgaWeight + rrpSignal.score * rrpWeight;
}

/**
 * Determine signal action and strength from composite score
 */
export function getSignalAction(score: number): { action: SignalAction; strength: SignalStrength } {
  if (score > THRESHOLDS.strongBuy) {
    return { action: "BUY", strength: "strong" };
  } else if (score > THRESHOLDS.moderateBuy) {
    return { action: "BUY", strength: "moderate" };
  } else if (score < THRESHOLDS.strongSell) {
    return { action: "SELL", strength: "strong" };
  } else if (score < THRESHOLDS.moderateSell) {
    return { action: "SELL", strength: "moderate" };
  } else if (Math.abs(score) < 0.15) {
    return { action: "HOLD", strength: "weak" };
  } else {
    return { action: "HOLD", strength: "moderate" };
  }
}

/**
 * Calculate the composite multi-factor signal
 */
export function calculateCompositeSignal(
  tgaData: ChartDataPoint[],
  rrpData: ChartDataPoint[],
  btcChartData: ChartDataPoint[],
  stablecoinChartData: ChartDataPoint[],
  latestTga: { balance: number; change: number } | null,
  latestRrp: { balance: number; change: number } | null,
  btcData: { price: number; change24h: number; marketCap: number } | null,
  stablecoinData: { total: number; usdt: number; usdc: number; change24h: number } | null
): CompositeSignal {
  // Calculate individual factor signals
  const tgaSignal = calculateTgaSignal(tgaData, latestTga);
  const rrpSignal = calculateRrpSignal(rrpData, latestRrp);
  const stablecoinSignal = calculateStablecoinSignal(stablecoinChartData, stablecoinData);

  // Calculate liquidity trend for BTC divergence
  const liquidityTrend = calculateLiquidityTrend(tgaSignal, rrpSignal);
  const btcDivergenceSignal = calculateBtcDivergenceSignal(btcData, btcChartData, liquidityTrend);

  // Calculate weighted composite score
  const factors = [tgaSignal, rrpSignal, stablecoinSignal, btcDivergenceSignal];
  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  const compositeScore = factors.reduce((sum, f) => sum + f.score * f.weight, 0) / totalWeight;

  const { action, strength } = getSignalAction(compositeScore);

  return {
    score: compositeScore,
    action,
    strength,
    factors,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Historical multi-factor signal for backtesting
 */
export interface HistoricalSignal {
  date: string;
  score: number;
  action: SignalAction;
  strength: SignalStrength;
  factors: {
    tga: number;
    rrp: number;
    stablecoin: number;
    btcDivergence: number;
  };
  btcPriceAtSignal: number;
  btcPriceAfter14Days: number | null;
  btcPriceNow: number;
  return14Days: number | null;
  returnToNow: number;
}

/**
 * Calculate a single point-in-time multi-factor signal for backtesting
 */
function calculatePointInTimeSignal(
  tgaData: ChartDataPoint[],
  rrpData: ChartDataPoint[],
  btcData: ChartDataPoint[],
  stablecoinData: ChartDataPoint[],
  endIndex: number, // Calculate signal using data up to this index
  lookbackDays: number = 7
): { score: number; factors: { tga: number; rrp: number; stablecoin: number; btcDivergence: number } } | null {
  // Need at least lookbackDays of data
  if (endIndex < lookbackDays) return null;

  // Helper to get data slice for a dataset by matching dates
  const getSliceByDate = (data: ChartDataPoint[], targetDate: string, days: number): ChartDataPoint[] => {
    const targetTime = new Date(targetDate).getTime();
    const cutoffTime = targetTime - days * 24 * 60 * 60 * 1000;
    return data.filter(d => {
      const time = new Date(d.date).getTime();
      return time >= cutoffTime && time <= targetTime;
    });
  };

  const currentDate = tgaData[endIndex].date;

  // Get slices for each dataset
  const tgaSlice = getSliceByDate(tgaData, currentDate, lookbackDays);
  const rrpSlice = getSliceByDate(rrpData, currentDate, lookbackDays);
  const btcSlice = getSliceByDate(btcData, currentDate, lookbackDays);
  const stableSlice = getSliceByDate(stablecoinData, currentDate, lookbackDays);

  if (tgaSlice.length < 2) return null;

  // Calculate TGA signal
  const tgaStart = tgaSlice[0]?.value ?? 0;
  const tgaEnd = tgaSlice[tgaSlice.length - 1]?.value ?? 0;
  const tgaChange = tgaStart > 0 ? (tgaEnd - tgaStart) / tgaStart : 0;
  const tgaScore = Math.max(-1, Math.min(1, -tgaChange * 20)); // Invert: falling TGA = positive

  // Calculate RRP signal
  let rrpScore = 0;
  if (rrpSlice.length >= 2) {
    const rrpStart = rrpSlice[0]?.value ?? 0;
    const rrpEnd = rrpSlice[rrpSlice.length - 1]?.value ?? 0;
    const rrpChange = rrpStart > 0 ? (rrpEnd - rrpStart) / rrpStart : 0;
    // If RRP is very low, give slight bullish bias
    if (rrpEnd < 50) {
      rrpScore = 0.1;
    } else {
      rrpScore = Math.max(-1, Math.min(1, -rrpChange * 10));
    }
  }

  // Calculate Stablecoin signal
  let stableScore = 0;
  if (stableSlice.length >= 2) {
    const stableStart = stableSlice[0]?.value ?? 0;
    const stableEnd = stableSlice[stableSlice.length - 1]?.value ?? 0;
    const stableChange = stableStart > 0 ? ((stableEnd - stableStart) / stableStart) * 100 : 0;
    stableScore = Math.max(-1, Math.min(1, stableChange / 2));
  }

  // Calculate BTC divergence signal
  let btcDivergenceScore = 0;
  if (btcSlice.length >= 2) {
    const btcStart = btcSlice[0]?.value ?? 0;
    const btcEnd = btcSlice[btcSlice.length - 1]?.value ?? 0;
    const btcChange = btcStart > 0 ? ((btcEnd - btcStart) / btcStart) * 100 : 0;

    // Liquidity trend from TGA and RRP
    const liquidityTrend = tgaScore * (WEIGHTS.tga / (WEIGHTS.tga + WEIGHTS.rrp)) +
                          rrpScore * (WEIGHTS.rrp / (WEIGHTS.tga + WEIGHTS.rrp));

    const btcTrend = btcChange > 2 ? "up" : btcChange < -2 ? "down" : "flat";
    const liqTrend = liquidityTrend > 0.1 ? "expanding" : liquidityTrend < -0.1 ? "contracting" : "stable";

    if (btcTrend === "down" && liqTrend === "expanding") {
      btcDivergenceScore = 0.8;
    } else if (btcTrend === "up" && liqTrend === "contracting") {
      btcDivergenceScore = -0.8;
    } else if (btcTrend === "flat" && liqTrend === "expanding") {
      btcDivergenceScore = 0.5;
    } else if (btcTrend === "up" && liqTrend === "expanding") {
      btcDivergenceScore = 0.3;
    } else if (btcTrend === "down" && liqTrend === "contracting") {
      btcDivergenceScore = -0.3;
    }
  }

  // Calculate weighted composite score
  const compositeScore = (
    tgaScore * WEIGHTS.tga +
    rrpScore * WEIGHTS.rrp +
    stableScore * WEIGHTS.stablecoin +
    btcDivergenceScore * WEIGHTS.btcDivergence
  );

  return {
    score: compositeScore,
    factors: {
      tga: tgaScore,
      rrp: rrpScore,
      stablecoin: stableScore,
      btcDivergence: btcDivergenceScore,
    },
  };
}

/**
 * Calculate historical multi-factor signals for backtesting
 * Returns signals only when the composite score crosses the buy/sell thresholds
 */
export function calculateHistoricalSignals(
  tgaData: ChartDataPoint[],
  rrpData: ChartDataPoint[],
  btcData: ChartDataPoint[],
  stablecoinData: ChartDataPoint[],
  minDaysBetweenSignals: number = 14
): HistoricalSignal[] {
  if (tgaData.length < 14 || btcData.length < 14) return [];

  const signals: HistoricalSignal[] = [];
  const latestBtcPrice = btcData[btcData.length - 1]?.value ?? 0;

  // Create BTC price lookup map
  const btcPriceMap = new Map(btcData.map(d => [d.date, d.value]));

  // Helper to find closest BTC price within 3 days
  const findBtcPrice = (dateStr: string): number | null => {
    if (btcPriceMap.has(dateStr)) return btcPriceMap.get(dateStr)!;
    const targetTime = new Date(dateStr).getTime();
    for (const [date, value] of btcPriceMap) {
      if (Math.abs(new Date(date).getTime() - targetTime) < 3 * 24 * 60 * 60 * 1000) {
        return value;
      }
    }
    return null;
  };

  let lastSignalDate: Date | null = null;
  let lastSignalType: SignalAction | null = null;

  // Scan through TGA data (primary timeline)
  for (let i = 14; i < tgaData.length; i++) {
    const currentDate = tgaData[i].date;
    const signalDate = new Date(currentDate);

    // Check minimum days between signals
    if (lastSignalDate && (signalDate.getTime() - lastSignalDate.getTime()) < minDaysBetweenSignals * 24 * 60 * 60 * 1000) {
      continue;
    }

    // Calculate point-in-time signal
    const signal = calculatePointInTimeSignal(tgaData, rrpData, btcData, stablecoinData, i);
    if (!signal) continue;

    const { action, strength } = getSignalAction(signal.score);

    // Only record BUY or SELL signals (not HOLD), and avoid consecutive same-type signals
    if (action === "HOLD") continue;
    if (action === lastSignalType) continue;

    // Get BTC prices for backtesting
    const btcPriceAtSignal = findBtcPrice(currentDate);
    if (!btcPriceAtSignal) continue;

    // Find BTC price 14 days later for backtest
    const futureIndex = Math.min(i + 14, tgaData.length - 1);
    const futureDate = tgaData[futureIndex]?.date;
    const btcPriceAfter14Days = futureDate ? findBtcPrice(futureDate) : null;

    const return14Days = btcPriceAfter14Days
      ? ((btcPriceAfter14Days - btcPriceAtSignal) / btcPriceAtSignal) * 100
      : null;
    const returnToNow = ((latestBtcPrice - btcPriceAtSignal) / btcPriceAtSignal) * 100;

    signals.push({
      date: currentDate,
      score: signal.score,
      action,
      strength,
      factors: signal.factors,
      btcPriceAtSignal,
      btcPriceAfter14Days,
      btcPriceNow: latestBtcPrice,
      return14Days,
      returnToNow,
    });

    lastSignalDate = signalDate;
    lastSignalType = action;
  }

  return signals;
}

/**
 * Calculate backtest performance metrics
 */
export interface BacktestMetrics {
  totalSignals: number;
  buySignals: number;
  sellSignals: number;
  avgReturn14Days: number;
  winRate14Days: number;
  avgReturnToNow: number;
  bestSignal: HistoricalSignal | null;
  worstSignal: HistoricalSignal | null;
}

export function calculateBacktestMetrics(signals: HistoricalSignal[]): BacktestMetrics {
  if (signals.length === 0) {
    return {
      totalSignals: 0,
      buySignals: 0,
      sellSignals: 0,
      avgReturn14Days: 0,
      winRate14Days: 0,
      avgReturnToNow: 0,
      bestSignal: null,
      worstSignal: null,
    };
  }

  const buySignals = signals.filter(s => s.action === "BUY");
  const sellSignals = signals.filter(s => s.action === "SELL");

  // For buy signals: positive return is a win
  // For sell signals: negative return (avoided loss) is a win
  const signalsWithReturn = signals.filter(s => s.return14Days !== null);

  let wins = 0;
  let totalReturn14Days = 0;
  let totalReturnToNow = 0;

  for (const signal of signalsWithReturn) {
    const effectiveReturn = signal.action === "BUY" ? signal.return14Days! : -signal.return14Days!;
    totalReturn14Days += effectiveReturn;
    if (effectiveReturn > 0) wins++;
  }

  for (const signal of signals) {
    const effectiveReturn = signal.action === "BUY" ? signal.returnToNow : -signal.returnToNow;
    totalReturnToNow += effectiveReturn;
  }

  // Find best and worst signals based on effective return
  let bestSignal: HistoricalSignal | null = null;
  let worstSignal: HistoricalSignal | null = null;
  let bestReturn = -Infinity;
  let worstReturn = Infinity;

  for (const signal of signals) {
    const effectiveReturn = signal.action === "BUY" ? signal.returnToNow : -signal.returnToNow;
    if (effectiveReturn > bestReturn) {
      bestReturn = effectiveReturn;
      bestSignal = signal;
    }
    if (effectiveReturn < worstReturn) {
      worstReturn = effectiveReturn;
      worstSignal = signal;
    }
  }

  return {
    totalSignals: signals.length,
    buySignals: buySignals.length,
    sellSignals: sellSignals.length,
    avgReturn14Days: signalsWithReturn.length > 0 ? totalReturn14Days / signalsWithReturn.length : 0,
    winRate14Days: signalsWithReturn.length > 0 ? (wins / signalsWithReturn.length) * 100 : 0,
    avgReturnToNow: signals.length > 0 ? totalReturnToNow / signals.length : 0,
    bestSignal,
    worstSignal,
  };
}
