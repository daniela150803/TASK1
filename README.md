# DYAMOND GEOS Wind Dashboard — Editable Source

Global atmospheric wind dynamics visualizer using NASA GEOS/DYAMOND simulation data.

## Requirements

- Node.js 20+

## Setup

```bash
npm install
```

## Development

Runs both the API server (port 3001) and the Vite frontend (port 5173) with hot reload:

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

## Project Structure

```
├── server/               # Express API server (TypeScript)
│   ├── index.ts          # Entry point
│   ├── app.ts            # Express app setup
│   ├── logger.ts         # Pino logger configuration
│   └── routes/
│       ├── index.ts      # Route aggregator
│       ├── health.ts     # GET /api/healthz
│       └── wind.ts       # Wind data endpoints
│
├── client/               # React frontend (TypeScript + Vite)
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx       # Main dashboard with tabs
│       ├── index.css
│       ├── types/api.ts  # TypeScript interfaces
│       ├── lib/api.ts    # API client
│       └── components/
│           ├── Controls.tsx      # Face/Level/Year selectors
│           ├── StatsCards.tsx    # KPI cards
│           ├── WindMap.tsx       # Canvas heatmap + vectors
│           ├── LevelsChart.tsx   # Altitude profile chart
│           ├── ProfileChart.tsx  # Lat-slice profile chart
│           ├── HistogramChart.tsx# Speed/temp/w distribution
│           ├── BarChartViz.tsx   # Region comparison
│           └── ParticleField.tsx # Animated particle flow
│
├── public/               # Static assets (favicon, etc.)
├── vite.config.ts        # Vite configuration
├── tailwind.config.js    # Tailwind CSS theme
├── tsconfig.json         # TypeScript config (client)
├── tsconfig.server.json  # TypeScript config (server)
└── package.json
```

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/healthz` | Health check |
| `GET /api/wind/stats` | Summary stats (max/avg speed, temp, jet stream) |
| `GET /api/wind/vectors` | Wind vector field (lat, lon, u, v, speed) |
| `GET /api/wind/heatmap` | High-res wind speed grid |
| `GET /api/wind/levels` | Vertical profile by altitude level |
| `GET /api/wind/profile` | Profile at specific latitude |
| `GET /api/wind/histogram` | Frequency distribution (speed/temp/w) |
| `GET /api/wind/bar` | Regional speed comparison |
| `GET /api/wind/particles` | Particle flow field data |

All wind endpoints accept `?face=0&level=30&year=2016` query params.

## Data Sources

- **OpenVisus (live)**: Fetches real GEOS data from `nsdf-climate3-origin.nationalresearchplatform.org` when available
- **Synthetic (fallback)**: Physically-based wind model using seeded random generation

## Build for Production

```bash
npm run build       # Builds frontend to dist/public and server to dist/server
npm start           # Runs the unified production server
```
