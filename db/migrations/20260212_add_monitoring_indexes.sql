-- Índices sugeridos para optimizar consultas frecuentes de monitoreo.
-- Revisar con EXPLAIN en su entorno antes de aplicar en producción.

-- Consultas por historial de ping: filtros por ip_id + rango temporal + orden por fecha.
CREATE INDEX idx_ping_logs_ip_id_fecha ON ping_logs (ip_id, fecha);

-- Si existen consultas que priorizan id incremental para timeline interno.
CREATE INDEX idx_ping_logs_ip_id_id ON ping_logs (ip_id, id);

-- Estado activo por host y últimos cambios.
CREATE INDEX idx_host_state_log_ip_active_changed_at
  ON host_state_log (ip_id, is_active, changed_at);

-- Historial de configuración de internet por sucursal/ip y fecha.
CREATE INDEX idx_check_internet_ip_id_fecha ON check_internet (ip_id, fecha);
