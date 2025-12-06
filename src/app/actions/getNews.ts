"use server";

export interface NewsArticle {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  category: string;
}

// Helper function to parse Google News RSS
function parseGoogleNewsRSS(xml: string, category: string): NewsArticle[] {
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
        category,
      });
    }
  }

  return articles;
}

export async function getNews(
  category: "tga" | "rrp" | "btc" | "stablecoin" | "all" = "all"
): Promise<Record<string, NewsArticle[]>> {
  const searchQueries: Record<string, string> = {
    tga: "Treasury General Account liquidity OR TGA balance OR Treasury cash balance",
    rrp: "Reverse repo OR RRP Federal Reserve OR overnight reverse repurchase",
    btc: "Bitcoin price OR BTC cryptocurrency OR Bitcoin market news",
    stablecoin: "Stablecoin USDT OR USDC OR stablecoin market cap OR Tether",
  };

  const categoriesToFetch =
    category === "all" ? ["tga", "rrp", "btc", "stablecoin"] : [category];

  const results: Record<string, NewsArticle[]> = {};

  for (const cat of categoriesToFetch) {
    const query = encodeURIComponent(searchQueries[cat]);
    const url = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; LiquidityDashboard/1.0)",
        },
        next: { revalidate: 1800 }, // Cache for 30 minutes
      });

      if (!response.ok) {
        results[cat] = [];
        continue;
      }

      const xml = await response.text();
      const articles = parseGoogleNewsRSS(xml, cat).slice(0, 5);
      results[cat] = articles;
    } catch {
      results[cat] = [];
    }
  }

  return results;
}
