# TGA Liquidity Dashboard

A real-time liquidity monitoring dashboard built with Next.js 14, shadcn/ui, Framer Motion, and Recharts. Track Treasury General Account (TGA), Reverse Repo (RRP), Bitcoin, and stablecoin market data.

## Features

- 📊 **Real-time TGA Data** - Treasury General Account closing balances from FiscalData
- 💰 **RRP Monitoring** - Overnight Reverse Repurchase Agreements from FRED
- ₿ **Bitcoin Price** - Live BTC price and 24h change from CoinGecko
- 🪙 **Stablecoin Supply** - USDT + USDC market cap tracking
- 📈 **Interactive Charts** - Historical data visualization with Recharts
- 🎨 **Modern UI** - Built with shadcn/ui components
- ✨ **Smooth Animations** - Framer Motion powered transitions
- 🌡️ **Liquidity Heatmap** - Visual risk-on/risk-off indicator

## Net Liquidity Formula

```
Net Liquidity = Fed Balance Sheet - TGA - RRP
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Data Fetching**: Server Actions
- **MCP Server**: Model Context Protocol SDK (optional)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- FRED API Key (free at https://fred.stlouisfed.org/docs/api/api_key.html)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd tga-dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Edit `.env.local` and add your FRED API key:
```
FRED_KEY=your_fred_api_key_here
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
tga-dashboard/
├── src/
│   ├── app/
│   │   ├── actions/        # Server actions for data fetching
│   │   │   ├── getTga.ts   # TGA data fetching
│   │   │   ├── getRrp.ts   # RRP data fetching
│   │   │   ├── getBtc.ts   # Bitcoin price fetching
│   │   │   └── getStable.ts # Stablecoin data fetching
│   │   ├── page.tsx        # Main dashboard page
│   │   └── layout.tsx      # Root layout
│   ├── components/
│   │   ├── dashboard/      # Dashboard components
│   │   │   ├── MetricCard.tsx
│   │   │   ├── LiquidityChart.tsx
│   │   │   ├── LiquidityHeatmap.tsx
│   │   │   └── Skeletons.tsx
│   │   └── ui/             # shadcn/ui components
│   ├── lib/
│   │   ├── api.ts          # API utility functions
│   │   └── utils.ts        # General utilities
│   └── types/
│       └── api.ts          # TypeScript type definitions
├── mcp-server/             # Optional MCP server
│   ├── server.ts           # MCP server implementation
│   ├── package.json
│   └── tsconfig.json
└── .env.example
```

## MCP Server (Optional)

The project includes an optional MCP (Model Context Protocol) server for handling API calls. This is useful for:

- Secure API key management
- Zero CORS issues
- Modular, extendable architecture

### Running the MCP Server

1. Navigate to the MCP server directory:
```bash
cd mcp-server
```

2. Install dependencies:
```bash
npm install
```

3. Build and run:
```bash
npm run build
npm start
```

## Data Sources

| Data | Source | Update Frequency |
|------|--------|------------------|
| TGA Balance | FiscalData Treasury API | Daily |
| RRP Balance | FRED API | Daily |
| Bitcoin Price | CoinGecko API | Every 5 minutes |
| Stablecoin MCap | CoinGecko API | Every 5 minutes |

## Deployment

### Next.js App

Deploy to Vercel:
```bash
npm run build
vercel deploy
```

### MCP Server

Deploy to:
- Fly.io
- Render
- Railway
- Docker container

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FRED_KEY` | Yes | FRED API key for RRP data |
| `COINGECKO_API_KEY` | No | CoinGecko API key (higher rate limits) |
| `MCP_SERVER_URL` | No | MCP server URL if using separate server |

## License

MIT
