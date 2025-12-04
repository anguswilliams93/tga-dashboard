"use server";

import { getGlobalMetrics, getStablecoinQuotes } from "@/lib/coinmarketcap";
import { fetchStablecoinData, fetchStablecoinHistoricalData } from "@/lib/api";
import type { StablecoinResponse, ChartDataPoint } from "@/types";

// In-memory cache
let stableCache: {
  data: { total: number; usdt: number; usdc: number; change24h: number } | null;
  timestamp: number;
} = { data: null, timestamp: 0 };

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getStablecoins(): Promise<StablecoinResponse> {
  return fetchStablecoinData();
}

export async function getStablecoinMarketCap(): Promise<{
  total: number;
  usdt: number;
  usdc: number;
  change24h: number;
} | null> {
  try {
    const now = Date.now();

    // Check cache first
    if (stableCache.data && now - stableCache.timestamp < CACHE_TTL) {
      return stableCache.data;
    }

    // Try CMC Global Metrics for total stablecoin market cap
    const globalMetrics = await getGlobalMetrics();
    const stablecoinQuotes = await getStablecoinQuotes();

    if (globalMetrics && stablecoinQuotes) {
      const result = {
        total: globalMetrics.stablecoin_market_cap,
        usdt: stablecoinQuotes.usdt.market_cap,
        usdc: stablecoinQuotes.usdc.market_cap,
        change24h: globalMetrics.stablecoin_24h_change,
      };

      stableCache = { data: result, timestamp: now };
      return result;
    }

    // Fall back to CoinGecko if CMC fails
    const data = await fetchStablecoinData();
    const usdtMarketCap = data.tether?.usd_market_cap ?? 0;
    const usdcMarketCap = data["usd-coin"]?.usd_market_cap ?? 0;
    const total = usdtMarketCap + usdcMarketCap;

    const result = {
      total,
      usdt: usdtMarketCap,
      usdc: usdcMarketCap,
      change24h: 0, // CoinGecko doesn't provide this
    };

    stableCache = { data: result, timestamp: now };
    return result;
  } catch (error) {
    console.error("Error fetching stablecoin data:", error);
    if (stableCache.data) {
      return stableCache.data;
    }
    return null;
  }
}

/**
 * Get historical stablecoin market cap for charts using CoinGecko free API
 */
export async function getStablecoinChartData(days: number = 365): Promise<ChartDataPoint[]> {
  try {
    const historical = await fetchStablecoinHistoricalData(days);

    if (historical && historical.length > 0) {
      return historical.map((h) => ({
        date: h.date,
        value: h.marketCap / 1e9, // Convert to billions for chart
      }));
    }

    return [];
  } catch (error) {
    console.error("Error getting stablecoin chart data:", error);
    return [];
  }
}
