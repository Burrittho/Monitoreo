const { sendMonitoringEmail } = require('../services/emailService');
const fs = require('fs').promises;
const path = require('path');

// Variable para el pool de conexiones
let pool = null;

// Configuración de intervalos
let CHECK_INTERVAL = 30000; // valor por defecto, se sobrescribe por config

// Número de minutos consecutivos requeridos para cambio de estado
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

// --- HELPERS PARA ENCONTRAR MOMENTOS EXACTOS DE TRANSICIÓN ---
// Obtener el último ping exitoso antes de una fecha específica
async function getLastSuccessfulPing(ipId, beforeTime) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT fecha, UNIX_TIMESTAMP(fecha) * 1000 as timestamp, 
       CASE WHEN latency IS NOT NULL THEN latency ELSE 0 END as latency
       FROM ping_logs WHERE ip_id = ? AND success = 1 AND fecha < ? ORDER BY fecha DESC LIMIT 1`,
      [ipId, new Date(beforeTime)]
    );
    if (rows.length > 0) {
      return rows[0];
    }
    return { fecha: new Date(beforeTime), timestamp: beforeTime, latency: 0 };
  } finally {
    conn.release();
  }
}

// Obtener el último ping fallido antes de una fecha específica  
async function getLastFailedPing(ipId, beforeTime) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT fecha, UNIX_TIMESTAMP(fecha) * 1000 as timestamp, 
       CASE WHEN latency IS NOT NULL THEN latency ELSE 'timeout' END as latency
       FROM ping_logs WHERE ip_id = ? AND success = 0 AND fecha < ? ORDER BY fecha DESC LIMIT 1`,
      [ipId, new Date(beforeTime)]
    );
    if (rows.length > 0) {
      return rows[0];
    }
    return { fecha: new Date(beforeTime), timestamp: beforeTime, latency: 'timeout' };
  } finally {
    conn.release();
  }
}

// Función para formatear una fecha en formato corto
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

// Función para calcular y formatear el tiempo transcurrido entre dos fechas
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
    
    // Formatear la salida de manera elegante
    if (result.length === 1) return result[0];
    if (result.length === 2) return result.join(' y ');
    
    const last = result.pop();
    return result.join(', ') + ' y ' + last;
    
  } catch (error) {
    return 'Error calculando tiempo';
  }
}

// --- FUNCIONES PARA CONSULTAR DATOS DE LAS TABLAS ---

