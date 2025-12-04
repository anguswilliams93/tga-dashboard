// Treasury General Account (TGA) data types
export interface TgaRecord {
  record_date: string;
  open_today_bal: string;
}

export interface TgaResponse {
  data: TgaRecord[];
  meta: {
    count: number;
    labels: Record<string, string>;
  };
  links: {
    self: string;
    first: string;
    prev: string | null;
    next: string | null;
    last: string;
  };
}

// FRED Reverse Repo (RRP) data types
export interface RrpObservation {
  realtime_start: string;
  realtime_end: string;
  date: string;
  value: string;
}

export interface RrpResponse {
  realtime_start: string;
  realtime_end: string;
  observation_start: string;
  observation_end: string;
  units: string;
  output_type: number;
  file_type: string;
  order_by: string;
  sort_order: string;
  count: number;
  offset: number;
  limit: number;
  observations: RrpObservation[];
}

// CoinGecko Bitcoin price types
export interface BtcPriceResponse {
  bitcoin: {
    usd: number;
    usd_24h_change?: number;
    usd_24h_vol?: number;
    usd_market_cap?: number;
  };
}

// Stablecoin market cap types
export interface StablecoinResponse {
  tether: {
    usd: number;
    usd_market_cap: number;
  };
  "usd-coin": {
    usd: number;
    usd_market_cap: number;
  };
}

// Chart data types
export interface ChartDataPoint {
  date: string;
  value: number;
}

export interface LiquidityData {
  tga: ChartDataPoint[];
  rrp: ChartDataPoint[];
  btcPrice: number;
  btcChange24h: number;
  stablecoinMarketCap: number;
  netLiquidity: number;
  lastUpdated: string;
}

// Dashboard card types
export interface MetricCard {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  trend?: "up" | "down" | "neutral";
}
