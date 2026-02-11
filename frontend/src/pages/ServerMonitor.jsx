import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet } from '../lib/api';

export default function ServerMonitor() {
  const { hostname } = useParams();
  const navigate = useNavigate();
  const [server, setServer] = useState(null);
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [hostname]);

  async function loadData() {
    try {
      const data = await apiGet(`/api/nrdp/servers/${hostname}`);
      setServer(data);
      processMetrics(data.metrics || []);
      setLoading(false);
    } catch (err) {
      console.error('Error loading data:', err);
      setLoading(false);
    }
  }

  function processMetrics(metricsArray) {
    const processed = {
      cpu: null,
      memory: null,
      disks: [],
      processes_cpu: [],
      processes_memory: [],
      network: null,
      system: {}
    };

    metricsArray.forEach(m => {
      if (m.service_name === 'cpu') {
        processed.cpu = parseMetric(m);
      } else if (m.service_name === 'memory') {
        processed.memory = parseMemory(m);
      } else if (m.service_name.startsWith('disk_') && m.state !== 3) {
        const disk = parseDisk(m);
        if (disk) processed.disks.push(disk);
      } else if (m.service_name === 'top_cpu_processes') {
        processed.processes_cpu = parseTopProcesses(m);
      } else if (m.service_name === 'top_memory_processes') {
        processed.processes_memory = parseTopProcesses(m);
      } else if (m.service_name === 'network') {
        processed.network = parseMetric(m);
      } else if (m.service_name === 'os_version') {
        processed.system.os = m.output.replace(/^(OK|WARNING|CRITICAL):\s*/i, '');
      } else if (m.service_name === 'uptime') {
        processed.system.uptime = parseUptime(m.output);
      } else if (m.service_name === 'active_sessions') {
        processed.system.sessions = parseValue(m.output);
      }
    });

    setMetrics(processed);
  }

  function parseMetric(m) {
    return {
      state: parseInt(m.state),
      output: m.output,
      perfdata: m.perfdata,
      percentage: extractPercentage(m.output, m.perfdata)
    };
  }

  function parseMemory(m) {
    const output = m.output;
    const physical = output.match(/physical used:\s*([\d.]+)GB\/([\d.]+)GB\s*\((\d+)%\)/);
    const committed = output.match(/committed used:\s*([\d.]+)GB\/([\d.]+)GB\s*\((\d+)%\)/);
    
    return {
      state: parseInt(m.state),
      output: m.output,
      physical: physical ? {
        used: parseFloat(physical[1]),
        total: parseFloat(physical[2]),
        percentage: parseInt(physical[3])
      } : null,
      committed: committed ? {
        used: parseFloat(committed[1]),
        total: parseFloat(committed[2]),
        percentage: parseInt(committed[3])
      } : null
    };
  }

  function parseDisk(m) {
    const match = m.output.match(/([A-Z]:):\s*([\d.]+)GB\/([\d.]+)GB\s*used\s*\((\d+)%\)/);
    if (match) {
      return {
        drive: match[1],
        used: parseFloat(match[2]),
        total: parseFloat(match[3]),
        percentage: parseInt(match[4]),
        state: parseInt(m.state)
      };
    }
    return null;
  }

  function parseTopProcesses(m) {
    if (!m.perfdata) return [];
    
    const processes = [];
    // Buscar patrones como: '\Process(*)\% Processor Time_chrome_value'=50;
    const regex = /\\Process\(\*\)\\[^_]+_([^_]+)_value'?=([^;]+)/g;
    let match;
    
    while ((match = regex.exec(m.perfdata)) !== null) {
      const name = match[1];
      const value = parseFloat(match[2]);
      
      if (name !== 'Idle' && name !== 'System' && value > 0) {
        processes.push({ name, value });
      }
    }
    
    return processes
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }

  function parseUptime(output) {
    const uptimeMatch = output.match(/uptime:\s*([^,]+)/);
    const bootMatch = output.match(/boot:\s*(.+?)(?:\s*\(|$)/);
    
    return {
      uptime: uptimeMatch ? uptimeMatch[1].trim() : null,
      boot: bootMatch ? bootMatch[1].trim() : null
    };
  }

  function parseValue(output) {
    const match = output.match(/:\s*(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  function extractPercentage(output, perfdata) {
    let match = output.match(/(\d+)%/);
    if (match) return parseInt(match[1]);
    
    if (perfdata) {
      match = perfdata.match(/=(\d+)%/);
      if (match) return parseInt(match[1]);
    }
    
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando datos del servidor...</p>
        </div>
      </div>
    );
  }

  if (!server) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg">Servidor no encontrado</p>
          <button 
            onClick={() => navigate('/servers')} 
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            ← Volver a servidores
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button 
            onClick={() => navigate('/servers')} 
            className="text-blue-600 hover:text-blue-700 mb-3 flex items-center gap-2"
          >
            <i className="fas fa-arrow-left"></i> Volver a Servidores
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {hostname}
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {server.ip_address} • Última actualización: {new Date(server.last_seen).toLocaleString('es-ES')}
              </p>
            </div>
            <ServerStatus minutes={server.minutes_since_last_seen} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Column 1: CPU, RAM, Discos */}
          <div className="lg:col-span-2 space-y-6">
            {/* CPU */}
            {metrics.cpu && <CPUCard data={metrics.cpu} />}
            
            {/* RAM */}
            {metrics.memory && <RAMCard data={metrics.memory} />}
            
            {/* Discos */}
            {metrics.disks.length > 0 && <DisksCard disks={metrics.disks} />}
          </div>

          {/* Column 2: System Info */}
          <div className="space-y-6">
            {/* System Info */}
            <SystemInfoCard system={metrics.system} />
            
            {/* Network (si existe) */}
            {metrics.network && <NetworkCard data={metrics.network} />}
          </div>
        </div>

        {/* Top Processes - Full Width */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {metrics.processes_cpu.length > 0 && (
            <TopProcessesCard 
              title="Top 10 Procesos - CPU" 
              processes={metrics.processes_cpu}
              unit="%"
              icon="microchip"
            />
          )}
          
          {metrics.processes_memory.length > 0 && (
            <TopProcessesCard 
              title="Top 10 Procesos - Memoria" 
              processes={metrics.processes_memory}
              unit="MB"
              icon="memory"
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== COMPONENTS ====================

function ServerStatus({ minutes }) {
  if (minutes <= 2) {
    return (
      <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-green-100 text-green-800">
        <span className="w-2 h-2 bg-green-600 rounded-full mr-2 animate-pulse"></span>
        En Línea
      </span>
    );
  } else if (minutes <= 5) {
    return (
      <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800">
        <span className="w-2 h-2 bg-yellow-600 rounded-full mr-2"></span>
        Advertencia
      </span>
    );
  } else {
    return (
      <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-red-100 text-red-800">
        <span className="w-2 h-2 bg-red-600 rounded-full mr-2"></span>
        Fuera de Línea
      </span>
    );
  }
}

function CPUCard({ data }) {
  const { state, percentage } = data;
  const color = getColorByPercentage(percentage, state);
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <i className="fas fa-microchip text-blue-600"></i>
          CPU
        </h3>
        <StateBadge state={state} />
      </div>
      
      {percentage !== null && (
        <>
          <div className="relative h-8 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
            <div 
              className={`h-full ${color.bg} transition-all duration-700 ease-out`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-900 dark:text-white">
              {percentage}%
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Uso promedio último minuto
          </p>
        </>
      )}
      
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-600 dark:text-gray-300">{data.output}</p>
      </div>
    </div>
  );
}

function RAMCard({ data }) {
  const { physical, committed, state } = data;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <i className="fas fa-memory text-purple-600"></i>
          Memoria RAM
        </h3>
        <StateBadge state={state} />
      </div>
      
      {physical && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Física</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {physical.used.toFixed(2)} GB / {physical.total.toFixed(2)} GB
            </span>
          </div>
          <ProgressBar percentage={physical.percentage} state={state} />
        </div>
      )}
      
      {committed && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Comprometida</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {committed.used.toFixed(2)} GB / {committed.total.toFixed(2)} GB
            </span>
          </div>
          <ProgressBar percentage={committed.percentage} state={state} />
        </div>
      )}
    </div>
  );
}

function DisksCard({ disks }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <i className="fas fa-hdd text-green-600"></i>
          Discos
        </h3>
      </div>
      
      <div className="space-y-6">
        {disks.map((disk, idx) => (
          <div key={idx}>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{disk.drive}</span>
                <StateBadge state={disk.state} small />
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {disk.used.toFixed(1)} GB / {disk.total.toFixed(1)} GB
              </span>
            </div>
            <ProgressBar percentage={disk.percentage} state={disk.state} />
          </div>
        ))}
      </div>
    </div>
  );
}

function SystemInfoCard({ system }) {
  const hasData = system.os || system.uptime || system.sessions !== null;
  
  if (!hasData) return null;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
        <i className="fas fa-server text-indigo-600"></i>
        Información del Sistema
      </h3>
      
      <div className="space-y-4">
        {system.os && (
          <InfoRow icon="desktop" label="Sistema Operativo" value={system.os} />
        )}
        
        {system.uptime?.uptime && (
          <InfoRow icon="clock" label="Tiempo Encendido" value={system.uptime.uptime} />
        )}
        
        {system.uptime?.boot && (
          <InfoRow icon="power-off" label="Fecha de Arranque" value={system.uptime.boot} />
        )}
        
        {(system.sessions !== null && system.sessions !== undefined) && (
          <InfoRow 
            icon="users" 
            label="Usuarios Conectados" 
            value={system.sessions.toString()}
          />
        )}
      </div>
    </div>
  );
}

