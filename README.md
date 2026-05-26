# Dyamond Wind Dashboard

Dashboard interactivo para visualización de datos de viento, partículas, campo vectorial, mapa de calor y gráficas conectadas.

## Requisitos previos

Antes de ejecutar el proyecto, asegúrate de tener instalado:

- Node.js
- pnpm

Puedes verificarlo con:

```powershell
node -v
pnpm -v
```

---

## 1. Abrir la carpeta del proyecto

En PowerShell, entra a la carpeta del proyecto:

```powershell
cd "...."
```

---

## 2. Limpiar e instalar dependencias

Ejecuta los siguientes comandos para eliminar dependencias anteriores e instalar todo nuevamente:

```powershell
Remove-Item -Recurse -Force .\node_modules -ErrorAction SilentlyContinue
pnpm install --force
```

---

## 3. Ejecutar la API

En la primera terminal, ejecuta:

```powershell

$env:PORT="5000"
$env:NODE_ENV="development"
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/api-server run start
```

Cuando veas un mensaje similar a este, la API ya estará funcionando:

```powershell
Server listening
port: 5000
```

Deja esta terminal abierta.

---

## 4. Ejecutar el frontend

Abre una segunda terminal de PowerShell y entra nuevamente a la carpeta del proyecto:

```powershell
cd "C:\Users\danie\Downloads\dyamond-wind-dashboard-conectado"
```

Luego ejecuta:

```powershell
pnpm --filter @workspace/wind-dashboard run dev
```

---

## 5. Abrir el dashboard

Cuando el frontend esté activo, abre el navegador en:

```text
http://localhost:5173
```

---

## Notas importantes

- La API debe quedar corriendo en el puerto `5000`.
- El frontend debe correr en el puerto `5173`.
- Se recomienda usar dos terminales: una para la API y otra para el frontend.
- No cierres la terminal de la API mientras estés usando el dashboard.
