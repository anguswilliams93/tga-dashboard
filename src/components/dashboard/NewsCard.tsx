"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { Newspaper, ExternalLink, Clock, DollarSign, TrendingUp, Bitcoin, Coins } from "lucide-react";
import { useState, useEffect } from "react";
import { getNews, type NewsArticle } from "@/app/actions/getNews";
import { cn } from "@/lib/utils";

interface NewsCardProps {
  delay?: number;
}

// Typewriter animation variants
const typewriterContainerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.02,
      delayChildren: 0.1,
    },
  },
};

const typewriterCharVariants = {
  hidden: { opacity: 0, y: 2 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "tween" as const,
      duration: 0.05,
    },
  },
};

// Typewriter text component
function TypewriterText({ text, className }: { text: string; className?: string }) {
  return (
    <motion.span
      variants={typewriterContainerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {text.split("").map((char, index) => (
        <motion.span key={index} variants={typewriterCharVariants} style={{ display: "inline-block" }}>
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </motion.span>
  );
}

const categoryConfig = {
  tga: {
    label: "TGA Liquidity",
    icon: DollarSign,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/20",
  },
  rrp: {
    label: "RRP / Fed",
    icon: TrendingUp,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  btc: {
    label: "Bitcoin",
    icon: Bitcoin,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
  },
  stablecoin: {
    label: "Stablecoins",
    icon: Coins,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.05,
      type: "spring" as const,
      stiffness: 100,
      damping: 15,
    },
  }),
};

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "Recently";
  }
}

function NewsItem({ article, index, category }: { article: NewsArticle; index: number; category: string }) {
  const config = categoryConfig[category as keyof typeof categoryConfig];

  return (
    <motion.a
      href={article.link}
      target="_blank"
      rel="noopener noreferrer"
      variants={itemVariants}
      custom={index}
      initial="hidden"
      animate="visible"
      className={cn(
        "group flex items-start gap-3 p-3 rounded-lg border transition-all duration-200",
        "hover:bg-muted/50 hover:border-primary/20 hover:shadow-sm",
        config.borderColor
      )}
    >
      <div className={cn("p-2 rounded-md shrink-0", config.bgColor)}>
        <config.icon className={cn("h-4 w-4", config.color)} />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <h4 className="text-sm font-medium leading-tight line-clamp-2 group-hover:text-primary transition-colors">
          <TypewriterText text={article.title} />
        </h4>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="truncate max-w-[120px]">{article.source}</span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatRelativeTime(article.pubDate)}
          </span>
        </div>
      </div>
      <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </motion.a>
  );
}

export function NewsCard({ delay = 0 }: NewsCardProps) {
  const [news, setNews] = useState<Record<string, NewsArticle[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("btc");

  useEffect(() => {
    async function fetchNews() {
      try {
        const data = await getNews("all");
        setNews(data);
      } catch (error) {
        console.error("Error fetching news:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchNews();
  }, []);

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay }}
    >
      <Card className="border-0 shadow-lg overflow-hidden bg-gradient-to-br from-card via-card to-muted/10">
        <div className="h-1 w-full bg-gradient-to-r from-orange-500 via-blue-500 to-emerald-500" />

        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg font-semibold">Latest News</CardTitle>
            </div>
            <Badge variant="secondary" className="text-xs">
              Live Feed
            </Badge>
          </div>
          <CardDescription>
            Stay updated with the latest liquidity and crypto market news
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-4 bg-muted/50 mb-4">
              {Object.entries(categoryConfig).map(([key, config]) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="text-xs data-[state=active]:bg-background"
                >
                  <config.icon className={cn("h-3.5 w-3.5 mr-1.5", config.color)} />
                  <span className="hidden sm:inline">{config.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <AnimatePresence mode="wait">
              {Object.entries(categoryConfig).map(([key]) => (
                <TabsContent key={key} value={key} className="mt-0 space-y-2">
                  {loading ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className="h-20 rounded-lg bg-muted/50 animate-pulse"
                        />
                      ))}
                    </div>
                  ) : news[key]?.length > 0 ? (
                    news[key].map((article, index) => (
                      <NewsItem
                        key={`${key}-${index}`}
                        article={article}
                        index={index}
                        category={key}
                      />
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Newspaper className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No news available</p>
                    </div>
                  )}
                </TabsContent>
              ))}
            </AnimatePresence>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}
