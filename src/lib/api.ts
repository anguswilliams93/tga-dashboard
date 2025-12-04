import type { TgaRecord, RrpObservation, BtcPriceResponse, StablecoinResponse } from "@/types";

/**
 * Fetch TGA (Treasury General Account) data directly from FiscalData API
 * Uses the Operating Cash Balance endpoint from Daily Treasury Statement
 */
export async function fetchTgaData(days: number = 180): Promise<TgaRecord[]> {
  try {
    const startDate = new Date(Date.now() - days * 86400000)
      .toISOString()
      .slice(0, 10);

    // Use the correct endpoint: operating_cash_balance
    const url = new URL(
      "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/dts/operating_cash_balance"
    );

    url.searchParams.set(
      "filter",
      `record_date:gte:${startDate},account_type:eq:Treasury General Account (TGA) Closing Balance`
    );
    url.searchParams.set("fields", "record_date,open_today_bal");
    url.searchParams.set("sort", "record_date");
    url.searchParams.set("page[size]", "5000");

    const response = await fetch(url.toString(), {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      console.error(`FiscalData API error: ${response.status}`);
      return [];
    }

    const json = await response.json();
    return json.data || [];
  } catch (error) {
    console.error("Error fetching TGA data:", error);
    return [];
  }
}

/**
 * Fetch RRP (Reverse Repo) data from FRED API
 */
export async function fetchRrpData(days: number = 180): Promise<RrpObservation[]> {
  try {
    const apiKey = process.env.FRED_KEY;

    if (!apiKey) {
      console.warn("FRED_KEY not set, returning empty RRP data");
      return [];
    }

    const startDate = new Date(Date.now() - days * 86400000)
      .toISOString()
      .slice(0, 10);

    const url = new URL("https://api.stlouisfed.org/fred/series/observations");
    url.searchParams.set("series_id", "RRPONTSYD");
    url.searchParams.set("file_type", "json");
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("observation_start", startDate);
    url.searchParams.set("sort_order", "asc");

    const response = await fetch(url.toString(), {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error(`FRED API error: ${response.status}`);
      return [];
    }

    const json = await response.json();
    return json.observations || [];
  } catch (error) {
    console.error("Error fetching RRP data:", error);
    return [];
  }
}

/**
 * Fetch Bitcoin price from CoinGecko
 */
export async function fetchBtcPrice(): Promise<BtcPriceResponse> {
  try {
    const url =
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true";

    const response = await fetch(url, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(10000),
    }); // 5 min cache

    if (!response.ok) {
      console.error(`CoinGecko API error: ${response.status}`);
      return { bitcoin: { usd: 0 } };
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching BTC price:", error);
    return { bitcoin: { usd: 0 } };
  }
}

/**
 * Fetch stablecoin market cap data from CoinGecko
 */
export async function fetchStablecoinData(): Promise<StablecoinResponse> {
  try {
    const url =
      "https://api.coingecko.com/api/v3/simple/price?ids=tether,usd-coin&vs_currencies=usd&include_market_cap=true";

    const response = await fetch(url, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(10000),
    }); // 5 min cache

    if (!response.ok) {
      console.error(`CoinGecko API error: ${response.status}`);
      return {
        tether: { usd: 0, usd_market_cap: 0 },
        "usd-coin": { usd: 0, usd_market_cap: 0 }
      };
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching stablecoin data:", error);
    return {
      tether: { usd: 0, usd_market_cap: 0 },
      "usd-coin": { usd: 0, usd_market_cap: 0 }
    };
  }
}

/**
 * Fetch Bitcoin historical price data from CoinGecko
 * Free API provides: 1 day = 5-min data, 2-90 days = hourly, 90+ days = daily
 */
export async function fetchBtcHistoricalData(days: number = 365): Promise<Array<{ date: string; price: number }>> {
  try {
    const url = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}&interval=daily`;

    const response = await fetch(url, {
      next: { revalidate: 3600 }, // 1 hour cache
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.error(`CoinGecko Historical API error: ${response.status}`);
      return [];
    }

    const data = await response.json();

    if (!data.prices || !Array.isArray(data.prices)) {
      return [];
    }

    // Use a Map to deduplicate by date (keeps the last value for each date)
    const priceMap = new Map<string, number>();

    for (const item of data.prices as [number, number][]) {
      const date = new Date(item[0]).toISOString().slice(0, 10);
      priceMap.set(date, item[1]);
    }

    // Convert to array and sort by date
    return Array.from(priceMap.entries())
      .map(([date, price]) => ({ date, price }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error("Error fetching BTC historical data:", error);
    return [];
  }
}

/**
 * Fetch stablecoin (USDT + USDC) historical market cap data from CoinGecko
 */
export async function fetchStablecoinHistoricalData(days: number = 365): Promise<Array<{ date: string; marketCap: number }>> {
  try {
    // Fetch both USDT and USDC market cap history
    const [usdtRes, usdcRes] = await Promise.all([
      fetch(`https://api.coingecko.com/api/v3/coins/tether/market_chart?vs_currency=usd&days=${days}&interval=daily`, {
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(15000),
      }),
      fetch(`https://api.coingecko.com/api/v3/coins/usd-coin/market_chart?vs_currency=usd&days=${days}&interval=daily`, {
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(15000),
      }),
    ]);

    if (!usdtRes.ok || !usdcRes.ok) {
      console.error(`CoinGecko Stablecoin Historical API error`);
      return [];
    }

    const [usdtData, usdcData] = await Promise.all([usdtRes.json(), usdcRes.json()]);

    if (!usdtData.market_caps || !usdcData.market_caps) {
      return [];
    }

    // First, deduplicate each stablecoin's data (keep last value per date)
    const usdtMap = new Map<string, number>();
    for (const [timestamp, marketCap] of usdtData.market_caps as [number, number][]) {
      const date = new Date(timestamp).toISOString().slice(0, 10);
      usdtMap.set(date, marketCap); // Overwrites duplicates, keeping last value
    }

    const usdcMap = new Map<string, number>();
    for (const [timestamp, marketCap] of usdcData.market_caps as [number, number][]) {
      const date = new Date(timestamp).toISOString().slice(0, 10);
      usdcMap.set(date, marketCap); // Overwrites duplicates, keeping last value
    }

    // Now combine USDT + USDC for each date
    const allDates = new Set([...usdtMap.keys(), ...usdcMap.keys()]);
    const result: Array<{ date: string; marketCap: number }> = [];

    for (const date of allDates) {
      const usdtMcap = usdtMap.get(date) || 0;
      const usdcMcap = usdcMap.get(date) || 0;
      result.push({ date, marketCap: usdtMcap + usdcMcap });
    }

    // Sort by date
    return result.sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error("Error fetching stablecoin historical data:", error);
    return [];
  }
}

/**
 * Calculate net liquidity
 * Formula: Fed Balance Sheet - TGA - RRP
 */
export function calculateNetLiquidity(
  fedBalance: number,
  tgaBalance: number,
  rrpBalance: number
): number {
  return fedBalance - tgaBalance - rrpBalance;
}

/**
 * Format number as currency in billions
 */
export function formatBillions(value: number): string {
  const billions = value / 1_000_000_000;
  return `$${billions.toFixed(2)}B`;
}

/**
 * Format number as currency
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Calculate percentage change
 */
export function calculateChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}
