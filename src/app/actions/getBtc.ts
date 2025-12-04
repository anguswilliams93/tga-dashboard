"use server";

import { getBtcLatestQuote } from "@/lib/coinmarketcap";
import { fetchBtcPrice, fetchBtcHistoricalData } from "@/lib/api";
import type { BtcPriceResponse, ChartDataPoint } from "@/types";

// In-memory cache for quick access (will be replaced with DB)
let btcCache: {
  data: { price: number; change24h: number; marketCap: number } | null;
  timestamp: number;
} = { data: null, timestamp: 0 };

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getBtc(): Promise<BtcPriceResponse> {
  return fetchBtcPrice();
}

export async function getLatestBtc(): Promise<{
  price: number;
  change24h: number;
  marketCap: number;
} | null> {
  try {
    // Check cache first
    const now = Date.now();
    if (btcCache.data && now - btcCache.timestamp < CACHE_TTL) {
      return btcCache.data;
    }

    // Try CoinMarketCap API first
    const cmcData = await getBtcLatestQuote();

    if (cmcData) {
      const result = {
        price: cmcData.price,
        change24h: cmcData.percent_change_24h,
        marketCap: cmcData.market_cap,
      };

      // Update cache
      btcCache = { data: result, timestamp: now };
      return result;
    }

    // Fall back to CoinGecko if CMC fails
    const data = await fetchBtcPrice();
    const result = {
      price: data.bitcoin.usd,
      change24h: data.bitcoin.usd_24h_change ?? 0,
      marketCap: data.bitcoin.usd_market_cap ?? 0,
    };

    btcCache = { data: result, timestamp: now };
    return result;
  } catch (error) {
    console.error("Error fetching BTC data:", error);
    // Return cached data if available
    if (btcCache.data) {
      return btcCache.data;
    }
    return null;
  }
}

/**
 * Get BTC price history for charts using CoinGecko free API
 */
export async function getBtcChartData(days: number = 365): Promise<ChartDataPoint[]> {
  try {
    const historical = await fetchBtcHistoricalData(days);

    if (historical && historical.length > 0) {
      return historical.map((h) => ({
        date: h.date,
        value: h.price,
      }));
    }

    return [];
  } catch (error) {
    console.error("Error getting BTC chart data:", error);
    return [];
  }
}
