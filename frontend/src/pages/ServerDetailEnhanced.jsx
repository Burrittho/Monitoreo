import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet } from '../lib/api';

export default function ServerDetailEnhanced() {
  const { hostname } = useParams();
  const navigate = useNavigate();
  const [server, setServer] = useState(null);
  const [grouped, setGrouped] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh cada 30s
    return () => clearInterval(interval);
  }, [hostname]);

  async function loadData() {
    try {
      const [serverData, groupedData] = await Promise.all([
        apiGet(`/api/nrdp/servers/${hostname}`),
        apiGet(`/api/nrdp/servers/${hostname}/metrics/grouped`)
      ]);
      setServer(serverData);
      setGrouped(groupedData);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-8 text-center">Cargando...</div>;
  if (error) return <div className="p-8 text-center text-red-600">Error: {error}</div>;
  if (!server) return <div className="p-8 text-center">Servidor no encontrado</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate('/servers')} className="text-blue-600 hover:text-blue-700 mb-2">
            ← Volver a Servidores
          </button>
          <h1 className="text-3xl font-bold">{hostname}</h1>
          <p className="text-gray-500">
            {server.ip_address || 'IP no disponible'} • 
            Última actualización: {new Date(server.last_seen).toLocaleString()}
          </p>
        </div>
        <StatusBadge status={server.status} />
      </div>

      {/* CPU Metrics */}
      {grouped?.cpu && grouped.cpu.length > 0 && (
        <MetricCard title="CPU" icon="microchip">
          {grouped.cpu.map((metric, idx) => (
            <MetricBar key={idx} metric={metric} type="cpu" />
          ))}
        </MetricCard>
      )}

      {/* Memory Metrics */}
      {grouped?.memory && grouped.memory.length > 0 && (
        <MetricCard title="Memoria" icon="memory">
          {grouped.memory.map((metric, idx) => (
            <MetricBar key={idx} metric={metric} type="memory" />
          ))}
        </MetricCard>
      )}

      {/* Disk Metrics */}
      {grouped?.disk && grouped.disk.length > 0 && (
        <MetricCard title="Discos" icon="hard-drive">
          {grouped.disk.map((metric, idx) => (
            <MetricBar key={idx} metric={metric} type="disk" />
          ))}
        </MetricCard>
      )}

      {/* Network Metrics */}
      {grouped?.network && grouped.network.length > 0 && (
        <MetricCard title="Red" icon="network-wired">
          {grouped.network.map((metric, idx) => (
            <MetricItem key={idx} metric={metric} />
          ))}
        </MetricCard>
      )}

      {/* System Info */}
      {grouped?.system && grouped.system.length > 0 && (
        <MetricCard title="Sistema" icon="server">
          {grouped.system.map((metric, idx) => (
            <MetricItem key={idx} metric={metric} />
          ))}
        </MetricCard>
      )}

      {/* Services */}
      {grouped?.services && grouped.services.length > 0 && (
        <MetricCard title="Servicios y Procesos" icon="cogs">
          {grouped.services.map((metric, idx) => (
            <MetricItem key={idx} metric={metric} />
          ))}
        </MetricCard>
      )}

      {/* Other Metrics */}
      {grouped?.other && grouped.other.length > 0 && (
        <MetricCard title="Otras Métricas" icon="chart-line">
          {grouped.other.map((metric, idx) => (
            <MetricItem key={idx} metric={metric} />
          ))}
        </MetricCard>
      )}
    </div>
  );
}