function NetworkCard({ data }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
        <i className="fas fa-network-wired text-cyan-600"></i>
        Red
      </h3>
      
      <div className="space-y-2">
        <p className="text-sm text-gray-600 dark:text-gray-300">{data.output}</p>
        <StateBadge state={data.state} />
      </div>
    </div>
  );
}

function TopProcessesCard({ title, processes, unit, icon }) {
  if (processes.length === 0) return null;
  
  const maxValue = Math.max(...processes.map(p => p.value));
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
        <i className={`fas fa-${icon} text-orange-600`}></i>
        {title}
      </h3>
      
      <div className="space-y-3">
        {processes.map((proc, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 w-6">
              #{idx + 1}
            </span>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-xs">
                  {proc.name}
                </span>
                <span className="text-sm font-bold text-gray-900 dark:text-white ml-2">
                  {unit === 'MB' ? `${(proc.value / 1024 / 1024).toFixed(0)} ${unit}` : `${proc.value}${unit}`}
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-orange-400 to-orange-600"
                  style={{ width: `${(proc.value / maxValue) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== UTILITY COMPONENTS ====================

function ProgressBar({ percentage, state }) {
  const color = getColorByPercentage(percentage, state);
  
  return (
    <div className="relative h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      <div 
        className={`h-full ${color.bg} transition-all duration-700 ease-out`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-900 dark:text-white">
        {percentage}%
      </span>
    </div>
  );
}

function StateBadge({ state, small = false }) {
  const states = {
    0: { label: 'OK', color: 'bg-green-100 text-green-800' },
    1: { label: 'WARNING', color: 'bg-yellow-100 text-yellow-800' },
    2: { label: 'CRITICAL', color: 'bg-red-100 text-red-800' },
    3: { label: 'UNKNOWN', color: 'bg-gray-100 text-gray-800' }
  };
  
  const stateInfo = states[state] || states[3];
  const sizeClass = small ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1';
  
  return (
    <span className={`${stateInfo.color} ${sizeClass} rounded-full font-semibold`}>
      {stateInfo.label}
    </span>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <i className={`fas fa-${icon} text-gray-400 mt-1 w-5`}></i>
      <div className="flex-1">
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">{value}</p>
      </div>
    </div>
  );
}

// ==================== UTILITY FUNCTIONS ====================

function getColorByPercentage(percentage, state) {
  if (state === 2) return { bg: 'bg-red-600', text: 'text-red-600' };
  if (state === 1) return { bg: 'bg-yellow-500', text: 'text-yellow-500' };
  
  if (percentage >= 90) return { bg: 'bg-red-600', text: 'text-red-600' };
  if (percentage >= 80) return { bg: 'bg-yellow-500', text: 'text-yellow-500' };
  return { bg: 'bg-green-500', text: 'text-green-500' };
}
