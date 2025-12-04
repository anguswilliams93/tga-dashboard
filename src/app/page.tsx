import { Suspense } from "react";
import {
  getTgaChartData,
  getRrpChartData,
  getLatestTga,
  getLatestRrp,
  getLatestBtc,
  getStablecoinMarketCap,
  getBtcChartData,
  getStablecoinChartData,
} from "./actions";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { DashboardSkeleton } from "@/components/dashboard/Skeletons";

// Force dynamic rendering to fetch fresh data at request time
export const dynamic = "force-dynamic";

// Revalidate data every hour
export const revalidate = 3600;

async function DashboardContent() {
  // Fetch all data in parallel with error handling
  const results = await Promise.allSettled([
    getTgaChartData(365),
    getRrpChartData(365),
    getLatestTga(),
    getLatestRrp(),
    getLatestBtc(),
    getStablecoinMarketCap(),
    getBtcChartData(365),
    getStablecoinChartData(365),
  ]);

  const tgaData = results[0].status === "fulfilled" ? results[0].value : [];
  const rrpData = results[1].status === "fulfilled" ? results[1].value : [];
  const latestTga = results[2].status === "fulfilled" ? results[2].value : null;
  const latestRrp = results[3].status === "fulfilled" ? results[3].value : null;
  const btcData = results[4].status === "fulfilled" ? results[4].value : null;
  const stablecoinData = results[5].status === "fulfilled" ? results[5].value : null;
  const btcChartData = results[6].status === "fulfilled" ? results[6].value : [];
  const stablecoinChartData = results[7].status === "fulfilled" ? results[7].value : [];

  return (
    <DashboardClient
      tgaData={tgaData}
      rrpData={rrpData}
      latestTga={latestTga}
      latestRrp={latestRrp}
      btcData={btcData}
      stablecoinData={stablecoinData}
      btcChartData={btcChartData}
      stablecoinChartData={stablecoinChartData}
    />
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            TGA Liquidity Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Real-time Treasury General Account, Reverse Repo, and Crypto market
            liquidity tracking
          </p>
        </header>

        {/* Dashboard Content */}
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardContent />
        </Suspense>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>
            Data sources: FiscalData Treasury, FRED (St. Louis Fed), CoinGecko
          </p>
          <p className="mt-1">
            Formula: Net Liquidity = Fed Balance Sheet - TGA - RRP
          </p>
        </footer>
      </div>
    </div>
  );
}
