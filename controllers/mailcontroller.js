const { sendMonitoringEmail } = require('../services/emailService');
const fs = require('fs').promises;
const path = require('path');

// === CONNECTION MANAGER CON SESIONES PERSISTENTES ===
class ConnectionManager {
  constructor(pool) {
    this.pool = pool;
    this.connections = new Map(); // Map de conexiones por tipo de operación
    this.lastUsed = new Map(); // Timestamp de último uso
    this.maxIdleTime = 300000; // 5 minutos de idle antes de cerrar
    this.maxConnections = 5; // Máximo 5 conexiones persistentes
    
    // Cleanup automático de conexiones idle
    setInterval(() => this.cleanupIdleConnections(), 60000);
  }
  
  async getConnection(operationType = 'default') {
    // Si ya existe una conexión para este tipo, reutilizarla
    if (this.connections.has(operationType)) {
      const conn = this.connections.get(operationType);
      
      // Verificar que la conexión sigue activa
      try {
        await conn.query('SELECT 1');
        this.lastUsed.set(operationType, Date.now());
        return conn;
      } catch (error) {
        console.log(`Conexión ${operationType} expiró, creando nueva...`);
        this.connections.delete(operationType);
        this.lastUsed.delete(operationType);
      }
    }
    
    // Crear nueva conexión si no existe o expiró
    if (this.connections.size < this.maxConnections) {
      const conn = await this.pool.getConnection();
      
      // Configurar timeouts optimizados para sesión persistente
      await conn.query('SET SESSION wait_timeout = 3600'); // 1 hora
      await conn.query('SET SESSION interactive_timeout = 3600');
      await conn.query('SET SESSION net_read_timeout = 120');
      await conn.query('SET SESSION net_write_timeout = 120');
      
      this.connections.set(operationType, conn);
      this.lastUsed.set(operationType, Date.now());
      
      console.log(`Nueva conexión persistente creada: ${operationType} (Total: ${this.connections.size})`);
      return conn;
    }
    
    // Si ya hay máximo de conexiones, usar una existente (round-robin)
    const connectionTypes = Array.from(this.connections.keys());
    const selectedType = connectionTypes[Math.floor(Math.random() * connectionTypes.length)];
    const conn = this.connections.get(selectedType);
    
    this.lastUsed.set(selectedType, Date.now());
    return conn;
  }
  