// Consultar información de sucursal
async function getSucursalInfo(ipId) {
  const conn = await pool.getConnection();
  try {
    // Primero obtenemos la información básica del host
    const [[ipInfo]] = await conn.query(
      'SELECT ip, name FROM ips WHERE id = ?',
      [ipId]
    );
    
    // Obtenemos información de la sucursal usando la relación correcta
    // sucursal_id en proveedores_internet es FK de id en ips
    const [[proveedorInfo]] = await conn.query(
      `SELECT p.Direccion, p.Colonia, p.Ciudad, p.Estado, p.maps 
       FROM proveedores_internet p 
       WHERE p.sucursal_id = ?`,
      [ipId]
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
  } finally {
    conn.release();
  }
}

// Consultar información de licencia/consola
async function getConsolaInfo(ipId) {
  const conn = await pool.getConnection();
  try {
    const [[licenciaInfo]] = await conn.query(
      `SELECT ip_id, mac, url, expiracion 
       FROM licencia 
       WHERE ip_id = ? 
       ORDER BY fecha DESC LIMIT 1`,
      [ipId]
    );
    
    if (licenciaInfo) {
      const [[ipInfo]] = await conn.query('SELECT ip FROM ips WHERE id = ?', [ipId]);
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
  } finally {
    conn.release();
  }
}

// Consultar información de internet y check_internet
async function getInternetInfo(ipId) {
  const conn = await pool.getConnection();
  try {
    // Información de proveedores usando la relación correcta
    const [[proveedorInfo]] = await conn.query(
      `SELECT p.proveedor_primario, p.cuenta_primario, p.proveedor_secundario, p.cuenta_secundario
       FROM proveedores_internet p 
       WHERE p.sucursal_id = ?`,
      [ipId]
    );
    
    // Información de check_internet (últimos datos)
    const [[checkInfo]] = await conn.query(
      `SELECT proveedor1, interfaz1, tipo1, ip1, trazado1, 
              proveedor2, interfaz2, tipo2, ip2, trazado2
       FROM check_internet 
       WHERE ip_id = ? 
       ORDER BY fecha DESC LIMIT 1`,
      [ipId]
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
  } finally {
    conn.release();
  }
}

// --- FUNCIONES PARA GENERAR HTML ---

// Cargar plantilla HTML
async function loadEmailTemplate() {
  try {
    const templatePath = path.join(__dirname, '..', 'templates', 'email-template.html');
    const template = await fs.readFile(templatePath, 'utf8');
    return template;
  } catch (error) {
    console.error('Error al cargar plantilla HTML:', error);
    // Plantilla de respaldo simple
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

// Generar tabla de sucursal
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

// Generar tabla de consola
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

// Generar tabla de internet
function generateInternetTable(internetInfo) {
  let conexionesHtml = '';
  
  if (internetInfo.conexiones.length > 0) {
    internetInfo.conexiones.forEach((conexion, index) => {
      // Determinar clase de estado basada en valores comunes
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

// Generar tabla de detalles del incidente
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

// Generar correo HTML completo
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
  
  // Generar todas las tablas
  const sucursalTable = generateSucursalTable(sucursalInfo);
  const consolaTable = generateConsolaTable(consolaInfo);
  const internetTable = generateInternetTable(internetInfo);
  const incidentTable = generateIncidentTable(
    incidentInfo.confirmacionCaida,
    incidentInfo.confirmacionRecuperacion,
    incidentInfo.tiempoSinSistema
  );
  
  const contenidoTablas = sucursalTable + consolaTable + internetTable + incidentTable;
  
  // Reemplazar placeholders en la plantilla
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

// Inicializa desde la DB
async function initializeHostStates() {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query('SELECT * FROM host_state');
    for (const row of rows) {
      hostsStatus[row.ip_id] = {
        state: row.state,
        unstableSince: row.unstable_since ? new Date(row.unstable_since).getTime() : null,
        downSince: row.down_since ? new Date(row.down_since).getTime() : null,
        upSince: row.up_since ? new Date(row.up_since).getTime() : null,
        notifySent: row.notify_sent,
        notifyTime: row.notify_sent ? Date.now() : null, // Cuando se envió la última notificación
        lastCheckTime: Date.now(),
        lastStateChange: Date.now(), // Cuándo fue el último cambio de estado
        originalDownTime: row.down_since ? new Date(row.down_since).getTime() : null // Fecha original de caída
      };
    }
    console.log(`Estados inicializados para ${rows.length} hosts`);
  } catch (error) {
    console.error('Error al inicializar estados de host:', error);
  } finally {
    connection.release();
  }
}

// Guardar transición de estado en log
async function logStateTransition(ipId, fromState, toState, details) {
  const conn = await pool.getConnection();
  try {
    await conn.query(
      `INSERT INTO state_transitions (ip_id, from_state, to_state, transition_time, details)
       VALUES (?, ?, ?, NOW(), ?)`,
      [ipId, fromState, toState, JSON.stringify(details)]
    );
  } catch (error) {
    console.error('Error al guardar transición de estado:', error);
  } finally {
    conn.release();
  }
}

// Persiste el cambio de estado
async function persistHostState(ipId, state, unstableSince, downSince, upSince, notifySent) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(`
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
    ]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error('Error al persistir el estado:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Worker principal
async function startWorker(poolConnection) {
  console.log('Iniciando servicio de monitoreo de estado...');
  
  // Asignar el pool recibido al módulo
  pool = poolConnection;

  // Leer configuración dinámica desde la base de datos
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query(
      "SELECT clave, valor FROM config WHERE clave IN ('minutos_consecutivos_requeridos', 'tiempo_ventana_minutos', 'intervalo_revision_minutos', 'tiempo_minimo_entre_correos', 'habilitar_estado_unstable', 'enviar_correos_unstable', 'debug_logging', 'latencia_maxima_aceptable')"
    );
    conn.release();
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
      console.log('Configuración dinámica aplicada:', {
        CONSECUTIVE_MINUTES_REQUIRED,
        SEQUENCE_WINDOW_MINUTES,
        CHECK_INTERVAL,
        ...config
      });
    }
  } catch (err) {
    console.error('Error leyendo configuración dinámica :', err);
  }

  await initializeHostStates();
  console.log('Estado inicial de hosts cargado desde DB');

  setInterval(async () => {
    try {
      const connection = await pool.getConnection();
      const [ips] = await connection.query('SELECT id, ip, name FROM ips');
      connection.release();
      await Promise.all(ips.map(host => checkHost(host)));
    } catch (error) {
      console.error('Worker error:', error);
    }
  }, CHECK_INTERVAL);
}

// --- MÁQUINA DE ESTADOS CON TODAS LAS TRANSICIONES ---
// Evalúa la ventana de N+1 minutos y retorna el nuevo estado y los timestamps relevantes
async function evaluateWindowState(ipId, now) {
  const windowMinutes = SEQUENCE_WINDOW_MINUTES + 1;
  const windowStart = new Date(now - windowMinutes * 60 * 1000);
  const conn = await pool.getConnection();
  try {
    const [logs] = await conn.query(
      'SELECT success, fecha, UNIX_TIMESTAMP(fecha) * 1000 as timestamp FROM ping_logs WHERE ip_id = ? AND fecha >= ? ORDER BY fecha ASC',
      [ipId, windowStart]
    );
    // Agrupa por minuto
    const minutesMap = new Map();
    logs.forEach(log => {
      const minuteKey = Math.floor(log.timestamp / 60000);
      if (!minutesMap.has(minuteKey)) minutesMap.set(minuteKey, []);
      minutesMap.get(minuteKey).push(log.success);
    });
    // Para cada minuto, si todos los pings son éxito, es minuto OK; si todos son fallo, es minuto FAIL; si mezcla, es MIX
    const minuteStates = [];
    for (const [minute, arr] of minutesMap.entries()) {
      if (arr.every(s => s === 1)) minuteStates.push({ minute, state: 'OK' });
      else if (arr.every(s => s === 0)) minuteStates.push({ minute, state: 'FAIL' });
      else minuteStates.push({ minute, state: 'MIX' });
    }
    // Ordena por minuto ascendente
    minuteStates.sort((a, b) => a.minute - b.minute);
    // Busca bloques de N minutos consecutivos de OK o FAIL
    let blockOK = null, blockFAIL = null;
    for (let i = 0; i <= minuteStates.length - CONSECUTIVE_MINUTES_REQUIRED; i++) {
      const okBlock = minuteStates.slice(i, i + CONSECUTIVE_MINUTES_REQUIRED);
      if (okBlock.every(m => m.state === 'OK')) blockOK = okBlock;
      const failBlock = minuteStates.slice(i, i + CONSECUTIVE_MINUTES_REQUIRED);
      if (failBlock.every(m => m.state === 'FAIL')) blockFAIL = failBlock;
      if (blockOK || blockFAIL) break;
    }
    if (blockOK) {
      // Estado UP, busca el último ping fallido antes del bloque
      const firstBlockMinute = blockOK[0].minute * 60000;
      const lastFailed = await getLastFailedPing(ipId, firstBlockMinute);
      return { state: STATE_UP, lastFailed };
    } else if (blockFAIL) {
      // Estado DOWN, busca el último ping exitoso antes del bloque
      const firstBlockMinute = blockFAIL[0].minute * 60000;
      const lastSuccess = await getLastSuccessfulPing(ipId, firstBlockMinute);
      return { state: STATE_DOWN, lastSuccess };
    } else {
      // Estado UNSTABLE
      return { state: STATE_UNSTABLE };
    }
  } finally {
    conn.release();
  }
}
async function checkHost({ id: ipId, ip, name }) {
  let conn;
  try {
    conn = await pool.getConnection();
    const [[lastLog]] = await conn.query(
      'SELECT success, fecha, UNIX_TIMESTAMP(fecha) * 1000 as timestamp FROM ping_logs WHERE ip_id = ? ORDER BY fecha DESC LIMIT 1',
      [ipId]
    );
    conn.release();
    conn = null;
    if (!lastLog) return;

    const now = lastLog.timestamp;
    
    // Verificar si hay un estado existente para este host, si no, crear uno nuevo
    if (!hostsStatus[ipId]) {
      // Intentar obtener el último estado registrado en la BD
      const connection = await pool.getConnection();
      try {
        const [[row]] = await connection.query('SELECT * FROM host_state WHERE ip_id = ?', [ipId]);
        if (row) {
          hostsStatus[ipId] = {
            state: row.state,
            unstableSince: row.unstable_since ? new Date(row.unstable_since).getTime() : null,
            downSince: row.down_since ? new Date(row.down_since).getTime() : null,
            upSince: row.up_since ? new Date(row.up_since).getTime() : null,
            notifySent: row.notify_sent,
            notifyTime: row.notify_sent ? Date.now() : null, // Cuando se envió la última notificación
            lastCheckTime: Date.now(),
            lastStateChange: Date.now(), // Cuándo fue el último cambio de estado
            originalDownTime: row.down_since ? new Date(row.down_since).getTime() : null // Fecha original de caída
          };
        } else {
          // Si no hay estado en la BD, inicializar como UP
          hostsStatus[ipId] = {
            state: STATE_UP,
            unstableSince: null,
            downSince: null,
            upSince: now,
            notifySent: false,
            notifyTime: null,
            lastCheckTime: Date.now(),
            lastStateChange: Date.now(),
            originalDownTime: null // Fecha original de caída
          };
          await connection.query(
            `INSERT INTO host_state (ip_id, state, up_since)
             VALUES (?, ?, NOW())`,
            [ipId, STATE_UP]
          );
        }
      } catch (error) {
        console.error('Error al verificar estado en BD:', error);
      } finally {
        connection.release();
      }
    }

    const evalResult = await evaluateWindowState(ipId, now);
    let newState = { ...hostsStatus[ipId] };
    let changed = false;

    switch (evalResult.state) {
      case STATE_UP:
        if (newState.state !== STATE_UP) {
          // Transición a UP
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
          
          // Generar correo HTML de recuperación
          try {
            const sucursalInfo = await getSucursalInfo(ipId);
            const consolaInfo = await getConsolaInfo(ipId);
            const internetInfo = await getInternetInfo(ipId);
            
            // Calcular tiempo sin sistema
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
            // Fallback al correo simple
            await sendMonitoringEmail(
              `RECUPERADO: ${name} - Sistema Restablecido`,
              `<p>Sistema restablecido: ${name} (${ip}) a las ${formatDate(new Date(now))}</p>`
            );
          }
        }
        break;
      case STATE_DOWN:
        if (newState.state !== STATE_DOWN) {
          // Transición a DOWN
          newState = {
            ...newState,
            state: STATE_DOWN,
            unstableSince: null,
            downSince: now,
            upSince: null,
            notifySent: false,
            originalDownTime: now  // Guardar la fecha original de caída
          };
          changed = true;
          await logStateTransition(ipId, hostsStatus[ipId].state, STATE_DOWN, evalResult);
          
          // Generar correo HTML de caída
          try {
            const sucursalInfo = await getSucursalInfo(ipId);
            const consolaInfo = await getConsolaInfo(ipId);
            const internetInfo = await getInternetInfo(ipId);
            
            const incidentInfo = {
              confirmacionCaida: formatDate(new Date(now)),
              confirmacionRecuperacion: null,
              tiempoSinSistema: null  // No aplica en correos de caída
            };
            
            const emailData = await generateEmailHTML('caida', sucursalInfo, consolaInfo, internetInfo, incidentInfo);
            await sendMonitoringEmail(emailData.subject, emailData.html);
            
          } catch (emailError) {
            console.error('Error generando correo de caída:', emailError);
            // Fallback al correo simple
            await sendMonitoringEmail(
              `ALERTA: ${name} - Sistema Caído`,
              `<p>Sistema caído: ${name} (${ip}) a las ${formatDate(new Date(now))}</p>`
            );
          }
        }
        break;
      default:
        // No acción
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
  } finally {
    if (conn) conn.release();
  }
}

// Exportar la función principal para que pueda ser utilizada en server.js
module.exports = { startWorker };
