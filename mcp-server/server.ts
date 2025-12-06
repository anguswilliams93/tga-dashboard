import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Create the MCP server
const server = new McpServer({
  name: "liquidity-data-server",
  version: "1.0.0",
});

// TGA Fetch Tool - Treasury General Account data from FiscalData
server.tool(
  "tga_fetch",
  "Fetch Treasury General Account (TGA) closing balance data from FiscalData API",
  {
    days: z.number().default(180).describe("Number of days of historical data to fetch"),
  },
  async ({ days }) => {
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

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`FiscalData API error: ${response.status}`);
      }

      const json = await response.json();

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(json.data, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching TGA data: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// RRP Fetch Tool - Reverse Repo data from FRED
server.tool(
  "rrp_fetch",
  "Fetch Overnight Reverse Repurchase Agreements (RRP) data from FRED API",
  {
    days: z.number().default(180).describe("Number of days of historical data to fetch"),
  },
  async ({ days }) => {
    try {
      const apiKey = process.env.FRED_KEY;

      if (!apiKey) {
        throw new Error("FRED_KEY environment variable is not set");
      }

      const startDate = new Date(Date.now() - days * 86400000)
        .toISOString()
        .slice(0, 10);

      const url = new URL(
        "https://api.stlouisfed.org/fred/series/observations"
      );
      url.searchParams.set("series_id", "RRPONTSYD");
      url.searchParams.set("file_type", "json");
      url.searchParams.set("api_key", apiKey);
      url.searchParams.set("observation_start", startDate);
      url.searchParams.set("sort_order", "asc");

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`FRED API error: ${response.status}`);
      }

      const json = await response.json();

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(json.observations, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching RRP data: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// BTC Price Tool - Bitcoin price from CoinGecko
server.tool(
  "btc_fetch",
  "Fetch current Bitcoin price and market data from CoinGecko API",
  {},
  async () => {
    try {
      const url =
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true";

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const json = await response.json();

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(json, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching BTC data: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Stablecoin Market Cap Tool
server.tool(
  "stablecoin_fetch",
  "Fetch stablecoin (USDT, USDC) market cap data from CoinGecko API",
  {},
  async () => {
    try {
      const url =
        "https://api.coingecko.com/api/v3/simple/price?ids=tether,usd-coin&vs_currencies=usd&include_market_cap=true";

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const json = await response.json();

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(json, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching stablecoin data: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Net Liquidity Calculator Resource
server.tool(
  "net_liquidity",
  "Calculate net liquidity from TGA and RRP data. Formula: Fed Balance Sheet - TGA - RRP",
  {
    tgaBalance: z.number().describe("Current TGA balance in billions"),
    rrpBalance: z.number().describe("Current RRP balance in billions"),
    fedBalance: z.number().default(7000).describe("Fed balance sheet total in billions (default: 7000)"),
  },
  async ({ tgaBalance, rrpBalance, fedBalance }) => {
    const netLiquidity = fedBalance - tgaBalance - rrpBalance;

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              fedBalance,
              tgaBalance,
              rrpBalance,
              netLiquidity,
              formula: "Fed Balance Sheet - TGA - RRP",
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// News Article Interface
interface NewsArticle {
  title: string;
  link: string;
  source: string;
  pubDate: string;
}

// Helper function to parse Google News RSS
function parseGoogleNewsRSS(xml: string): NewsArticle[] {
  const articles: NewsArticle[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/;
  const linkRegex = /<link>(.*?)<\/link>/;
  const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/;
  const sourceRegex = /<source.*?>(.*?)<\/source>/;

  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];

    const titleMatch = item.match(titleRegex);
    const linkMatch = item.match(linkRegex);
    const pubDateMatch = item.match(pubDateRegex);
    const sourceMatch = item.match(sourceRegex);

    if (titleMatch && linkMatch) {
      articles.push({
        title: (titleMatch[1] || titleMatch[2] || "").trim(),
        link: linkMatch[1].trim(),
        source: sourceMatch ? sourceMatch[1].trim() : "Google News",
        pubDate: pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString(),
      });
    }
  }

  return articles;
}

// News Fetch Tool - Fetch latest news for liquidity-related topics
server.tool(
  "news_fetch",
  "Fetch latest 5 news articles for TGA liquidity, RRP, Bitcoin, and Stablecoin topics",
  {
    category: z
      .enum(["tga", "rrp", "btc", "stablecoin", "all"])
      .default("all")
      .describe("News category: tga, rrp, btc, stablecoin, or all"),
  },
  async ({ category }) => {
    try {
      const searchQueries: Record<string, string> = {
        tga: "Treasury General Account liquidity OR TGA balance OR Treasury cash balance",
        rrp: "Reverse repo OR RRP Federal Reserve OR overnight reverse repurchase",
        btc: "Bitcoin price OR BTC cryptocurrency OR Bitcoin market",
        stablecoin: "Stablecoin USDT OR USDC OR stablecoin market cap OR Tether",
      };

      const categoriesToFetch = category === "all"
        ? ["tga", "rrp", "btc", "stablecoin"]
        : [category];

      const results: Record<string, NewsArticle[]> = {};

      for (const cat of categoriesToFetch) {
        const query = encodeURIComponent(searchQueries[cat]);
        const url = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;

        try {
          const response = await fetch(url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; LiquidityDashboard/1.0)",
            },
          });

          if (!response.ok) {
            results[cat] = [];
            continue;
          }

          const xml = await response.text();
          const articles = parseGoogleNewsRSS(xml).slice(0, 5);
          results[cat] = articles;
        } catch {
          results[cat] = [];
        }
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching news: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Start the server with stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Liquidity Data MCP Server running on stdio");
}

main().catch(console.error);
