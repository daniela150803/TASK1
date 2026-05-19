# DYAMOND GEOS Wind Dashboard — Código Fuente Editable

Versión editable del dashboard de análisis global de vientos atmosféricos basado en datos DYAMOND/GEOS.

## Requisitos

- Node.js 20+

## Instalación

```bash
npm install
```

## Desarrollo

Inicia el servidor API (puerto 3001) y el frontend Vite (puerto 5173) con hot reload:

```bash
npm run dev
```

Abrir http://localhost:5173

## Estructura del proyecto

```
├── server/               # Servidor Express API (TypeScript)
│   ├── index.ts
│   ├── app.ts
│   ├── logger.ts
│   └── routes/
│       ├── index.ts
│       ├── health.ts     # GET /api/healthz
│       └── wind.ts       # 8 endpoints de datos de viento
│
├── client/               # Frontend React (TypeScript + Vite)
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx                   # Layout principal con pestañas
│       ├── index.css
│       ├── types/api.ts              # Interfaces TypeScript
│       ├── lib/api.ts                # Cliente HTTP
│       └── components/
│           ├── YearSelector.tsx      # Selector de año con timeline
│           ├── StatsCards.tsx        # 4 tarjetas KPI
│           ├── ParticleGlobe.tsx     # Globo ortográfico + partículas
│           ├── WindVectorField.tsx   # Campo vectorial del viento
│           ├── SpeedHeatmap.tsx      # Mapa de calor de velocidad
│           ├── VerticalSection.tsx   # Sección transversal flujo vertical
│           ├── AtmProfile.tsx        # Perfil atmosférico multivariable
│           └── VorticityViz.tsx      # Vorticidad y relaciones atmosféricas
│
├── dist/                 # App compilada lista para producción
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tsconfig.server.json
```

## Endpoints de la API

| Endpoint | Descripción |
|---|---|
| `GET /api/healthz` | Health check |
| `GET /api/wind/stats` | Estadísticas globales |
| `GET /api/wind/particles` | Campo de partículas (lat, lon, u, v) |
| `GET /api/wind/vectors` | Campo vectorial del viento |
| `GET /api/wind/heatmap` | Mapa de calor de velocidad |
| `GET /api/wind/levels` | Perfil por niveles atmosféricos |
| `GET /api/wind/profile` | Perfil atmosférico vertical |
| `GET /api/wind/histogram` | Histograma de velocidades |
| `GET /api/wind/bar` | Velocidad promedio mensual |

Parámetros: `?face=0&level=30&year=2016`

## Fuentes de datos

- **OpenVisus (live)**: Datos GEOS reales desde `nsdf-climate3-origin.nationalresearchplatform.org`
- **Sintéticos (fallback)**: Modelo de viento físicamente basado cuando no hay conexión

## Build para producción

```bash
npm run build    # Compila frontend → dist/public y servidor → dist/
npm start        # Sirve desde dist/index.mjs (idéntico al branch main)
```
