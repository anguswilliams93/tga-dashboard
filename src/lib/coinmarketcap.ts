/**
 * CoinMarketCap API client
 * Handles BTC price and stablecoin market cap data
 */

const CMC_BASE_URL = "https://pro-api.coinmarketcap.com";

interface CMCQuoteResponse {
  data: {
    [id: string]: {
      id: number;
      name: string;
      symbol: string;
      quote: {
        USD: {
          price: number;
          volume_24h: number;
          percent_change_24h: number;
          market_cap: number;
          last_updated: string;
        };
      };
    };
  };
  status: {
    timestamp: string;
    error_code: number;
    error_message: string | null;
  };
}

interface CMCGlobalMetricsResponse {
  data: {
    stablecoin_market_cap: number;
    stablecoin_volume_24h: number;
    stablecoin_24h_percentage_change: number;
    quote: {
      USD: {
        total_market_cap: number;
        stablecoin_market_cap: number;
        stablecoin_volume_24h: number;
        stablecoin_24h_percentage_change: number;
      };
    };
  };
  status: {
    timestamp: string;
    error_code: number;
    error_message: string | null;
  };
}

interface CMCHistoricalQuoteResponse {
  data: {
    id: number;
    name: string;
    symbol: string;
    quotes: Array<{
      timestamp: string;
      quote: {
        USD: {
          price: number;
          volume_24h: number;
          market_cap: number;
          timestamp: string;
        };
      };
    }>;
  };
  status: {
    timestamp: string;
    error_code: number;
    error_message: string | null;
  };
}

function getApiKey(): string {
  const apiKey = process.env.COINMARKETCAP_API_KEY;
  if (!apiKey) {
    throw new Error("COINMARKETCAP_API_KEY is not set");
  }
  return apiKey;
}

/**
 * Get latest BTC price and market data
 * CMC IDs: 1 = Bitcoin, 825 = USDT, 3408 = USDC
 */
