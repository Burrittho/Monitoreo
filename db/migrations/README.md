# Migraciones sugeridas de índices

Aplicar manualmente en ventana de mantenimiento:

```sql
SOURCE db/migrations/20260212_add_monitoring_indexes.sql;
```

## Objetivo

- Mejorar consultas de historial de `ping_logs` por `ip_id` y fecha.
- Mejorar lecturas del estado activo en `host_state_log`.
- Mejorar lecturas de histórico de internet en `check_internet`.

## Nota

Siempre validar con `EXPLAIN` y revisar impacto de escritura antes de aplicar en producción.
