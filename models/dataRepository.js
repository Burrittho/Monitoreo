/**
 * Data Repository - Consultas de información de hosts para emails
 * Obtiene datos de sucursales, consolas e internet
 */

/**
 * Obtiene información de la sucursal
 * @param {number} ipId - ID del host
 * @param {ConnectionManager} connectionManager - Instancia del gestor de conexiones
 * @returns {Object} Información de la sucursal
 */

async function getSucursalInfo(ipId, connectionManager) {
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

/**
 * Obtiene información de la consola
 * @param {number} ipId - ID del host
 * @param {ConnectionManager} connectionManager - Instancia del gestor de conexiones
 * @returns {Object} Información de la consola
 */
async function getConsolaInfo(ipId, connectionManager) {
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

/**
 * Obtiene información de conexiones a internet
 * @param {number} ipId - ID del host
 * @param {ConnectionManager} connectionManager - Instancia del gestor de conexiones
 * @returns {Object} Información de internet (proveedores y conexiones)
 */
async function getInternetInfo(ipId, connectionManager) {
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

module.exports = {
  getSucursalInfo,
  getConsolaInfo,
  getInternetInfo
};