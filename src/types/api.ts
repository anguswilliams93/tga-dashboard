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

// Multi-factor Signal Types
export type SignalStrength = "strong" | "moderate" | "weak";
export type SignalAction = "BUY" | "SELL" | "HOLD";

export interface FactorSignal {
  name: string;
  score: number; // -1 to +1
  weight: number;
  reason: string;
  condition: string;
}

export interface CompositeSignal {
  score: number; // -1 to +1
  action: SignalAction;
  strength: SignalStrength;
  factors: FactorSignal[];
  timestamp: string;
}

export interface SignalThresholds {
  strongBuy: number;   // > 0.6
  moderateBuy: number; // > 0.3
  hold: number;        // -0.3 to 0.3
  moderateSell: number; // < -0.3
  strongSell: number;  // < -0.6
}
