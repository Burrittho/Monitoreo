# Optimización Live (antes/después)

## Supuestos de medición
- 2 vistas críticas abiertas en paralelo (Monitor + Sidebar).
- Intervalo promedio previo: 30 segundos.
- Payload promedio endpoint `ping-results*`: ~18 KB por respuesta.
- Payload endpoint `GET /api/live`: ~3 KB por respuesta (solo estado actual por IP).
- SSE con deltas promedio: ~0.6 KB por ciclo agregado.

## Antes (polling duplicado por vista)
- Endpoints consultados por ciclo en cada vista: 3 (`ping-results`, `ping-results-dvr`, `ping-results-server`).
- Llamadas/minuto: `(60/30) * 3 * 2 vistas = 12`.
- Bytes/minuto: `12 * 18 KB = 216 KB/min`.
- Estimado en 8h: `216 KB * 480 = 103,680 KB (~101.3 MB)`.

## Después (store live centralizado + SSE)
- `GET /api/live` inicial por cliente: 1 llamada.
- SSE: flujo continuo, sin reconsultar las 3 colecciones por vista.
- Llamadas/minuto (steady state): ~0.2 (reintentos ocasionales o fallback).
- Bytes/minuto (steady state): ~36 KB/min (deltas SSE promedio).
- Estimado en 8h: `36 KB * 480 = 17,280 KB (~16.9 MB)`.

## Reducción estimada
- Llamadas/minuto: de **12** a **~0.2** (≈ **98.3% menos**).
- Tráfico/minuto: de **216 KB** a **36 KB** (≈ **83.3% menos**).
- Tráfico en 8h: de **~101.3 MB** a **~16.9 MB** (≈ **83.3% menos**).

## Nota metodológica
Estas cifras son una base de comparación operativa con cargas promedio. Para producción, validar con captura real de tráfico (DevTools + logs Nginx/Node) y recalcular por número de IPs y concurrencia real.