export async function getBtcLatestQuote(): Promise<{
  price: number;
  market_cap: number;
  volume_24h: number;
  percent_change_24h: number;
  timestamp: string;
} | null> {
  try {
    const url = new URL(`${CMC_BASE_URL}/v2/cryptocurrency/quotes/latest`);
    url.searchParams.set("id", "1"); // Bitcoin

    const response = await fetch(url.toString(), {
      headers: {
        "X-CMC_PRO_API_KEY": getApiKey(),
        Accept: "application/json",
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      console.error(`CMC API error: ${response.status}`);
      return null;
    }

    const data: CMCQuoteResponse = await response.json();

    if (data.status.error_code !== 0) {
      console.error(`CMC API error: ${data.status.error_message}`);
      return null;
    }

    const btc = data.data["1"];
    return {
      price: btc.quote.USD.price,
      market_cap: btc.quote.USD.market_cap,
      volume_24h: btc.quote.USD.volume_24h,
      percent_change_24h: btc.quote.USD.percent_change_24h,
      timestamp: btc.quote.USD.last_updated,
    };
  } catch (error) {
    console.error("Error fetching BTC quote from CMC:", error);
    return null;
  }
}

/**
 * Get latest stablecoin quotes (USDT and USDC)
 */
export async function getStablecoinQuotes(): Promise<{
  usdt: { price: number; market_cap: number };
  usdc: { price: number; market_cap: number };
  timestamp: string;
} | null> {
  try {
    const url = new URL(`${CMC_BASE_URL}/v2/cryptocurrency/quotes/latest`);
    url.searchParams.set("id", "825,3408"); // USDT, USDC

    const response = await fetch(url.toString(), {
      headers: {
        "X-CMC_PRO_API_KEY": getApiKey(),
        Accept: "application/json",
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      console.error(`CMC API error: ${response.status}`);
      return null;
    }

    const data: CMCQuoteResponse = await response.json();

    if (data.status.error_code !== 0) {
      console.error(`CMC API error: ${data.status.error_message}`);
      return null;
    }

    return {
      usdt: {
        price: data.data["825"].quote.USD.price,
        market_cap: data.data["825"].quote.USD.market_cap,
      },
      usdc: {
        price: data.data["3408"].quote.USD.price,
        market_cap: data.data["3408"].quote.USD.market_cap,
      },
      timestamp: data.status.timestamp,
    };
  } catch (error) {
    console.error("Error fetching stablecoin quotes from CMC:", error);
    return null;
  }
}

/**
 * Get global metrics including stablecoin market cap
 */
export async function getGlobalMetrics(): Promise<{
  total_market_cap: number;
  stablecoin_market_cap: number;
  stablecoin_24h_change: number;
  timestamp: string;
} | null> {
  try {
    const url = new URL(`${CMC_BASE_URL}/v1/global-metrics/quotes/latest`);

    const response = await fetch(url.toString(), {
      headers: {
        "X-CMC_PRO_API_KEY": getApiKey(),
        Accept: "application/json",
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      console.error(`CMC Global Metrics API error: ${response.status}`);
      return null;
    }

    const data: CMCGlobalMetricsResponse = await response.json();

    if (data.status.error_code !== 0) {
      console.error(`CMC API error: ${data.status.error_message}`);
      return null;
    }

    return {
      total_market_cap: data.data.quote.USD.total_market_cap,
      stablecoin_market_cap: data.data.stablecoin_market_cap,
      stablecoin_24h_change: data.data.stablecoin_24h_percentage_change,
      timestamp: data.status.timestamp,
    };
  } catch (error) {
    console.error("Error fetching global metrics from CMC:", error);
    return null;
  }
}

/**
 * Get historical BTC quotes (requires Hobbyist plan or higher)
 * @param days Number of days of history to fetch
 */
export async function getBtcHistoricalQuotes(days: number = 60): Promise<Array<{
  date: string;
  price: number;
  market_cap: number;
  volume_24h: number;
}> | null> {
  try {
    const timeEnd = new Date();
    const timeStart = new Date(Date.now() - days * 86400000);

    const url = new URL(`${CMC_BASE_URL}/v2/cryptocurrency/quotes/historical`);
    url.searchParams.set("id", "1"); // Bitcoin
    url.searchParams.set("time_start", timeStart.toISOString());
    url.searchParams.set("time_end", timeEnd.toISOString());
    url.searchParams.set("interval", "daily");
    url.searchParams.set("count", days.toString());

    const response = await fetch(url.toString(), {
      headers: {
        "X-CMC_PRO_API_KEY": getApiKey(),
        Accept: "application/json",
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`CMC Historical API error: ${response.status}`, errorText);
      // This endpoint requires paid plan - return null gracefully
      return null;
    }

    const data: CMCHistoricalQuoteResponse = await response.json();

    if (data.status.error_code !== 0) {
      console.error(`CMC API error: ${data.status.error_message}`);
      return null;
    }

    return data.data.quotes.map((q) => ({
      date: q.timestamp.split("T")[0],
      price: q.quote.USD.price,
      market_cap: q.quote.USD.market_cap,
      volume_24h: q.quote.USD.volume_24h,
    }));
  } catch (error) {
    console.error("Error fetching BTC historical quotes from CMC:", error);
    return null;
  }
}

/**
 * Get historical global metrics (requires Hobbyist plan or higher)
 */
export async function getGlobalMetricsHistorical(days: number = 60): Promise<Array<{
  date: string;
  total_market_cap: number;
  stablecoin_market_cap: number;
}> | null> {
  try {
    const timeEnd = new Date();
    const timeStart = new Date(Date.now() - days * 86400000);

    const url = new URL(`${CMC_BASE_URL}/v1/global-metrics/quotes/historical`);
    url.searchParams.set("time_start", timeStart.toISOString());
    url.searchParams.set("time_end", timeEnd.toISOString());
    url.searchParams.set("interval", "daily");
    url.searchParams.set("count", days.toString());

    const response = await fetch(url.toString(), {
      headers: {
        "X-CMC_PRO_API_KEY": getApiKey(),
        Accept: "application/json",
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      console.error(`CMC Historical Global Metrics API error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.status.error_code !== 0) {
      console.error(`CMC API error: ${data.status.error_message}`);
      return null;
    }

    return data.data.quotes.map((q: { timestamp: string; quote: { USD: { total_market_cap: number; stablecoin_market_cap?: number } } }) => ({
      date: q.timestamp.split("T")[0],
      total_market_cap: q.quote.USD.total_market_cap,
      stablecoin_market_cap: q.quote.USD.stablecoin_market_cap ?? 0,
    }));
  } catch (error) {
    console.error("Error fetching historical global metrics from CMC:", error);
    return null;
  }
}
