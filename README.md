# Monitoreo

Sistema de monitoreo de IPs (ping/logs/downtime), alertas por correo y vistas web.

## Requisitos
- Node.js 18+
- MySQL/MariaDB
- `fping` instalado en el servidor

## Variables de entorno
- `PORT`
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`
- `DB_CONNECTION_LIMIT`
- `CORS_ORIGINS` (coma separada)
- `API_KEY` (opcional para endpoints admin)
- `DB_BACKFILL_ON_RECOVERY` (default `false`)
- `DB_HEALTH_INITIAL_RETRY_MS`, `DB_HEALTH_MAX_RETRY_MS`
- `INVENTORY_CACHE_DIR` (cache local de inventario para arranque con DB offline)
- `NO_INVENTORY_WARN_INTERVAL_MS` (throttle de warning por inventario faltante)

## Ejecución
```bash
npm install
npm start
```

## Tests
```bash
npm test
```

## Endpoints nuevos
- `GET /api/live`
- `GET /api/live/stream`
- `GET /api/logs?ipId=&from=&to=&limit=&offset=`
- `GET /api/downtime?ipId=&from=&to=`
- `GET /api/summary?from=&to=`
- `GET /api/health`
- `GET /api/ready`

## Compatibilidad
Se mantienen montadas rutas legacy (`/api/ips_report`, `/api/ping_history`, etc.) para migración progresiva.
