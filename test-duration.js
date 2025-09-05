// Test de la función formatDuration
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

// Pruebas
const now = Date.now();
console.log('=== PRUEBAS DE FORMATEO DE DURACIÓN ===');
console.log('30 segundos:', formatDuration(now - 30000, now));
console.log('2 minutos y 15 segundos:', formatDuration(now - 135000, now));
console.log('1 hora y 30 minutos:', formatDuration(now - 5400000, now));
console.log('2 días, 3 horas y 45 minutos:', formatDuration(now - 185700000, now));
console.log('1 segundo:', formatDuration(now - 1000, now));
console.log('Menos de 1 segundo:', formatDuration(now - 500, now));