function MetricCard({ title, icon, children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <i className={`fas fa-${icon} text-blue-600`}></i>
        {title}
      </h2>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

function MetricBar({ metric, type }) {
  const percentage = extractPercentage(metric.output, metric.perfdata);
  const state = parseInt(metric.state);
  
  const color = getColorByState(state);
  const bgColor = getBgColorByState(state);
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="font-medium">{metric.service_name}</span>
        <span className={`text-sm px-2 py-1 rounded ${bgColor} ${color}`}>
          {getStateText(state)}
        </span>
      </div>
      
      {percentage !== null && (
        <div className="relative w-full h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={`h-full ${getProgressColor(percentage, state)} transition-all duration-500`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-800 dark:text-white">
            {percentage.toFixed(1)}%
          </span>
        </div>
      )}
      
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {metric.output}
      </p>
    </div>
  );
}

function MetricItem({ metric }) {
  const state = parseInt(metric.state);
  const color = getColorByState(state);
  const bgColor = getBgColorByState(state);
  
  return (
    <div className="flex justify-between items-start p-3 bg-gray-50 dark:bg-gray-700 rounded">
      <div className="flex-1">
        <div className="font-medium">{metric.service_name}</div>
        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {metric.output}
        </div>
      </div>
      <span className={`ml-4 text-sm px-2 py-1 rounded ${bgColor} ${color} whitespace-nowrap`}>
        {getStateText(state)}
      </span>
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = {
    online: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    offline: 'bg-red-100 text-red-800'
  };
  
  return (
    <span className={`px-4 py-2 rounded-full font-semibold ${colors[status] || colors.offline}`}>
      {status === 'online' ? '● En Línea' : status === 'warning' ? '⚠ Advertencia' : '✕ Fuera de Línea'}
    </span>
  );
}

function extractPercentage(output, perfdata) {
  // 1. Buscar patrón "(XX.XX%)" o "XX.XX%" en el output
  let match = output.match(/\((\d+(?:\.\d+)?)\s*%\)|(\d+(?:\.\d+)?)\s*%/);
  if (match) return parseFloat(match[1] || match[2]);
  
  // 2. Buscar patrón "XX.XXG/XX.XXG" para calcular porcentaje (discos, memoria)
  match = output.match(/(\d+(?:\.\d+)?)\s*[GM]B?\s*\/\s*(\d+(?:\.\d+)?)\s*[GM]B?/i);
  if (match) {
    const used = parseFloat(match[1]);
    const total = parseFloat(match[2]);
    if (total > 0) return (used / total) * 100;
  }
  
  // 3. Intentar extraer del perfdata
  if (perfdata) {
    // Formato: 'nombre'=valor%;warn;crit;min;max
    match = perfdata.match(/=(\d+(?:\.\d+)?)%/);
    if (match) return parseFloat(match[1]);
    
    // Formato: 'nombre'=valorU;warn;crit;min;max (calcular porcentaje)
    match = perfdata.match(/='?([^'=]+)'?=(\d+(?:\.\d+)?)[^;]*;[^;]*;[^;]*;[^;]*;(\d+(?:\.\d+)?)/);
    if (match) {
      const value = parseFloat(match[2]);
      const max = parseFloat(match[3]);
      if (max > 0) return (value / max) * 100;
    }
  }
  
  return null;
}

function getStateText(state) {
  const states = {
    0: 'OK',
    1: 'WARNING',
    2: 'CRITICAL',
    3: 'UNKNOWN'
  };
  return states[state] || 'UNKNOWN';
}

function getColorByState(state) {
  const colors = {
    0: 'text-green-800',
    1: 'text-yellow-800',
    2: 'text-red-800',
    3: 'text-gray-800'
  };
  return colors[state] || colors[3];
}

function getBgColorByState(state) {
  const colors = {
    0: 'bg-green-100',
    1: 'bg-yellow-100',
    2: 'bg-red-100',
    3: 'bg-gray-100'
  };
  return colors[state] || colors[3];
}

function getProgressColor(percentage, state) {
  if (state === 2) return 'bg-red-600';
  if (state === 1) return 'bg-yellow-500';
  
  // Colores dinámicos basados en porcentaje
  if (percentage >= 90) return 'bg-red-600';
  if (percentage >= 80) return 'bg-yellow-500';
  return 'bg-green-500';
}