  async executeQuery(sql, params = [], operationType = 'default', retries = 3) {
    let attempt = 0;
    
    while (attempt < retries) {
      try {
        const conn = await this.getConnection(operationType);
        const result = await conn.query(sql, params);
        return result;
        
      } catch (error) {
        console.error(`Query error (attempt ${attempt + 1}/${retries}) [${operationType}]:`, error.message);
        
        // Si es error de conexión, limpiar y reintentar
        if (error.code === 'ER_CLIENT_INTERACTION_TIMEOUT' || 
            error.code === 'PROTOCOL_CONNECTION_LOST' ||
            error.code === 'ER_CONNECTION_LOST') {
          
          this.connections.delete(operationType);
          this.lastUsed.delete(operationType);
          attempt++;
          
          if (attempt < retries) {
            console.log(`Reintentando query [${operationType}] en 1 segundo...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
        }
        throw error;
      }
    }
  }
  
  cleanupIdleConnections() {
    const now = Date.now();
    const toRemove = [];
    
    for (const [type, lastUsed] of this.lastUsed.entries()) {
      if (now - lastUsed > this.maxIdleTime) {
        toRemove.push(type);
      }
    }
    
    toRemove.forEach(type => {
      const conn = this.connections.get(type);
      if (conn) {
        conn.release();
        console.log(`Conexión idle liberada: ${type}`);
      }
      this.connections.delete(type);
      this.lastUsed.delete(type);
    });
  }
  
  async closeAll() {
    for (const [type, conn] of this.connections.entries()) {
      try {
        conn.release();
        console.log(`Conexión cerrada: ${type}`);
      } catch (error) {
        console.error(`Error cerrando conexión ${type}:`, error.message);
      }
    }
    this.connections.clear();
    this.lastUsed.clear();
  }
}

// Variable global para el connection manager
let connectionManager = null;
let pool = null;

// Configuración de intervalos
let CHECK_INTERVAL = 30000;
let CONSECUTIVE_MINUTES_REQUIRED = 5;
let SEQUENCE_WINDOW_MINUTES = 6;

const STATE_UP = 'UP';
const STATE_DOWN = 'DOWN';
const STATE_UNSTABLE = 'UNSTABLE';

// Cache de configuración y estados
let config = {
  tiempo_minimo_entre_correos: 5 * 60 * 1000,
  habilitar_estado_unstable: false,
  enviar_correos_unstable: false,
  debug_logging: false,
  latencia_maxima_aceptable: 1500
};
let hostsStatus = {};

// === FUNCIONES OPTIMIZADAS CON CONNECTION MANAGER ===

async function getLastSuccessfulPing(ipId, beforeTime) {
  try {
    const [rows] = await connectionManager.executeQuery(
      `SELECT fecha, UNIX_TIMESTAMP(fecha) * 1000 as timestamp, 
       CASE WHEN latency IS NOT NULL THEN latency ELSE 0 END as latency
       FROM ping_logs WHERE ip_id = ? AND success = 1 AND fecha < ? ORDER BY fecha DESC LIMIT 1`,
      [ipId, new Date(beforeTime)],
      'ping_queries'
    );
    
    if (rows.length > 0) {
      return rows[0];
    }
    return { fecha: new Date(beforeTime), timestamp: beforeTime, latency: 0 };
  } catch (error) {
    console.error(`Error obteniendo último ping exitoso para IP ${ipId}:`, error.message);
    return { fecha: new Date(beforeTime), timestamp: beforeTime, latency: 0 };
  }
}

async function getLastFailedPing(ipId, beforeTime) {
  try {
    const [rows] = await connectionManager.executeQuery(
      `SELECT fecha, UNIX_TIMESTAMP(fecha) * 1000 as timestamp, 
       CASE WHEN latency IS NOT NULL THEN latency ELSE 'timeout' END as latency
       FROM ping_logs WHERE ip_id = ? AND success = 0 AND fecha < ? ORDER BY fecha DESC LIMIT 1`,
      [ipId, new Date(beforeTime)],
      'ping_queries'
    );
    
    if (rows.length > 0) {
      return rows[0];
    }
    return { fecha: new Date(beforeTime), timestamp: beforeTime, latency: 'timeout' };
  } catch (error) {
    console.error(`Error obteniendo último ping fallido para IP ${ipId}:`, error.message);
    return { fecha: new Date(beforeTime), timestamp: beforeTime, latency: 'timeout' };
  }
}

async function getSucursalInfo(ipId) {
  try {
    const [[ipInfo]] = await connectionManager.executeQuery(
      'SELECT ip, name FROM ips WHERE id = ?',
      [ipId],
      'info_queries'
    );
    
    const [[proveedorInfo]] = await connectionManager.executeQuery(
      `SELECT p.Direccion, p.Colonia, p.Ciudad, p.Estado, p.maps 
       FROM proveedores_internet p 
       WHERE p.sucursal_id = ?`,
      [ipId],
      'info_queries'
    );
    
    let direccionCompleta = 'No disponible';
    let urlMaps = '#';
    
    if (proveedorInfo) {
      const direccionPartes = [
        proveedorInfo.Direccion,
        proveedorInfo.Colonia,
        proveedorInfo.Ciudad,
        proveedorInfo.Estado
      ].filter(parte => parte && parte.trim() !== '');
      
      direccionCompleta = direccionPartes.length > 0 ? direccionPartes.join(', ') : 'No disponible';
      urlMaps = proveedorInfo.maps || '#';
    }
    
    return {
      nombre: ipInfo ? ipInfo.name : 'Host desconocido',
      ip: ipInfo ? ipInfo.ip : 'IP desconocida',
      direccion: direccionCompleta,
      urlMaps: urlMaps
    };
  } catch (error) {
    console.error(`Error obteniendo información de sucursal para IP ${ipId}:`, error.message);
    return {
      nombre: 'Host desconocido',
      ip: 'IP desconocida',
      direccion: 'No disponible',
      urlMaps: '#'
    };
  }
}

async function getConsolaInfo(ipId) {
  try {
    const [[licenciaInfo]] = await connectionManager.executeQuery(
      `SELECT ip_id, mac, url, expiracion 
       FROM licencia 
       WHERE ip_id = ? 
       ORDER BY fecha DESC LIMIT 1`,
      [ipId],
      'info_queries'
    );
    
    if (licenciaInfo) {
      const [[ipInfo]] = await connectionManager.executeQuery(
        'SELECT ip FROM ips WHERE id = ?', 
        [ipId],
        'info_queries'
      );
      return {
        ip: ipInfo ? ipInfo.ip : 'IP desconocida',
        mac: licenciaInfo.mac || 'No disponible',
        url: licenciaInfo.url || 'No disponible'
      };
    }
    
    return {
      ip: 'No disponible',
      mac: 'No disponible', 
      url: 'No disponible'
    };
  } catch (error) {
    console.error(`Error obteniendo información de consola para IP ${ipId}:`, error.message);
    return {
      ip: 'No disponible',
      mac: 'No disponible', 
      url: 'No disponible'
    };
  }
}

async function getInternetInfo(ipId) {
  try {
    const [[proveedorInfo]] = await connectionManager.executeQuery(
      `SELECT p.proveedor_primario, p.cuenta_primario, p.proveedor_secundario, p.cuenta_secundario
       FROM proveedores_internet p 
       WHERE p.sucursal_id = ?`,
      [ipId],
      'info_queries'
    );
    
    const [[checkInfo]] = await connectionManager.executeQuery(
      `SELECT proveedor1, interfaz1, tipo1, ip1, trazado1, 
              proveedor2, interfaz2, tipo2, ip2, trazado2
       FROM check_internet 
       WHERE ip_id = ? 
       ORDER BY fecha DESC LIMIT 1`,
      [ipId],
      'info_queries'
    );
    
    const result = {
      proveedores: {
        primario: proveedorInfo ? proveedorInfo.proveedor_primario : 'No disponible',
        cuentaPrimario: proveedorInfo ? proveedorInfo.cuenta_primario : 'No disponible',
        secundario: proveedorInfo ? proveedorInfo.proveedor_secundario : 'No disponible',
        cuentaSecundario: proveedorInfo ? proveedorInfo.cuenta_secundario : 'No disponible'
      },
      conexiones: []
    };
    
    if (checkInfo) {
      if (checkInfo.proveedor1) {
        result.conexiones.push({
          proveedor: checkInfo.proveedor1,
          puerto: checkInfo.interfaz1 || 'N/A',
          configuracion: checkInfo.tipo1 || 'N/A',
          ip: checkInfo.ip1 || 'N/A',
          estado: checkInfo.trazado1 || 'Desconocido'
        });
      }
      
      if (checkInfo.proveedor2) {
        result.conexiones.push({
          proveedor: checkInfo.proveedor2,
          puerto: checkInfo.interfaz2 || 'N/A',
          configuracion: checkInfo.tipo2 || 'N/A',
          ip: checkInfo.ip2 || 'N/A',
          estado: checkInfo.trazado2 || 'Desconocido'
        });
      }
    }
    
    return result;
  } catch (error) {
    console.error(`Error obteniendo información de internet para IP ${ipId}:`, error.message);
    return {
      proveedores: {
        primario: 'No disponible',
        cuentaPrimario: 'No disponible',
        secundario: 'No disponible',
        cuentaSecundario: 'No disponible'
      },
      conexiones: []
    };
  }
}

// === RESTO DE FUNCIONES (sin cambios en lógica, solo usando connectionManager) ===

function formatDate(dateValue) {
  if (!dateValue) return 'No disponible';
  try {
    if (typeof dateValue === 'string') {
      return new Date(dateValue).toLocaleString();
    }
    return dateValue.toLocaleString();
  } catch (error) {
    return 'Fecha inválida';
  }
}

function formatDuration(startTime, endTime) {
  if (!startTime || !endTime) return 'No disponible';
  
  try {
    const start = typeof startTime === 'string' ? new Date(startTime).getTime() : startTime;
    const end = typeof endTime === 'string' ? new Date(endTime).getTime() : endTime;
    
    if (isNaN(start) || isNaN(end)) return 'Tiempo inválido';
    
    const diffMs = Math.abs(end - start);
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    let result = [];
    
    if (days > 0) result.push(`${days} día${days !== 1 ? 's' : ''}`);
    if (hours > 0) result.push(`${hours} hora${hours !== 1 ? 's' : ''}`);
    if (minutes > 0) result.push(`${minutes} minuto${minutes !== 1 ? 's' : ''}`);
    if (seconds > 0) result.push(`${seconds} segundo${seconds !== 1 ? 's' : ''}`);
    
    if (result.length === 0) return 'Menos de 1 segundo';
    
    if (result.length === 1) return result[0];
    if (result.length === 2) return result.join(' y ');
    
    const last = result.pop();
    return result.join(', ') + ' y ' + last;
    
  } catch (error) {
    return 'Error calculando tiempo';
  }
}

// === FUNCIONES HTML (sin cambios) ===
async function loadEmailTemplate() {
  try {
    const templatePath = path.join(__dirname, '..', 'templates', 'email-template.html');
    const template = await fs.readFile(templatePath, 'utf8');
    return template;
  } catch (error) {
    console.error('Error al cargar plantilla HTML:', error);
    return `
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h1>{{TITULO_HEADER}}</h1>
          <div>{{CONTENIDO_TABLAS}}</div>
          <p><small>{{FECHA_GENERACION}}</small></p>
        </body>
      </html>
    `;
  }
}

function generateSucursalTable(sucursalInfo) {
  return `
    <div class="section">
      <div class="section-title">Sucursal</div>
      <table class="table">
        <thead>
          <tr>
            <th>Dirección</th>
            <th>URL Maps</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${sucursalInfo.direccion}</td>
            <td><a href="${sucursalInfo.urlMaps}" class="maps-link" target="_blank">Ver en Maps</a></td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

function generateConsolaTable(consolaInfo) {
  const hasData = consolaInfo.ip !== 'No disponible' && consolaInfo.mac !== 'No disponible' && consolaInfo.url !== 'No disponible';
  
  if (!hasData) {
    return `
      <div class="section">
        <div class="section-title">Consola</div>
        <table class="table">
          <tbody>
            <tr>
              <td colspan="3" style="text-align: center; color: #7f8c8d; font-style: italic; padding: 20px;">
                No hay información de consola disponible para esta IP
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }
  
  return `
    <div class="section">
      <div class="section-title">Consola</div>
      <table class="table">
        <thead>
          <tr>
            <th>IP</th>
            <th>MAC</th>
            <th>URL</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${consolaInfo.ip}</td>
            <td>${consolaInfo.mac}</td>
            <td><a href="${consolaInfo.url}" target="_blank" class="maps-link">${consolaInfo.url}</a></td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

function generateInternetTable(internetInfo) {
  let conexionesHtml = '';
  
  if (internetInfo.conexiones.length > 0) {
    internetInfo.conexiones.forEach((conexion, index) => {
      let estadoClass = 'status-down';
      const estado = (conexion.estado || '').toLowerCase();
      
      if (estado.includes('up') || estado.includes('activo') || estado.includes('ok') || estado.includes('conectado')) {
        estadoClass = 'status-up';
      }
      
      conexionesHtml += `
        <div class="subtable">
          <table class="table">
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>Puerto</th>
                <th>Configuración</th>
                <th>IP</th>
                <th>Estado (Último Check)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${conexion.proveedor}</td>
                <td>${conexion.puerto}</td>
                <td>${conexion.configuracion}</td>
                <td>${conexion.ip}</td>
                <td><span class="${estadoClass}">${conexion.estado}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    });
  } else {
    conexionesHtml = `
      <div class="subtable">
        <table class="table">
          <tbody>
            <tr>
              <td colspan="5" style="text-align: center; color: #7f8c8d; font-style: italic;">
                No hay información de conexiones disponible
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }
  
  return `
    <div class="section">
      <div class="section-title">Internet</div>
      <table class="table">
        <thead>
          <tr>
            <th>Proveedor Primario</th>
            <th>Cuenta Primario</th>
            <th>Proveedor Secundario</th>
            <th>Cuenta Secundario</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${internetInfo.proveedores.primario}</td>
            <td>${internetInfo.proveedores.cuentaPrimario}</td>
            <td>${internetInfo.proveedores.secundario}</td>
            <td>${internetInfo.proveedores.cuentaSecundario}</td>
          </tr>
        </tbody>
      </table>
      ${conexionesHtml}
    </div>
  `;
}

function generateIncidentTable(confirmacionCaida, confirmacionRecuperacion = null, tiempoSinSistema = null) {
  let recuperacionSection = '';
  if (confirmacionRecuperacion) {
    recuperacionSection = `
      <h4>Confirmación de Restablecimiento:</h4>
      <table class="table">
        <tbody>
          <tr>
            <td><strong>Fecha y hora:</strong></td>
            <td>${confirmacionRecuperacion}</td>
          </tr>
        </tbody>
      </table>
      
      <h4>Tiempo sin sistema:</h4>
      <table class="table">
        <tbody>
          <tr>
            <td><strong>Duración:</strong></td>
            <td style="color: #e74c3c; font-weight: bold;">${tiempoSinSistema || 'No calculado'}</td>
          </tr>
        </tbody>
      </table>
    `;
  }
  
  return `
    <div class="section">
      <div class="section-title">Detalles del Incidente</div>
      
      <h4>Confirmación de caída:</h4>
      <table class="table">
        <tbody>
          <tr>
            <td><strong>Fecha y hora:</strong></td>
            <td>${confirmacionCaida}</td>
          </tr>
        </tbody>
      </table>
      
      ${recuperacionSection}
    </div>
  `;
}

async function generateEmailHTML(tipo, sucursalInfo, consolaInfo, internetInfo, incidentInfo) {
  const template = await loadEmailTemplate();
  const fecha = formatDate(new Date());
  const hora = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  
  let tipoClase, tituloHeader, asunto;
  
  if (tipo === 'caida') {
    tipoClase = 'alert';
    tituloHeader = `Enlace Caído - ${sucursalInfo.nombre}`;
    asunto = `[Alerta] ${sucursalInfo.nombre} - Enlace Caído [${hora}]`;
  } else {
    tipoClase = 'recovery';
    tituloHeader = `Enlace Restablecido - ${sucursalInfo.nombre}`;
    asunto = `[Restablecimiento] ${sucursalInfo.nombre} - Enlace Arriba [${hora}]`;
  }
  
  const sucursalTable = generateSucursalTable(sucursalInfo);
  const consolaTable = generateConsolaTable(consolaInfo);
  const internetTable = generateInternetTable(internetInfo);
  const incidentTable = generateIncidentTable(
    incidentInfo.confirmacionCaida,
    incidentInfo.confirmacionRecuperacion,
    incidentInfo.tiempoSinSistema
  );
  
  const contenidoTablas = sucursalTable + consolaTable + internetTable + incidentTable;
  
  const htmlContent = template
    .replace(/{{TITULO}}/g, asunto)
    .replace(/{{TIPO_CLASE}}/g, tipoClase)
    .replace(/{{TITULO_HEADER}}/g, tituloHeader)
    .replace(/{{FECHA_GENERACION}}/g, fecha)
    .replace(/{{CONTENIDO_TABLAS}}/g, contenidoTablas);
  
  return {
    subject: asunto,
    html: htmlContent
  };
}

// === FUNCIONES DE ESTADO (usando connectionManager) ===

async function initializeHostStates() {
  try {
    const [rows] = await connectionManager.executeQuery(
      'SELECT * FROM host_state',
      [],
      'state_management'
    );
    
    for (const row of rows) {
      hostsStatus[row.ip_id] = {
        state: row.state,
        unstableSince: row.unstable_since ? new Date(row.unstable_since).getTime() : null,
        downSince: row.down_since ? new Date(row.down_since).getTime() : null,
        upSince: row.up_since ? new Date(row.up_since).getTime() : null,
        notifySent: row.notify_sent,
        notifyTime: row.notify_sent ? Date.now() : null,
        lastCheckTime: Date.now(),
        lastStateChange: Date.now(),
        originalDownTime: row.down_since ? new Date(row.down_since).getTime() : null
      };
    }
    console.log(`Estados inicializados para ${rows.length} hosts usando conexiones persistentes`);
  } catch (error) {
    console.error('Error al inicializar estados de host:', error);
  }
}

async function logStateTransition(ipId, fromState, toState, details) {
  try {
    await connectionManager.executeQuery(
      `INSERT INTO state_transitions (ip_id, from_state, to_state, transition_time, details)
       VALUES (?, ?, ?, NOW(), ?)`,
      [ipId, fromState, toState, JSON.stringify(details)],
      'state_management'
    );
  } catch (error) {
    console.error('Error al guardar transición de estado:', error);
  }
}

async function persistHostState(ipId, state, unstableSince, downSince, upSince, notifySent) {
  try {
    await connectionManager.executeQuery(`
      INSERT INTO host_state (ip_id, state, unstable_since, down_since, up_since, notify_sent)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        state = VALUES(state),
        unstable_since = VALUES(unstable_since),
        down_since = VALUES(down_since),
        up_since = VALUES(up_since),
        notify_sent = VALUES(notify_sent),
        updated_at = CURRENT_TIMESTAMP
    `, [
      ipId,
      state,
      unstableSince ? new Date(unstableSince) : null,
      downSince ? new Date(downSince) : null,
      upSince ? new Date(upSince) : null,
      notifySent
    ], 'state_management');
  } catch (error) {
    console.error('Error al persistir el estado:', error);
    throw error;
  }
}

// === WORKER PRINCIPAL ===
async function startWorker(poolConnection) {
  console.log('Iniciando servicio de monitoreo con conexiones persistentes...');
  
  pool = poolConnection;
  connectionManager = new ConnectionManager(pool);

  // Configurar shutdown graceful
  process.on('SIGINT', async () => {
    console.log('Cerrando conexiones persistentes...');
    await connectionManager.closeAll();
    process.exit(0);
  });

  try {
    const [rows] = await connectionManager.executeQuery(
      "SELECT clave, valor FROM config WHERE clave IN ('minutos_consecutivos_requeridos', 'tiempo_ventana_minutos', 'intervalo_revision_minutos', 'tiempo_minimo_entre_correos', 'habilitar_estado_unstable', 'enviar_correos_unstable', 'debug_logging', 'latencia_maxima_aceptable')",
      [],
      'config'
    );
    
    rows.forEach(row => {
      switch(row.clave) {
        case 'minutos_consecutivos_requeridos':
          CONSECUTIVE_MINUTES_REQUIRED = parseInt(row.valor) || CONSECUTIVE_MINUTES_REQUIRED;
          break;
        case 'tiempo_ventana_minutos':
          SEQUENCE_WINDOW_MINUTES = parseInt(row.valor) || SEQUENCE_WINDOW_MINUTES;
          break;
        case 'intervalo_revision_minutos':
          CHECK_INTERVAL = (parseInt(row.valor) || (CHECK_INTERVAL/60000)) * 60 * 1000;
          break;
        case 'tiempo_minimo_entre_correos':
          config.tiempo_minimo_entre_correos = (parseInt(row.valor) || 5) * 60 * 1000;
          break;
        case 'habilitar_estado_unstable':
          config.habilitar_estado_unstable = row.valor.toLowerCase() === 'true';
          break;
        case 'enviar_correos_unstable':
          config.enviar_correos_unstable = row.valor.toLowerCase() === 'true';
          break;
        case 'debug_logging':
          config.debug_logging = row.valor.toLowerCase() === 'false';
          break;
        case 'latencia_maxima_aceptable':
          config.latencia_maxima_aceptable = parseInt(row.valor) || config.latencia_maxima_aceptable;
          break;
      }
    });
    
    if (config.debug_logging) {
      console.log('Configuración con conexiones persistentes:', {
        CONSECUTIVE_MINUTES_REQUIRED,
        SEQUENCE_WINDOW_MINUTES,
        CHECK_INTERVAL,
        maxConnections: connectionManager.maxConnections,
        ...config
      });
    }
  } catch (err) {
    console.error('Error leyendo configuración:', err);
  }

  await initializeHostStates();
  console.log('Estado inicial cargado con conexiones persistentes');

  setInterval(async () => {
    try {
      const [ips] = await connectionManager.executeQuery(
        'SELECT id, ip, name FROM ips',
        [],
        'main_loop'
      );
      
      // Procesar en lotes pequeños para no saturar
      const batchSize = 3;
      for (let i = 0; i < ips.length; i += batchSize) {
        const batch = ips.slice(i, i + batchSize);
        await Promise.all(batch.map(host => checkHost(host)));
        
        if (i + batchSize < ips.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    } catch (error) {
      console.error('Worker error:', error);
    }
  }, CHECK_INTERVAL);
}

async function evaluateWindowState(ipId, now) {
  const windowMinutes = SEQUENCE_WINDOW_MINUTES + 1;
  const windowStart = new Date(now - windowMinutes * 60 * 1000);
  
  try {
    const [logs] = await connectionManager.executeQuery(
      'SELECT success, fecha, UNIX_TIMESTAMP(fecha) * 1000 as timestamp FROM ping_logs WHERE ip_id = ? AND fecha >= ? ORDER BY fecha ASC',
      [ipId, windowStart],
      'window_evaluation'
    );
    
    const minutesMap = new Map();
    logs.forEach(log => {
      const minuteKey = Math.floor(log.timestamp / 60000);
      if (!minutesMap.has(minuteKey)) minutesMap.set(minuteKey, []);
      minutesMap.get(minuteKey).push(log.success);
    });
    
    const minuteStates = [];
    for (const [minute, arr] of minutesMap.entries()) {
      if (arr.every(s => s === 1)) minuteStates.push({ minute, state: 'OK' });
      else if (arr.every(s => s === 0)) minuteStates.push({ minute, state: 'FAIL' });
      else minuteStates.push({ minute, state: 'MIX' });
    }
    
    minuteStates.sort((a, b) => a.minute - b.minute);
    
    let blockOK = null, blockFAIL = null;
    for (let i = 0; i <= minuteStates.length - CONSECUTIVE_MINUTES_REQUIRED; i++) {
      const okBlock = minuteStates.slice(i, i + CONSECUTIVE_MINUTES_REQUIRED);
      if (okBlock.every(m => m.state === 'OK')) blockOK = okBlock;
      const failBlock = minuteStates.slice(i, i + CONSECUTIVE_MINUTES_REQUIRED);
      if (failBlock.every(m => m.state === 'FAIL')) blockFAIL = failBlock;
      if (blockOK || blockFAIL) break;
    }
    
    if (blockOK) {
      const firstBlockMinute = blockOK[0].minute * 60000;
      const lastFailed = await getLastFailedPing(ipId, firstBlockMinute);
      return { state: STATE_UP, lastFailed };
    } else if (blockFAIL) {
      const firstBlockMinute = blockFAIL[0].minute * 60000;
      const lastSuccess = await getLastSuccessfulPing(ipId, firstBlockMinute);
      return { state: STATE_DOWN, lastSuccess };
    } else {
      return { state: STATE_UNSTABLE };
    }
  } catch (error) {
    console.error(`Error evaluando estado de ventana para IP ${ipId}:`, error.message);
    return { state: STATE_UNSTABLE };
  }
}

async function checkHost({ id: ipId, ip, name }) {
  try {
    const [[lastLog]] = await connectionManager.executeQuery(
      'SELECT success, fecha, UNIX_TIMESTAMP(fecha) * 1000 as timestamp FROM ping_logs WHERE ip_id = ? ORDER BY fecha DESC LIMIT 1',
      [ipId],
      'host_checking'
    );
    
    if (!lastLog) return;

    const now = lastLog.timestamp;
    
    if (!hostsStatus[ipId]) {
      try {
        const [[row]] = await connectionManager.executeQuery(
          'SELECT * FROM host_state WHERE ip_id = ?',
          [ipId],
          'state_management'
        );
        
        if (row) {
          hostsStatus[ipId] = {
            state: row.state,
            unstableSince: row.unstable_since ? new Date(row.unstable_since).getTime() : null,
            downSince: row.down_since ? new Date(row.down_since).getTime() : null,
            upSince: row.up_since ? new Date(row.up_since).getTime() : null,
            notifySent: row.notify_sent,
            notifyTime: row.notify_sent ? Date.now() : null,
            lastCheckTime: Date.now(),
            lastStateChange: Date.now(),
            originalDownTime: row.down_since ? new Date(row.down_since).getTime() : null
          };
        } else {
          hostsStatus[ipId] = {
            state: STATE_UP,
            unstableSince: null,
            downSince: null,
            upSince: now,
            notifySent: false,
            notifyTime: null,
            lastCheckTime: Date.now(),
            lastStateChange: Date.now(),
            originalDownTime: null
          };
          await connectionManager.executeQuery(
            `INSERT INTO host_state (ip_id, state, up_since) VALUES (?, ?, NOW())`,
            [ipId, STATE_UP],
            'state_management'
          );
        }
      } catch (error) {
        console.error('Error al verificar estado en BD:', error);
      }
    }

    const evalResult = await evaluateWindowState(ipId, now);
    let newState = { ...hostsStatus[ipId] };
    let changed = false;

    switch (evalResult.state) {
      case STATE_UP:
        if (newState.state !== STATE_UP) {
          newState = {
            ...newState,
            state: STATE_UP,
            unstableSince: null,
            downSince: null,
            upSince: now,
            notifySent: false
          };
          changed = true;
          await logStateTransition(ipId, hostsStatus[ipId].state, STATE_UP, evalResult);
          
          try {
            const sucursalInfo = await getSucursalInfo(ipId);
            const consolaInfo = await getConsolaInfo(ipId);
            const internetInfo = await getInternetInfo(ipId);
            
            const currentState = hostsStatus[ipId];
            let tiempoSinSistema = 'No calculado';
            
            if (currentState.originalDownTime) {
              tiempoSinSistema = formatDuration(currentState.originalDownTime, now);
            }
            
            const incidentInfo = {
              confirmacionCaida: currentState.originalDownTime ? formatDate(new Date(currentState.originalDownTime)) : 'No disponible',
              confirmacionRecuperacion: formatDate(new Date(now)),
              tiempoSinSistema: tiempoSinSistema
            };
            
            const emailData = await generateEmailHTML('recuperacion', sucursalInfo, consolaInfo, internetInfo, incidentInfo);
            await sendMonitoringEmail(emailData.subject, emailData.html);
            
          } catch (emailError) {
            console.error('Error generando correo de recuperación:', emailError);
            await sendMonitoringEmail(
              `RECUPERADO: ${name} - Sistema Restablecido`,
              `<p>Sistema restablecido: ${name} (${ip}) a las ${formatDate(new Date(now))}</p>`
            );
          }
        }
        break;
        
      case STATE_DOWN:
        if (newState.state !== STATE_DOWN) {
          newState = {
            ...newState,
            state: STATE_DOWN,
            unstableSince: null,
            downSince: now,
            upSince: null,
            notifySent: false,
            originalDownTime: now
          };
          changed = true;
          await logStateTransition(ipId, hostsStatus[ipId].state, STATE_DOWN, evalResult);
          
          try {
            const sucursalInfo = await getSucursalInfo(ipId);
            const consolaInfo = await getConsolaInfo(ipId);
            const internetInfo = await getInternetInfo(ipId);
            
            const incidentInfo = {
              confirmacionCaida: formatDate(new Date(now)),
              confirmacionRecuperacion: null,
              tiempoSinSistema: null
            };
            
            const emailData = await generateEmailHTML('caida', sucursalInfo, consolaInfo, internetInfo, incidentInfo);
            await sendMonitoringEmail(emailData.subject, emailData.html);
            
          } catch (emailError) {
            console.error('Error generando correo de caída:', emailError);
            await sendMonitoringEmail(
              `ALERTA: ${name} - Sistema Caído`,
              `<p>Sistema caído: ${name} (${ip}) a las ${formatDate(new Date(now))}</p>`
            );
          }
        }
        break;
    }
    
    if (changed) {
      hostsStatus[ipId] = newState;
      console.log(`Estado actual de ${name} (${ip}):`);
      console.log(`  - Estado: ${newState.state}`);
      console.log(`  - Inestabilidad: ${newState.unstableSince ? formatDate(new Date(newState.unstableSince)) : 'NULL'}`);
      console.log(`  - Caída: ${newState.downSince ? formatDate(new Date(newState.downSince)) : 'NULL'}`);
      console.log(`  - Recuperación: ${newState.upSince ? formatDate(newState.upSince ? new Date(newState.upSince) : null) : 'NULL'}`);
      console.log(`  - Notificación: ${newState.notifySent || 'NULL'}`);
      
      await persistHostState(
        ipId,
        newState.state,
        newState.unstableSince,
        newState.downSince,
        newState.upSince,
        newState.notifySent
      );
    }
  } catch (error) {
    console.error(`Error procesando el host ${name} (${ip}):`, error);
  }
}

module.exports = { startWorker };
