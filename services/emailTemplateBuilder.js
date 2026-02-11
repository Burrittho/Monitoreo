/**
 * Email Template Builder - Construcción de emails HTML para alertas de monitoreo
 * Genera el contenido HTML para correos de caída y recuperación de servicios
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Formatea una fecha para mostrar en el email
 */
function formatDate(dateValue) {
  if (!dateValue) return 'No disponible';
  try {
    if (typeof dateValue === 'string') {
      return new Date(dateValue).toLocaleString('es-ES');
    }
    return dateValue.toLocaleString('es-ES');
  } catch (error) {
    return 'Fecha inválida';
  }
}

/**
 * Calcula y formatea la duración entre dos timestamps
 */
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

/**
 * Carga la plantilla HTML base
 */
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

/**
 * Genera la tabla de información de sucursal
 */
function generateSucursalTable(sucursalInfo) {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px;">
      <tr>
        <td style="background-color: #495057; color: #ffffff; padding: 15px 25px; font-size: 18px; font-weight: 600;">
          SUCURSAL
        </td>
      </tr>
      <tr>
        <td style="padding: 15px 25px; background-color: #e9ecef; border-left: 3px solid #6c757d;">
          <strong>Dirección:</strong> ${sucursalInfo.direccion}<br>
          <strong>URL Maps:</strong> <a href="${sucursalInfo.urlMaps}" style="color: #3498db; text-decoration: none;" target="_blank">Ver en Maps</a>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Genera la tabla de información de consola
 */
function generateConsolaTable(consolaInfo) {
  const hasData = consolaInfo.ip !== 'No disponible' && consolaInfo.mac !== 'No disponible' && consolaInfo.url !== 'No disponible';
  
  if (!hasData) {
    return `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px;">
        <tr>
          <td style="background-color: #495057; color: #ffffff; padding: 15px 25px; font-size: 18px; font-weight: 600;">
            CONSOLA
          </td>
        </tr>
        <tr>
          <td style="padding: 20px 25px; text-align: center; color: #7f8c8d; font-style: italic; background-color: #f8f9fa;">
            No hay información de consola disponible para esta IP
          </td>
        </tr>
      </table>
    `;
  }
  
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px;">
      <tr>
        <td style="background-color: #495057; color: #ffffff; padding: 15px 25px; font-size: 18px; font-weight: 600;">
          CONSOLA
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #dee2e6; margin-bottom: 25px;">
      <thead>
        <tr style="background-color: #495057;">
          <th style="padding: 12px; color: #ffffff; text-align: left; font-weight: 600; border-right: 1px solid #6c757d;">IP</th>
          <th style="padding: 12px; color: #ffffff; text-align: left; font-weight: 600; border-right: 1px solid #6c757d;">MAC</th>
          <th style="padding: 12px; color: #ffffff; text-align: left; font-weight: 600;">URL</th>
        </tr>
      </thead>
      <tbody>
        <tr style="background-color: #f8f9fa;">
          <td style="padding: 10px; border-right: 1px solid #dee2e6;">${consolaInfo.ip}</td>
          <td style="padding: 10px; border-right: 1px solid #dee2e6;">${consolaInfo.mac}</td>
          <td style="padding: 10px;"><a href="${consolaInfo.url}" target="_blank" style="color: #3498db; text-decoration: none;">${consolaInfo.url}</a></td>
        </tr>
      </tbody>
    </table>
  `;
}

/**
 * Genera la tabla de información de internet
 */
function generateInternetTable(internetInfo) {
  let conexionesHtml = '';
  
  if (internetInfo.conexiones.length > 0) {
    internetInfo.conexiones.forEach((conexion, index) => {
      const estado = (conexion.estado || '').toLowerCase();
      let estadoBadge = '';
      
      if (estado.includes('sin conexion') || estado.includes('down') || estado.includes('offline')) {
        estadoBadge = `<span style="background-color: #dc3545; color: #ffffff; padding: 4px 8px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${conexion.estado}</span>`;
      } else if (estado.includes('verificar') || estado.includes('warning') || estado.includes('timeout')) {
        estadoBadge = `<span style="background-color: #ffc107; color: #000000; padding: 4px 8px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${conexion.estado}</span>`;
      } else {
        estadoBadge = `<span style="background-color: #28a745; color: #ffffff; padding: 4px 8px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${conexion.estado}</span>`;
      }
      
      const bgColor = index % 2 === 0 ? '#f8f9fa' : '#ffffff';
      
      conexionesHtml += `
        <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #dee2e6; margin-bottom: 15px;">
          <thead>
            <tr style="background-color: #6c757d;">
              <th style="padding: 12px; color: #ffffff; text-align: left; font-weight: 600; border-right: 1px solid #5a6268;">Proveedor</th>
              <th style="padding: 12px; color: #ffffff; text-align: left; font-weight: 600; border-right: 1px solid #5a6268;">Puerto</th>
              <th style="padding: 12px; color: #ffffff; text-align: left; font-weight: 600; border-right: 1px solid #5a6268;">Configuración</th>
              <th style="padding: 12px; color: #ffffff; text-align: left; font-weight: 600; border-right: 1px solid #5a6268;">IP</th>
              <th style="padding: 12px; color: #ffffff; text-align: left; font-weight: 600;">Estado (Último Check)</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background-color: ${bgColor};">
              <td style="padding: 10px; border-right: 1px solid #dee2e6;">${conexion.proveedor}</td>
              <td style="padding: 10px; border-right: 1px solid #dee2e6;">${conexion.puerto}</td>
              <td style="padding: 10px; border-right: 1px solid #dee2e6;">${conexion.configuracion}</td>
              <td style="padding: 10px; border-right: 1px solid #dee2e6;">${conexion.ip}</td>
              <td style="padding: 10px;">${estadoBadge}</td>
            </tr>
          </tbody>
        </table>
      `;
    });
  } else {
    conexionesHtml = `
      <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #dee2e6; margin-bottom: 15px;">
        <tbody>
          <tr>
            <td style="padding: 20px; text-align: center; color: #7f8c8d; font-style: italic; background-color: #f8f9fa;">
              No hay información de conexiones disponible
            </td>
          </tr>
        </tbody>
      </table>
    `;
  }
  
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px;">
      <tr>
        <td style="background-color: #495057; color: #ffffff; padding: 15px 25px; font-size: 18px; font-weight: 600;">
          INTERNET
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #dee2e6; margin-bottom: 20px;">
      <thead>
        <tr style="background-color: #495057;">
          <th style="padding: 12px; color: #ffffff; text-align: left; font-weight: 600; border-right: 1px solid #6c757d;">Proveedor Primario</th>
          <th style="padding: 12px; color: #ffffff; text-align: left; font-weight: 600; border-right: 1px solid #6c757d;">Cuenta Primario</th>
          <th style="padding: 12px; color: #ffffff; text-align: left; font-weight: 600; border-right: 1px solid #6c757d;">Proveedor Secundario</th>
          <th style="padding: 12px; color: #ffffff; text-align: left; font-weight: 600;">Cuenta Secundario</th>
        </tr>
      </thead>
      <tbody>
        <tr style="background-color: #f8f9fa;">
          <td style="padding: 10px; border-right: 1px solid #dee2e6;">${internetInfo.proveedores.primario}</td>
          <td style="padding: 10px; border-right: 1px solid #dee2e6;">${internetInfo.proveedores.cuentaPrimario}</td>
          <td style="padding: 10px; border-right: 1px solid #dee2e6;">${internetInfo.proveedores.secundario}</td>
          <td style="padding: 10px;">${internetInfo.proveedores.cuentaSecundario}</td>
        </tr>
      </tbody>
    </table>
    ${conexionesHtml}
  `;
}

/**
 * Genera la tabla de detalles del incidente
 */
function generateIncidentTable(confirmacionCaida, confirmacionRecuperacion = null, tiempoSinSistema = null) {
  let recuperacionSection = '';
  if (confirmacionRecuperacion) {
    recuperacionSection = `
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #d4edda; border: 1px solid #c3e6cb; margin-bottom: 15px;">
        <tr>
          <td style="padding: 15px; border-left: 4px solid #28a745;">
            <strong style="color: #155724;">Confirmación de Restablecimiento:</strong><br>
            <span style="color: #155724; font-size: 16px;">${confirmacionRecuperacion}</span>
          </td>
        </tr>
      </table>
      
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff3cd; border: 1px solid #ffc107; margin-bottom: 15px;">
        <tr>
          <td style="padding: 15px; border-left: 4px solid #ffc107;">
            <strong style="color: #856404;">Tiempo sin sistema:</strong><br>
            <span style="color: #dc3545; font-weight: bold; font-size: 18px;">${tiempoSinSistema || 'No calculado'}</span>
          </td>
        </tr>
      </table>
    `;
  }
  
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px;">
      <tr>
        <td style="background-color: #495057; color: #ffffff; padding: 15px 25px; font-size: 18px; font-weight: 600;">
          DETALLES DEL INCIDENTE
        </td>
      </tr>
    </table>
    
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8d7da; border: 1px solid #f5c6cb; margin-bottom: 15px;">
      <tr>
        <td style="padding: 15px; border-left: 4px solid #dc3545;">
          <strong style="color: #721c24;">Confirmación de caída:</strong><br>
          <span style="color: #721c24; font-size: 16px;">${confirmacionCaida}</span>
        </td>
      </tr>
    </table>
    
    ${recuperacionSection}
  `;
}

/**
 * Genera el HTML completo del email
 * @param {string} tipo - 'caida' o 'recuperacion'
 * @param {Object} sucursalInfo - Información de la sucursal
 * @param {Object} consolaInfo - Información de la consola
 * @param {Object} internetInfo - Información de internet
 * @param {Object} incidentInfo - Información del incidente (confirmacionCaida, confirmacionRecuperacion, tiempoSinSistema)
 * @returns {Object} { subject, html }
 */
async function buildIncidentEmail(tipo, sucursalInfo, consolaInfo, internetInfo, incidentInfo) {
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

module.exports = {
  buildIncidentEmail,
  formatDate,
  formatDuration
};
