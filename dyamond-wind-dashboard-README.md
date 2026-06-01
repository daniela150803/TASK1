# DYAMOND GEOS Wind Dashboard — Setup Local

## Requisitos

- **Node.js 20+** — https://nodejs.org
- **pnpm 9+** — `npm install -g pnpm`
- **PostgreSQL** (opcional, la app no usa base de datos)

---

## Instalación

```bash
# 1. Entra a la carpeta del proyecto
cd dyamond-wind-dashboard

# 2. Instala todas las dependencias
pnpm install

# 3. Genera el cliente de API (React Query hooks + Zod schemas)
pnpm --filter @workspace/api-spec run codegen
```

---

## Ejecutar en desarrollo

Necesitas dos terminales:

**Terminal 1 — API Server (puerto 5000 por defecto):**
```bash
PORT=5000 pnpm --filter @workspace/api-server run dev
```

**Terminal 2 — Frontend (puerto 5173 por defecto):**
```bash
pnpm --filter @workspace/wind-dashboard run dev
```

Luego abre `http://localhost:5173` en tu navegador.

---

## Build de producción

```bash
# Frontend
pnpm --filter @workspace/wind-dashboard run build
# Los archivos quedan en artifacts/wind-dashboard/dist/

# API Server
pnpm --filter @workspace/api-server run build
# El bundle queda en artifacts/api-server/dist/index.mjs
# Ejecutar con: PORT=5000 node artifacts/api-server/dist/index.mjs
```

---

## Variables de entorno

El frontend no requiere variables de entorno.

El API server requiere solo:
| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `PORT`   | Puerto del servidor | Requerido |

---

## Estructura del proyecto

```
dyamond-wind-dashboard/
├── artifacts/
│   ├── api-server/          # Express 5 API server
│   │   └── src/routes/wind.ts   # Rutas de datos de viento
│   └── wind-dashboard/      # React + Vite frontend
│       └── src/
│           ├── App.tsx
│           ├── components/
│           │   ├── charts/      # 9 componentes de visualización
│           │   ├── KpiCards.tsx
│           │   ├── Tab1HorizontalWind.tsx
│           │   ├── Tab2VerticalDynamics.tsx
│           │   └── Tab3AtmosphericRelations.tsx
│           └── lib/utils.ts
├── lib/
│   ├── api-spec/            # OpenAPI spec (fuente de verdad)
│   ├── api-client-react/    # Hooks generados (React Query)
│   └── api-zod/             # Schemas Zod generados
├── pnpm-workspace.yaml
└── package.json
```

---

## Conexión entre frontend y API

El frontend llama a `/api/wind/*`. En producción, configura un proxy inverso
(nginx, Caddy, etc.) que dirija `/api` a tu API server.

Para desarrollo local sin proxy, edita `artifacts/wind-dashboard/vite.config.ts`
y agrega:
```ts
server: {
  proxy: {
    '/api': 'http://localhost:5000'
  }
}
```
