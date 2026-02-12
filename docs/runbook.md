# Runbook Operativo - Monitoreo Backend

## Señales operativas

### Logging estructurado
- Todos los logs se emiten en formato JSON para facilitar búsqueda e ingesta en SIEM.
- Campos mínimos por request:
  - `requestId`: correlación extremo a extremo (acepta `X-Request-Id` entrante).
  - `level`: severidad (`info`, `warn`, `error`).
  - `route`: ruta atendida.
  - `durationMs`: duración total del request.
- En errores de servidor (`5xx`) se incluye `error.stack` para diagnóstico.

### Health y readiness
- `GET /health`: valida que el proceso Node está vivo (liveness).
- `GET /ready`: valida disponibilidad de DB y devuelve estado operacional.
  - `200` con `status: ready` cuando DB responde.
  - `503` con `status: degraded` y detalles cuando DB no está disponible.

### Métricas del monitor
Se registran en memoria y se publican por logs en cada ciclo:
- `cycle`: contador total de ciclos ejecutados.
- `hostsEvaluated`: hosts evaluados por ciclo.
- `pingFailures`: hosts con fallo de ping en el ciclo.
- `durationMs`: tiempo total por ciclo.
- `dbStatus`: estado actual de DB (`ready`, `unavailable`, `unknown`).
- `dbQueryAvgLatencyMs`: latencia promedio de queries a DB.

## Alertas sugeridas

1. **DB no lista / degradación**
   - Condición: `/ready` responde `503` por más de 2 minutos.
   - Acción: revisar conectividad DB, credenciales y saturación del pool.

2. **Aumento de fallos de ping**
   - Condición: `pingFailures / hostsEvaluated > 0.3` sostenido 5 ciclos.
   - Acción: validar red/sede/proveedor y estado de hosts.

3. **Latencia de queries anormal**
   - Condición: `dbQueryAvgLatencyMs` o `db.latencyMs` > umbral (ej. 200ms) por 10 minutos.
   - Acción: revisar carga DB, índices y bloqueos.

4. **Errores HTTP 5xx**
   - Condición: incremento abrupto de logs `level=error` con `http_request` o `Unhandled server error`.
   - Acción: correlacionar por `requestId`, revisar `error.stack` y endpoint afectado.

## Procedimiento rápido de diagnóstico
1. Consultar `GET /health` para confirmar proceso vivo.
2. Consultar `GET /ready` para estado de DB y degradación.
3. Filtrar logs por `requestId` de una transacción fallida.
4. Revisar logs `monitor_cycle_metric` para detectar fallos masivos o degradación.
5. Si hay degradación de DB, escalar a equipo de base de datos con latencias observadas.
