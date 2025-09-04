// Script de prueba para verificar la generación de correos HTML
const fs = require('fs').promises;
const path = require('path');

// Simular las funciones del mailcontroller
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

// Cargar plantilla HTML
async function loadEmailTemplate() {
  try {
    const templatePath = path.join(__dirname, 'templates', 'email-template.html');
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

// Datos de prueba
const datosEjemplo = {
  sucursal: {
    nombre: 'Sucursal #59',
    ip: '192.168.59.1',
    direccion: 'Av. Principal 123, Centro, Ciudad Ejemplo, Estado',
    urlMaps: 'https://maps.google.com/?q=Av.+Principal+123'
  },
  consola: {
    ip: '192.168.59.1',
    mac: '00:1B:44:11:3A:B7',
    url: 'https://consola.ejemplo.com/admin'
  },
  internet: {
    proveedores: {
      primario: 'Telnor',
      cuentaPrimario: '12345678',
      secundario: 'TotalPlay',
      cuentaSecundario: '87654321'
    },
    conexiones: [
      {
        proveedor: 'Telnor',
        puerto: 'GigabitEthernet0/0/1',
        configuracion: 'DHCP',
        ip: '200.123.45.67',
        estado: 'UP'
      },
      {
        proveedor: 'TotalPlay',
        puerto: 'GigabitEthernet0/0/2',
        configuracion: 'PPPoE',
        ip: '201.98.76.54',
        estado: 'DOWN'
      }
    ]
  },
  incidente: {
    pings: [
      { fecha: '4/9/2025, 1:05:30 p.m.', estado: 'Fallido', latencia: 'Timeout' },
      { fecha: '4/9/2025, 1:05:31 p.m.', estado: 'Fallido', latencia: 'Timeout' },
      { fecha: '4/9/2025, 1:05:32 p.m.', estado: 'Exitoso', latencia: '45ms' },
      { fecha: '4/9/2025, 1:05:33 p.m.', estado: 'Exitoso', latencia: '38ms' },
      { fecha: '4/9/2025, 1:05:34 p.m.', estado: 'Exitoso', latencia: '42ms' }
    ],
    confirmacionCaida: '4/9/2025, 1:00:00 p.m.',
    pingsRecuperacion: [
      { fecha: '4/9/2025, 1:10:30 p.m.', estado: 'Exitoso', latencia: '35ms' },
      { fecha: '4/9/2025, 1:10:31 p.m.', estado: 'Exitoso', latencia: '41ms' },
      { fecha: '4/9/2025, 1:10:32 p.m.', estado: 'Exitoso', latencia: '38ms' }
    ],
    confirmacionRecuperacion: '4/9/2025, 1:10:35 p.m.'
  }
};

// Funciones para generar las tablas (copiadas del mailcontroller)
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
            <td>${consolaInfo.url}</td>
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

function generateIncidentTable(pings, confirmacionCaida, pingsRecuperacion = null, confirmacionRecuperacion = null) {
  let pingsHtml = '';
  
  pings.forEach(ping => {
    const estadoClass = ping.estado === 'Exitoso' ? 'ping-success' : 'ping-failed';
    pingsHtml += `
      <tr>
        <td>${ping.fecha}</td>
        <td><span class="${estadoClass}">${ping.estado}</span></td>
        <td>${ping.latencia}</td>
      </tr>
    `;
  });
  
  let recuperacionSection = '';
  if (pingsRecuperacion && confirmacionRecuperacion) {
    let pingsRecuperacionHtml = '';
    pingsRecuperacion.forEach(ping => {
      const estadoClass = ping.estado === 'Exitoso' ? 'ping-success' : 'ping-failed';
      pingsRecuperacionHtml += `
        <tr>
          <td>${ping.fecha}</td>
          <td><span class="${estadoClass}">${ping.estado}</span></td>
          <td>${ping.latencia}</td>
        </tr>
      `;
    });
    
    recuperacionSection = `
      <h4>Últimos 10 pings después de restablecimiento:</h4>
      <table class="table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Estado</th>
            <th>Latencia</th>
          </tr>
        </thead>
        <tbody>
          ${pingsRecuperacionHtml}
        </tbody>
      </table>
      
      <h4>Confirmación de Restablecimiento:</h4>
      <table class="table">
        <tbody>
          <tr>
            <td><strong>Fecha y hora:</strong></td>
            <td>${confirmacionRecuperacion}</td>
          </tr>
        </tbody>
      </table>
    `;
  }
  
  return `
    <div class="section">
      <div class="section-title">Detalles del Incidente</div>
      
      <h4>Últimos 10 pings:</h4>
      <table class="table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Estado</th>
            <th>Latencia</th>
          </tr>
        </thead>
        <tbody>
          ${pingsHtml}
        </tbody>
      </table>
      
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
    incidentInfo.pings,
    incidentInfo.confirmacionCaida,
    incidentInfo.pingsRecuperacion,
    incidentInfo.confirmacionRecuperacion
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

// Función principal de prueba
async function testEmails() {
  try {
    console.log('🧪 Generando correos de prueba...\n');
    
    // Probar correo de caída
    const emailCaida = await generateEmailHTML('caida', datosEjemplo.sucursal, datosEjemplo.consola, datosEjemplo.internet, datosEjemplo.incidente);
    await fs.writeFile('test-email-caida.html', emailCaida.html, 'utf8');
    console.log('✅ Correo de caída generado: test-email-caida.html');
    console.log('📧 Asunto:', emailCaida.subject, '\n');
    
    // Probar correo de recuperación
    const emailRecuperacion = await generateEmailHTML('recuperacion', datosEjemplo.sucursal, datosEjemplo.consola, datosEjemplo.internet, datosEjemplo.incidente);
    await fs.writeFile('test-email-recuperacion.html', emailRecuperacion.html, 'utf8');
    console.log('✅ Correo de recuperación generado: test-email-recuperacion.html');
    console.log('📧 Asunto:', emailRecuperacion.subject, '\n');
    
    console.log('🎉 ¡Pruebas completadas exitosamente!');
    console.log('📁 Archivos HTML generados para visualizar en el navegador');
    
  } catch (error) {
    console.error('❌ Error durante las pruebas:', error);
  }
}

// Ejecutar pruebas
testEmails();
