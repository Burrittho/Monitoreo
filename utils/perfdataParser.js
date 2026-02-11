/**
 * Perfdata Parser - Parsea el formato de perfdata de Nagios/NSClient++
 * Formato: 'metric_name'=value[UOM];[warn];[crit];[min];[max]
 */

/**
 * Parsea una cadena de perfdata y retorna array de métricas
 * @param {string} perfdata - Cadena de perfdata
 * @returns {Array} Array de objetos con métricas parseadas
 */
function parsePerfdata(perfdata) {
  if (!perfdata || typeof perfdata !== 'string') {
    return [];
  }
  
  const metrics = [];
  
  // Dividir por espacios, respetando comillas
  const parts = perfdata.match(/(?:[^\s'"]+|'[^']*'|"[^"]*")+/g) || [];
  
  for (const part of parts) {
    try {
      const metric = parseSingleMetric(part);
      if (metric) {
        metrics.push(metric);
      }
    } catch (err) {
      console.warn(`Error parsing perfdata part "${part}":`, err.message);
    }
  }
  
  return metrics;
}

/**
 * Parsea una métrica individual
 * @param {string} metricStr - String de una métrica
 * @returns {Object|null} Objeto con datos de la métrica o null
 */
function parseSingleMetric(metricStr) {
  // Patrón para métrica: 'name'=value[UOM];[warn];[crit];[min];[max]
  const pattern = /^'?([^'=]+)'?=([^;]+)(;([^;]*))?(;([^;]*))?(;([^;]*))?(;([^;]*))?$/;
  const match = metricStr.match(pattern);
  
  if (!match) {
    return null;
  }
  
  const [
    ,
    name,
    valueStr,
    ,
    warning = null,
    ,
    critical = null,
    ,
    min = null,
    ,
    max = null
  ] = match;
  
  // Extraer valor y unidad de medida
  const { value, uom } = parseValue(valueStr);
  
  return {
    name: name.trim(),
    value: value,
    uom: uom || null,
    warning: warning ? parseNumeric(warning) : null,
    critical: critical ? parseNumeric(critical) : null,
    min: min ? parseNumeric(min) : null,
    max: max ? parseNumeric(max) : null
  };
}

/**
 * Parsea valor con unidad de medida
 * @param {string} valueStr - String del valor (ej: "45.5GB", "80%")
 * @returns {Object} {value: number, uom: string}
 */
function parseValue(valueStr) {
  if (!valueStr) {
    return { value: null, uom: null };
  }
  
  // Patrón para número seguido opcionalmente de unidad
  const match = valueStr.match(/^([-+]?[\d.]+)([A-Za-z%]*)$/);
  
  if (!match) {
    return { value: null, uom: null };
  }
  
  const [, numStr, uom] = match;
  const value = parseFloat(numStr);
  
  return {
    value: isNaN(value) ? null : value,
    uom: uom || null
  };
}

/**
 * Parsea un string a número
 * @param {string} str - String a parsear
 * @returns {number|null} Número o null
 */
function parseNumeric(str) {
  if (!str || str === '') {
    return null;
  }
  
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

/**
 * Extrae perfdata de un output de check
 * @param {string} output - Output del check (ej: "OK: CPU 15% | cpu=15%;80;90;")
 * @returns {string|null} String de perfdata o null
 */
function extractPerfdata(output) {
  if (!output || typeof output !== 'string') {
    return null;
  }
  
  // Buscar pipe (|) que separa output de perfdata
  const match = output.match(/\|(.+)$/);
  return match ? match[1].trim() : null;
}

/**
 * Valida que una métrica tenga los campos mínimos requeridos
 * @param {Object} metric - Objeto de métrica
 * @returns {boolean} true si es válida
 */
function isValidMetric(metric) {
  return (
    metric &&
    typeof metric.name === 'string' &&
    metric.name.length > 0 &&
    (metric.value !== null || metric.value !== undefined)
  );
}

module.exports = {
  parsePerfdata,
  parseSingleMetric,
  parseValue,
  parseNumeric,
  extractPerfdata,
  isValidMetric
};
