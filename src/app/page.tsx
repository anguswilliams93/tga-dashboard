import { Suspense } from "react";
import type { Metadata } from "next";
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
import { ThemeToggle } from "@/components/theme-toggle";

// SEO Metadata
export const metadata: Metadata = {
  title: "TGA Liquidity Dashboard | Bitcoin Trading Signals & Treasury Analysis",
  description: "Track Treasury General Account (TGA), Reverse Repo (RRP), and stablecoin flows to identify optimal Bitcoin entry and exit points. Real-time 4-factor composite signal strategy for crypto traders.",
  keywords: ["TGA", "Treasury General Account", "Bitcoin trading signals", "liquidity dashboard", "RRP", "Reverse Repo", "stablecoin", "crypto trading", "Fed liquidity", "market analysis"],
  openGraph: {
    title: "TGA Liquidity Dashboard | Bitcoin Trading Signals",
    description: "Real-time Treasury flows, Fed liquidity, and stablecoin analysis for optimal BTC trading decisions.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TGA Liquidity Dashboard",
    description: "Track Treasury & Fed liquidity to time your Bitcoin trades with our 4-factor signal strategy.",
  },
};

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
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-7xl">
        {/* Hero Header */}
        <header className="mb-8 sm:mb-10 relative">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Live Market Data
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text">
                Liquidity Signal Dashboard
              </h1>
              <p className="text-muted-foreground text-base sm:text-lg max-w-2xl leading-relaxed">
                Track <span className="text-orange-500 font-medium">Treasury flows</span>,{" "}
                <span className="text-blue-500 font-medium">Fed liquidity</span>, and{" "}
                <span className="text-emerald-500 font-medium">stablecoin supply</span> to identify
                optimal Bitcoin entry and exit points.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-3">
              <div className="flex flex-col items-end gap-1 text-right">
                <span className="text-xs text-muted-foreground">Powered by</span>
                <a
                  href="https://nativeschema.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium hover:text-primary transition-colors"
                >
                  NativeSchema
                </a>
              </div>
              <div className="h-8 w-px bg-border" />
              <ThemeToggle />
            </div>
            <div className="sm:hidden absolute top-4 right-4">
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main>
          <Suspense fallback={<DashboardSkeleton />}>
            <DashboardContent />
          </Suspense>
        </main>

        {/* Footer */}
        <footer className="mt-12 sm:mt-16 pt-8 border-t border-border/50">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              <p className="font-medium text-foreground/80">Data Sources:</p>
              <div className="flex flex-wrap justify-center gap-2">
                <span className="px-2 py-1 rounded-md bg-muted/50 text-xs">FiscalData Treasury</span>
                <span className="px-2 py-1 rounded-md bg-muted/50 text-xs">FRED (St. Louis Fed)</span>
                <span className="px-2 py-1 rounded-md bg-muted/50 text-xs">CoinGecko</span>
              </div>
            </div>
            <div className="text-center sm:text-right">
              <p className="text-xs opacity-70">
                Net Liquidity = Fed Balance Sheet − TGA − RRP
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
